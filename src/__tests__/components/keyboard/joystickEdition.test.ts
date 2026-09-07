import { describe, expect, it, vi } from "vitest";
import {
  beginJoystickPageEdition,
  currentJoystickPageVisual,
  nextJoystickVisual,
} from "@/components/uniques/Joystick/edition";

function memoryStorage(initialValue: string | null = null) {
  let value = initialValue;
  return {
    getItem: vi.fn(() => value),
    setItem: vi.fn((_key: string, nextValue: string) => {
      value = nextValue;
    }),
  };
}

describe("Joystick page edition", () => {
  it("strictly alternates Analog and Digital across production page loads", () => {
    const storage = memoryStorage();
    expect(nextJoystickVisual("analog")).toBe("digital");
    expect(nextJoystickVisual("digital")).toBe("analog");
    expect(nextJoystickVisual("unknown")).toBe("analog");
    expect(nextJoystickVisual(null)).toBe("analog");
    expect(beginJoystickPageEdition(storage)).toBe("analog");
    expect(currentJoystickPageVisual()).toBe("analog");
    expect(beginJoystickPageEdition(storage)).toBe("digital");
    expect(currentJoystickPageVisual()).toBe("digital");
  });

  it("keeps one stable fallback when storage is unavailable", () => {
    const brokenStorage = {
      getItem() { throw new Error("unavailable"); },
      setItem() { throw new Error("unavailable"); },
    };

    expect(beginJoystickPageEdition(brokenStorage)).toBe("analog");
    expect(currentJoystickPageVisual()).toBe("analog");
  });
});
