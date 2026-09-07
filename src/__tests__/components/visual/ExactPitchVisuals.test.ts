import { describe, expect, it } from "vitest";
import floatingPopupSource from "@/components/FloatingPopup.vue?raw";
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

  it("colors active exact pitches by pitch class instead of a scale sentinel", () => {
    expect(floatingPopupSource).toContain("getKeyBackgroundByPitchClass(");
    expect(floatingPopupSource).toContain(
      "note.solfegeIndex < 0 && Number.isInteger(note.pitchClassIndex)",
    );
  });
});
