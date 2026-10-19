import type { PersistenceOptions } from "pinia-plugin-persistedstate";
import type { PiniaPluginContext, StateTree } from "pinia";
import {
  persistentStorage,
  isQuotaExceeded,
  reportSaveFailure,
  reportSaveSuccess,
  type SafeStorage,
} from "@/services/safeStorage";

/**
 * Versioned saved data. Every saved store describes its format once (a codec)
 * and reads and writes through a binding that enforces the rules in
 * docs/persistence-codec.md:
 *
 *  - a payload written by a newer app is never overwritten;
 *  - before any rewrite of a stored payload the app did not just write (a
 *    migration, or replacing an unreadable payload), the prior bytes are
 *    copied to a dated backup key, and if that copy fails nothing is rewritten;
 *  - whatever cannot be read leaves the app running on defaults in memory.
 */

/** The version of data saved before codecs existed (no envelope). */
export const UNVERSIONED = 0;

/**
 * Routine migration backups kept per store key, newest first. The spec said
 * one ("kept for one version"); two protects against a bad migration followed
 * by a second one before anyone notices. Recovery copies are kept separately.
 * Burooj's call in the PR (docs/persistence-codec.md).
 */
export const BACKUP_RETENTION = 2;

export interface PersistenceCodec<T> {
  /** Storage key of the store's payload. */
  key: string;
  /** Current format version, an integer from 1. */
  version: number;
  /** The in-memory state when nothing usable is stored. */
  defaults: () => T;
  /**
   * Current-version data → state. Sanitises field by field (an entry the app
   * can no longer use is dropped); throws only when the data is unusable as a
   * whole, which the binding treats as unreadable.
   */
  decode: (data: unknown) => T;
  /** State → current-version data (plain JSON). May throw. Identity if absent. */
  encode?: (state: T) => unknown;
  /**
   * Keyed by from-version: `migrations[n]` turns version-n data into version
   * n+1. `migrations[0]` lifts unversioned (pre-codec) data. Every step from
   * the lowest key to `version - 1` must exist. A store that never saved
   * unversioned data omits 0, and an unversioned payload is then unreadable.
   */
  migrations: Readonly<Record<number, (data: unknown) => unknown>>;
  /** Version-labelled migration backups to keep; defaults to BACKUP_RETENTION. */
  backupRetention?: number;
  /**
   * Reconcile with a payload another tab saved (docs/persistence-codec.md,
   * "Two tabs"). `base` is the current-version data this binding last agreed
   * with storage on (null when it never did), `ours` the state in memory,
   * `theirs` the stored data, lifted to the current version. Returns the state
   * to keep and write. Throws when `theirs` is unusable as a whole. Without
   * it the store is last-write-wins, which suits a setting.
   */
  merge?: (base: unknown, ours: T, theirs: unknown) => T;
  /**
   * The part of the data every tab shares (per-tab parts, such as the open
   * take, left out). A save that would change none of it is skipped, so two
   * tabs never trade writes that differ only per tab. Identity if absent.
   */
  shared?: (data: unknown) => unknown;
}

/** Check a codec's shape once, where it is defined. */
export function defineCodec<T>(codec: PersistenceCodec<T>): PersistenceCodec<T> {
  if (!Number.isInteger(codec.version) || codec.version < 1) {
    throw new Error(`Codec "${codec.key}": version must be an integer from 1`);
  }
  const steps = Object.keys(codec.migrations).map(Number);
  if (steps.some((from) => !Number.isInteger(from) || from < 0 || from >= codec.version)) {
    throw new Error(`Codec "${codec.key}": migrations must be keyed 0..${codec.version - 1}`);
  }
  const lowest = steps.length ? Math.min(...steps) : codec.version;
  for (let from = lowest; from < codec.version; from += 1) {
    if (!codec.migrations[from]) {
      throw new Error(`Codec "${codec.key}": no migration from version ${from}`);
    }
  }
  if (codec.backupRetention !== undefined && (!Number.isInteger(codec.backupRetention) || codec.backupRetention < 1)) {
    throw new Error(`Codec "${codec.key}": backupRetention must be at least 1`);
  }
  return codec;
}

// ─── The stored envelope ────────────────────────────────────────────────────

