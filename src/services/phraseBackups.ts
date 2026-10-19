import {
  abandonRestore, asCurrentPayload, BACKUP_RETENTION, backupKeyFor, bindingFor, markRestored, parseBackupKey,
  type BackupEntry, type RestoreResult,
} from "@/services/persistenceCodec";
import { persistentStorage, reportSaveFailure, reportSaveSuccess } from "@/services/safeStorage";

const DATABASE = "emotitone-phrase-backups";
const STORE = "backups";
/** An open that never settles (a stuck upgrade, a wedged browser) must not stall saves silently. */
export const IDB_OPEN_DEADLINE_MS = 10_000;
export interface PhraseBackup extends BackupEntry { raw: string }

/** Close each connection, including on failure; never block a future DB upgrade. */
async function transaction<T>(
  mode: IDBTransactionMode,
  run: (store: IDBObjectStore, result: (value: T) => void) => void,
): Promise<T> {
  const db = await new Promise<IDBDatabase>((resolve, reject) => {
    const request = indexedDB.open(DATABASE, 1);
    let late = false;
    const deadline = setTimeout(() => {
      late = true;
      reject(new Error("Phrase backup database did not open in time"));
    }, IDB_OPEN_DEADLINE_MS);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE, { keyPath: "backupKey" });
    request.onsuccess = () => {
      clearTimeout(deadline);
      if (late) request.result.close();
      else resolve(request.result);
    };
    request.onerror = () => { clearTimeout(deadline); reject(request.error); };
    request.onblocked = () => {
      clearTimeout(deadline);
      request.onsuccess = () => request.result.close();
      reject(new Error("Phrase backup database is blocked"));
    };
  });
  try {
    return await new Promise<T>((resolve, reject) => {
      const tx = db.transaction(STORE, mode);
      let value: T;
      tx.oncomplete = () => resolve(value);
      tx.onabort = () => reject(tx.error ?? new Error("Phrase backup transaction aborted"));
      tx.onerror = () => reject(tx.error);
      try { run(tx.objectStore(STORE), (next) => { value = next; }); }
      catch (error) { tx.abort(); reject(error); }
    });
  } finally { db.close(); }
}

export async function listPhraseBackups(): Promise<PhraseBackup[]> {
  return transaction("readonly", (store, result) => {
    const request = store.getAll();
    request.onsuccess = () => result((request.result as PhraseBackup[]).sort(
      (a, b) => b.date.localeCompare(a.date) || b.sequence - a.sequence,
    ));
  });
}

/** One atomic transaction: copy first, then prune routine migration copies. */
export async function writePhraseBackup(
  key: string, label: string, raw: string, time = Date.now(), retention = BACKUP_RETENTION,
): Promise<void> {
  await transaction<void>("readwrite", (store, result) => {
    const request = store.getAll();
    request.onsuccess = () => {
      const date = new Date(time).toISOString().slice(0, 10);
      const existing = (request.result as PhraseBackup[]).filter((entry) => entry.of === key);
      const same = existing.find((entry) => entry.label === label && entry.date === date && entry.raw === raw);
      const sequence = 1 + Math.max(0, ...existing.filter((entry) => entry.date === date).map((entry) => entry.sequence));
      const backupKey = same?.backupKey ?? backupKeyFor(key, label, date, sequence);
      const entry: PhraseBackup = { backupKey, of: key, label, date, sequence, raw };
      if (!same) store.add(entry);
      const migrations = existing.filter((entry) => /^v\d+$/.test(entry.label) && entry.backupKey !== backupKey)
        .sort((a, b) => b.date.localeCompare(a.date) || b.sequence - a.sequence);
      for (const stale of migrations.slice(retention - (/^v\d+$/.test(label) ? 1 : 0))) {
        store.delete(stale.backupKey);
      }
      result();
    };
  });
}

export async function restorePhraseBackup(backupKey: string): Promise<RestoreResult> {
  try {
    const entry = parseBackupKey(backupKey);
    const saved = (await listPhraseBackups()).find((entry) => entry.backupKey === backupKey);
    if (!entry || entry.of !== "phrases" || !saved) return { ok: false, message: "Phrase backup not found." };
    const current = persistentStorage.read(entry.of);
    if (!current.ok) return { ok: false, message: "Could not read the current shelf." };
    if (current.value !== null && current.value !== saved.raw) {
      await writePhraseBackup(entry.of, "pre-restore", current.value);
    }
    // An autosave or another tab may have written while IndexedDB was committing.
    const latest = persistentStorage.read(entry.of);
    if (!latest.ok || latest.value !== current.value) {
      return { ok: false, message: "Shelf changed during backup; retry restore." };
    }
    // This tab stops first, then every other open tab (the stamp), then the
    // shelf goes back: no tab can merge its own shelf back over the restore.
    const live = bindingFor(entry.of);
    live?.holdUntilReload();
    const unmark = markRestored(persistentStorage, entry.of, Date.now());
    if (!unmark) {
      abandonRestore(entry.of, null, live);
      return { ok: false, message: "Could not tell other tabs about the restore; nothing restored." };
    }
    // The live key never goes back below the current version: an older backup
    // goes back lifted into a current envelope (its original bytes stay in
    // IndexedDB), so a tab still running an older build keeps meeting the
    // "newer" hold instead of saving its stale shelf over the restore.
    const restored = live ? asCurrentPayload(live.codec, saved.raw) : saved.raw;
    if (!persistentStorage.write(entry.of, restored)) {
      // The shelf is unchanged: take the stamp back so no tab is left not saving.
      const undone = abandonRestore(entry.of, unmark, live);
      return {
        ok: false,
        message: `Could not restore shelf; nothing changed.${undone ? "" : " Reload every open tab to save again."}`,
      };
    }
    return { ok: true, message: "Shelf restored. Reload now; saving is held until reload." };
  } catch {
    reportSaveFailure("unknown", "phrases.backup");
    return { ok: false, message: "Could not back up the current shelf; nothing restored." };
  }
}

export function installPhraseBackupConsole(target: object): void {
  Object.assign(target, {
    emotitonePhraseBackups: {
      list: async () => (await listPhraseBackups()).map(({ raw, ...entry }) => ({ ...entry, bytes: new TextEncoder().encode(raw).byteLength })),
      read: async (key: string) => (await listPhraseBackups()).find((entry) => entry.backupKey === key)?.raw ?? null,
      restore: async (key: string) => {
        const result = await restorePhraseBackup(key);
        if (result.ok) reportSaveSuccess("phrases.backup");
        return result;
      },
    },
  });
}
