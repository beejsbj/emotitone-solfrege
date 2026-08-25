import { describe, expect, it } from "vitest";
import {
  keyboardEditionVariation,
  keyboardEditionRowVariations,
  keyboardFamilyForDate,
  visibleKeyboardOctaves,
} from "@/components/compounds/keyboardEdition";

describe("keyboard daily editions", () => {
  it("uses every family once per five-day deck without boundary repeats", () => {
    const families = Array.from({ length: 15 }, (_, offset) =>
      keyboardFamilyForDate(new Date(2000, 0, offset + 1)),
    );

    for (let start = 0; start < 15; start += 5) {
      expect(new Set(families.slice(start, start + 5)).size).toBe(5);
    }
    expect(families[4]).not.toBe(families[5]);
    expect(families[9]).not.toBe(families[10]);
  });

  it("returns deterministic token references for a key inside one edition", () => {
    const first = keyboardEditionVariation("tab", "load-a", "0_4");
    const again = keyboardEditionVariation("tab", "load-a", "0_4");

    expect(again).toEqual(first);
    expect(first.cut).toMatch(/^var\(--keyboard-tab-cut-[1-3]\)$/);
    expect(first.rotation).toMatch(/^var\(--keyboard-tab-rotation-[1-3]\)$/);
    expect(first.shadow).toMatch(/^var\(--keyboard-tab-shadow-[1-3]\)$/);
  });

  it("never assigns the same authored cut to adjacent Keys in a row", () => {
    const keyIds = Array.from({ length: 12 }, (_, index) => `${index}_4`);
    const families = ["standard", "tile", "offcut", "tab", "pill"] as const;

    for (const family of families) {
      for (const seed of ["load-a", "load-b", "2026-08-25:37"]) {
        const first = keyboardEditionRowVariations(family, seed, keyIds);
        const again = keyboardEditionRowVariations(family, seed, keyIds);
        expect(again).toEqual(first);

        const variants = first.map(([, variation]) => variation.variant);
        for (let index = 1; index < variants.length; index += 1) {
          expect(variants[index]).not.toBe(variants[index - 1]);
        }
        expect(first.every(([, variation]) =>
          variation.cut.startsWith(`var(--keyboard-${family}-cut-`),
        )).toBe(true);
      }
    }
  });

  it("clips unavailable octave rows while preserving odd requested controls", () => {
    expect(visibleKeyboardOctaves(4, 3)).toEqual([5, 4, 3]);
    expect(visibleKeyboardOctaves(1, 3)).toEqual([2, 1]);
    expect(visibleKeyboardOctaves(8, 7)).toEqual([8, 7, 6, 5]);
    expect(visibleKeyboardOctaves(4, 2)).toEqual([5, 4, 3]);
  });
});
