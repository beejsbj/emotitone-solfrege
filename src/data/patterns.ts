import type { Pattern, PatternNote } from "@/types/patterns";

type MelodyStep = {
  note: string;
  duration: number;
};

const SCALE_INDEX_BY_NOTE: Record<string, number> = {
  C: 0,
  D: 1,
  E: 2,
  F: 3,
  G: 4,
  A: 5,
  B: 6,
};

function buildPatternNotes(patternId: string, steps: MelodyStep[]): PatternNote[] {
  let cursor = 0;

  return steps.map((step, index) => {
    const noteLetter = step.note[0];
    const octave = Number(step.note.slice(-1));
    const scaleIndex = SCALE_INDEX_BY_NOTE[noteLetter] ?? 0;
    const note: PatternNote = {
      id: `${patternId}-note-${index + 1}`,
      note: step.note,
      scaleDegree: scaleIndex + 1,
      scaleIndex,
      octave,
      pressTime: cursor,
      releaseTime: cursor + step.duration,
      duration: step.duration,
    };

    cursor += step.duration;
    return note;
  });
}

function buildDefaultPattern(
  id: string,
  name: string,
  steps: MelodyStep[],
  instrument = "piano"
): Pattern {
  const notes = buildPatternNotes(id, steps);
  const firstNote = notes[0];
  const lastNote = notes[notes.length - 1];

  return {
    id,
    name,
    notes,
    duration: lastNote.releaseTime - firstNote.pressTime,
    noteCount: notes.length,
    key: "C",
    mode: "major",
    instrument,
    createdAt: 0,
    isDefault: true,
    isKept: true,
  };
}

export const defaultPatterns: Pattern[] = [
  buildDefaultPattern("pattern-twinkle-1", "Twinkle Twinkle Little Star", [
    { note: "C4", duration: 500 },
    { note: "C4", duration: 500 },
    { note: "G4", duration: 500 },
    { note: "G4", duration: 500 },
    { note: "A4", duration: 500 },
    { note: "A4", duration: 500 },
    { note: "G4", duration: 1000 },
    { note: "F4", duration: 500 },
    { note: "F4", duration: 500 },
    { note: "E4", duration: 500 },
    { note: "E4", duration: 500 },
    { note: "D4", duration: 500 },
    { note: "D4", duration: 500 },
    { note: "C4", duration: 1000 },
  ]),
  buildDefaultPattern("pattern-mary-1", "Mary Had a Little Lamb", [
    { note: "E4", duration: 500 },
    { note: "D4", duration: 500 },
    { note: "C4", duration: 500 },
    { note: "D4", duration: 500 },
    { note: "E4", duration: 500 },
    { note: "E4", duration: 500 },
    { note: "E4", duration: 1000 },
    { note: "D4", duration: 500 },
    { note: "D4", duration: 500 },
    { note: "D4", duration: 1000 },
    { note: "E4", duration: 500 },
    { note: "G4", duration: 500 },
    { note: "G4", duration: 1000 },
  ]),
  buildDefaultPattern("pattern-hot-cross-buns-1", "Hot Cross Buns", [
    { note: "E4", duration: 500 },
    { note: "D4", duration: 500 },
    { note: "C4", duration: 1000 },
    { note: "E4", duration: 500 },
    { note: "D4", duration: 500 },
    { note: "C4", duration: 1000 },
    { note: "C4", duration: 250 },
    { note: "C4", duration: 250 },
    { note: "C4", duration: 250 },
    { note: "C4", duration: 250 },
    { note: "D4", duration: 250 },
    { note: "D4", duration: 250 },
    { note: "D4", duration: 250 },
    { note: "D4", duration: 250 },
    { note: "E4", duration: 500 },
    { note: "D4", duration: 500 },
    { note: "C4", duration: 1000 },
  ]),
  buildDefaultPattern("pattern-ode-to-joy-1", "Ode to Joy", [
    { note: "E4", duration: 500 },
    { note: "E4", duration: 500 },
    { note: "F4", duration: 500 },
    { note: "G4", duration: 500 },
    { note: "G4", duration: 500 },
    { note: "F4", duration: 500 },
    { note: "E4", duration: 500 },
    { note: "D4", duration: 500 },
    { note: "C4", duration: 500 },
    { note: "C4", duration: 500 },
    { note: "D4", duration: 500 },
    { note: "E4", duration: 500 },
    { note: "E4", duration: 750 },
    { note: "D4", duration: 250 },
    { note: "D4", duration: 1000 },
  ]),
];
