import { defaultPatterns } from "@/data/patterns";
import { CHROMATIC_NOTES } from "@/data";
import { normalizeChromaticNote } from "@/services/musicColor";
import type { Pattern } from "@/types/patterns";
import type { PatternReelPrototypeItem } from "./types";

function displayNote(note: string) {
  return note.replace(/\d+$/, "");
}

function rootOctave(pattern: Pattern) {
  const tonic = pattern.notes.find((note) => displayNote(note.note) === pattern.key);
  return tonic?.octave ?? pattern.notes[0]?.octave ?? 4;
}

function musicColor(pitchClassIndex: number, octave: number) {
  const hue = ((pitchClassIndex + .5) * 30) % 360;
  return `oklch(calc(20% + (${octave} * 7.5%)) var(--music-c) ${hue}deg)`;
}

function notePitchClass(noteName: string) {
  const chromaticNote = normalizeChromaticNote(noteName);
  const index = chromaticNote ? CHROMATIC_NOTES.indexOf(chromaticNote) : -1;
  return Math.max(0, index);
}

function toPrototypeItem(pattern: Pattern): PatternReelPrototypeItem {
  const octave = rootOctave(pattern);

  return {
    id: pattern.id,
    name: pattern.name ?? "Untitled pattern",
    rootPitchClass: Math.max(0, CHROMATIC_NOTES.indexOf(pattern.key)),
    rootOctave: octave,
    rootLabel: `${pattern.key}${octave}`,
    barTape: pattern.notes.map((note) => ({
      color: musicColor(notePitchClass(note.note), note.octave),
      durationMs: note.duration,
    })),
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
    barTape: [{ color: musicColor(0, 4), durationMs: 460 }],
    codeTokens: ["C4"],
    isLive: true,
  },
];