const VERSION_FIELD = "$version";

interface Envelope {
  [VERSION_FIELD]: number;
  data: unknown;
}

/** The exact string a store writes: `{"$version":n,"data":…}`. Throws if encode does. */
export function encodePayload<T>(codec: PersistenceCodec<T>, state: T): string {
  const data = codec.encode ? codec.encode(state) : state;
  const envelope: Envelope = { [VERSION_FIELD]: codec.version, data };
  return JSON.stringify(envelope);
}

export type ReadOutcome<T> =
  /** Nothing stored. */
  | { kind: "empty"; state: T }
  /** Stored at the current version and decoded. */
  | { kind: "current"; state: T }
  /** Stored at an older version and migrated to the current one in memory. */
  | { kind: "migrated"; state: T; from: number }
  /** Written by a newer app. `state` is defaults; the payload must be left alone. */
  | { kind: "newer"; state: T; found: number }
  /** Unparseable, malformed, or a migration/decode threw. `state` is defaults. */
  | { kind: "unreadable"; state: T; from: number | null; error: unknown };

function storedVersion(parsed: unknown): { version: number; data: unknown } | { malformed: true } {
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed) || !(VERSION_FIELD in parsed)) {
    return { version: UNVERSIONED, data: parsed };
  }
  const record = parsed as Record<string, unknown>;
  const version = record[VERSION_FIELD];
  if (typeof version !== "number" || !Number.isInteger(version) || version < 1 || !("data" in record)) {
    return { malformed: true };
  }
  return { version, data: record.data };
}

type Lifted =
  | { kind: "lifted"; from: number; data: unknown }
  | { kind: "newer"; found: number }
  | { kind: "unreadable"; from: number | null; error: unknown };

/** Parse a stored string and migrate its data to the current version, without decoding. */
function liftPayload(codec: PersistenceCodec<unknown>, raw: string): Lifted {
  let from: number | null = null;
  try {
    const stored = storedVersion(JSON.parse(raw));
    if ("malformed" in stored) throw new Error(`Malformed ${VERSION_FIELD} envelope`);
    from = stored.version;
    if (from > codec.version) return { kind: "newer", found: from };
    let data = stored.data;
    for (let version = from; version < codec.version; version += 1) {
      const step = codec.migrations[version];
      if (!step) throw new Error(`No migration from version ${version}`);
      data = step(data);
    }
    return { kind: "lifted", from, data };
  } catch (error) {
    return { kind: "unreadable", from, error };
  }
}

/** Read a stored string. Pure: never touches storage, never throws. */
export function readPayload<T>(codec: PersistenceCodec<T>, raw: string | null): ReadOutcome<T> {
  if (raw === null) return { kind: "empty", state: codec.defaults() };
  const lifted = liftPayload(codec as PersistenceCodec<unknown>, raw);
  if (lifted.kind === "newer") return { kind: "newer", state: codec.defaults(), found: lifted.found };
  if (lifted.kind === "unreadable") return { kind: "unreadable", state: codec.defaults(), from: lifted.from, error: lifted.error };
  try {
    const state = codec.decode(lifted.data);
    return lifted.from === codec.version
      ? { kind: "current", state }
      : { kind: "migrated", state, from: lifted.from };
  } catch (error) {
    return { kind: "unreadable", state: codec.defaults(), from: lifted.from, error };
  }
}

/** JSON equality: a property holding undefined counts as absent, as JSON drops it. */
export function sameJson(left: unknown, right: unknown): boolean {
  if (left === right) return true;
  if (typeof left !== "object" || typeof right !== "object" || left === null || right === null) return false;
  if (Array.isArray(left) || Array.isArray(right)) {
    if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) return false;
    return left.every((value, index) => sameJson(value, right[index]));
  }
  const l = left as Record<string, unknown>;
  const r = right as Record<string, unknown>;
  for (const key of Object.keys(l)) if (!sameJson(l[key], r[key])) return false;
  for (const key of Object.keys(r)) if (!(key in l) && r[key] !== undefined) return false;
  return true;
}

// ─── Backups ────────────────────────────────────────────────────────────────

