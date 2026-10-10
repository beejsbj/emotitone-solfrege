import { describe, expect, it } from "vitest";
import { Chord, Note } from "@tonaljs/tonal";
import { CHROMATIC_NOTES, MODE_DEFINITIONS, MODE_ORDER, getScaleForMode } from "@/data";
import {
  CHORD_QUALITIES,
  SIGNATURE_MODE,
  describeInterval,
  formatChordSymbol,
  identifyChord,
  identifyPitch,
  intervalBetween,
  keySpelling,
  nameChord,
  parseChordSymbol,
  spellPitch,
  spellTonic,
  spokenPitchName,
  type MusicalContext,
} from "@/domain/musicalIdentity";
import type { MusicalMode } from "@/types/music";
import { LEAD_SHEET } from "./fixtures/leadSheet";

const LETTERS = "CDEFGAB";
const contexts: MusicalContext[] = CHROMATIC_NOTES.flatMap((tonic) =>
  MODE_ORDER.map((mode) => ({ tonic, mode })),
);
const label = ({ tonic, mode }: MusicalContext) => `${tonic} ${mode}`;

function letterIndex(name: string) {
  return LETTERS.indexOf(Note.get(name).letter);
}

function accidentals(name: string) {
  return Math.abs(Note.get(name).alt);
}

