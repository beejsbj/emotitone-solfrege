import { describe, expect, it } from "vitest";
import {
  buildRoliPianoPalette,
  cssColorToLittleFootHex,
  generateRoliPianoScript,
  getScaleDegreeIndexForPitchClass,
  ROLI_OFF_COLOUR,
} from "@/services/roliPianoExport";

describe("roliPianoExport", () => {
  it("converts hsla colors to LittleFoot ARGB hex", () => {
    expect(cssColorToLittleFootHex("hsla(0, 100%, 50%, 1)")).toBe(
      "0xffff0000"
    );
    expect(cssColorToLittleFootHex("hsla(120, 100%, 50%, 0.5)")).toBe(
      "0x8000ff00"
    );
  });

  it("converts rgb and hex colors to LittleFoot ARGB hex", () => {
    expect(cssColorToLittleFootHex("rgb(77, 189, 248)")).toBe("0xff4dbdf8");
    expect(cssColorToLittleFootHex("#4dbdf8")).toBe("0xff4dbdf8");
  });

  it("maps only in-scale pitch classes for the current key and mode", () => {
    const palette = buildRoliPianoPalette({
      dynamicColorConfig: {
        chromaticMapping: false,
        saturation: 0.8,
        baseLightness: 0.5,
        lightnessRange: 0.3,
        hueAnimationAmplitude: 0,
        animationSpeed: 1,
      },
      currentKey: "C",
      currentMode: "major",
      octave: 4,
      activeColor: "hsla(60, 100%, 50%, 1)",
    });

    expect(palette.C).toMatch(/^0x[\da-f]{8}$/);
    expect(palette.C_).toBe(ROLI_OFF_COLOUR);
    expect(palette.D_).toBe(ROLI_OFF_COLOUR);
    expect(palette.F_).toBe(ROLI_OFF_COLOUR);
    expect(palette.B).toMatch(/^0x[\da-f]{8}$/);
    expect(palette.activeColour).toBe("0xffffff00");
  });

  it("remaps the lit pitch classes when the key or mode changes", () => {
    const dMinorPalette = buildRoliPianoPalette({
      dynamicColorConfig: {
        chromaticMapping: true,
        saturation: 0.8,
        baseLightness: 0.5,
        lightnessRange: 0.3,
        hueAnimationAmplitude: 0,
        animationSpeed: 1,
      },
      currentKey: "D",
      currentMode: "minor",
    });

    expect(dMinorPalette.C).toMatch(/^0x[\da-f]{8}$/);
    expect(dMinorPalette.C_).toBe(ROLI_OFF_COLOUR);
    expect(dMinorPalette.E).toMatch(/^0x[\da-f]{8}$/);
    expect(dMinorPalette.F_).toBe(ROLI_OFF_COLOUR);
    expect(dMinorPalette.A_).toMatch(/^0x[\da-f]{8}$/);
    expect(dMinorPalette.B).toBe(ROLI_OFF_COLOUR);
  });

  it("exposes the scale degree index for in-scale pitch classes", () => {
    expect(getScaleDegreeIndexForPitchClass("C", "C", "major")).toBe(0);
    expect(getScaleDegreeIndexForPitchClass("F", "C", "major")).toBe(3);
    expect(getScaleDegreeIndexForPitchClass("A#", "D", "minor")).toBe(5);
    expect(getScaleDegreeIndexForPitchClass("F#", "D", "minor")).toBeNull();
  });

  it("generates a LittleFoot script with the expected metadata and key count", () => {
    const script = generateRoliPianoScript({
      dynamicColorConfig: {
        chromaticMapping: true,
        saturation: 0.8,
        baseLightness: 0.5,
        lightnessRange: 0.3,
        hueAnimationAmplitude: 0,
        animationSpeed: 1,
      },
      currentKey: "C",
      currentMode: "major",
      keyCount: 49,
      exportedAt: "2026-03-19T10:00:00.000Z",
    });

    expect(script).toContain('description="Emotitone palette for ROLI piano"');
    expect(script).toContain("Generated 2026-03-19T10:00:00.000Z for C major");
    expect(script).toContain("supports live MIDI note mirroring and palette updates");
    expect(script).toContain("const int maxKeys = 49;");
    expect(script).toContain("const int CcPaletteIndex               = 102;");
    expect(script).toContain("const int CcMainOctave                 = 111;");
    expect(script).toContain("int externalKeyStates[maxKeys];");
    expect(script).toContain("setAppMainOctave(byte2);");
    expect(script).toContain("void handleMIDI(int byte0, int byte1, int byte2)");
    expect(script).toContain('target="Lightkey, roliPiano49"');
    expect(script).toContain('name="activeColour"');
  });
});
