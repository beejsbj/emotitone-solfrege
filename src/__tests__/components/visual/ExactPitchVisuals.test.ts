import { describe, expect, it } from "vitest";
import unifiedCanvasSource from "@/composables/canvas/useUnifiedCanvas.ts?raw";
import { resolveBlobPitchClass } from "@/composables/canvas/useBlobRenderer";

describe("exact-pitch visual identity", () => {
  it("threads exact note names into Blob positioning", () => {
    expect(unifiedCanvasSource).toContain(
      "noteName, // Preserve exact pitch identity for borrowed harmony tones",
    );
    expect(resolveBlobPitchClass(
      { name: "D#", number: 0, emotion: "Borrowed harmony tone" },
      "C",
      "major",
      "D#4",
    )).toBe("D#");
  });
});
