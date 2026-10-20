import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, defineStore } from "pinia";
import { createApp, nextTick } from "vue";
import { createPersistedState } from "pinia-plugin-persistedstate";
import {
  BACKUP_RETENTION,
  codecPersist,
  createPersistedBinding,
  defineCodec,
  installBackupConsole,
  listBackups,
  restoreBackup,
  type PersistenceCodec,
} from "@/services/persistenceCodec";
import { createSafeStorage, hasSaveFailure, resetSaveFailure, saveFailureNotice } from "@/services/safeStorage";

const DAY = Date.UTC(2026, 9, 10, 12);
const KEY = "sketch";

/** A Storage double that can be filled up: writes throw QuotaExceededError while full. */
function memoryStorage() {
  const items = new Map<string, string>();
  const backend = {
    full: false,
    writes: [] as string[],
    get length() {
      return items.size;
    },
    key: (index: number) => Array.from(items.keys())[index] ?? null,
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => {
      if (backend.full) throw new DOMException("The quota has been exceeded.", "QuotaExceededError");
      backend.writes.push(key);
      items.set(key, value);
    },
    removeItem: (key: string) => {
      items.delete(key);
    },
    clear: () => items.clear(),
    items,
  };
  return { backend, storage: createSafeStorage(() => backend as unknown as Storage) };
}

interface Sketch {
  takes: string[];
  tempo: number;
}

/** v0: a bare array of takes. v1: `{ takes }`. v2: `{ takes, tempo }`. */
const sketchCodec: PersistenceCodec<Sketch> = {
  key: KEY,
  version: 2,
  defaults: () => ({ takes: [], tempo: 120 }),
  decode: (data) => {
    const record = data as Partial<Sketch> | null;
    if (!record || !Array.isArray(record.takes)) throw new Error("not a sketch");
    return { takes: record.takes.map(String), tempo: Number(record.tempo) || 120 };
  },
  migrations: {
    0: (data) => ({ takes: data }),
    1: (data) => ({ ...(data as object), tempo: 120 }),
  },
};

function setup(codec: PersistenceCodec<Sketch> = sketchCodec) {
  const { backend, storage } = memoryStorage();
  let now = DAY;
  const binding = createPersistedBinding(codec, { storage, now: () => now });
  return {
    backend,
    storage,
    binding,
    setNow: (time: number) => {
      now = time;
    },
  };
}

const envelope = (version: number, data: unknown) => JSON.stringify({ $version: version, data });

