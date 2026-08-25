import { describe, expect, it } from "vitest";
import specimenSource from "@/style-guide/compounds/CompoundKeyboard.vue?raw";

describe("Keyboard style-guide specimen", () => {
  it("imports the authoritative compound and remains inert", () => {
    expect(specimenSource).toContain(
      'import Keyboard from "@/components/compounds/Keyboard.vue"',
    );
    expect(specimenSource).not.toMatch(
      /@\/stores|useSolfegeInteraction|attackNote|releaseNote|triggerNoteHaptic|localStorage/,
    );
    expect(specimenSource).toContain("inert · no input yet");
  });

  it("covers the accepted visual inspection dimensions with bounded controls", () => {
    expect(specimenSource).toContain("[320, 390, 768, 960]");
    expect(specimenSource).toContain("[1, 3, 5, 7]");
    expect(specimenSource).toContain("KEYBOARD_GEOMETRY_FAMILIES");
    expect(specimenSource).toContain("Pressed + sounding");
    expect(specimenSource).toContain("Reduced preview");
    expect(specimenSource).toContain("Forced-color preview");
    expect(specimenSource).toContain("Production-baseline tuning");
  });
});
