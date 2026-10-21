import { describe, expect, it } from "vitest";
import { chromaticPitchHeight } from "@/services/scalePitch";

const C_MAJOR = { key: "C", mode: "major" } as const;

describe("chromaticPitchHeight", () => {
  it("reads exact pitch from the note name as octave × 12 + pitch class", () => {
    expect(chromaticPitchHeight({ note: "C4", octave: 4 }, C_MAJOR)).toBe(48);
    expect(chromaticPitchHeight({ note: "F#5", octave: 5 }, C_MAJOR)).toBe(66);
    // B#3 sounds as C4; the note name is the exact identity.
    expect(chromaticPitchHeight({ note: "B#3", octave: 3 }, C_MAJOR)).toBe(48);
  });

  it("uses the stored pitch class for borrowed pitches without a note name", () => {
    expect(chromaticPitchHeight(
      { pitchClassIndex: 3, scaleIndex: -1, octave: 4 },
      C_MAJOR,
    )).toBe(51);
  });

  it("keeps semitone spacing that a diatonic index would flatten", () => {
    const heights = ["C4", "C#4", "D4"].map((note) => (
      chromaticPitchHeight({ note, octave: 4 }, C_MAJOR)
    ));
    expect(heights).toEqual([48, 49, 50]);
  });

  it("falls back to tonic + mode interval above the octave for scale indexes", () => {
    const fSharpDorian = { key: "F#", mode: "dorian" } as const;
    expect([0, 2, 4, 6].map((scaleIndex) => (
      chromaticPitchHeight({ scaleIndex, octave: 4 }, fSharpDorian)
    ))).toEqual([54, 57, 61, 64]);
    // The next octave of the tonic sits exactly 12 above.
    expect(chromaticPitchHeight({ scaleIndex: 7, octave: 4 }, fSharpDorian)).toBe(66);
  });
});