export interface BackupEntry {
  /** The backup's own storage key. */
  backupKey: string;
  /** The store key it was copied from. */
  of: string;
  /** Why it was taken: `v<n>` (the version the bytes were read as), `unreadable`, or `pre-restore`. */
  label: string;
  /** UTC date it was written, YYYY-MM-DD. */
  date: string;
  /** Order among backups written for the same key on the same date, from 1. */
  sequence: number;
}

const BACKUP_INFIX = ".backup.";

/**
 * A restore stamps `<key>.restored` before it puts the backup back, so every
 * open tab, not only the one that restored, stops writing until it reloads
 * (otherwise another tab would merge its shelf back over the restored bytes).
 */
export const restoredMarkerKey = (key: string): string => `${key}.restored`;

/**
 * Stamp a restore of `key` for every open tab. Returns how to take the stamp
 * back (for a restore whose payload then could not be written), or null when
 * the stamp itself could not be written.
 */
export function markRestored(storage: SafeStorage, key: string, time: number): (() => boolean) | null {
  const markerKey = restoredMarkerKey(key);
  const previous = storage.read(markerKey);
  if (!previous.ok || !storage.write(markerKey, String(time), { oneOff: true })) return null;
  return () => {
    if (previous.value !== null) return storage.write(markerKey, previous.value, { oneOff: true });
    storage.removeItem(markerKey);
    const now = storage.read(markerKey);
    return now.ok && now.value === null;
  };
}

/**
 * A restore failed after this page stopped saving for it: take the stamp back
 * and let `live` save again. If the stamp can't be taken back, every tab must
 * reload, and this one says so like the others.
 */
export function abandonRestore(
  key: string,
  unmark: (() => boolean) | null,
  live: PersistedBinding<unknown> | undefined,
): boolean {
  const undone = unmark ? unmark() : true;
  if (undone) live?.resume();
  else reportSaveFailure("newer", key);
  return undone;
}
const BACKUP_TAIL = /^([A-Za-z0-9-]+)\.(\d{4}-\d{2}-\d{2})(?:\.(\d+))?$/;

/** `<key>.backup.<label>.<YYYY-MM-DD>`, with `.<n>` when the date repeats. */
export function backupKeyFor(key: string, label: string, date: string, sequence = 1): string {
  return `${key}${BACKUP_INFIX}${label}.${date}${sequence > 1 ? `.${sequence}` : ""}`;
}

export function parseBackupKey(backupKey: string): BackupEntry | null {
  const at = backupKey.lastIndexOf(BACKUP_INFIX);
  if (at <= 0) return null;
  const match = BACKUP_TAIL.exec(backupKey.slice(at + BACKUP_INFIX.length));
  if (!match) return null;
  return {
    backupKey,
    of: backupKey.slice(0, at),
    label: match[1],
    date: match[2],
    sequence: match[3] ? Number(match[3]) : 1,
  };
}

const newestFirst = (a: BackupEntry, b: BackupEntry) =>
  a.date === b.date ? b.sequence - a.sequence : a.date < b.date ? 1 : -1;

/** Backups in storage, newest first; only those of `key` when given. */
export function listBackups(storage: SafeStorage, key?: string): BackupEntry[] {
  const keys = storage.keys();
  if (keys === null) throw new Error("Could not enumerate backups");
  return keys
    .map(parseBackupKey)
    .filter((entry): entry is BackupEntry => entry !== null && (key === undefined || entry.of === key))
    .sort(newestFirst);
}

const isoDate = (time: number) => new Date(time).toISOString().slice(0, 10);

/**
 * Copy `raw` to a dated backup of `key`, reusing today's copy when it holds
 * the same bytes. `stored` is false when the copy could not be written (the
 * failure is already reported under `backupKey`).
 */
function writeBackup(
  storage: SafeStorage,
  key: string,
  label: string,
  raw: string,
  time: number,
): { backupKey: string; stored: boolean } {
  const date = isoDate(time);
  let existing: BackupEntry[];
  try {
    existing = listBackups(storage, key);
  } catch {
    const backupKey = backupKeyFor(key, label, date);
    reportSaveFailure("unknown", backupKey);
    return { backupKey, stored: false };
  }
  const sameCopy = existing.find(
    (entry) => entry.label === label && entry.date === date && storage.getItem(entry.backupKey) === raw,
  );
  if (sameCopy) return { backupKey: sameCopy.backupKey, stored: true };
  const sequence = 1 + Math.max(0, ...existing.filter((entry) => entry.date === date).map((entry) => entry.sequence));
  const backupKey = backupKeyFor(key, label, date, sequence);
  return { backupKey, stored: storage.write(backupKey, raw) };
}

