import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import capturedConfigs from "../fixtures/persistence/saved-configs.v0.store-capture.json?raw";
import capturedLooks from "../fixtures/persistence/saved-stage-looks.v0.store-capture.json?raw";
import { createPresetPersistence, savedStageLooksCodec } from "@/services/appearancePresetPersistence";
import { createPersistedBinding, listBackups } from "@/services/persistenceCodec";
import {
  dismissSaveFailure,
  persistentStorage,
  resetSaveFailure,
  saveFailureNotice,
  type SaveFailureKind,
} from "@/services/safeStorage";
import { useVisualConfigStore } from "@/stores/visualConfig";

/**
 * BJS-579: two tabs, one list of named appearance presets. Each "tab" is a
 * real visual config store on its own Pinia (its own memory) over the one
 * shared localStorage. A browser delivers a `storage` event to the tabs that
 * did not write; here both stores share one window, so the writer hears its
 * own event too, which must change nothing (it is not another tab's bytes).
 *
 * There is no rename control yet. A rename is an edit to the entry in memory,
 * which the tab's next save carries to storage like any other change.
 */

interface Tab { pinia: Pinia; store: ReturnType<typeof useVisualConfigStore> }
const tabs: Tab[] = [];

function openTab(): Tab {
  const pinia = createPinia();
  setActivePinia(pinia);
  const tab = { pinia, store: useVisualConfigStore(pinia) };
  tabs.push(tab);
  return tab;
}

const hear = (key: string) => window.dispatchEvent(new StorageEvent("storage", { key }));

interface Preset { id: string; name: string; updatedAt?: string }
interface Kind {
  label: string;
  key: string;
  /** The exact bytes the build before this one wrote for two presets. */
  captured: string;
  list: (tab: Tab) => Preset[];
  save: (tab: Tab, name: string) => { id: string; failure: SaveFailureKind | null };
  remove: (tab: Tab, id: string) => void;
}

const kinds: Kind[] = [
  {
    label: "Stage Looks",
    key: "emotitone-saved-stage-looks",
    captured: capturedLooks,
    list: (tab) => tab.store.savedStageLooks,
    save: (tab, name) => {
      const { look, failure } = tab.store.saveStageLookAs(name);
      return { id: look.id, failure };
    },
    remove: (tab, id) => { tab.store.deleteSavedStageLook(id); },
  },
  {
    label: "full configurations",
    key: "emotitone-saved-configs",
    captured: capturedConfigs,
    list: (tab) => tab.store.savedConfigs,
    save: (tab, name) => {
      const { savedConfig, failure } = tab.store.saveConfigAs(name);
      return { id: savedConfig.id, failure };
    },
    remove: (tab, id) => { tab.store.deleteSavedConfig(id); },
  },
];

/** What a fresh page would read: the saved list inside its envelope. */
function storedList(key: string): Preset[] {
  const parsed = JSON.parse(localStorage.getItem(key)!);
  expect(parsed.$version).toBe(1);
  return parsed.data;
}
const names = (list: Array<{ name: string }>) => list.map((preset) => preset.name).sort();
const nameOf = (list: Preset[], id: string) => list.find((preset) => preset.id === id)?.name;
const rename = (kind: Kind, tab: Tab, id: string, name: string) => {
  kind.list(tab).find((preset) => preset.id === id)!.name = name;
};
const writes = (key: string) =>
  vi.mocked(localStorage.setItem).mock.calls.filter(([written]) => written === key).length;

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  localStorage.clear();
  vi.mocked(localStorage.setItem).mockClear();
  resetSaveFailure();
});

afterEach(() => {
  tabs.splice(0).forEach((tab) => disposePinia(tab.pinia));
  vi.restoreAllMocks();
});

