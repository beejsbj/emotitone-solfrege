import { describe, expect, it } from "vitest";
import { normalizeScaleIndex } from "@/data";
import * as scales from "@/data/scales";

describe("scales helpers", () => {
  it("exposes no parallel mode syllable helper", () => {
    expect(scales).not.toHaveProperty("getSolfegeNameForMode");
  });
  it("wraps scale indices for non-heptatonic modes", () => {
    expect(normalizeScaleIndex("major pentatonic", 5)).toBe(0);
    expect(normalizeScaleIndex("major pentatonic", -1)).toBe(4);
  });

});
