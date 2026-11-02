import { createPinia, disposePinia, setActivePinia, type Pinia } from "pinia";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { resetSaveFailure } from "@/services/safeStorage";

/**
 * BJS-579: two tabs, one list of named appearance presets. Each "tab" is a
 * real visual config store on its own Pinia (its own memory) over the one
 * shared localStorage. A browser delivers a `storage` event to the tabs that
 * did not write; here both stores share one window, so the writer hears its
 * own event too, which must change nothing (it is not another tab's bytes).
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

interface Kind {
  label: string;
  key: string;
  list: (tab: Tab) => Array<{ id: string; name: string }>;
  save: (tab: Tab, name: string) => string;
  remove: (tab: Tab, id: string) => void;
}

const kinds: Kind[] = [
  {
    label: "Stage Looks",
    key: "emotitone-saved-stage-looks",
    list: (tab) => tab.store.savedStageLooks,
    save: (tab, name) => tab.store.saveStageLookAs(name).look.id,
    remove: (tab, id) => { tab.store.deleteSavedStageLook(id); },
  },
  {
    label: "full configurations",
    key: "emotitone-saved-configs",
    list: (tab) => tab.store.savedConfigs,
    save: (tab, name) => tab.store.saveConfigAs(name).savedConfig.id,
    remove: (tab, id) => { tab.store.deleteSavedConfig(id); },
  },
];

/** What a fresh page would read: the saved list, whatever shape holds it. */
function storedList(key: string): Array<{ id: string; name: string }> {
  const parsed = JSON.parse(localStorage.getItem(key)!);
  return Array.isArray(parsed) ? parsed : parsed.data;
}
const names = (list: Array<{ name: string }>) => list.map((preset) => preset.name).sort();

beforeEach(() => {
  vi.spyOn(console, "error").mockImplementation(() => {});
  localStorage.clear();
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
  it("keeps a preset deleted in one tab deleted when the other tab's stale list saves", () => {
    const a = openTab();
    const shared = kind.save(a, "Shared");
    // B opens on a list that holds it, then A deletes it.
    const b = openTab();
    expect(names(kind.list(b))).toEqual(["Shared"]);
    kind.remove(a, shared);
    expect(storedList(kind.key)).toEqual([]);
    // B still lists it, and saves something else.
    kind.save(b, "Fresh");

    expect(names(storedList(kind.key))).toEqual(["Fresh"]);
    expect(names(kind.list(b))).toEqual(["Fresh"]);
  });
});
