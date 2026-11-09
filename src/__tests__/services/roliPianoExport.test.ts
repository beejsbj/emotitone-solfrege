import { describe, expect, it } from "vitest";
import {
  buildRoliPianoPalette,
  roliAppOctave,
  roliDeviceOctave,
  roliKeyNote,
  cssColorToLittleFootHex,
  generateRoliPianoScript,
  getScaleDegreeIndexForPitchClass,
  ROLI_OFF_COLOUR,
  srgbToLittleFootHex,
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

  it("serializes numeric sRGB without a generated CSS round-trip", () => {
    expect(srgbToLittleFootHex({ r: 1, g: 0.5, b: 0, alpha: 0.25 }))
      .toBe("0x40ff8000");
  });

  it("maps only in-scale pitch classes for the current key and mode", () => {
    const palette = buildRoliPianoPalette({
      dynamicColorConfig: {
        recipeVersion: 1,
        musicColorMode: "movable-ordinal",
        chroma: 0.18,
        lightnessCenter: 0.575,
        lightnessSpan: 0.6,
        hueMotionEnabled: false,
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

  it("colors all 12 pitch classes in fixed mode", () => {
    const dMinorPalette = buildRoliPianoPalette({
      dynamicColorConfig: {
        recipeVersion: 1,
        musicColorMode: "fixed",
        chroma: 0.18,
        lightnessCenter: 0.575,
        lightnessSpan: 0.6,
        hueMotionEnabled: false,
        animationSpeed: 1,
      },
      currentKey: "D",
      currentMode: "minor",
    });

    expect(Object.values(dMinorPalette).slice(0, 12)).not.toContain(ROLI_OFF_COLOUR);
  });

  it("turns off out-of-scale pitch classes in movable mode", () => {
    const dMinorPalette = buildRoliPianoPalette({
      dynamicColorConfig: {
        recipeVersion: 1,
        musicColorMode: "movable-ordinal",
        chroma: 0.18,
        lightnessCenter: 0.575,
        lightnessSpan: 0.6,
        hueMotionEnabled: false,
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
        recipeVersion: 1,
        musicColorMode: "fixed",
        chroma: 0.18,
        lightnessCenter: 0.575,
        lightnessSpan: 0.6,
        hueMotionEnabled: false,
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

  it("centres the piano on the app's main octave, as the on-screen rows are", () => {
    const keys = 49;
    for (const mainOctave of [2, 3, 4, 5, 6]) {
      const device = roliDeviceOctave(mainOctave, keys);
      // The middle C-to-B of 49 keys (keys 24-35) is the main octave.
      expect(roliKeyNote(24, device)).toBe((mainOctave + 1) * 12);
      expect(roliAppOctave(device)).toBe(mainOctave);
    }
    // The app's default octave 4 is the usual 49-key span, C2 to C6.
    expect(roliKeyNote(0, roliDeviceOctave(4, keys))).toBe(36);
  });

  it("never asks the piano for a note above 127", () => {
    for (let mainOctave = 1; mainOctave <= 8; mainOctave++) {
      expect(roliKeyNote(48, roliDeviceOctave(mainOctave, 49))).toBeLessThanOrEqual(127);
    }
  });

  it("builds the device octave range and handshake into the script", () => {
    const script = generateRoliPianoScript({
      dynamicColorConfig: {
        recipeVersion: 1,
        musicColorMode: "fixed",
        chroma: 0.18,
        lightnessCenter: 0.575,
        lightnessSpan: 0.6,
        hueMotionEnabled: false,
        animationSpeed: 1,
      },
      currentKey: "C",
      currentMode: "major",
    });

    expect(script).toContain("const int MinOctave                    = -4;");
    expect(script).toContain("const int MaxOctave                    = 2;");
    expect(script).toContain("const int AppOctaveOffset              = 5;");
    expect(script).toContain("setLocalConfigItemRange(ConfigId_octave, MinOctave, MaxOctave);");
    expect(script).not.toMatch(/clamp\(-4, 6/);
    expect(script).toContain("const int ScriptVersion                = 2;");
    expect(script).toContain("sendCC(ControlChannel, CcHello, ScriptVersion);");
    expect(script).toContain("sendCC(ControlChannel, CcMainOctave, octave + AppOctaveOffset);");
  });
});