describe.each(kinds)("two tabs, one list of $label", (kind) => {
  it("keeps a preset named in one tab when the other tab saves its own, with no storage event", () => {
    const a = openTab();
    const b = openTab();
    kind.save(a, "Night");
    // B never heard about it and saves a preset of its own.
    kind.save(b, "Dawn");

    expect(names(storedList(kind.key))).toEqual(["Dawn", "Night"]);
    // B took A's preset in too, so its own list is whole.
    expect(names(kind.list(b))).toEqual(["Dawn", "Night"]);

    // And the other way round.
    kind.save(a, "Dusk");
    expect(names(storedList(kind.key))).toEqual(["Dawn", "Dusk", "Night"]);
  });

  it("shows the other tab's preset on the storage event, whole, and writes nothing back", () => {
    const a = openTab();
    const b = openTab();
    const { id } = kind.save(a, "Night");
    const written = writes(kind.key);

    hear(kind.key);
    expect(kind.list(b).map((preset) => preset.id)).toEqual([id]);
    // The same preset, not a lookalike: nothing was lost or normalised on the way.
    expect(kind.list(b)).toEqual(kind.list(a));
    expect(writes(kind.key)).toBe(written);

    kind.save(b, "Dawn");
    hear(kind.key);
    expect(names(kind.list(a))).toEqual(["Dawn", "Night"]);
    expect(kind.list(a)).toEqual(kind.list(b));
  });

  it("keeps a preset deleted in one tab deleted when the other tab's stale list saves", () => {
    const a = openTab();
    const { id } = kind.save(a, "Shared");
    // B opens on a list that holds it, then A deletes it.
    const b = openTab();
    expect(names(kind.list(b))).toEqual(["Shared"]);
    kind.remove(a, id);
    expect(storedList(kind.key)).toEqual([]);
    // B still lists it, and saves something else.
    kind.save(b, "Fresh");

    expect(names(storedList(kind.key))).toEqual(["Fresh"]);
    expect(names(kind.list(b))).toEqual(["Fresh"]);
  });

  it("takes a delete in on the storage event", () => {
    const a = openTab();
    const { id } = kind.save(a, "Shared");
    const b = openTab();
    kind.remove(a, id);
    const written = writes(kind.key);

    hear(kind.key);
    expect(kind.list(b)).toEqual([]);
    expect(writes(kind.key)).toBe(written);
  });

  it("brings back a preset edited in one tab over a delete in the other", () => {
    const a = openTab();
    const { id } = kind.save(a, "Shared");
    const b = openTab();
    kind.remove(a, id);
    // B touched it after they last agreed: an edit beats a concurrent delete.
    rename(kind, b, id, "Kept after all");
    kind.save(b, "Fresh");

    expect(names(storedList(kind.key))).toEqual(["Fresh", "Kept after all"]);
  });

  it("keeps a preset renamed in one tab when the other tab's stale list saves", () => {
    const a = openTab();
    const { id } = kind.save(a, "Draft");
    const b = openTab();
    rename(kind, a, id, "Final");
    kind.save(a, "Other");
    // B still lists "Draft", and saves something else.
    expect(nameOf(kind.list(b), id)).toBe("Draft");
    kind.save(b, "Fresh");

    expect(nameOf(storedList(kind.key), id)).toBe("Final");
    expect(nameOf(kind.list(b), id)).toBe("Final");
    expect(names(storedList(kind.key))).toEqual(["Final", "Fresh", "Other"]);
  });

  it("takes a rename in on the storage event", () => {
    const a = openTab();
    const { id } = kind.save(a, "Draft");
    const b = openTab();
    rename(kind, a, id, "Final");
    kind.save(a, "Other");

    hear(kind.key);
    expect(nameOf(kind.list(b), id)).toBe("Final");
    expect(names(kind.list(b))).toEqual(["Final", "Other"]);
  });

  it("keeps a preset deleted here deleted when the other tab saved something since", () => {
    const a = openTab();
    const { id } = kind.save(a, "Shared");
    const b = openTab();
    // Storage moves on while A, which has not heard, deletes the preset.
    kind.save(b, "Added by B");
    kind.remove(a, id);

    expect(names(storedList(kind.key))).toEqual(["Added by B"]);
    expect(names(kind.list(a))).toEqual(["Added by B"]);
  });

  it("keeps a preset edited here when the other tab saves its unchanged copy", () => {
    const a = openTab();
    const { id } = kind.save(a, "Draft");
    const b = openTab();
    kind.save(b, "Added by B");
    rename(kind, a, id, "Final");
    kind.save(a, "Added by A");

    expect(nameOf(storedList(kind.key), id)).toBe("Final");
    expect(names(storedList(kind.key))).toEqual(["Added by A", "Added by B", "Final"]);
  });

  it("keeps a change to one field here and a change to another field in the other tab", () => {
    const a = openTab();
    const { id } = kind.save(a, "Draft");
    const b = openTab();
    rename(kind, a, id, "Final");
    kind.save(a, "From A");
    const stamp = "2026-11-02T12:00:00.000Z";
    kind.list(b).find((preset) => preset.id === id)!.updatedAt = stamp;
    kind.save(b, "From B");

    const merged = storedList(kind.key).find((preset) => preset.id === id)!;
    expect(merged.name).toBe("Final");
    expect(merged.updatedAt).toBe(stamp);
  });

  it("lets the tab that saves last win when both rename one preset, and both tabs agree", () => {
    const a = openTab();
    const { id } = kind.save(a, "Draft");
    const b = openTab();
    rename(kind, a, id, "A's name");
    kind.save(a, "From A");
    rename(kind, b, id, "B's name");
    kind.save(b, "From B");

    expect(nameOf(storedList(kind.key), id)).toBe("B's name");
    hear(kind.key);
    expect(nameOf(kind.list(a), id)).toBe("B's name");
    expect(names(kind.list(a))).toEqual(["B's name", "From A", "From B"]);
    expect(names(kind.list(b))).toEqual(["B's name", "From A", "From B"]);
  });

  it("settles without a write loop when the tabs hold the same presets in a different order", () => {
    const a = openTab();
    const b = openTab();
    kind.save(a, "a1");
    kind.save(b, "b1");
    hear(kind.key);
    // A has [a1, b1] and B has [b1, a1]: the same presets, in each tab's order.
    expect(kind.list(a).map((preset) => preset.name)).toEqual(["a1", "b1"]);
    expect(kind.list(b).map((preset) => preset.name)).toEqual(["b1", "a1"]);

    const written = writes(kind.key);
    for (let round = 0; round < 6; round += 1) hear(kind.key);
    expect(writes(kind.key)).toBe(written);

    // A save after that is one write, heard once, and the tabs still agree.
    kind.save(a, "a2");
    hear(kind.key);
    hear(kind.key);
    expect(writes(kind.key)).toBe(written + 1);
    expect(names(kind.list(a))).toEqual(["a1", "a2", "b1"]);
    expect(names(kind.list(b))).toEqual(["a1", "a2", "b1"]);
  });

  it("keeps both presets when two tabs name one in the same millisecond", () => {
    vi.spyOn(Date, "now").mockReturnValue(Date.UTC(2026, 10, 2));
    const a = openTab();
    const b = openTab();
    kind.save(a, "From A");
    kind.save(b, "From B");

    expect(names(storedList(kind.key))).toEqual(["From A", "From B"]);
  });

  it("tells the tap why a save failed, keeps the preset in memory, and stores it with the next save", () => {
    const a = openTab();
    vi.mocked(localStorage.setItem).mockImplementationOnce(() => {
      throw new DOMException("full", "QuotaExceededError");
    });
    expect(kind.save(a, "Too big").failure).toBe("quota");
    expect(saveFailureNotice.value?.message).toBe("Can't save — storage full");
    expect(names(kind.list(a))).toEqual(["Too big"]);

    expect(kind.save(a, "Fits").failure).toBeNull();
    expect(saveFailureNotice.value).toBeNull();
    expect(names(storedList(kind.key))).toEqual(["Fits", "Too big"]);
  });

  it("announces a repeat failure again after the player put the first away", () => {
    const a = openTab();
    const full = () => { throw new DOMException("full", "QuotaExceededError"); };
    vi.mocked(localStorage.setItem).mockImplementationOnce(full);
    expect(kind.save(a, "First").failure).toBe("quota");
    expect(saveFailureNotice.value).not.toBeNull();
    dismissSaveFailure();
    expect(saveFailureNotice.value).toBeNull();

    // An explicit save fails once, in answer to a tap: a second tap that fails is news.
    vi.mocked(localStorage.setItem).mockImplementationOnce(full);
    expect(kind.save(a, "Second").failure).toBe("quota");
    expect(saveFailureNotice.value?.message).toBe("Can't save — storage full");
  });

  describe("saved by the build before this one", () => {
    /** A tab still running that build: it saves its own list, bare, over whatever is stored. */
    const oldBuildTab = () => {
      const known = JSON.parse(kind.captured) as Array<Preset & Record<string, unknown>>;
      return {
        save(name: string): string {
          known.push({ ...known[0], id: `old-build-${name}`, name });
          const bytes = JSON.stringify(known);
          localStorage.setItem(kind.key, bytes);
          return bytes;
        },
      };
    };
    const everyone = (...added: string[]) => [...names(JSON.parse(kind.captured)), ...added].sort();

    it("lifts the bare list into the envelope after backing up its exact bytes", () => {
      localStorage.setItem(kind.key, kind.captured);
      const tab = openTab();

      expect(kind.list(tab)).toEqual(JSON.parse(kind.captured));
      expect(JSON.parse(localStorage.getItem(kind.key)!)).toEqual({ $version: 1, data: JSON.parse(kind.captured) });
      const backups = listBackups(persistentStorage, kind.key);
      expect(backups).toHaveLength(1);
      expect(backups[0].label).toBe("v0");
      expect(localStorage.getItem(backups[0].backupKey)).toBe(kind.captured);

      // Another tab reads it as it is: no second backup, no rewrite.
      const written = writes(kind.key);
      const second = openTab();
      expect(kind.list(second)).toEqual(kind.list(tab));
      expect(listBackups(persistentStorage, kind.key)).toHaveLength(1);
      expect(writes(kind.key)).toBe(written);
    });

    it("keeps the presets from a tab still running that build, which writes the bare list over everything", () => {
      const a = openTab();
      kind.save(a, "Kept");
      // A tab open across the update knew only "Kept"; it adds a preset of its
      // own and writes the whole list, bare. That drops "Added by A".
      kind.save(a, "Added by A");
      const [kept] = storedList(kind.key);
      const oldBuildBytes = JSON.stringify([kept, { ...kept, id: "from-the-old-build", name: "From the old build" }]);
      localStorage.setItem(kind.key, oldBuildBytes);

      hear(kind.key);
      kind.save(a, "Next");

      // Nothing is read as deleted from bytes that do not follow the protocol.
      expect(names(storedList(kind.key))).toEqual(["Added by A", "From the old build", "Kept", "Next"]);
      const backups = listBackups(persistentStorage, kind.key);
      expect(backups.map((backup) => backup.label)).toEqual(["v0"]);
      expect(localStorage.getItem(backups[0].backupKey)).toBe(oldBuildBytes);
    });

    it("keeps a preset saved here when a tab on that build writes over it and a new tab then loads", () => {
      // The build before this one saved the list, and one tab still runs it.
      localStorage.setItem(kind.key, kind.captured);
      const old = oldBuildTab();
      // A tab on this build opens (backing the list up and writing it as v1) and saves a preset.
      const b = openTab();
      kind.save(b, "Night");
      // The old build's tab saves its own preset, bare. It never knew "Night".
      const oldBytes = old.save("Dawn");
      hear(kind.key);
      // That tab reloads onto this build, or any new tab opens, and the first tab hears.
      const c = openTab();
      hear(kind.key);

      expect(names(storedList(kind.key))).toEqual(everyone("Dawn", "Night"));
      expect(names(kind.list(b))).toEqual(everyone("Dawn", "Night"));
      expect(names(kind.list(c))).toEqual(everyone("Dawn", "Night"));
      // The old build's exact bytes were backed up before they were replaced.
      const backedUp = listBackups(persistentStorage, kind.key).map((backup) => localStorage.getItem(backup.backupKey));
      expect(backedUp).toContain(oldBytes);
      // And it stays: the next save here does not drop it.
      kind.save(b, "After");
      expect(names(storedList(kind.key))).toEqual(everyone("After", "Dawn", "Night"));
    });

    it("keeps a preset saved here when the tab that heard that build's write closes straight away", () => {
      localStorage.setItem(kind.key, kind.captured);
      const old = oldBuildTab();
      const b = openTab();
      kind.save(b, "Night");
      old.save("Dawn");
      hear(kind.key);
      disposePinia(b.pinia);

      expect(names(storedList(kind.key))).toEqual(everyone("Dawn", "Night"));
    });
  });

  it("never writes over a list a newer app saved, and says so", () => {
    const newer = JSON.stringify({ $version: 2, data: [] });
    localStorage.setItem(kind.key, newer);
    const tab = openTab();
    expect(kind.list(tab)).toEqual([]);

    expect(kind.save(tab, "Too early").failure).toBe("newer");
    expect(saveFailureNotice.value?.message).toBe("Can't save — reload to update");
    expect(localStorage.getItem(kind.key)).toBe(newer);
    expect(names(kind.list(tab))).toEqual(["Too early"]);
  });

  it("backs up a list it cannot read before replacing it", () => {
    localStorage.setItem(kind.key, "{not json");
    const tab = openTab();
    expect(kind.list(tab)).toEqual([]);

    const backups = listBackups(persistentStorage, kind.key);
    expect(backups.map((backup) => backup.label)).toEqual(["unreadable"]);
    expect(localStorage.getItem(backups[0].backupKey)).toBe("{not json");

    expect(kind.save(tab, "Fresh start").failure).toBeNull();
    expect(names(storedList(kind.key))).toEqual(["Fresh start"]);
  });
});