/** Prune only version-labelled migrations; recovery copies never count toward retention. */
function pruneBackups(storage: SafeStorage, key: string, retention: number, keep: string): void {
  let migrations: BackupEntry[];
  try {
    migrations = listBackups(storage, key).filter((entry) => /^v\d+$/.test(entry.label));
  } catch {
    return; // An unavailable listing cannot justify deleting any backup.
  }
  const keptMigration = migrations.some((entry) => entry.backupKey === keep);
  const others = migrations.filter((entry) => entry.backupKey !== keep);
  for (const stale of others.slice(retention - (keptMigration ? 1 : 0))) storage.removeItem(stale.backupKey);
}

// ─── The binding: one store's reads and writes ──────────────────────────────

/** Why writes are refused right now (null: writes go through). */
export type WriteHold =
  /** A newer app wrote the payload; refused for the rest of this page's life. */
  | { reason: "newer"; found: number }
  /** The stored bytes must be backed up first; retried on every save. */
  | { reason: "needs-backup"; raw: string; label: string; failedKey?: string }
  /** The stored bytes could not be read at all; refused for this page's life. */
  | { reason: "unread" }
  /** A backup was just restored into storage; refused until the page reloads. */
  | { reason: "restored" };

export interface PersistedBinding<T> {
  readonly codec: PersistenceCodec<T>;
  readonly storage: SafeStorage;
  /** Read, migrate, back up and rewrite as needed; returns the state to run on. */
  load(): T;
  /** Encode and write. False when nothing was stored (refused or failed; reported). */
  save(state: T): boolean;
  /**
   * The string to write, or null when writes are refused or encode threw
   * (either is reported). Clears a needs-backup hold if the backup now fits.
   */
  prepare(state: T): string | null;
  /** The exact string `save` would write (e.g. to measure against a budget). Throws if encode does. */
  encode(state: T): string;
  /** What the last `load` found. */
  readonly outcome: ReadOutcome<T>["kind"] | null;
  /** Why writes are refused, or null. */
  readonly hold: WriteHold | null;
  /** Refuse writes until the page reloads (used by restore). */
  holdUntilReload(): void;
  /** Undo `holdUntilReload` for a restore that did not happen. */
  resume(): void;
  /** Remove a disposed or ephemeral store from the support restore registry. */
  unregister(): void;
  /** Wait for an asynchronous backup and its queued save, if any. */
  settled(): Promise<void>;
  /**
   * For a codec with `merge`: reconcile with whatever another tab stored, now.
   * Returns the merged state (also handed to `adopt`), or null when there was
   * nothing to take in or the stored bytes must wait for the save path (a
   * hold, an older format that needs its backup first, unreadable bytes).
   */
  sync(current: T): T | null;
  /**
   * Call `sync` on every `storage` event for this key. Returns the unsubscribe.
   * `current` reads the state in memory at the time of the event.
   */
  listen(current: () => T, target?: EventTarget): () => void;
}

export interface BindingOptions<T = unknown> {
  storage?: SafeStorage;
  now?: () => number;
  /** An alternate backup destination. Resolves only after the copy is durable. */
  backup?: (key: string, label: string, raw: string, time: number, retention: number) => Promise<void>;
  /** Refuse an encoded payload before writing; the caller reports the reason. */
  accept?: (encoded: string) => boolean;
  /**
   * For a codec with `merge`: take a merged state into memory. Required for
   * such a codec, or the next save would write over what was merged in.
   */
  adopt?: (state: T) => void;
}

// Live bindings by key, so a restore can stop the running store from
// overwriting what it put back.
const bindings = new Map<string, Set<PersistedBinding<unknown>>>();

/** The live binding for a store key, if one was created. */
export function bindingFor(key: string): PersistedBinding<unknown> | undefined {
  const live = Array.from(bindings.get(key) ?? []);
  return live[live.length - 1];
}

