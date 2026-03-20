import { describe, expect, it } from "vitest";
import { getSolfegeNameForMode, normalizeScaleIndex } from "@/data";

describe("scales helpers", () => {
  it("wraps scale indices for non-heptatonic modes", () => {
    expect(normalizeScaleIndex("major pentatonic", 5)).toBe(0);
    expect(normalizeScaleIndex("major pentatonic", -1)).toBe(4);
  });

  it("resolves solfege labels from wrapped indices", () => {
    expect(getSolfegeNameForMode("major pentatonic", 5)).toBe("Do");
    expect(getSolfegeNameForMode("major pentatonic", -1)).toBe("La");
  });
});
