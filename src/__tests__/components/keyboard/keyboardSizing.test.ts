import { describe, expect, it } from "vitest";
import {
  KEYBOARD_CHORD_ROW_HEIGHT,
  defaultKeyboardHeight,
  minimumKeyboardHeight,
} from "@/components/compounds/keyboardSizing";

describe("keyboard host sizing", () => {
  it("allocates the permanent chord row in default and minimum heights", () => {
    expect(KEYBOARD_CHORD_ROW_HEIGHT).toBe(47);
    expect(defaultKeyboardHeight(1)).toBe(135);
    expect(minimumKeyboardHeight(1)).toBeCloseTo(116.14, 1);
    expect(defaultKeyboardHeight(3)).toBe(247);
  });
});
