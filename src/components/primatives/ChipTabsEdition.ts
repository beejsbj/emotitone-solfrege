import type { ChipTabsGeometry, ChipTabsTone } from "./ChipTabs.vue";

export interface ChipTabsEdition {
  id: string;
  geometry: ChipTabsGeometry;
  tone: ChipTabsTone;
}

export const CHIP_TABS_EDITIONS: readonly ChipTabsEdition[] = [
  { id: "tab-ivory", geometry: "tab", tone: "ivory" },
  { id: "offcut-ivory", geometry: "offcut", tone: "ivory" },
  { id: "tile-ivory", geometry: "tile", tone: "ivory" },
  { id: "sharp-ivory", geometry: "sharp", tone: "ivory" },
  { id: "rip-ivory", geometry: "rip", tone: "ivory" },
  { id: "tab-brass", geometry: "tab", tone: "brass" },
] as const;

const CHIP_TABS_EDITION_STORAGE_KEY = "emotitone.tabs.edition";
let pageEdition: ChipTabsEdition = CHIP_TABS_EDITIONS[0];

type EditionStorage = Pick<Storage, "getItem" | "setItem">;

export function nextChipTabsEdition(previousId: string | null | undefined): ChipTabsEdition {
  const previousIndex = CHIP_TABS_EDITIONS.findIndex((edition) => edition.id === previousId);
  return CHIP_TABS_EDITIONS[(previousIndex + 1) % CHIP_TABS_EDITIONS.length];
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
export function beginChipTabsPageEdition(
  storage: EditionStorage | undefined = browserStorage(),
): ChipTabsEdition {
  let previousId: string | null = null;

  try {
    previousId = storage?.getItem(CHIP_TABS_EDITION_STORAGE_KEY) ?? null;
  } catch {
    previousId = null;
  }

  pageEdition = nextChipTabsEdition(previousId);

  try {
    storage?.setItem(CHIP_TABS_EDITION_STORAGE_KEY, pageEdition.id);
  } catch {
    // The edition remains stable in memory when storage is unavailable.
  }

  return pageEdition;
}

export function currentChipTabsPageEdition(): ChipTabsEdition {
  return pageEdition;
}