describe("musical identity: key spelling", () => {
  it("covers every mode the app offers", () => {
    expect(new Set(MODE_ORDER)).toEqual(new Set(Object.keys(MODE_DEFINITIONS)));
    expect(new Set(Object.keys(SIGNATURE_MODE))).toEqual(new Set(MODE_ORDER));
  });

  it.each([
    ["major", "C Db D Eb E F F# G Ab A Bb B"],
    ["minor", "C C# D Eb E F F# G G# A Bb B"],
    ["dorian", "C C# D Eb E F F# G G# A Bb B"],
    ["phrygian", "C C# D D# E F F# G G# A A# B"],
    ["lydian", "C Db D Eb E F Gb G Ab A Bb B"],
    ["harmonic minor", "C C# D Eb E F F# G G# A Bb B"],
    ["major pentatonic", "C Db D Eb E F F# G Ab A Bb B"],
    ["minor pentatonic", "C C# D Eb E F F# G G# A Bb B"],
    ["minor blues", "C C# D Eb E F F# G G# A Bb B"],
    ["chromatic", "C Db D Eb E F F# G Ab A Bb B"],
  ] as const)("spells the twelve stored tonics in %s", (mode, expected) => {
    expect(CHROMATIC_NOTES.map((tonic) => spellTonic({ tonic, mode })).join(" "))
      .toBe(expected);
  });

  it.each(contexts.map((context) => [label(context), context] as const))(
    "%s: the tonic is the stored pitch with the lighter signature",
    (_, context) => {
      const key = keySpelling(context);
      expect(Note.chroma(key.tonic)).toBe(CHROMATIC_NOTES.indexOf(context.tonic as never));
      expect(accidentals(key.tonic)).toBeLessThanOrEqual(1);
      expect(Math.abs(key.signature)).toBeLessThanOrEqual(6);

      const alternate = Note.enharmonic(context.tonic);
      if (alternate !== context.tonic && accidentals(alternate) <= 1) {
        const other = keySpelling({ tonic: alternate, mode: context.mode });
        // Same pitch, same answer, whichever spelling is stored.
        expect(other.tonic).toBe(key.tonic);
      }
    },
  );

  it.each(contexts.map((context) => [label(context), context] as const))(
    "%s: every degree spells the right pitch from its interval",
    (_, context) => {
      const key = keySpelling(context);
      const scale = getScaleForMode(context.mode);
      expect(key.degrees).toHaveLength(scale.degreeCount);
      key.degrees.forEach((degree, index) => {
        expect(Note.chroma(degree)).toBe(
          (CHROMATIC_NOTES.indexOf(context.tonic as never) + scale.intervals[index]) % 12,
        );
      });
    },
  );

  const heptatonic = contexts.filter(({ mode }) => getScaleForMode(mode).degreeCount === 7);
  it.each(heptatonic.map((context) => [label(context), context] as const))(
    "%s: a heptatonic spelling uses each letter once, in order",
    (_, context) => {
      const { degrees, tonic } = keySpelling(context);
      expect(new Set(degrees.map((degree) => Note.get(degree).letter)).size).toBe(7);
      degrees.forEach((degree, index) => {
        expect(letterIndex(degree)).toBe((letterIndex(tonic) + index) % 7);
      });
    },
  );

  const pentatonic = contexts.filter(({ mode }) => MODE_DEFINITIONS[mode].family === "pentatonic");
  it.each(pentatonic.map((context) => [label(context), context] as const))(
    "%s: a pentatonic spelling is a subset of its key signature's scale",
    (_, context) => {
      const key = keySpelling(context);
      const parent = keySpelling({ tonic: context.tonic, mode: key.signatureMode });
      expect(parent.tonic).toBe(key.tonic);
      expect(parent.degrees).toEqual(expect.arrayContaining([...key.degrees]));
      expect(new Set(key.degrees.map((degree) => Note.get(degree).letter)).size).toBe(5);
    },
  );

  const blues = contexts.filter(({ mode }) => MODE_DEFINITIONS[mode].family === "hexatonic");
  it.each(blues.map((context) => [label(context), context] as const))(
    "%s: a blues spelling is its signature's scale plus the blue note by interval",
    (_, context) => {
      const key = keySpelling(context);
      const parent = keySpelling({ tonic: context.tonic, mode: key.signatureMode });
      const blueInterval = context.mode === "major blues" ? "3m" : "5d";
      const blueNote = Note.transpose(key.tonic, blueInterval);
      const outside = key.degrees.filter((degree) => !parent.degrees.includes(degree));
      expect(outside).toEqual([accidentals(blueNote) > 1
        ? Note.transpose(key.tonic, blueInterval === "5d" ? "4A" : "2A")
        : blueNote]);
      expect(key.degrees.every((degree) => accidentals(degree) <= 1)).toBe(true);
      // The blue note shares a letter with a neighbour, so letters repeat by design.
      expect(new Set(key.degrees.map((degree) => Note.get(degree).letter)).size).toBe(5);
    },
  );

  const chromatic = contexts.filter(({ mode }) => mode === "chromatic");
  it.each(chromatic.map((context) => [label(context), context] as const))(
    "%s: chromatic spelling uses no double accidentals",
    (_, context) => {
      const { degrees } = keySpelling(context);
      expect(new Set(degrees.map((degree) => Note.chroma(degree))).size).toBe(12);
      expect(degrees.every((degree) => accidentals(degree) <= 1)).toBe(true);
    },
  );

  it("spells the fourth of F major as Bb and Eb major by flats", () => {
    expect(keySpelling({ tonic: "F", mode: "major" }).degrees).toEqual([
      "F", "G", "A", "Bb", "C", "D", "E",
    ]);
    expect(keySpelling({ tonic: "D#", mode: "major" }).degrees).toEqual([
      "Eb", "F", "G", "Ab", "Bb", "C", "D",
    ]);
    expect(spellPitch("A#4", { tonic: "F", mode: "major" })).toBe("Bb4");
  });

  it.each([
    ["D#", "major", "Eb", "fewer flats than sharps"],
    ["F#", "major", "F#", "6 sharps tie 6 flats; the stored sharp stays"],
    ["D#", "minor", "Eb", "tie broken by the leading tone: D, not C##"],
    ["D#", "harmonic minor", "Eb", "the raised seventh is D, not C##"],
    ["D#", "melodic minor", "Eb", "the raised sixth and seventh avoid B# and C##"],
    ["D#", "minor pentatonic", "Eb", "minor signature, leading tone tie-break"],
    ["D#", "minor blues", "Eb", "agrees with Eb minor; its blue fifth is written A"],
    ["A#", "phrygian", "A#", "6 sharps tie 6 flats in the mode itself"],
    ["G#", "dorian", "G#", "6 sharps tie 6 flats in the mode itself"],
  ] as const)("spells a stored %s %s as %s (%s)", (tonic, mode, expected) => {
    expect(spellTonic({ tonic, mode })).toBe(expected);
  });

  it("gives D#/Eb minor a leading tone without a double sharp", () => {
    expect(keySpelling({ tonic: "D#", mode: "harmonic minor" }).degrees).toEqual([
      "Eb", "F", "Gb", "Ab", "Bb", "Cb", "D",
    ]);
  });

  it("spells Eb minor blues' blue note as A rather than Bbb", () => {
    const context = { tonic: "D#", mode: "minor blues" as MusicalMode };
    expect(keySpelling(context).degrees).toEqual(["Eb", "Gb", "Ab", "A", "Bb", "Db"]);
    expect(identifyPitch("A", context)).toMatchObject({
      spelling: "A", borrowed: false,
      interval: { label: "A4" }, functionalInterval: { label: "d5" },
    });
  });

  it("keeps true leading tones in harmonic minor, double sharps included", () => {
    expect(keySpelling({ tonic: "A", mode: "harmonic minor" }).degrees.at(-1)).toBe("G#");
    expect(keySpelling({ tonic: "G#", mode: "harmonic minor" }).degrees.at(-1)).toBe("F##");
  });
});

