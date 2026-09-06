import { describe, expect, it } from "vitest";
import { convertRecordedPattern } from "@/services/RecordedPatternConversion";
import type { PatternNote } from "@/types/patterns";

const note = (
  id: string,
  rawPitch: string,
  scaleIndex: number,
  octave: number,
  pressTime: number,
  duration: number,
): PatternNote => ({
  id,
  note: rawPitch,
  scaleDegree: scaleIndex + 1,
  scaleIndex,
  octave,
  pressTime,
  releaseTime: pressTime + duration,
  duration,
});

const tokens = (
  notes: PatternNote[],
  notation: "solfege" | "note" | "degree" = "solfege",
) => convertRecordedPattern({
  notes,
  source: { sourceBpm: 120 },
  codeStrip: {
    mode: "major",
    musicKey: "C",
    notation,
    surfaceStyle: "colored",
    keyBrightness: 1,
    keySaturation: 1,
  },
}).tokens;

const conversion = (notes: PatternNote[], sourceBpm = 120, bpm = 120) =>
  convertRecordedPattern({
    notes,
    source: { sourceBpm, bpm },
    codeStrip: {
      mode: "major",
      musicKey: "C",
      notation: "note",
      surfaceStyle: "colored",
      keyBrightness: 1,
      keySaturation: 1,
    },
  });

describe("recorded-pattern conversion", () => {
  it("maps sequential notes and silence without inventing playback state", () => {
    const result = tokens([
      note("c", "C4", 0, 4, 1000, 500),
      note("d", "D4", 1, 4, 2000, 250),
    ]);

    expect(result).toMatchObject([
      {
        type: "note",
        note: "do",
        glyph: "syl",
        text: "Do",
        rawPitch: "C4",
        duration: "@0.25",
      },
      { type: "rest", duration: "@0.25" },
      {
        type: "note",
        note: "re",
        text: "Re",
        rawPitch: "D4",
        duration: "@0.125",
      },
    ]);
    expect(result.every((token) => !("progress" in token))).toBe(true);
  });

  it("preserves measured gaps in rapid taps", () => {
    const result = conversion([
      note("c", "C4", 0, 4, 1000, 80),
      note("d", "D4", 1, 4, 1160, 80),
    ]);

    expect(result.source).toContain("C4@0.04 ~@0.04 D4@0.04");
    expect(result.tokens).toMatchObject([
      { type: "note", duration: "@0.04" },
      { type: "rest", duration: "@0.04" },
      { type: "note", duration: "@0.04" },
    ]);
  });

  it.each([
    ["solfege", "syl", "Do"],
    ["degree", "deg", "1"],
    ["note", "raw", "C4"],
  ] as const)("preserves the %s notation preference", (notation, glyph, text) => {
    expect(tokens([note("c", "C4", 0, 4, 1000, 500)], notation)[0])
      .toMatchObject({ type: "note", glyph, text });
  });

  it("clusters overlaps in press order and preserves independent voicing order", () => {
    const result = conversion([
      note("g", "G4", 4, 4, 1000, 1000),
      note("c", "C4", 0, 4, 1000, 1000),
      note("e", "E4", 2, 4, 1500, 500),
    ]);
    const chord = result.tokens[0];

    expect(result.source).toContain("{C4, G4, ~@0.25 E4@0.25}@0.5");
    expect(chord).toMatchObject({
      type: "chord",
      display: "notes",
      duration: "@0.5",
    });
    if (chord.type !== "chord") throw new Error("Expected chord token");

    expect(chord.members.map((member) => member.rawPitch)).toEqual(["G4", "C4", "E4"]);
    expect(chord.members.map((member) => member.pressOrder)).toEqual([0, 1, 2]);
    expect(chord.members.map((member) => member.voicingOrder)).toEqual([2, 0, 1]);
    expect(chord.members.every((member) => member.progress == null)).toBe(true);
  });

  it("keeps one chained overlap block in both representations", () => {
    const result = conversion([
      note("c", "C4", 0, 4, 1000, 400),
      note("g", "G4", 4, 4, 1300, 400),
      note("e", "E4", 2, 4, 1600, 400),
    ]);

    expect(result.source).toContain(
      "{C4@0.2 ~@0.1 E4@0.2, ~@0.15 G4@0.2 ~@0.15}@0.5",
    );
    expect(result.tokens).toHaveLength(1);
    expect(result.tokens[0]).toMatchObject({ type: "chord", duration: "@0.5" });
  });

  it("uses capture tempo for both durations and playback tempo only for cpm", () => {
    const result = conversion([note("c", "C4", 0, 4, 1000, 500)], 120, 60);

    expect(result.source).toContain("C4@0.25");
    expect(result.source).toContain(".cpm(60 / 4)");
    expect(result.tokens[0]).toMatchObject({ type: "note", duration: "@0.25" });
  });

  it("preserves pitch context independently in source and identity metadata", () => {
    const result = convertRecordedPattern({
      notes: [note("a", "A4", 4, 4, 1000, 500)],
      source: {
        notationType: "relative",
        scaleKey: "C",
        scaleMode: "major pentatonic",
        scaleOctave: 4,
      },
      codeStrip: {
        mode: "major pentatonic",
        musicKey: "C",
        notation: "solfege",
        surfaceStyle: "colored",
        keyBrightness: 1,
        keySaturation: 1,
      },
    });

    expect(result.source).toContain("[ 4@0.25 ]");
    expect(result.source).toContain('.scale("C4:major pentatonic")');
    expect(result.tokens[0]).toMatchObject({
      type: "note",
      rawPitch: "A4",
      scaleIndex: 4,
      mode: "major pentatonic",
      musicKey: "C",
    });
  });

  it("always preserves Rest semantics for the CodeMirror source map", () => {
    expect(tokens([
      note("c", "C4", 0, 4, 1000, 500),
      note("d", "D4", 1, 4, 2000, 500),
    ]).map((token) => token.type)).toEqual(["note", "rest", "note"]);
  });
});
