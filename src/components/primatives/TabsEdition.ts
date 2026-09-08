import type { TabsGeometry, TabsTone } from "./Tabs.vue";

export interface TabsEdition {
  id: string;
  geometry: TabsGeometry;
  tone: TabsTone;
}

export const TABS_EDITIONS: readonly TabsEdition[] = [
  { id: "tab-ivory", geometry: "tab", tone: "ivory" },
  { id: "offcut-ivory", geometry: "offcut", tone: "ivory" },
  { id: "tile-ivory", geometry: "tile", tone: "ivory" },
  { id: "sharp-ivory", geometry: "sharp", tone: "ivory" },
  { id: "rip-ivory", geometry: "rip", tone: "ivory" },
  { id: "tab-brass", geometry: "tab", tone: "brass" },
] as const;

const TABS_EDITION_STORAGE_KEY = "emotitone.tabs.edition";
let pageEdition: TabsEdition = TABS_EDITIONS[0];

type EditionStorage = Pick<Storage, "getItem" | "setItem">;

export function nextTabsEdition(previousId: string | null | undefined): TabsEdition {
  const previousIndex = TABS_EDITIONS.findIndex((edition) => edition.id === previousId);
  return TABS_EDITIONS[(previousIndex + 1) % TABS_EDITIONS.length];
}

function browserStorage(): EditionStorage | undefined {
  if (typeof window === "undefined") return undefined;

  try {
    return window.localStorage;
  } catch {
    return undefined;
  }
}

/** Selects one chip treatment for every unpinned Tabs instance on this page load. */
export function beginTabsPageEdition(
  storage: EditionStorage | undefined = browserStorage(),
): TabsEdition {
  let previousId: string | null = null;

  try {
    previousId = storage?.getItem(TABS_EDITION_STORAGE_KEY) ?? null;
  } catch {
    previousId = null;
  }

  pageEdition = nextTabsEdition(previousId);

  try {
    storage?.setItem(TABS_EDITION_STORAGE_KEY, pageEdition.id);
  } catch {
    // The edition remains stable in memory when storage is unavailable.
  }

  return pageEdition;
}

export function currentTabsPageEdition(): TabsEdition {
  return pageEdition;
}
