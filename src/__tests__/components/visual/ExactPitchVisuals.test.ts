import { describe, expect, it } from "vitest";
import { resolveBlobPitchClass } from "@/composables/canvas/useBlobRenderer";

describe("exact-pitch visual identity", () => {
  it("resolves the exact pitch class for Blob positioning", () => {
    expect(resolveBlobPitchClass(
      { name: "D#", number: 0, emotion: "Borrowed harmony tone" },
      "C",
      "major",
      "D#4",
    )).toBe("D#");
  });
});
