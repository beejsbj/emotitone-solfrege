import { describe, expect, it } from "vitest";
import ambientSource from "@/composables/canvas/useAmbientRenderer.ts?raw";
import hilbertSource from "@/composables/canvas/useHilbertScopeRenderer.ts?raw";

describe("active-note canvas color routing", () => {
  it("routes Ambient and Hilbert active notes through exact pitch identity", () => {
    expect(ambientSource).toContain("resolveMusicColorSampleByPitchClass(");
    expect(ambientSource).toContain("suppliedActiveNotes");
    expect(ambientSource).toContain("context.highlightPitchClassIndex");
    expect(ambientSource).toContain('"fixed-chromatic"');
    expect(hilbertSource).toContain("musicColor.getPrimaryColorForPitch");
    expect(hilbertSource).toContain("activeNotes: readonly ActiveNote[]");
    expect(hilbertSource).toContain("firstNote.pitchClassIndex");
    expect(hilbertSource).not.toContain("firstNote.solfege.name,");
  });
});
