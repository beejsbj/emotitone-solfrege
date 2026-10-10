import { Interval } from "@tonaljs/tonal";
import { describe, expect, it } from "vitest";
import { CHROMATIC_NOTES, MODE_ORDER, getScaleForMode } from "@/data";
import { getSolfegeLabelForInterval, identifyPitch, spellTonic, pitchSolfege, pitchSolfegeData, spelledPitchSolfege } from "@/domain/musicalIdentity";
import { phraseContour } from "@/domain/phraseBook";
import type { Phrase } from "@/types/phrases";

// Independent expected vocabulary for the written intervals the identity
// policy produces. Pair = do-based / relative-major (la-based minor).
const EXPECTED: Record<string, [string, string]> = {
  "1P": ["Do", "La"], "1A": ["Di", "Li"],
  "2m": ["Ra", "Te"], "2M": ["Re", "Ti"], "2A": ["Ri", "♯Ti"],
  "3m": ["Me", "Do"], "3M": ["Mi", "Di"],
  "4P": ["Fa", "Re"], "4A": ["Fi", "Ri"],
  "5d": ["Se", "Me"], "5P": ["Sol", "Mi"], "5A": ["Si", "♯Mi"],
  "6m": ["Le", "Fa"], "6M": ["La", "Fi"], "6A": ["Li", "♯♯Fa"],
  "7m": ["Te", "Sol"], "7M": ["Ti", "Si"],
};
const MINOR_MODES = ["minor", "harmonic minor", "melodic minor", "minor pentatonic", "minor blues"];

describe("shared chromatic solfege", () => {
  it.each(CHROMATIC_NOTES.flatMap((tonic) => MODE_ORDER.flatMap((mode) =>
    [false, true].map((laBasedMinor) => ({ tonic, mode, laBasedMinor })),
  )))("$tonic $mode, la-based=$laBasedMinor: every scale and borrowed pitch agrees across identity, Stage data and contours", ({ tonic, mode, laBasedMinor }) => {
    const context = { tonic, mode };
    for (let pc = 0; pc < 12; pc++) {
      const identity = identifyPitch(pc, context)!;
      const scale = getScaleForMode(mode);
      const semitones = (pc - CHROMATIC_NOTES.indexOf(tonic) + 12) % 12;
      const scaleIndex = scale.intervals.indexOf(semitones);
      // Chromatic mode deliberately uses harmonic-chromatic spelling (Fi at 6).
      // Other scale tones follow the mode table even if a double accidental
      // was respelled. Borrowed tones follow the displayed note's spelling.
      const expectedInterval = mode === "chromatic"
        ? ["1P", "2m", "2M", "3m", "3M", "4P", "4A", "5P", "6m", "6M", "7m", "7M"][semitones]
        : scaleIndex !== -1
          ? scale.intervalNames[scaleIndex]
          : Interval.distance(spellTonic(context), identity.spelling);
      const expected = EXPECTED[expectedInterval][laBasedMinor && MINOR_MODES.includes(mode) ? 1 : 0];
      expect(pitchSolfege(pc, context, { laBasedMinor })).toBe(expected);
      expect(pitchSolfegeData(pc, context, laBasedMinor)).toMatchObject({ name: expected, intervalName: expectedInterval });
      const phrase = {
        context: { key: tonic, mode },
        notes: [{ note: `${CHROMATIC_NOTES[pc]}4`, pitchClassIndex: pc, pressTime: 0 }],
      } as Pick<Phrase, "notes" | "context">;
      expect(phraseContour(phrase, laBasedMinor)).toBe(expected);
    }
  });

  it.each(CHROMATIC_NOTES)("gives chromatic Fi augmented-fourth emotion metadata in %s", (tonic) => {
    const pc = (CHROMATIC_NOTES.indexOf(tonic) + 6) % 12;
    expect(pitchSolfegeData(pc, { tonic, mode: "chromatic" })).toMatchObject({
      name: "Fi", number: 7, emotion: "Lift, shimmer, surprise",
      description: "A sharpened fourth that opens a bright suspended skylight.",
      texture: "electric lift, suspended shine",
    });
  });

  it.each(CHROMATIC_NOTES)("keeps the %s minor-blues blue degree Se / Me", (tonic) => {
    const pc = (CHROMATIC_NOTES.indexOf(tonic) + 6) % 12;
    const context = { tonic, mode: "minor blues" as const };
    expect(pitchSolfege(pc, context)).toBe("Se");
    expect(pitchSolfege(pc, context, { laBasedMinor: true })).toBe("Me");
  });

  it("accepts ascending compound intervals and rejects directed descending intervals", () => {
    expect(getSolfegeLabelForInterval("9M")).toBe("Re");
    expect(getSolfegeLabelForInterval("-2M")).toBe("·");
  });

  it("uses all five raised and lowered syllables when explicitly requested", () => {
    const context = { tonic: "C", mode: "major" as const };
    expect([1, 3, 6, 8, 10].map((pc) => pitchSolfege(pc, context, { inflection: "raised" })))
      .toEqual(["Di", "Ri", "Fi", "Si", "Li"]);
    expect([1, 3, 6, 8, 10].map((pc) => pitchSolfege(pc, context, { inflection: "lowered" })))
      .toEqual(["Ra", "Me", "Se", "Le", "Te"]);
  });

  it("calls Db major pc 9 Si from written A5, but honours an explicit lowered inflection", () => {
    const context = { tonic: "Db", mode: "major" as const };
    expect(pitchSolfege(9, context)).toBe("Si");
    expect(pitchSolfege(9, context, { inflection: "lowered" })).toBe("Le");
    expect(pitchSolfege(9, context, { inflection: "raised" })).toBe("Si");
  });

  it("keeps a chord member's raised spelling and never replaces rare alterations with Do", () => {
    const context = { tonic: "C", mode: "major" as const };
    expect(spelledPitchSolfege("G#4", context)).toBe("Si");
    expect(spelledPitchSolfege("Ab4", context)).toBe("Le");
    expect(spelledPitchSolfege("Bbb4", context)).toBe("♭♭Ti");
    expect(pitchSolfege("invalid", context)).toBe("·");
  });
});
