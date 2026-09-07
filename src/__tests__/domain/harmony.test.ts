import { describe, expect, it } from "vitest";
import { buildHarmony, SCALE_CONTAINED_TEMPLATE_RANKING } from "@/domain/harmony";
import type { MusicalMode } from "@/types/music";

describe("harmony domain", () => {
  it.each([
    ["major pentatonic", 5],
    ["major blues", 6],
    ["major", 7],
    ["chromatic", 12],
  ] as const)("builds one chord per %s scale degree", (scaleType, count) => {
    expect(buildHarmony({ tonic: "C", scaleType })).toHaveLength(count);
  });

  it("stacks scale-contained thirds for seven-note scales with octave wrapping", () => {
    const chords = buildHarmony({ tonic: "C", scaleType: "major", octave: 4 });

    expect(chords.map((chord) => chord.symbol)).toEqual([
      "C", "Dm", "Em", "F", "G", "Am", "Bdim",
    ]);
    expect(chords[5].voicing.pitches.map((pitch) => pitch.name)).toEqual([
      "A4", "C5", "E5",
    ]);
    expect(chords[6].voicing.pitches.map((pitch) => pitch.name)).toEqual([
      "B4", "D5", "F5",
    ]);
    expect(chords.every((chord) =>
      chord.voicing.pitches.every((pitch) => pitch.scaleIndex !== null),
    )).toBe(true);
  });

  it("uses the documented template ranking and truthful fallback for sparse scales", () => {
    expect(SCALE_CONTAINED_TEMPLATE_RANKING.map(({ quality }) => quality)).toEqual([
      "major", "minor", "diminished", "augmented", "sus2", "sus4",
    ]);

    for (const scaleType of [
      "major pentatonic",
      "minor pentatonic",
      "major blues",
      "minor blues",
    ] as MusicalMode[]) {
      const chords = buildHarmony({ tonic: "F#", scaleType });
      expect(chords.every((chord) =>
        chord.voicing.pitches.every((pitch) => pitch.scaleIndex !== null),
      )).toBe(true);
      expect(chords.every((chord) =>
        chord.quality !== "dyad" || chord.symbol.includes("–"),
      )).toBe(true);
    }
  });

  it("uses an explicit all-major base bank for chromatic mode", () => {
    const chords = buildHarmony({ tonic: "C", scaleType: "chromatic" });

    expect(chords.every((chord) => chord.policy === "chromatic-major-bank"))
      .toBe(true);
    expect(chords.every((chord) => chord.quality === "major")).toBe(true);
    expect(chords[11].voicing.pitches.map((pitch) => pitch.name)).toEqual([
      "B4", "D#5", "F#5",
    ]);
  });

  it("keeps alteration separate from voicing and permits explicit borrowed pitches", () => {
    const [automatic] = buildHarmony({ tonic: "C", scaleType: "major" });
    const [dark] = buildHarmony({
      tonic: "C",
      scaleType: "major",
      alteration: "dark",
    });

    expect(automatic.alteration).toBe("auto");
    expect(dark.alteration).toBe("dark");
    expect(dark.voicing.kind).toBe("close-position");
    expect(dark.voicing.pitches.map((pitch) => pitch.name)).toEqual([
      "C4", "D#4", "G4",
    ]);
    expect(dark.voicing.pitches[1].scaleIndex).toBeNull();
  });

  it("maps the eight HiChord-inspired directions to deterministic qualities", () => {
    const alterationQuality = [
      ["flip", "minor"],
      ["dominant7", "dominant7"],
      ["dark", "minor"],
      ["jazzy7", "major7"],
      ["augmented", "augmented"],
      ["sweet", "major6"],
      ["sus4", "sus4"],
      ["lush9", "major9"],
    ] as const;

    for (const [alteration, quality] of alterationQuality) {
      expect(buildHarmony({
        tonic: "C",
        scaleType: "major",
        alteration,
      })[0].quality).toBe(quality);
    }
  });
});
