import { defaultPatterns } from "@/data/patterns";
import { CHROMATIC_NOTES } from "@/data";
import type { Pattern } from "@/types/patterns";
import type { PatternReelPrototypeItem } from "./types";

function displayNote(note: string) {
  return note.replace(/\d+$/, "");
}

function rootOctave(pattern: Pattern) {
  const tonic = pattern.notes.find((note) => displayNote(note.note) === pattern.key);
  return tonic?.octave ?? pattern.notes[0]?.octave ?? 4;
}

function toPrototypeItem(pattern: Pattern): PatternReelPrototypeItem {
  const octave = rootOctave(pattern);

  return {
    id: pattern.id,
    name: pattern.name ?? "Untitled pattern",
    rootPitchClass: Math.max(0, CHROMATIC_NOTES.indexOf(pattern.key)),
    rootOctave: octave,
    rootLabel: `${pattern.key}${octave}`,
    codeTokens: pattern.notes.slice(0, 9).map((note) => displayNote(note.note)),
  };
}

const libraryPatterns = defaultPatterns.map(toPrototypeItem);

export const patternReelPrototypeItems: PatternReelPrototypeItem[] = [
  ...libraryPatterns,
  {
    id: "prototype-current-take",
    name: "Current take",
    rootPitchClass: 0,
    rootOctave: 4,
    rootLabel: "C4",
    codeTokens: ["C4"],
    isLive: true,
  },
];
