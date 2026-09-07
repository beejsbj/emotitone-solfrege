import { describe, expect, it, vi } from "vitest";
import {
  beginTabsPageEdition,
  TABS_EDITIONS,
  currentTabsPageEdition,
  nextTabsEdition,
} from "@/components/primatives/TabsEdition";

function memoryStorage(initialValue: string | null = null) {
  let value = initialValue;

  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe("Tabs page edition", () => {
  it("cycles through every accepted guide variant across app loads", () => {
    const storage = memoryStorage();
    const received = TABS_EDITIONS.map(() => beginTabsPageEdition(storage).id);

    expect(received).toEqual(TABS_EDITIONS.map((edition) => edition.id));
    expect(beginTabsPageEdition(storage).id).toBe(TABS_EDITIONS[0].id);
    expect(storage.setItem).toHaveBeenCalledTimes(TABS_EDITIONS.length + 1);
  });

  it("starts from the first edition when the stored value is unknown", () => {
    expect(nextTabsEdition("retired-edition")).toEqual(TABS_EDITIONS[0]);
    expect(nextTabsEdition(null)).toEqual(TABS_EDITIONS[0]);
  });

  it("keeps one in-memory edition when storage is unavailable", () => {
    const storage = {
      getItem: vi.fn(() => { throw new Error("blocked"); }),
      setItem: vi.fn(() => { throw new Error("blocked"); }),
    };

    expect(() => beginTabsPageEdition(storage)).not.toThrow();
    expect(currentTabsPageEdition()).toEqual(TABS_EDITIONS[0]);
  });
});