export function createPersistedBinding<T>(
  codecDefinition: PersistenceCodec<T>,
  { storage = persistentStorage, now = () => Date.now(), backup, accept, adopt }: BindingOptions<T> = {},
): PersistedBinding<T> {
  const codec = defineCodec(codecDefinition);
  const retention = codec.backupRetention ?? BACKUP_RETENTION;
  if (codec.merge && !adopt) throw new Error(`Codec "${codec.key}": a merging codec needs adopt`);
  let outcome: ReadOutcome<T>["kind"] | null = null;
  let hold: WriteHold | null = null;
  let pendingBackup: Promise<void> | null = null;
  let queuedState: { state: T } | null = null;
  let backedUpRaw: string | null = null;
  // The last payload `prepare` handed out. Stored bytes equal to it are bytes
  // this binding produced: current, readable, nothing to classify or back up.
  let lastEncoded: string | null = null;
  // The stored bytes this binding last agreed with: loaded, written, or merged
  // in. A merge's base. Kept as the string and parsed when needed, so nothing
  // in memory can alias (and silently edit) the base.
  let synced: string | null = null;
  const lift = (raw: string) => liftPayload(codec as PersistenceCodec<unknown>, raw);
  const baseData = (): unknown => {
    if (synced === null) return null;
    const lifted = lift(synced);
    return lifted.kind === "lifted" ? lifted.data : null;
  };
  const readMarker = (): string | null => {
    const marker = storage.read(restoredMarkerKey(codec.key));
    return marker.ok ? marker.value : null;
  };
  // The restore stamp this page started from (undefined until first looked at).
  let restoreSeen: string | null | undefined;
  /** Another tab restored a backup since: hold until reload, and say so. */
  const restoredElsewhere = (): boolean => {
    const marker = readMarker();
    if (restoreSeen === undefined) restoreSeen = marker;
    if (marker === restoreSeen) return false;
    hold = { reason: "restored" };
    queuedState = null;
    reportSaveFailure("newer", codec.key);
    return true;
  };
  /** Stored bytes another tab wrote since this binding last agreed with storage. */
  const isForeign = (raw: string | null): raw is string =>
    raw !== null && raw !== lastEncoded && raw !== synced;

  /** Try to clear the hold. True when writes may proceed. */
  const releaseHold = (): boolean => {
    if (!hold) return true;
    switch (hold.reason) {
      case "newer":
        reportSaveFailure("newer", codec.key);
        return false;
      case "unread":
        reportSaveFailure("unknown", codec.key);
        return false;
      case "restored":
        return false;
      case "needs-backup": {
        if (backup) {
          if (hold.raw === backedUpRaw) {
            hold = null;
            return true;
          }
          if (!pendingBackup) {
            const waiting = hold;
            const failureKey = `${codec.key}.backup`;
            pendingBackup = backup(codec.key, waiting.label, waiting.raw, now(), retention)
              .then(() => {
                backedUpRaw = waiting.raw;
                reportSaveSuccess(failureKey);
                if (hold === waiting) hold = null;
              })
              .catch((error) => {
                reportSaveFailure(isQuotaExceeded(error) ? "quota" : "unknown", failureKey);
              })
              .finally(() => {
                pendingBackup = null;
                if (!hold && queuedState) {
                  const latest = queuedState.state;
                  queuedState = null;
                  binding.save(latest);
                }
              });
          }
          return false;
        }
        const { backupKey, stored } = writeBackup(storage, codec.key, hold.label, hold.raw, now());
        if (!stored) {
          hold.failedKey = backupKey;
          return false;
        }
        // A retry can land on a new key (the date moved on); end the old failure too.
        if (hold.failedKey && hold.failedKey !== backupKey) reportSaveSuccess(hold.failedKey);
        pruneBackups(storage, codec.key, retention, backupKey);
        hold = null;
        return true;
      }
    }
  };

  /**
   * Merge another tab's lifted data into `ours`; null (logged) when theirs is
   * unusable. Bytes written at another version came from a build that does
   * not keep this base: what they lack is not known to be released, so they
   * merge with no base (a plain union).
   */
  const mergeIn = (ours: T, theirs: { from: number; data: unknown }): { state: T } | null => {
    try {
      const base = theirs.from === codec.version ? baseData() : null;
      return { state: codec.merge!(base, ours, theirs.data) };
    } catch (error) {
      console.error(`Saved "${codec.key}" from another tab could not be merged.`, error);
      return null;
    }
  };

  /** `own`: the stored bytes are this binding's last write. */
  interface Prepared { encoded: string; stored: string | null; own: boolean }

  const prepareWrite = (state: T): Prepared | null => {
    if (backup) queuedState = { state };
    // Another tab may have replaced the bytes since hydration. Classify them
    // again so legacy and unreadable payloads get the same backup protection.
    const stored = storage.read(codec.key);
    if (!stored.ok) {
      // Can't see what is stored now, so this save can't go over it. Only a
      // failed initial load holds every write (`unread`, set in load); after
      // a good load the next save simply reads again.
      if (hold?.reason === "newer") reportSaveFailure("newer", codec.key);
      return null;
    }
    if (!releaseHold()) return null;
    if (restoredElsewhere()) return null;
    const raw = stored.value;
    const own = raw !== null && raw === lastEncoded;
    if (own) synced = raw;
    let merged: { state: T; raw: string } | null = null;
    if (codec.merge) {
      // Bytes another tab wrote are merged in, never written over blindly.
      // An older format is backed up first (the hold below); empty storage
      // (cleared) is not a delete of everything, so this tab writes its own.
      if (isForeign(raw)) {
        const lifted = lift(raw);
        if (lifted.kind === "newer") {
          hold = { reason: "newer", found: lifted.found };
        } else {
          const result = lifted.kind === "lifted" ? mergeIn(state, lifted) : null;
          if (!result || lifted.kind !== "lifted" || lifted.from !== codec.version) {
            hold = {
              reason: "needs-backup", raw,
              label: result && lifted.kind === "lifted" ? `v${lifted.from}` : "unreadable",
            };
          }
          if (result) merged = { state: result.state, raw };
        }
      }
    } else if (raw === null || raw !== lastEncoded) {
      const read = readPayload(codec, raw);
      if (read.kind === "newer") {
        hold = { reason: "newer", found: read.found };
      } else if (read.kind === "migrated" || read.kind === "unreadable") {
        hold = {
          reason: "needs-backup", raw: raw as string,
          label: read.kind === "migrated" ? `v${read.from}` : "unreadable",
        };
      }
    }
    if (!releaseHold()) return null;
    if (merged) {
      // Memory takes in the other tab's work whether or not this write lands.
      synced = merged.raw;
      state = merged.state;
      adopt!(state);
    }
    try {
      const encoded = encodePayload(codec, state);
      queuedState = null;
      if (accept && !accept(encoded)) return null;
      lastEncoded = encoded;
      return { encoded, stored: raw, own };
    } catch (error) {
      console.error(`Failed to encode "${codec.key}" for saving:`, error);
      reportSaveFailure("unknown", codec.key);
      return null;
    }
  };

  const prepare = (state: T): string | null => prepareWrite(state)?.encoded ?? null;

  /**
   * The stored bytes, which this binding agrees with, already hold everything
   * every tab shares: writing would only trade per-tab parts back and forth.
   */
  const changesNothingShared = ({ encoded, stored, own }: Prepared): boolean => {
    if (!codec.merge || stored === null || stored !== synced) return false;
    if (stored === encoded) return true;
    // Over its own last write a change is this tab's to save; only bytes
    // another tab wrote (loaded or merged in) are worth comparing.
    if (own) return false;
    const ours = lift(encoded);
    const theirs = lift(stored);
    if (ours.kind !== "lifted" || theirs.kind !== "lifted" || theirs.from !== codec.version) return false;
    const shared = codec.shared ?? ((data: unknown) => data);
    return sameJson(shared(ours.data), shared(theirs.data));
  };

  const binding: PersistedBinding<T> = {
    codec,
    storage,
    async settled() {
      while (pendingBackup) await pendingBackup;
    },
    unregister() {
      queuedState = null;
      const live = bindings.get(codec.key);
      live?.delete(binding as PersistedBinding<unknown>);
      if (live?.size === 0) bindings.delete(codec.key);
    },
    get outcome() {
      return outcome;
    },
    get hold() {
      return hold;
    },
    holdUntilReload() {
      queuedState = null;
      hold = { reason: "restored" };
    },
    resume() {
      if (hold?.reason === "restored") hold = null;
    },
    prepare,
    encode: (state) => encodePayload(codec, state),
    load() {
      const stored = storage.read(codec.key);
      if (!stored.ok) {
        // Can't see what is stored, so nothing may be written over it.
        outcome = "unreadable";
        hold = { reason: "unread" };
        return codec.defaults();
      }
      const raw = stored.value;
      // A restore stamped before this load is the payload this page runs on.
      restoreSeen = readMarker();
      const read = readPayload(codec, raw);
      outcome = read.kind;
      hold = null;
      // What this page now agrees with; a migration's base is the old bytes, lifted.
      synced = read.kind === "empty" || read.kind === "current" || read.kind === "migrated" ? raw : null;
      switch (read.kind) {
        case "empty":
        case "current":
          return read.state;
        case "newer":
          hold = { reason: "newer", found: read.found };
          return read.state;
        case "unreadable":
          console.error(`Saved "${codec.key}" could not be read; running on defaults.`, read.error);
          hold = {
            reason: "needs-backup",
            raw: raw as string,
            label: "unreadable",
          };
          // Back up now if it fits; the store's saves overwrite only after.
          releaseHold();
          return read.state;
        case "migrated": {
          hold = { reason: "needs-backup", raw: raw as string, label: `v${read.from}` };
          // Eager rewrite: back up the prior bytes, then store the migrated
          // format. Without a backup the stored payload stays as it was.
          const encoded = prepare(read.state);
          if (encoded !== null && storage.write(codec.key, encoded)) synced = encoded;
          return read.state;
        }
      }
    },
    save(state) {
      const prepared = prepareWrite(state);
      if (!prepared) return false;
      if (changesNothingShared(prepared)) return true;
      if (!storage.write(codec.key, prepared.encoded)) return false;
      // This tab's own write is a base too: without it, a sketch this tab
      // saved and then released would come back from another tab that had only
      // taken it in. Cost: the read-then-write race (docs, "Two tabs").
      synced = prepared.encoded;
      return true;
    },
    sync(current) {
      if (hold || restoredElsewhere() || !codec.merge) return null;
      const stored = storage.read(codec.key);
      if (!stored.ok || !isForeign(stored.value)) return null;
      const lifted = lift(stored.value);
      if (lifted.kind === "newer") {
        // A newer app took over the payload: say so now, not at the next save.
        hold = { reason: "newer", found: lifted.found };
        reportSaveFailure("newer", codec.key);
        return null;
      }
      // An older format or unreadable bytes wait for the save path, which backs them up first.
      if (lifted.kind !== "lifted" || lifted.from !== codec.version) return null;
      const merged = mergeIn(current, lifted);
      if (!merged) return null;
      synced = stored.value;
      adopt!(merged.state);
      return merged.state;
    },
    listen(current, target = globalThis) {
      const onStorage = (event: Event) => {
        const { key } = event as StorageEvent;
        // A null key is a clear(); the read in sync decides.
        if (key === codec.key || key === restoredMarkerKey(codec.key) || key === null) binding.sync(current());
      };
      target.addEventListener("storage", onStorage);
      return () => target.removeEventListener("storage", onStorage);
    },
  };

  const live = bindings.get(codec.key) ?? new Set<PersistedBinding<unknown>>();
  live.add(binding as PersistedBinding<unknown>);
  bindings.set(codec.key, live);
  return binding;
}

