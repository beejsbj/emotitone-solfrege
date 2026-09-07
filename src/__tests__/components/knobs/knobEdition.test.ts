import { describe, expect, it, vi } from "vitest";
import {
  beginKnobPageEdition,
  currentKnobPageVisual,
  nextKnobVisual,
} from "@/components/primatives/Knob/edition";

function memoryStorage(initialValue: string | null = null) {
  let value = initialValue;

  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe("Knob page edition", () => {
  it("starts with Analog Ring, then strictly alternates each app load", () => {
    const storage = memoryStorage();

    expect(beginKnobPageEdition(storage)).toBe("ring");
    expect(currentKnobPageVisual()).toBe("ring");
    expect(beginKnobPageEdition(storage)).toBe("arc");
    expect(beginKnobPageEdition(storage)).toBe("ring");
    expect(storage.setItem).toHaveBeenCalledTimes(3);
  });

  it("treats only a recorded Ring edition as the reason to show Arc", () => {
    expect(nextKnobVisual("ring")).toBe("arc");
    expect(nextKnobVisual("arc")).toBe("ring");
    expect(nextKnobVisual("unknown")).toBe("ring");
    expect(nextKnobVisual(null)).toBe("ring");
  });

  it("keeps one stable page edition when storage is unavailable", () => {
    const storage = {
      getItem: vi.fn(() => {
        throw new Error("blocked");
      }),
      setItem: vi.fn(() => {
        throw new Error("blocked");
      }),
    };

    expect(() => beginKnobPageEdition(storage)).not.toThrow();
    expect(currentKnobPageVisual()).toBe("ring");
  });
});
