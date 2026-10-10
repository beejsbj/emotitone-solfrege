import { describe, expect, it } from "vitest";
import { CHROMATIC_NOTES } from "@/data/notes";
import { MODE_ORDER } from "@/data/modes";
import { getScaleForMode } from "@/data/scales";
import { buildDefaultPattern, defaultPatterns, transposePatternNotes } from "@/data/patterns";
import { remap } from "@/domain/modeRemap";
import { identifyPitch, pitchHeightOf } from "@/domain/musicalIdentity";
import { createPhraseBook, followControls, getTake, openPhrase, phraseFromPattern } from "@/domain/phraseBook";
import { getSolfegeLabelForInterval } from "@/data/solfege";
import type { PatternNote } from "@/types/patterns";

function notes(...pitches: string[]): PatternNote[] {
  return buildDefaultPattern({
    id: "test", name: "test", key: "C", mode: "major", bpm: 120, instrument: "piano",
    steps: pitches.map((note) => ({ note, duration: 250 })),
  }).notes;
}

const heights = (notes: readonly PatternNote[]) => notes.map((note) => pitchHeightOf(note.note)!);

describe("mode remap", () => {
  it("keeps Twinkle's Sol as Sol when G major becomes pentatonic", () => {
    const twinkle = defaultPatterns.find((pattern) => pattern.id === "pattern-twinkle-1")!;
    const mapped = remap(twinkle.notes, twinkle.mode, "major pentatonic", twinkle.key);
    expect(mapped.slice(0, 7).map((note) => note.note)).toEqual([
      "G4", "G4", "D5", "D5", "E5", "E5", "D5",
    ]);
    expect(mapped[2].scaleIndex).toBe(3);
    expect(mapped[7].note).toBe("B4"); // C5 is a tie: B4 wins over D5.
  });

  it("maps equal-size scales by actual pitch's degree, ignoring stale indices", () => {
    const base = notes("B3", "C4", "E4", "B4", "C5");
    base.forEach((note) => { note.scaleIndex = 99; });
    expect(remap(base, "major", "minor", "C").map((note) => note.note))
      .toEqual(["A#3", "C4", "D#4", "A#4", "C5"]);
  });

  it("snaps across octaves and breaks ties lower", () => {
    const mapped = remap(notes("B3", "F4", "F#4", "B4"), "chromatic", "major pentatonic", "C");
    expect(mapped.map((note) => note.note)).toEqual(["C4", "E4", "G4", "C5"]);
    const ties = remap(notes("E4", "B4"), "chromatic", "minor pentatonic", "C");
    expect(ties.map((note) => note.note)).toEqual(["D#4", "A#4"]);
  });

  it("applies the specified rules to equal-size blues scales with a borrowed tone", () => {
    const base = notes("E4", "F4");
    base[1] = { ...base[1], scaleIndex: -1, scaleDegree: 0, isBorrowed: true };
    // Degree mapping moves E to F#, while borrowed F is already a target
    // tone. This is the documented contour exception to the two policies.
    expect(remap(base, "major blues", "minor blues", "C").map((note) => note.note))
      .toEqual(["F#4", "F4"]);
    expect(remap(base, "major blues", "major blues", "C")).toEqual(base);
  });

  it("restores all original fields and borrowed flags without mutating the base", () => {
    const base = notes("C#4", "F#4", "G4");
    base[0].scaleIndex = -1;
    base[1].isBorrowed = true;
    delete base[2].isBorrowed;
    base[0].velocity = 0.4;
    base[0].pitchExpression = [{ timeMs: 0, cents: 15 }];
    const saved = structuredClone(base);
    remap(base, "major", "minor pentatonic", "C");
    expect(base).toEqual(saved);
    expect(remap(base, "major", "major", "C")).toEqual(saved);
  });

  it("stores Hot Cross Buns as Mi-Re-Do in E major", () => {
    const buns = defaultPatterns.find((pattern) => pattern.id === "pattern-hot-cross-buns-1")!;
    expect(buns.mode).toBe("major");
    expect(buns.notes.slice(0, 3).map((note) => note.note)).toEqual(["G#4", "F#4", "E4"]);
    expect(buns.notes.slice(0, 3).map((note) => note.scaleDegree)).toEqual([3, 2, 1]);
    expect(buns.notes.slice(0, 3).map((note) => getSolfegeLabelForInterval(
      identifyPitch(note.note, { tonic: buns.key, mode: buns.mode })!.interval.tonal,
    ))).toEqual(["Mi", "Re", "Do"]);
  });

  for (const key of CHROMATIC_NOTES) {
    it(`preserves library contour and exact follow round trips in ${key}, all mode pairs`, () => {
      const failures: string[] = [];
      let collapses = 0;
      for (const pattern of defaultPatterns) {
        const transposed = transposePatternNotes(pattern.notes,
          CHROMATIC_NOTES.indexOf(key) - CHROMATIC_NOTES.indexOf(pattern.key));
        for (const fromMode of MODE_ORDER) {
          const base = remap(transposed, pattern.mode, fromMode, key);
          for (const toMode of MODE_ORDER) {
            const mapped = remap(base, fromMode, toMode, key);
            const before = heights(base);
            const after = heights(mapped);
            for (let i = 1; i < before.length; i++) {
              const direction = Math.sign(before[i] - before[i - 1]);
              const nextDirection = Math.sign(after[i] - after[i - 1]);
              if (direction !== 0 && nextDirection === 0) {
                collapses++;
                // A collapse is legal only at one shared target scale tone.
                if (identifyPitch(mapped[i].note, { tonic: key, mode: toMode })!.borrowed) {
                  failures.push(`${pattern.name} ${fromMode} -> ${toMode}: borrowed collapse ${i}`);
                }
              } else if (direction !== nextDirection) {
                failures.push(`${pattern.name} ${fromMode} -> ${toMode}: reversal ${i} ${before[i - 1]},${before[i]} -> ${after[i - 1]},${after[i]}`);
              }
            }
            const phrase = phraseFromPattern({ ...pattern, key, mode: fromMode, notes: base }, "library");
            const book = createPhraseBook(phrase.context, 0);
            openPhrase(book, phrase.id, [phrase], 0);
            const original = structuredClone(getTake(book).notes);
            followControls(book, new Map(), { ...phrase.context, mode: toMode });
            followControls(book, new Map(), phrase.context);
            if (JSON.stringify(getTake(book).notes) !== JSON.stringify(original)) {
              failures.push(`${pattern.name} ${fromMode} -> ${toMode}: round trip`);
            }
            // Every changed pitch must follow degree mapping or the bounded
            // nearest-tone rule. Metadata names the resulting target pitch.
            mapped.forEach((note, index) => {
              if (fromMode === toMode) return;
              const identity = identifyPitch(note.note, { tonic: key, mode: toMode })!;
              if (note.isBorrowed !== identity.borrowed || note.scaleIndex !== (identity.scaleIndex ?? -1)) {
                failures.push(`${pattern.name} ${fromMode} -> ${toMode}: identity ${index}`);
              }
              if (getScaleForMode(fromMode).degreeCount !== getScaleForMode(toMode).degreeCount
                && Math.abs(after[index] - before[index]) > 1) {
                failures.push(`${pattern.name} ${fromMode} -> ${toMode}: snap distance ${index}`);
              }
            });
          }
        }
      }
      expect(failures).toEqual([]);
      expect(collapses).toBeGreaterThan(0);
    });
  }
});
