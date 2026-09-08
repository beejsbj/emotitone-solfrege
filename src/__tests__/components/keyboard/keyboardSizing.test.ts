import { describe, expect, it } from "vitest";
import {
  KEYBOARD_CHORD_ROW_HEIGHT,
  MAX_KEYBOARD_OUTER_ROW_HEIGHT,
  MIN_KEYBOARD_OUTER_ROW_HEIGHT,
  defaultKeyboardHeight,
  minimumKeyboardHeight,
  resolveKeyboardLayout,
} from "@/components/compounds/keyboardSizing";

describe("keyboard host sizing", () => {
  it("allocates the permanent chord row in default and minimum heights", () => {
    expect(KEYBOARD_CHORD_ROW_HEIGHT).toBe(47);
    expect(defaultKeyboardHeight(1)).toBe(123);
    expect(minimumKeyboardHeight(1)).toBeCloseTo(106.71, 1);
    expect(defaultKeyboardHeight(3)).toBe(235);
  });

  it("adds and removes whole rows when a drag crosses the key-size limits", () => {
    const expanded = resolveKeyboardLayout(320, 3);
    expect(expanded.rowCount).toBe(4);
    expect(expanded.outerRowHeight).toBeGreaterThanOrEqual(MIN_KEYBOARD_OUTER_ROW_HEIGHT);
    expect(expanded.outerRowHeight).toBeLessThanOrEqual(MAX_KEYBOARD_OUTER_ROW_HEIGHT);

    const contracted = resolveKeyboardLayout(238, 4);
    expect(contracted.rowCount).toBe(3);
    expect(contracted.outerRowHeight).toBeGreaterThanOrEqual(MIN_KEYBOARD_OUTER_ROW_HEIGHT);
    expect(contracted.outerRowHeight).toBeLessThanOrEqual(MAX_KEYBOARD_OUTER_ROW_HEIGHT);
  });

  it("keeps the current row count inside the shared height range", () => {
    expect(resolveKeyboardLayout(270, 3).rowCount).toBe(3);
    expect(resolveKeyboardLayout(270, 4).rowCount).toBe(4);
  });

  it("does not reverse the first row addition on a tiny pointer reversal", () => {
    expect(resolveKeyboardLayout(167, 1).rowCount).toBe(2);
    expect(resolveKeyboardLayout(163, 2).rowCount).toBe(2);
    expect(resolveKeyboardLayout(150, 2).rowCount).toBe(1);
  });

  it("saturates at complete one-row and eight-row layouts", () => {
    expect(resolveKeyboardLayout(0, 1)).toMatchObject({
      rowCount: 1,
      outerRowHeight: MIN_KEYBOARD_OUTER_ROW_HEIGHT,
    });
    expect(resolveKeyboardLayout(10_000, 8)).toMatchObject({
      rowCount: 8,
      outerRowHeight: MAX_KEYBOARD_OUTER_ROW_HEIGHT,
    });
  });
});