describe("musical identity: pitches and intervals", () => {
  it.each(contexts.map((context) => [label(context), context] as const))(
    "%s: every pitch class names an interval that matches semitones and letters",
    (_, context) => {
      const key = keySpelling(context);
      for (const inflection of [undefined, "raised", "lowered"] as const) {
        for (let pitchClass = 0; pitchClass < 12; pitchClass += 1) {
          const identity = identifyPitch(pitchClass, context, { inflection })!;
          expect(Note.chroma(identity.spelling)).toBe(pitchClass);
          expect(identity.semitones).toBe((pitchClass - key.tonicPitchClass + 12) % 12);
          expect(identity.interval.semitones).toBe(identity.semitones);
          expect(identity.interval.number).toBe(
            ((letterIndex(identity.spelling) - letterIndex(key.tonic) + 7) % 7) + 1,
          );
          // Function follows the rule; only the written form may fall back.
          expect(identity.degree).toBe(identity.functionalInterval.number);
          expect(identity.functionalInterval.semitones).toBe(identity.semitones);
          expect((identity.degree === 1 ? 0 : [0, 2, 4, 5, 7, 9, 11][identity.degree - 1])
            + identity.alteration).toBe(identity.semitones);
          expect(identity.borrowed).toBe(identity.scaleIndex === null);
          if (identity.scaleIndex !== null && context.mode !== "chromatic") {
            expect(identity.spelling).toBe(key.degrees[identity.scaleIndex]);
          }
        }
      }
    },
  );

  it("names borrowed tones by the harmonic chromatic scale", () => {
    const c = { tonic: "C", mode: "major" as MusicalMode };
    expect(["C#", "D#", "F#", "G#", "A#"].map((pitch) => spellPitch(`${pitch}4`, c)))
      .toEqual(["Db4", "Eb4", "F#4", "Ab4", "Bb4"]);
    expect(identifyPitch("D#", c)).toMatchObject({
      spelling: "Eb",
      borrowed: true,
      scaleIndex: null,
      degree: 3,
      alteration: -1,
      interval: { label: "m3", tonal: "3m", spoken: "minor third" },
    });
    expect(identifyPitch("A#", { tonic: "F", mode: "major" })).toMatchObject({
      spelling: "Bb", borrowed: false, scaleIndex: 3, alteration: 0,
      interval: { label: "P4" },
    });
  });

  it("offers raised and lowered forms for later chromatic syllables", () => {
    const c = { tonic: "C", mode: "major" as MusicalMode };
    expect([1, 3, 6, 8, 10].map((pc) => identifyPitch(pc, c, { inflection: "raised" })!.spelling))
      .toEqual(["C#", "D#", "F#", "G#", "A#"]);
    expect([1, 3, 6, 8, 10].map((pc) => identifyPitch(pc, c, { inflection: "lowered" })!.spelling))
      .toEqual(["Db", "Eb", "Gb", "Ab", "Bb"]);
    // A scale tone keeps its key spelling whatever the direction.
    expect(identifyPitch("F#", { tonic: "D", mode: "major" }, { inflection: "lowered" })!.spelling)
      .toBe("F#");
  });

  it.each([undefined, "raised", "lowered"] as const)("exposes written and functional intervals for solfege (%s)", (inflection) => {
    // Db major's b6 would be Bbb; A natural is the raised fifth.
    expect(spellPitch("A4", { tonic: "C#", mode: "major" })).toBe("A4");
    // Default solfege follows written A5; an explicit inflection can use function.
    expect(identifyPitch("A", { tonic: "C#", mode: "major" }, { inflection })).toMatchObject({
      spelling: "A",
      interval: { label: "A5" },
      functionalInterval: { label: inflection === "raised" ? "A5" : "m6" },
      degree: inflection === "raised" ? 5 : 6,
      alteration: inflection === "raised" ? 1 : -1,
    });
  });

  it.each(contexts.filter((_, index) => index % 5 === 0).map((context) => [label(context), context] as const))(
    "%s: spelled pitches keep their height across octave boundaries",
    (_, context) => {
      for (let height = 0; height <= 127; height += 1) {
        expect(Note.get(spellPitch(height, context)!).height).toBe(height);
      }
    },
  );

  it("spells B#/Cb octaves by letter (Cb5 sits at B4's height)", () => {
    expect(spellPitch("B4", { tonic: "F", mode: "locrian" })).toBe("Cb5");
    expect(spellPitch("F5", { tonic: "F#", mode: "major" })).toBe("E#5");
  });

  it("reads C to Eb as a minor third, wherever Eb is stored as D#", () => {
    const c = { tonic: "C", mode: "major" as MusicalMode };
    expect(intervalBetween(spellPitch("C4", c)!, spellPitch("D#4", c)!)?.label).toBe("m3");
    expect(intervalBetween("C4", "Eb4")).toMatchObject({ label: "m3", spoken: "minor third" });
  });

  it("names harmonic intervals by size, lower note first", () => {
    expect(intervalBetween("C5", "E4")?.label).toBe("m6");
    expect(intervalBetween("C4", "E5")?.label).toBe("M10");
    expect(intervalBetween("C4", "C5")).toMatchObject({ label: "P8", spoken: "perfect octave" });
    expect(intervalBetween("F4", "B4")).toMatchObject({ label: "A4", spoken: "augmented fourth" });
    expect(intervalBetween("B4", "F5")).toMatchObject({ label: "d5", spoken: "diminished fifth" });
  });

  it("agrees with semitone and letter distance for every pair of spelled pitches", () => {
    // Single accidentals: the labels the instrument shows (doubles are checked above).
    const names = LETTERS.split("").flatMap((letter) => ["b", "", "#"]
      .flatMap((accidental) => [3, 4, 5].map((octave) => `${letter}${accidental}${octave}`)));
    for (const first of names) {
      for (const second of names) {
        const [a, b] = [Note.get(first), Note.get(second)];
        const rank = (note: typeof a) => note.oct! * 7 + note.step;
        // Pitch order and letter order must agree for an interval to exist
        // (Cb4 above B#3 in letters but below it in pitch has no name).
        if ((a.height - b.height) * (rank(a) - rank(b)) < 0) continue;
        const [lower, upper] = a.height < b.height || (a.height === b.height && rank(a) <= rank(b))
          ? [a, b]
          : [b, a];
        const interval = intervalBetween(first, second)!;
        expect(interval.semitones).toBe(upper.height - lower.height);
        expect(interval.number).toBe(rank(upper) - rank(lower) + 1);
      }
    }
  });

  it("speaks spelled pitch names", () => {
    expect(spokenPitchName("Bb4")).toBe("B flat 4");
    expect(spokenPitchName("F##")).toBe("F double sharp");
    expect(spokenPitchName("C")).toBe("C");
    expect(describeInterval("4A")?.spoken).toBe("augmented fourth");
  });
});

