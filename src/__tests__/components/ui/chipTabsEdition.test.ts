import { describe, expect, it, vi } from "vitest";
import {
  beginChipTabsPageEdition,
  CHIP_TABS_EDITIONS,
  currentChipTabsPageEdition,
  nextChipTabsEdition,
} from "@/components/primatives/ChipTabsEdition";

function memoryStorage(initialValue: string | null = null) {
  let value = initialValue;

  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe("ChipTabs page edition", () => {
  it("cycles through every accepted guide variant across app loads", () => {
    const storage = memoryStorage();
    const received = CHIP_TABS_EDITIONS.map(() => beginChipTabsPageEdition(storage).id);

    expect(received).toEqual(CHIP_TABS_EDITIONS.map((edition) => edition.id));
    expect(beginChipTabsPageEdition(storage).id).toBe(CHIP_TABS_EDITIONS[0].id);
    expect(storage.setItem).toHaveBeenCalledTimes(CHIP_TABS_EDITIONS.length + 1);
  });

  it("starts from the first edition when the stored value is unknown", () => {
    expect(nextChipTabsEdition("retired-edition")).toEqual(CHIP_TABS_EDITIONS[0]);
    expect(nextChipTabsEdition(null)).toEqual(CHIP_TABS_EDITIONS[0]);
  });

  it("keeps one in-memory edition when storage is unavailable", () => {
    const storage = {
      getItem: vi.fn(() => { throw new Error("blocked"); }),
      setItem: vi.fn(() => { throw new Error("blocked"); }),
    };

    expect(() => beginChipTabsPageEdition(storage)).not.toThrow();
    expect(currentChipTabsPageEdition()).toEqual(CHIP_TABS_EDITIONS[0]);
  });
});
