import { describe, expect, it } from "vitest";
import { buildLiveCodeStripFrame } from "@/components/patterns/liveCodeStripAdapter";
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

const frame = (
  notes: PatternNote[],
  playbackPhase: number | null,
  showRests = true,
  notation: "solfege" | "note" | "degree" = "solfege",
) => buildLiveCodeStripFrame({
  notes,
  mode: "major",
  musicKey: "C",
  notation,
  showRests,
  barMs: 2000,
  playbackPhase,
  surfaceStyle: "colored",
  keyBrightness: 1,
  keySaturation: 1,
});

describe("live CodeStrip production adapter", () => {
  it("maps sequential notes and silence into accepted CodeStrip tokens", () => {
    const result = frame([
      note("c", "C4", 0, 4, 1000, 500),
      note("d", "D4", 1, 4, 2000, 250),
    ], null);

    expect(result.tokens).toMatchObject([
      {
        type: "note",
        note: "do",
        glyph: "syl",
        text: "Do",
        rawPitch: "C4",
        duration: "@0.25",
        progress: 0,
      },
      { type: "rest", duration: "@0.25", progress: 0 },
      {
        type: "note",
        note: "re",
        text: "Re",
        rawPitch: "D4",
        duration: "@0.125",
        progress: 0,
      },
    ]);
    expect(result.activeTokenIndex).toBeNull();
  });

  it.each([
    ["solfege", "syl", "Do"],
    ["degree", "deg", "1"],
    ["note", "raw", "C4"],
  ] as const)("preserves the %s notation preference", (notation, glyph, text) => {
    const result = frame([note("c", "C4", 0, 4, 1000, 500)], null, true, notation);

    expect(result.tokens[0]).toMatchObject({ type: "note", glyph, text });
  });

  it("clusters overlaps by press order while preserving voicing and independent progress", () => {
    const result = frame([
      note("g", "G4", 4, 4, 1000, 1000),
      note("c", "C4", 0, 4, 1000, 1000),
      note("e", "E4", 2, 4, 1500, 500),
    ], .625);
    const chord = result.tokens[0];

    expect(chord).toMatchObject({
      type: "chord",
      display: "notes",
      duration: "@0.5",
    });
    if (chord.type !== "chord") throw new Error("Expected chord token");

    expect(chord.members.map((member) => member.rawPitch)).toEqual(["G4", "C4", "E4"]);
    expect(chord.members.map((member) => member.pressOrder)).toEqual([0, 1, 2]);
    expect(chord.members.map((member) => member.voicingOrder)).toEqual([2, 0, 1]);
    expect(chord.members.map((member) => member.progress)).toEqual([.625, .625, .25]);
    expect(result.activeTokenIndex).toBe(0);
  });

  it("fills Rest through its own playback span and follows it", () => {
    const result = frame([
      note("c", "C4", 0, 4, 1000, 500),
      note("d", "D4", 1, 4, 2000, 500),
    ], .5);

    expect(result.tokens).toMatchObject([
      { type: "note", progress: 1 },
      { type: "rest", progress: .5 },
      { type: "note", progress: 0 },
    ]);
    expect(result.activeTokenIndex).toBe(1);
  });

  it("keeps timing but omits Rest when the production preference hides it", () => {
    const result = frame([
      note("c", "C4", 0, 4, 1000, 500),
      note("d", "D4", 1, 4, 2000, 500),
    ], .5, false);

    expect(result.tokens.map((token) => token.type)).toEqual(["note", "note"]);
    expect(result.activeTokenIndex).toBeNull();
  });

  it("resets all progress when playback is inactive", () => {
    const result = frame([
      note("c", "C4", 0, 4, 1000, 500),
      note("d", "D4", 1, 4, 1500, 500),
    ], null);

    expect(result.tokens.map((token) => token.type === "note" && token.progress)).toEqual([0, 0]);
    expect(result.activeTokenIndex).toBeNull();
  });
});