describe("musical identity: chord symbols", () => {
  it.each(LEAD_SHEET.map((entry) => [
    `${entry.tonic} ${entry.mode}: ${entry.pitches.join(" ")} (${entry.note})`,
    entry,
  ] as const))("%s", (_, entry) => {
    const chord = identifyChord(entry.pitches, entry);
    expect(chord?.symbol).toBe(entry.symbol);
  });

  it("names a chord the same whatever order its notes were pressed", () => {
    const f = { tonic: "F", mode: "major" as MusicalMode };
    expect(identifyChord(["F4", "D4", "A#4"], f)?.symbol).toBe("Bb/D");
    expect(identifyChord(["A#4", "F4", "D4"], f)?.symbol).toBe("Bb/D");
  });

  it("spells chord members from the root and keeps each input's octave", () => {
    const chord = identifyChord(["E3", "G#3", "B3"], { tonic: "C", mode: "major" })!;
    expect(chord.members).toEqual(["E", "G#", "B"]);
    expect(chord.pitchSpellings).toEqual(["E3", "G#3", "B3"]);
    expect(identifyChord(["D#4", "G4", "A#4"], { tonic: "G#", mode: "minor" })!.pitchSpellings)
      .toEqual(["D#4", "F##4", "A#4"]);
  });

  it("speaks chords for screen readers", () => {
    expect(identifyChord(["D4", "F4", "A#4"], { tonic: "F", mode: "major" })?.spoken)
      .toBe("B flat major over D");
    expect(nameChord(11, "halfDiminished7", { tonic: "C", mode: "major" }).spoken)
      .toBe("B half-diminished seventh");
  });

  it("keeps a minor-major seventh whole rather than reading ma7 as a bass", () => {
    expect(identifyChord(["C4", "D#4", "G4", "B4"], { tonic: "C", mode: "major" })?.symbol)
      .toBe("Cm(maj7)");
    expect(identifyChord(["A3", "C4", "E4", "G#4"], { tonic: "A", mode: "harmonic minor" }))
      .toMatchObject({ symbol: "Am(maj7)", quality: "minorMajor7" });
  });

  it("prefers a catalog name over Tonal's first candidate", () => {
    // Tonal ranks CM7b6 first for C E G# B.
    expect(identifyChord(["C4", "E4", "G#4", "B4"], { tonic: "C", mode: "major" }))
      .toMatchObject({ symbol: "C+maj7", quality: "augmentedMajor7" });
  });

  it("roots a symmetric chord where its spelling is simplest", () => {
    const c = { tonic: "C", mode: "major" as MusicalMode };
    // Tonal offers E+ (E G# B#) first; C+ over E needs one accidental.
    expect(identifyChord(["E4", "G#4", "C5"], c)?.symbol).toBe("C+/E");
    expect(identifyChord(["C4", "E4", "G#4"], c)?.symbol).toBe("C+");
    // A tie keeps the bass as root.
    expect(identifyChord(["G#3", "B3", "D4", "F4"], c)?.symbol).toBe("G#°7");
  });

  it("returns no chord for a dyad Tonal cannot name", () => {
    expect(identifyChord(["C4", "E4"], { tonic: "C", mode: "major" })).toBeNull();
  });

  it("formats every catalog quality and reads it back", () => {
    for (const { quality, intervals } of CHORD_QUALITIES) {
      for (const root of ["C", "Bb", "F#"]) {
        for (const bass of [null, Note.transpose(root, intervals[1])]) {
          const symbol = formatChordSymbol({ root, quality, bass });
          const parsed = parseChordSymbol(symbol)!;
          expect(parsed).toMatchObject({ root, quality, bass: bass ?? null });
          expect(parsed.intervals).toEqual(intervals);
          // The symbol can still be classified by Tonal.
          expect(Chord.get(parsed.tonalName).intervals).toEqual(intervals);
        }
      }
    }
  });

  it("uses lead-sheet forms rather than Tonal's names", () => {
    const c = { tonic: "C", mode: "major" as MusicalMode };
    expect(formatChordSymbol({ root: "C", quality: "major", bass: "E" })).toBe("C/E");
    expect(nameChord(0, "minor", c).symbol).toBe("Cm");
    expect(nameChord(11, "diminished", c).symbol).toBe("B°");
    expect(nameChord(11, "halfDiminished7", c).symbol).toBe("Bø7");
    expect(nameChord("A#", "major7", { tonic: "F", mode: "major" }).symbol).toBe("Bbmaj7");
  });
});
