import type { PersistenceOptions } from "pinia-plugin-persistedstate";
import type { PiniaPluginContext, StateTree } from "pinia";
import {
  persistentStorage,
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
 * Backups kept per store key, newest first. The spec said one ("kept for one
 * version"); two survives a restore followed by a reload that migrates again,
 * and a bad migration followed by a second one before anyone notices.
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
  /** Backups to keep for this key; defaults to BACKUP_RETENTION. */
  backupRetention?: number;
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

/** Read a stored string. Pure: never touches storage, never throws. */
export function readPayload<T>(codec: PersistenceCodec<T>, raw: string | null): ReadOutcome<T> {
  if (raw === null || raw === "") return { kind: "empty", state: codec.defaults() };
  let from: number | null = null;
  try {
    const stored = storedVersion(JSON.parse(raw));
    if ("malformed" in stored) throw new Error(`Malformed ${VERSION_FIELD} envelope`);
    from = stored.version;
    if (from > codec.version) return { kind: "newer", state: codec.defaults(), found: from };
    let data = stored.data;
    for (let version = from; version < codec.version; version += 1) {
      const step = codec.migrations[version];
      if (!step) throw new Error(`No migration from version ${version}`);
      data = step(data);
    }
    const state = codec.decode(data);
    return from === codec.version
      ? { kind: "current", state }
      : { kind: "migrated", state, from };
  } catch (error) {
    return { kind: "unreadable", state: codec.defaults(), from, error };
  }
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
  return storage
    .keys()
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
  const existing = listBackups(storage, key);
  const sameCopy = existing.find(
    (entry) => entry.label === label && entry.date === date && storage.getItem(entry.backupKey) === raw,
  );
  if (sameCopy) return { backupKey: sameCopy.backupKey, stored: true };
  const sequence = 1 + Math.max(0, ...existing.filter((entry) => entry.date === date).map((entry) => entry.sequence));
  const backupKey = backupKeyFor(key, label, date, sequence);
  return { backupKey, stored: storage.write(backupKey, raw) };
}

/** Keep `keep` plus the newest others up to `retention`; remove the rest. */
function pruneBackups(storage: SafeStorage, key: string, retention: number, keep: string): void {
  const others = listBackups(storage, key).filter((entry) => entry.backupKey !== keep);
  for (const stale of others.slice(Math.max(0, retention - 1))) storage.removeItem(stale.backupKey);
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
}

export interface BindingOptions {
  storage?: SafeStorage;
  now?: () => number;
}

// Live bindings by key, so a restore can stop the running store from
// overwriting what it put back.
const bindings = new Map<string, PersistedBinding<unknown>>();

/** The live binding for a store key, if one was created. */
export function bindingFor(key: string): PersistedBinding<unknown> | undefined {
  return bindings.get(key);
}

export function createPersistedBinding<T>(
  codecDefinition: PersistenceCodec<T>,
  { storage = persistentStorage, now = Date.now }: BindingOptions = {},
): PersistedBinding<T> {
  const codec = defineCodec(codecDefinition);
  const retention = codec.backupRetention ?? BACKUP_RETENTION;
  let outcome: ReadOutcome<T>["kind"] | null = null;
  let hold: WriteHold | null = null;

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

  const prepare = (state: T): string | null => {
    if (!releaseHold()) return null;
    try {
      return encodePayload(codec, state);
    } catch (error) {
      console.error(`Failed to encode "${codec.key}" for saving:`, error);
      reportSaveFailure("unknown", codec.key);
      return null;
    }
  };

  const binding: PersistedBinding<T> = {
    codec,
    storage,
    get outcome() {
      return outcome;
    },
    get hold() {
      return hold;
    },
    holdUntilReload() {
      hold = { reason: "restored" };
    },
    prepare,
    encode: (state) => encodePayload(codec, state),
    load() {
      let raw: string | null;
      try {
        raw = storage.getItem(codec.key);
      } catch (error) {
        // Can't see what is stored, so nothing may be written over it.
        console.error(`Failed to read "${codec.key}" from storage:`, error);
        outcome = "unreadable";
        hold = { reason: "unread" };
        return codec.defaults();
      }
      const read = readPayload(codec, raw);
      outcome = read.kind;
      hold = null;
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
            label: read.from === null ? "unreadable" : `v${read.from}`,
          };
          // Back up now if it fits; the store's saves overwrite only after.
          releaseHold();
          return read.state;
        case "migrated": {
          hold = { reason: "needs-backup", raw: raw as string, label: `v${read.from}` };
          // Eager rewrite: back up the prior bytes, then store the migrated
          // format. Without a backup the stored payload stays as it was.
          const encoded = prepare(read.state);
          if (encoded !== null) storage.write(codec.key, encoded);
          return read.state;
        }
      }
    },
    save(state) {
      const encoded = prepare(state);
      return encoded !== null && storage.write(codec.key, encoded);
    },
  };

  bindings.set(codec.key, binding as PersistedBinding<unknown>);
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
    storage: binding.storage,
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
  { storage = persistentStorage, now = Date.now }: BindingOptions = {},
): RestoreResult {
  const entry = parseBackupKey(backupKey);
  if (!entry) return { ok: false, message: `"${backupKey}" is not a backup key.` };
  const saved = storage.getItem(backupKey);
  if (saved === null) return { ok: false, message: `No backup stored at "${backupKey}".` };

  const live = bindings.get(entry.of);
  const current = storage.getItem(entry.of);
  let preRestoreBackup: string | undefined;
  if (current !== null && current !== saved) {
    const kept = writeBackup(storage, entry.of, "pre-restore", current, now());
    if (!kept.stored) return { ok: false, message: `Could not back up the current "${entry.of}"; nothing restored.` };
    preRestoreBackup = kept.backupKey;
  }
  if (!storage.write(entry.of, saved)) {
    return { ok: false, message: `Could not write "${entry.of}"; nothing restored.`, preRestoreBackup };
  }
  live?.holdUntilReload();
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
