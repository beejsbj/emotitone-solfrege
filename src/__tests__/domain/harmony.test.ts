import { describe, expect, it } from "vitest";
import { buildHarmony, HARMONY_ALTERATIONS, SCALE_CONTAINED_TEMPLATE_RANKING } from "@/domain/harmony";
import { identifyChord } from "@/domain/musicalIdentity";
import { CHROMATIC_NOTES, MODE_ORDER } from "@/data";
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
      "C", "Dm", "Em", "F", "G", "Am", "B°",
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

  it("revoices extended chords into MIDI's playable range", () => {
    const chords = buildHarmony({
      tonic: "C",
      scaleType: "major",
      octave: 8,
      alteration: "lush9",
    });

    expect(chords.flatMap((chord) => chord.voicing.pitches).every(
      (pitch) => pitch.midi >= 0 && pitch.midi <= 127,
    )).toBe(true);
    expect(chords[6].voicing.pitches.map((pitch) => pitch.name)).toEqual([
      "B7", "D8", "F#8", "A8", "C#9",
    ]);
  });

  it("spells the F-major chord row by key: Bb, not A#", () => {
    const chords = buildHarmony({ tonic: "F", scaleType: "major" });

    expect(chords.map((chord) => chord.symbol)).toEqual([
      "F", "Gm", "Am", "Bb", "C", "Dm", "E°",
    ]);
    expect(chords[3].voicing.pitches.map((pitch) => pitch.label)).toEqual([
      "Bb4", "D5", "F5",
    ]);
    // The attack key stays sharps-only and unchanged.
    expect(chords[3].voicing.pitches[0].name).toBe("A#4");
    expect(chords[3].accessibleName).toBe("B flat major chord");
  });

  it("spells the Eb-major chord row from a stored D# tonic", () => {
    const chords = buildHarmony({ tonic: "D#", scaleType: "major" });

    expect(chords.map((chord) => chord.symbol)).toEqual([
      "Eb", "Fm", "Gm", "Ab", "Bb", "Cm", "D°",
    ]);
    expect(buildHarmony({ tonic: "D#", scaleType: "major", alteration: "jazzy7" })
      .map((chord) => chord.symbol)).toEqual([
      "Ebmaj7", "Fm7", "Gm7", "Abmaj7", "Bbmaj7", "Cm7", "Dm7",
    ]);
  });

  it("spells borrowed alteration members from the chord root", () => {
    const [dark] = buildHarmony({ tonic: "C", scaleType: "major", alteration: "dark" });
    expect(dark.symbol).toBe("Cm");
    expect(dark.voicing.pitches.map((pitch) => pitch.label)).toEqual(["C4", "Eb4", "G4"]);

    const flipped = buildHarmony({ tonic: "C", scaleType: "major", alteration: "flip" })[2];
    expect(flipped.symbol).toBe("E");
    expect(flipped.voicing.pitches.map((pitch) => pitch.label)).toEqual(["E4", "G#4", "B4"]);
  });

  it("names every chord-row chord as the Stage would name its sounding pitches", () => {
    // One chord namer: a chord is never named two ways on one screen.
    for (const tonic of CHROMATIC_NOTES) {
      for (const scaleType of MODE_ORDER) {
        for (const alteration of HARMONY_ALTERATIONS) {
          for (const chord of buildHarmony({ tonic, scaleType, alteration })) {
            if (chord.quality === "dyad" || chord.quality === "octave") continue;
            const stage = identifyChord(
              chord.voicing.pitches.map((pitch) => pitch.name),
              { tonic, mode: scaleType },
            );
            expect(
              stage?.symbol,
              `${tonic} ${scaleType} ${alteration} degree ${chord.degreeIndex + 1}`,
            ).toBe(chord.symbol);
            expect(stage?.pitchSpellings).toEqual(chord.voicing.pitches.map((pitch) => pitch.label));
          }
        }
      }
    }
  });
});