// ─── pinia-plugin-persistedstate adapter ────────────────────────────────────

/**
 * Thrown from the plugin serializer to stop a write. pinia-plugin-persistedstate
 * swallows serializer errors before reaching storage, so every refusal has
 * already been reported (by `prepare`) when this is thrown.
 */
class WriteRefused extends Error {}

/**
 * `persist` options for a Pinia store saved through a binding. The codec's
 * state is the picked state. Hydration loads through the binding (migrating
 * and backing up first), and every autosave passes the binding's write rules.
 */
export function codecPersist<T extends StateTree>(
  binding: PersistedBinding<T>,
  options: { pick?: string[]; afterHydrate?: (context: PiniaPluginContext) => void } = {},
): PersistenceOptions {
  let loaded: { state: T } | null = null;
  return {
    key: binding.codec.key,
    pick: options.pick,
    storage: {
      setItem: (key, value) => binding.storage.setItem(key, value),
      // deserialize consumes the codec load, even for missing/unreadable data.
      // A second backend read could otherwise skip applying that saved state.
      getItem: () => "{}",
    },
    // Load here rather than from the plugin's getItem, so a failed read still
    // closes the write gate and an empty key still resets it.
    beforeHydrate: () => {
      loaded = { state: binding.load() };
    },
    afterHydrate: options.afterHydrate,
    serializer: {
      deserialize: () => {
        // $hydrate({ runHooks: false }) skips beforeHydrate.
        const state = loaded ? loaded.state : binding.load();
        loaded = null;
        return state;
      },
      serialize: (state) => {
        const encoded = binding.prepare(state as T);
        if (encoded === null) throw new WriteRefused(binding.codec.key);
        return encoded;
      },
    },
  };
}

