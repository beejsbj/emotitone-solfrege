import { describe, expect, it } from "vitest";
import { normalizeScaleIndex } from "@/data";

describe("scales helpers", () => {
  it("wraps scale indices for non-heptatonic modes", () => {
    expect(normalizeScaleIndex("major pentatonic", 5)).toBe(0);
    expect(normalizeScaleIndex("major pentatonic", -1)).toBe(4);
  });

});
