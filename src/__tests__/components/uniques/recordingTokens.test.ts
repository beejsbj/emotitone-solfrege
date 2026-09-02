import { describe, expect, it } from "vitest";
import { buildRecordedCodeStripTokens } from "@/components/uniques/CodeStrip/recordingTokens";
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
) => buildRecordedCodeStripTokens({
  notes,
  mode: "major",
  musicKey: "C",
  notation,
  barMs: 2000,
  sourceBpm: 120,
  surfaceStyle: "colored",
  keyBrightness: 1,
  keySaturation: 1,
});

describe("CodeStrip recorded-token metadata", () => {
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

  it("uses the same rapid-tap coalescing rule as the playable source", () => {
    expect(tokens([
      note("c", "C4", 0, 4, 1000, 80),
      note("d", "D4", 1, 4, 1160, 80),
    ])).toMatchObject([
      { type: "note", duration: "@0.08" },
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
    const chord = tokens([
      note("g", "G4", 4, 4, 1000, 1000),
      note("c", "C4", 0, 4, 1000, 1000),
      note("e", "E4", 2, 4, 1500, 500),
    ])[0];

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

  it("always preserves Rest semantics for the CodeMirror source map", () => {
    expect(tokens([
      note("c", "C4", 0, 4, 1000, 500),
      note("d", "D4", 1, 4, 2000, 500),
    ]).map((token) => token.type)).toEqual(["note", "rest", "note"]);
  });
});