// ─── Restore (support path) ─────────────────────────────────────────────────

export interface RestoreResult {
  ok: boolean;
  message: string;
  /** Backup of what was stored before the restore, if anything was. */
  preRestoreBackup?: string;
}

/**
 * Put a backup back as its store's payload. What is stored now is first backed
 * up (`pre-restore`), so a restore can itself be undone; if that copy fails,
 * nothing is restored. The running store is stopped from overwriting the
 * restored bytes; reload the page to run on them (migrating again if needed).
 */
export function restoreBackup(
  backupKey: string,
  { storage = persistentStorage, now = () => Date.now() }: BindingOptions = {},
): RestoreResult {
  const entry = parseBackupKey(backupKey);
  if (!entry) return { ok: false, message: `"${backupKey}" is not a backup key.` };
  const saved = storage.getItem(backupKey);
  if (saved === null) return { ok: false, message: `No backup stored at "${backupKey}".` };

  const live = bindingFor(entry.of);
  const currentRead = storage.read(entry.of);
  if (!currentRead.ok) return { ok: false, message: `Could not read "${entry.of}"; nothing restored.` };
  const current = currentRead.value;
  let preRestoreBackup: string | undefined;
  if (current !== null && current !== saved) {
    const kept = writeBackup(storage, entry.of, "pre-restore", current, now());
    if (!kept.stored) return { ok: false, message: `Could not back up the current "${entry.of}"; nothing restored.` };
    preRestoreBackup = kept.backupKey;
  }
  // Stamp first: no other tab may write between the restore and the stamp.
  live?.holdUntilReload();
  const unmark = markRestored(storage, entry.of, now());
  if (!unmark) {
    abandonRestore(entry.of, null, live);
    return { ok: false, message: `Could not tell other tabs about the restore of "${entry.of}"; nothing restored.`, preRestoreBackup };
  }
  if (!storage.write(entry.of, saved)) {
    // Nothing changed: take the stamp back so no tab is left not saving.
    const undone = abandonRestore(entry.of, unmark, live);
    return {
      ok: false,
      message: `Could not write "${entry.of}"; nothing restored.${undone ? "" : " Reload every open tab to save again."}`,
      preRestoreBackup,
    };
  }
  // Prune only after the swap: the restored bytes are live now.
  if (preRestoreBackup) {
    pruneBackups(storage, entry.of, live?.codec.backupRetention ?? BACKUP_RETENTION, preRestoreBackup);
  }
  return {
    ok: true,
    message: `Restored "${entry.of}" from "${backupKey}". Reload the page now; nothing saves until you do.`,
    preRestoreBackup,
  };
}

/** Console handle for support: `emotitoneBackups.list()`, `.read(key)`, `.restore(key)`. */
export function installBackupConsole(
  target: object = globalThis,
  storage: SafeStorage = persistentStorage,
): void {
  Object.assign(target, {
    emotitoneBackups: {
      list: (key?: string) =>
        listBackups(storage, key).map((entry) => ({
          ...entry,
          bytes: storage.getItem(entry.backupKey)?.length ?? 0,
        })),
      read: (backupKey: string) => storage.getItem(backupKey),
      restore: (backupKey: string) => restoreBackup(backupKey, { storage }),
    },
  });
}