describe("persistence codec", () => {
  beforeEach(() => {
    resetSaveFailure();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("refuses a migration table with a gap", () => {
    expect(() => defineCodec({ ...sketchCodec, migrations: { 0: (data) => data } })).toThrow(
      /no migration from version 1/,
    );
    expect(() => defineCodec({ ...sketchCodec, migrations: { ...sketchCodec.migrations, 2: (d) => d } })).toThrow();
    expect(() => defineCodec({ ...sketchCodec, version: 0 })).toThrow();
  });

  it("round-trips the current version inside the $version envelope", () => {
    const { backend, binding } = setup();
    expect(binding.load()).toEqual({ takes: [], tempo: 120 });
    expect(binding.outcome).toBe("empty");

    expect(binding.save({ takes: ["a", "b"], tempo: 96 })).toBe(true);
    expect(JSON.parse(backend.items.get(KEY)!)).toEqual({ $version: 2, data: { takes: ["a", "b"], tempo: 96 } });

    expect(binding.load()).toEqual({ takes: ["a", "b"], tempo: 96 });
    expect(binding.outcome).toBe("current");
    expect(listBackups(binding.storage)).toEqual([]);
  });

  it("migrates through every step, backing up the prior bytes before rewriting", () => {
    const { backend, binding } = setup();
    const unversioned = JSON.stringify(["first", "second"]);
    backend.items.set(KEY, unversioned);

    expect(binding.load()).toEqual({ takes: ["first", "second"], tempo: 120 });
    expect(binding.outcome).toBe("migrated");

    const backupKey = `${KEY}.backup.v0.2026-10-10`;
    expect(backend.items.get(backupKey)).toBe(unversioned);
    expect(backend.writes).toEqual([backupKey, KEY]);
    expect(backend.items.get(KEY)).toBe(envelope(2, { takes: ["first", "second"], tempo: 120 }));
    expect(binding.hold).toBeNull();
  });

  it("does not migrate when the backup can't be stored, runs on the old payload, and reports it", () => {
    const { backend, binding } = setup();
    const v1 = envelope(1, { takes: ["kept"] });
    backend.items.set(KEY, v1);
    backend.full = true;

    expect(binding.load()).toEqual({ takes: ["kept"], tempo: 120 });
    expect(backend.items.get(KEY)).toBe(v1);
    expect(listBackups(binding.storage)).toEqual([]);
    expect(saveFailureNotice.value?.message).toBe("Can't save — storage full");

    // Later saves still refuse to overwrite while the backup won't fit…
    expect(binding.save({ takes: ["kept", "new"], tempo: 120 })).toBe(false);
    expect(backend.items.get(KEY)).toBe(v1);

    // …and once there is room, the backup goes first and then the write.
    backend.full = false;
    expect(binding.save({ takes: ["kept", "new"], tempo: 120 })).toBe(true);
    expect(backend.writes).toEqual([`${KEY}.backup.v1.2026-10-10`, KEY]);
    expect(backend.items.get(`${KEY}.backup.v1.2026-10-10`)).toBe(v1);
    expect(hasSaveFailure.value).toBe(false);
  });

  it("leaves a payload from a newer app untouched and runs on defaults", () => {
    const { backend, binding } = setup();
    const fromTheFuture = envelope(3, { takes: ["from v3"], tempo: 70, swing: 0.6 });
    backend.items.set(KEY, fromTheFuture);

    expect(binding.load()).toEqual({ takes: [], tempo: 120 });
    expect(binding.outcome).toBe("newer");
    expect(binding.save({ takes: ["typed in the old tab"], tempo: 120 })).toBe(false);

    expect(backend.items.get(KEY)).toBe(fromTheFuture);
    expect(backend.writes).toEqual([]);
    expect(saveFailureNotice.value?.message).toBe("Can't save — reload to update");
  });

  it("keeps the reload instruction when a held newer payload becomes unreadable", () => {
    const { backend, binding } = setup();
    const future = envelope(3, { takes: ["newer app"], tempo: 90 });
    backend.items.set(KEY, future);
    binding.load();
    expect(binding.save(sketchCodec.defaults())).toBe(false);
    vi.spyOn(backend, "getItem").mockImplementation(() => { throw new Error("Read denied"); });
    expect(binding.save(sketchCodec.defaults())).toBe(false);
    expect(binding.hold).toEqual({ reason: "newer", found: 3 });
    expect(saveFailureNotice.value?.message).toBe("Can't save — reload to update");
    expect(backend.items.get(KEY)).toBe(future);
    expect(backend.writes).toEqual([]);
  });

  it("keeps an unreadable payload: backed up before anything overwrites it, defaults in memory", () => {
    const { backend, binding } = setup();
    backend.items.set(KEY, "{not json");

    expect(binding.load()).toEqual({ takes: [], tempo: 120 });
    expect(binding.outcome).toBe("unreadable");
    expect(backend.items.get(KEY)).toBe("{not json");
    expect(backend.items.get(`${KEY}.backup.unreadable.2026-10-10`)).toBe("{not json");

    expect(binding.save({ takes: ["fresh"], tempo: 120 })).toBe(true);
    expect(backend.items.get(`${KEY}.backup.unreadable.2026-10-10`)).toBe("{not json");
  });

  it.each(["", "{not json", envelope(2, { takes: "not a list" })])(
    "retains unreadable bytes after two later routine migrations: %s",
    (raw) => {
      const { backend, binding, setNow } = setup();
      backend.items.set(KEY, raw);
      binding.load();
      const unreadableBackup = listBackups(binding.storage, KEY)[0].backupKey;
      expect(binding.save({ takes: ["fresh"], tempo: 120 })).toBe(true);

      for (const day of [1, 2]) {
        setNow(DAY + day * 24 * 60 * 60 * 1000);
        backend.items.set(KEY, envelope(1, { takes: [`migration ${day}`] }));
        binding.load();
      }

      expect(backend.items.get(unreadableBackup)).toBe(raw);
      expect(listBackups(binding.storage, KEY).filter((entry) => /^v\d+$/.test(entry.label))).toHaveLength(2);
    },
  );

  it.each(["save", "prepare"] as const)("refuses a stale binding's %s after another binding writes v2", (method) => {
    const { backend, storage } = memoryStorage();
    const older = createPersistedBinding({ ...sketchCodec, version: 1, migrations: { 0: sketchCodec.migrations[0] } }, { storage });
    older.load();
    const newer = createPersistedBinding(sketchCodec, { storage });
    newer.load();
    expect(newer.save({ takes: ["new tab"], tempo: 90 })).toBe(true);
    const saved = backend.items.get(KEY);
    backend.writes.length = 0;

    expect(older[method]({ takes: ["old tab"], tempo: 120 })).toBe(method === "save" ? false : null);
    expect(older.hold).toEqual({ reason: "newer", found: 2 });
    expect(backend.items.get(KEY)).toBe(saved);
    expect(backend.writes).toEqual([]);
    expect(saveFailureNotice.value?.message).toBe("Can't save — reload to update");
  });

  it.each([JSON.stringify(["legacy tab"]), "{broken", "", envelope(2, { takes: null })])(
    "backs up bytes written after hydration before saving: %s", (raw) => {
      const { backend, binding } = setup();
      binding.load();
      backend.items.set(KEY, raw);
      backend.full = true;
      expect(binding.save({ takes: ["new"], tempo: 120 })).toBe(false);
      expect(backend.items.get(KEY)).toBe(raw);
      backend.full = false;
      expect(binding.save({ takes: ["new"], tempo: 120 })).toBe(true);
      const backup = listBackups(binding.storage, KEY)[0];
      expect(backend.items.get(backup.backupKey)).toBe(raw);
      expect(backend.writes).toEqual([backup.backupKey, KEY]);
    },
  );

  it("hydrates the codec state without a second fallible plugin read", async () => {
    const { backend, binding, storage } = setup();
    const saved = envelope(2, { takes: ["kept"], tempo: 90 });
    backend.items.set(KEY, saved);
    // The shelf's first read works; any later read of it (a second plugin read) throws.
    let shelfReads = 0;
    const getItem = vi.spyOn(backend, "getItem").mockImplementation((key) => {
      if (key === KEY && ++shelfReads > 1) throw new Error("Transient read failure");
      return backend.items.get(key) ?? null;
    });
    const useStore = defineStore(KEY, { state: sketchCodec.defaults, persist: codecPersist(binding) });
    const pinia = createPinia();
    createApp({}).use(pinia);
    pinia.use(createPersistedState({ storage }));
    const store = useStore(pinia);
    expect(store.takes).toEqual(["kept"]);
    expect(store.tempo).toBe(90);
    getItem.mockRestore();
    store.tempo = 100;
    await nextTick();
    expect(JSON.parse(backend.items.get(KEY)!).data).toEqual({ takes: ["kept"], tempo: 100 });
    backend.items.set(KEY, saved);
    store.$hydrate({ runHooks: false });
    expect(store.tempo).toBe(90);
  });

  it("preserves existing backups when enumeration fails, then retries safely", () => {
    const { backend, binding } = setup();
    const backupKey = `${KEY}.backup.unreadable.2026-10-10`;
    backend.items.set(backupKey, "previous recovery copy");
    backend.items.set(KEY, "{broken now");
    vi.spyOn(backend, "key").mockImplementationOnce(() => { throw new Error("Listing denied"); });
    binding.load();
    expect(backend.writes).toEqual([]);
    expect(backend.items.get(backupKey)).toBe("previous recovery copy");
    expect(backend.items.get(KEY)).toBe("{broken now");
    expect(binding.hold?.reason).toBe("needs-backup");
    expect(binding.save({ takes: ["fresh"], tempo: 120 })).toBe(true);
    expect(backend.items.get(backupKey)).toBe("previous recovery copy");
    expect(backend.items.get(`${backupKey}.2`)).toBe("{broken now");
    expect(hasSaveFailure.value).toBe(false);
  });

  it("protects a newer tab's autosave from a store opened before the update", async () => {
    const { backend, storage } = memoryStorage();
    const tab = (version: number) => {
      const binding = createPersistedBinding({
        ...sketchCodec,
        version,
        migrations: version === 1 ? { 0: sketchCodec.migrations[0] } : sketchCodec.migrations,
      }, { storage });
      const useStore = defineStore(KEY, {
        state: sketchCodec.defaults,
        persist: codecPersist(binding),
      });
      const pinia = createPinia();
      createApp({}).use(pinia);
      pinia.use(createPersistedState());
      return useStore(pinia);
    };
    const older = tab(1);
    older.takes.push("old tab");
    await nextTick();
    const newer = tab(2);
    newer.takes.push("new tab");
    await nextTick();
    const saved = backend.items.get(KEY);
    expect(JSON.parse(saved!).$version).toBe(2);

    older.takes.push("unsaved edit");
    await nextTick();

    expect(older.takes).toEqual(["old tab", "unsaved edit"]);
    expect(backend.items.get(KEY)).toBe(saved);
    expect(saveFailureNotice.value?.message).toBe("Can't save — reload to update");
  });

  it("clears the failure when a retried backup lands after the date has moved on", () => {
    const { backend, binding, setNow } = setup();
    backend.items.set(KEY, JSON.stringify(["late night"]));
    backend.full = true;
    binding.load();
    expect(hasSaveFailure.value).toBe(true);

    setNow(DAY + 24 * 60 * 60 * 1000);
    backend.full = false;
    expect(binding.save({ takes: ["late night"], tempo: 120 })).toBe(true);

    expect(backend.items.get(`${KEY}.backup.v0.2026-10-11`)).toBe(JSON.stringify(["late night"]));
    expect(hasSaveFailure.value).toBe(false);
  });

  it("never overwrites an unreadable payload while its backup can't be stored", () => {
    const { backend, binding } = setup();
    // Parseable and current-version, but decode rejects it.
    const broken = envelope(2, { takes: "not a list" });
    backend.items.set(KEY, broken);
    backend.full = true;

    expect(binding.load()).toEqual({ takes: [], tempo: 120 });
    expect(binding.save({ takes: ["fresh"], tempo: 120 })).toBe(false);
    expect(backend.items.get(KEY)).toBe(broken);
    expect(hasSaveFailure.value).toBe(true);
  });

  it("reports an encode that throws and writes nothing", () => {
    const { backend, binding } = setup({
      ...sketchCodec,
      encode: () => {
        throw new Error("cannot encode");
      },
    });
    binding.load();

    expect(binding.save({ takes: ["a"], tempo: 120 })).toBe(false);
    expect(backend.writes).toEqual([]);
    expect(saveFailureNotice.value?.message).toBe("Can't save");
  });

  it("refuses all writes when storage can't even be read", () => {
    const { backend, binding } = setup();
    backend.items.set(KEY, envelope(2, { takes: ["safe"], tempo: 120 }));
    const getItem = vi.spyOn(backend, "getItem").mockImplementation((key) => {
      if (key === KEY) throw new Error("SecurityError");
      return backend.items.get(key) ?? null;
    });

    expect(binding.load()).toEqual({ takes: [], tempo: 120 });
    getItem.mockRestore();
    expect(binding.save({ takes: [], tempo: 120 })).toBe(false);
    expect(backend.items.get(KEY)).toBe(envelope(2, { takes: ["safe"], tempo: 120 }));
  });

  it("holds writes after an unavailable backend becomes readable again", () => {
    const { backend } = memoryStorage();
    const saved = envelope(2, { takes: ["safe"], tempo: 120 });
    backend.items.set(KEY, saved);
    let available = false;
    const storage = createSafeStorage(() => available ? backend as unknown as Storage : undefined);
    const binding = createPersistedBinding(sketchCodec, { storage });

    expect(binding.load()).toEqual(sketchCodec.defaults());
    available = true;
    expect(binding.save(sketchCodec.defaults())).toBe(false);
    expect(binding.hold).toEqual({ reason: "unread" });
    expect(backend.items.get(KEY)).toBe(saved);
  });

  it("refuses only the save whose read failed after hydration; the next save tries again", () => {
    const { backend, binding } = setup();
    const saved = envelope(2, { takes: ["safe"], tempo: 120 });
    backend.items.set(KEY, saved);
    binding.load();
    vi.spyOn(backend, "getItem").mockImplementationOnce(() => { throw new Error("Read denied"); });

    expect(binding.save({ takes: ["unsaved"], tempo: 120 })).toBe(false);
    expect(backend.items.get(KEY)).toBe(saved);
    expect(binding.hold).toBeNull();
    expect(saveFailureNotice.value?.message).toBe("Can't save");

    expect(binding.save({ takes: ["unsaved", "later"], tempo: 120 })).toBe(true);
    expect(JSON.parse(backend.items.get(KEY)!).data).toEqual({ takes: ["unsaved", "later"], tempo: 120 });
    expect(saveFailureNotice.value).toBeNull();
  });


  it(`keeps the newest ${BACKUP_RETENTION} backups per key and never prunes the one just written`, () => {
    const { backend, binding, setNow } = setup();
    const days = [Date.UTC(2026, 0, 1), Date.UTC(2026, 3, 1), Date.UTC(2026, 6, 1)];
    for (const [index, day] of days.entries()) {
      setNow(day);
      backend.items.set(KEY, JSON.stringify([`take ${index}`]));
      binding.load();
    }
    backend.items.set("other.backup.v0.2025-01-01", "another store's backup");

    expect(listBackups(binding.storage, KEY).map((entry) => entry.backupKey)).toEqual([
      `${KEY}.backup.v0.2026-07-01`,
      `${KEY}.backup.v0.2026-04-01`,
    ]);
    expect(backend.items.get(`${KEY}.backup.v0.2026-07-01`)).toBe(JSON.stringify(["take 2"]));
    expect(backend.items.has("other.backup.v0.2025-01-01")).toBe(true);
  });

  it("adds a sequence number instead of overwriting a same-day backup with different bytes", () => {
    const { backend, binding } = setup();
    backend.items.set(KEY, "{broken one");
    binding.load();
    backend.items.set(KEY, "{broken two");
    binding.load();

    expect(backend.items.get(`${KEY}.backup.unreadable.2026-10-10`)).toBe("{broken one");
    expect(backend.items.get(`${KEY}.backup.unreadable.2026-10-10.2`)).toBe("{broken two");
  });

  it("retains pre-restore bytes through later migrations without consuming their retention", () => {
    const { backend, binding, storage, setNow } = setup();
    backend.items.set(KEY, JSON.stringify(["original"]));
    binding.load();
    binding.save({ takes: ["before restore"], tempo: 100 });
    const beforeRestore = backend.items.get(KEY);
    const restored = restoreBackup(`${KEY}.backup.v0.2026-10-10`, { storage, now: () => DAY });
    expect(restored.ok).toBe(true);
    binding.load();
    for (const day of [1, 2]) {
      setNow(DAY + day * 24 * 60 * 60 * 1000);
      backend.items.set(KEY, envelope(1, { takes: [`migration ${day}`] }));
      binding.load();
    }
    expect(backend.items.get(restored.preRestoreBackup!)).toBe(beforeRestore);
    expect(listBackups(storage, KEY).filter((entry) => /^v\d+$/.test(entry.label))).toHaveLength(2);
  });
});

describe("restoring a backup", () => {
  beforeEach(() => {
    resetSaveFailure();
    vi.spyOn(console, "error").mockImplementation(() => {});
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("puts the backup back, backs up what it replaces, and stops the running store overwriting it", () => {
    const { backend, storage, binding } = setup();
    const original = JSON.stringify(["the good take"]);
    backend.items.set(KEY, original);
    binding.load();
    binding.save({ takes: ["after a bad migration"], tempo: 120 });
    const beforeRestore = backend.items.get(KEY)!;

    const result = restoreBackup(`${KEY}.backup.v0.2026-10-10`, { storage, now: () => DAY });

    expect(result.ok).toBe(true);
    expect(backend.items.get(KEY)).toBe(original);
    expect(backend.items.get(result.preRestoreBackup!)).toBe(beforeRestore);
    expect(result.preRestoreBackup).toBe(`${KEY}.backup.pre-restore.2026-10-10.2`);

    // The running page must not write over the restored bytes before a reload.
    expect(binding.save({ takes: ["still in memory"], tempo: 120 })).toBe(false);
    expect(backend.items.get(KEY)).toBe(original);

    // After the reload the restored payload is read (and migrated) as usual.
    expect(binding.load()).toEqual({ takes: ["the good take"], tempo: 120 });
  });

  it("stops every open tab of a last-write-wins store from writing over a restore", () => {
    const { backend, storage, binding: otherTab } = setup();
    const original = JSON.stringify(["the good take"]);
    backend.items.set(KEY, original);
    otherTab.load();
    // The tab whose console runs the restore.
    const restoringTab = createPersistedBinding(sketchCodec, { storage, now: () => DAY });
    restoringTab.load();
    restoringTab.save({ takes: ["after a bad migration"], tempo: 120 });

    expect(restoreBackup(`${KEY}.backup.v0.2026-10-10`, { storage, now: () => DAY }).ok).toBe(true);
    expect(backend.items.get(KEY)).toBe(original);

    // The other tab never called restore, yet it holds and says to reload.
    expect(otherTab.save({ takes: ["stale, from the other tab"], tempo: 120 })).toBe(false);
    expect(restoringTab.save({ takes: ["still in memory"], tempo: 120 })).toBe(false);
    expect(backend.items.get(KEY)).toBe(original);
    expect(saveFailureNotice.value?.message).toBe("Can't save — reload to update");
    restoringTab.unregister();
  });

  it("restores nothing when the current payload can't be backed up first", () => {
    const { backend, storage, binding } = setup();
    backend.items.set(KEY, JSON.stringify(["old"]));
    binding.load();
    const current = backend.items.get(KEY);
    backend.full = true;

    const result = restoreBackup(`${KEY}.backup.v0.2026-10-10`, { storage, now: () => DAY });

    expect(result.ok).toBe(false);
    expect(backend.items.get(KEY)).toBe(current);
  });

  it("aborts restore when reading the live payload fails", () => {
    const { backend, storage, binding } = setup();
    backend.items.set(KEY, JSON.stringify(["original"]));
    binding.load();
    const current = backend.items.get(KEY);
    backend.writes.length = 0;
    const getItem = backend.getItem;
    vi.spyOn(backend, "getItem").mockImplementation((key) => {
      if (key === KEY) throw new Error("Read denied");
      return getItem(key);
    });
    expect(restoreBackup(`${KEY}.backup.v0.2026-10-10`, { storage }).ok).toBe(false);
    expect(backend.items.get(KEY)).toBe(current);
    expect(backend.writes).toEqual([]);
  });

  it("is reachable from the console for a support step", () => {
    const { backend, storage, binding } = setup();
    backend.items.set(KEY, JSON.stringify(["console take"]));
    binding.load();
    const target: Record<string, unknown> = {};
    installBackupConsole(target, storage);
    const console = target.emotitoneBackups as {
      list: () => Array<{ backupKey: string; bytes: number }>;
      read: (key: string) => string | null;
      restore: (key: string) => { ok: boolean; message: string };
    };

    const [entry] = console.list();
    expect(entry.backupKey).toBe(`${KEY}.backup.v0.2026-10-10`);
    expect(entry.bytes).toBe(JSON.stringify(["console take"]).length);
    expect(console.read(entry.backupKey)).toBe(JSON.stringify(["console take"]));
    expect(console.restore(entry.backupKey).ok).toBe(true);
    expect(backend.items.get(KEY)).toBe(JSON.stringify(["console take"]));
  });
});