describe("a base that bytes from the build before this one have outlived", () => {
  const stamp = "2026-11-02T09:00:00.000Z";
  const look = (id: string) => ({ id, name: id, patch: {}, createdAt: stamp, updatedAt: stamp });
  const key = "emotitone-saved-stage-looks";

  it("merges the bytes that follow them with no base, so nothing saved here reads as deleted", () => {
    let held: ReturnType<typeof look>[] = [];
    const binding = createPersistedBinding(savedStageLooksCodec, { adopt: (list) => { held = list; } });
    held = binding.load();
    held.push(look("known"), look("mine"));
    expect(binding.save(held)).toBe(true);

    // A tab on the build before this one saves its own list, bare. It never knew "mine".
    localStorage.setItem(key, JSON.stringify([look("known"), look("old")]));
    expect(binding.sync(held)).toBeNull();
    // A current tab loads those bytes and stores them as v1, without "mine".
    localStorage.setItem(key, JSON.stringify({ $version: 1, data: [look("known"), look("old")] }));
    const merged = binding.sync(held);

    expect(merged?.map((preset) => preset.id)).toEqual(["known", "mine", "old"]);
    binding.unregister();
  });
});

describe("a save that changes nothing the tabs share", () => {
  it("writes nothing when the presets differ only in order", () => {
    const look = (id: string) => ({
      id, name: id, patch: {}, createdAt: "2026-11-02T09:00:00.000Z", updatedAt: "2026-11-02T09:00:00.000Z",
    });
    let held: ReturnType<typeof look>[] = [];
    const first = createPresetPersistence(savedStageLooksCodec, () => {});
    expect(first.save([look("one"), look("two")])).toBeNull();

    const second = createPresetPersistence(savedStageLooksCodec, (list) => { held = list; });
    held = second.binding.load();
    expect(held.map((preset) => preset.id)).toEqual(["one", "two"]);
    const written = writes("emotitone-saved-stage-looks");

    // This tab merged the same presets in another order. Order is not news.
    expect(second.save([held[1], held[0]])).toBeNull();
    expect(writes("emotitone-saved-stage-looks")).toBe(written);
    first.binding.unregister();
    second.binding.unregister();
  });
});

describe("tabs that must not take part", () => {
  it("leaves an isolated specimen alone, and a tab that is gone", () => {
    const specimen = openTab();
    specimen.store.useEphemeralDefaults();
    const gone = openTab();
    const a = openTab();
    disposePinia(gone.pinia);

    kinds.forEach((kind) => {
      kind.save(a, "Night");
      hear(kind.key);
      expect(kind.list(specimen)).toEqual([]);
      expect(kind.list(gone)).toEqual([]);
    });
  });
});
