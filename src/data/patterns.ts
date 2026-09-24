import type { Pattern, PatternNote } from "@/types/patterns";
import { DEFAULT_INSTRUMENT } from "@/data/instruments";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import { CHROMATIC_NOTES } from "@/data/notes";
import { getScaleForMode } from "@/data/scales";
import { Note as TonalNote, Scale as TonalScale } from "@tonaljs/tonal";

export type MelodyStep = {
  note: string;
  duration: number;
};

export interface DefaultPatternOptions {
  id: string;
  name: string;
  key: ChromaticNote;
  mode: MusicalMode;
  bpm: number;
  instrument: string;
  steps?: MelodyStep[];
  strudel?: string;
}

function step(note: string, beats: number, bpm: number): MelodyStep {
  return {
    note,
    duration: Math.round((60000 / bpm) * beats),
  };
}

function getScaleNotes(key: ChromaticNote, mode: MusicalMode): ChromaticNote[] {
  const scale = getScaleForMode(mode);
  const tonalNotes = TonalScale.get(`${key} ${scale.tonalName}`).notes;
  if (tonalNotes.length) {
    return tonalNotes.map((n) => {
      const parsed = TonalNote.get(n);
      return CHROMATIC_NOTES[parsed.chroma >= 0 ? parsed.chroma : 0];
    });
  }
  return scale.intervals.map((semitones) => {
    const rootIndex = CHROMATIC_NOTES.indexOf(key);
    return CHROMATIC_NOTES[(rootIndex + semitones) % 12];
  });
}

function getScaleIndex(
  pc: ChromaticNote,
  key: ChromaticNote,
  mode: MusicalMode
): { scaleIndex: number; isBorrowed: boolean } {
  const scaleNotes = getScaleNotes(key, mode);
  const exactIndex = scaleNotes.indexOf(pc);
  if (exactIndex !== -1) {
    return { scaleIndex: exactIndex, isBorrowed: false };
  }
  const rootIndex = CHROMATIC_NOTES.indexOf(key);
  const noteIndex = CHROMATIC_NOTES.indexOf(pc);
  const relativeSemitone = (noteIndex - rootIndex + 12) % 12;
  const intervals = getScaleForMode(mode).intervals;
  let fallbackIndex = 0;
  for (let i = 0; i < intervals.length; i++) {
    if (intervals[i] <= relativeSemitone) fallbackIndex = i;
    else break;
  }
  return { scaleIndex: fallbackIndex, isBorrowed: true };
}

export function getSemitoneShift(oldKey: ChromaticNote, newKey: ChromaticNote): number {
  const oldIndex = CHROMATIC_NOTES.indexOf(oldKey);
  const newIndex = CHROMATIC_NOTES.indexOf(newKey);
  if (oldIndex === -1 || newIndex === -1) return 0;
  let shift = (newIndex - oldIndex) % 12;
  if (shift > 6) shift -= 12;
  if (shift < -6) shift += 12;
  return shift;
}

export function transposePatternNotes(
  notes: PatternNote[],
  semitones: number,
): PatternNote[] {
  if (semitones === 0) return notes;
  return notes.map((note) => {
    const midi = TonalNote.midi(note.note);
    if (midi == null) return note;
    const newNoteName = TonalNote.fromMidi(midi + semitones);
    const parsed = TonalNote.get(newNoteName);
    const pc = CHROMATIC_NOTES[parsed.chroma >= 0 ? parsed.chroma : 0];
    const octave = Number.isFinite(parsed.oct) ? (parsed.oct as number) : 4;
    const canonicalNote = `${pc}${octave}`;

    return {
      ...note,
      note: canonicalNote,
      pitchClassIndex: parsed.chroma >= 0 ? parsed.chroma : undefined,
      octave,
      frequency: parsed.freq || undefined,
    };
  });
}

export function mutatePatternMode(
  notes: PatternNote[],
  key: ChromaticNote,
  newMode: MusicalMode
): PatternNote[] {
  const scaleNotes = getScaleNotes(key, newMode);
  const targetIntervals = getScaleForMode(newMode).intervals;
  const rootChroma = CHROMATIC_NOTES.indexOf(key);
  return notes.map((note) => {
    const degree = note.scaleIndex;
    if (degree >= 0 && degree < scaleNotes.length && degree < targetIntervals.length) {
      const pc = scaleNotes[degree];
      const currentMidi = TonalNote.midi(note.note);
      const currentChroma = TonalNote.get(note.note).chroma;
      const currentInterval = (currentChroma - rootChroma + 12) % 12;
      const shiftedNote = currentMidi == null || currentChroma < 0 || rootChroma < 0
        ? `${pc}${note.octave}`
        : TonalNote.fromMidi(currentMidi - currentInterval + targetIntervals[degree]);
      const shifted = TonalNote.get(shiftedNote);
      const octave = Number.isFinite(shifted.oct) ? (shifted.oct as number) : note.octave;
      const newNoteName = `${pc}${octave}`;
      const parsed = TonalNote.get(newNoteName);
      return {
        ...note,
        note: newNoteName,
        scaleDegree: degree + 1,
        scaleIndex: degree,
        pitchClassIndex: parsed.chroma >= 0 ? parsed.chroma : undefined,
        isBorrowed: false,
        octave,
        frequency: parsed.freq || undefined,
      };
    }
    return note;
  });
}

function buildPatternNotes(
  patternId: string,
  key: ChromaticNote,
  mode: MusicalMode,
  steps: MelodyStep[]
): PatternNote[] {
  let cursor = 0;
  return steps.map((melodyStep, index) => {
    const parsed = TonalNote.get(melodyStep.note);
    const pitchClassIndex = parsed.chroma >= 0 ? parsed.chroma : 0;
    const pc = CHROMATIC_NOTES[pitchClassIndex] ?? "C";
    const octave = Number.isFinite(parsed.oct) ? (parsed.oct as number) : 4;
    const canonicalNote = `${pc}${octave}`;
    const { scaleIndex, isBorrowed } = getScaleIndex(pc, key, mode);
    const scaleDegree = isBorrowed ? 0 : scaleIndex + 1;

    const note: PatternNote = {
      id: `${patternId}-note-${index + 1}`,
      note: canonicalNote,
      scaleDegree,
      scaleIndex,
      pitchClassIndex,
      isBorrowed,
      octave,
      frequency: parsed.freq || undefined,
      pressTime: cursor,
      releaseTime: cursor + melodyStep.duration,
      duration: melodyStep.duration,
    };

    cursor += melodyStep.duration;
    return note;
  });
}

function parseStrudelNotes(
  patternId: string,
  raw: string,
  bpm: number,
  key: ChromaticNote,
  mode: MusicalMode
): { notes: PatternNote[]; duration: number } {
  const cycleMs = (60000 / bpm) * 4;
  const layers = raw.split(",");
  const allNotes: PatternNote[] = [];
  let phraseDuration = 0;

  layers.forEach((layerStr) => {
    const tokens = layerStr.trim().split(/\s+/);
    let cursor = 0;
    tokens.forEach((tok) => {
      if (!tok) return;
      let noteName = tok;
      let fraction = 0.25;
      if (tok.includes("@")) {
        const parts = tok.split("@");
        noteName = parts[0].trim();
        fraction = parseFloat(parts[1]);
      }
      const tokenDuration = Math.round(fraction * cycleMs);
      if (noteName !== "~" && noteName && noteName !== ",") {
        const parsed = TonalNote.get(noteName);
        const pitchClassIndex = parsed.chroma >= 0 ? parsed.chroma : 0;
        const pc = CHROMATIC_NOTES[pitchClassIndex] ?? "C";
        const octave = Number.isFinite(parsed.oct) ? (parsed.oct as number) : 4;
        const canonicalNote = `${pc}${octave}`;
        const { scaleIndex, isBorrowed } = getScaleIndex(pc, key, mode);
        const scaleDegree = isBorrowed ? 0 : scaleIndex + 1;

        allNotes.push({
          id: `${patternId}-note-${allNotes.length + 1}`,
          note: canonicalNote,
          scaleDegree,
          scaleIndex,
          pitchClassIndex,
          isBorrowed,
          octave,
          frequency: parsed.freq || undefined,
          pressTime: cursor,
          releaseTime: cursor + tokenDuration,
          duration: tokenDuration,
        });
      }
      cursor += tokenDuration;
    });
    phraseDuration = Math.max(phraseDuration, cursor);
  });

  return {
    notes: allNotes.sort((a, b) => a.pressTime - b.pressTime),
    duration: phraseDuration,
  };
}

export function buildDefaultPattern(
  idOrOptions: string | DefaultPatternOptions,
  name?: string,
  steps?: MelodyStep[],
  instrument: string = DEFAULT_INSTRUMENT
): Pattern {
  let id: string;
  let patternName: string;
  let patternKey: ChromaticNote = "C";
  let patternMode: MusicalMode = "major";
  let patternBpm = 120;
  let patternInstrument = instrument;
  let patternSteps: MelodyStep[] | undefined;
  let strudelNotation: string | undefined;

  if (typeof idOrOptions === "object") {
    id = idOrOptions.id;
    patternName = idOrOptions.name;
    patternKey = idOrOptions.key;
    patternMode = idOrOptions.mode;
    patternBpm = idOrOptions.bpm;
    patternInstrument = idOrOptions.instrument;
    patternSteps = idOrOptions.steps;
    strudelNotation = idOrOptions.strudel;
  } else {
    id = idOrOptions;
    patternName = name!;
    patternSteps = steps!;
    patternInstrument = instrument;
  }

  const parsedStrudel = strudelNotation
    ? parseStrudelNotes(id, strudelNotation, patternBpm, patternKey, patternMode)
    : undefined;
  const notes = parsedStrudel?.notes
    ?? buildPatternNotes(id, patternKey, patternMode, patternSteps ?? []);
  const firstNote = notes[0];
  const lastNote = notes[notes.length - 1];

  return {
    id,
    name: patternName,
    notes,
    duration: parsedStrudel?.duration
      ?? (lastNote ? lastNote.releaseTime - firstNote.pressTime : 0),
    noteCount: notes.length,
    key: patternKey,
    mode: patternMode,
    bpm: patternBpm,
    instrument: patternInstrument,
    createdAt: 0,
    isDefault: true,
    isKept: true,
  };
}

export const defaultPatterns: Pattern[] = [
  buildDefaultPattern({
    id: "pattern-twinkle-1",
    name: "Twinkle Twinkle Little Star",
    key: "G",
    mode: "major",
    bpm: 96,
    instrument: "gm_celesta",
    steps: [
      step("G4", 1, 96), step("G4", 1, 96), step("D5", 1, 96), step("D5", 1, 96),
      step("E5", 1, 96), step("E5", 1, 96), step("D5", 2, 96),
      step("C5", 1, 96), step("C5", 1, 96), step("B4", 1, 96), step("B4", 1, 96),
      step("A4", 1, 96), step("A4", 1, 96), step("G4", 2, 96),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-mary-1",
    name: "Mary Had a Little Lamb",
    key: "F",
    mode: "major",
    bpm: 112,
    instrument: "gm_acoustic_guitar_nylon",
    steps: [
      step("A4", 1, 112), step("G4", 1, 112), step("F4", 1, 112), step("G4", 1, 112),
      step("A4", 1, 112), step("A4", 1, 112), step("A4", 2, 112),
      step("G4", 1, 112), step("G4", 1, 112), step("G4", 2, 112),
      step("A4", 1, 112), step("C5", 1, 112), step("C5", 2, 112),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-hot-cross-buns-1",
    name: "Hot Cross Buns",
    key: "E",
    mode: "minor",
    bpm: 84,
    instrument: "gm_marimba",
    steps: [
      step("G4", 1, 84), step("F#4", 1, 84), step("E4", 2, 84),
      step("G4", 1, 84), step("F#4", 1, 84), step("E4", 2, 84),
      step("E4", 0.5, 84), step("E4", 0.5, 84), step("E4", 0.5, 84), step("E4", 0.5, 84),
      step("F#4", 0.5, 84), step("F#4", 0.5, 84), step("F#4", 0.5, 84), step("F#4", 0.5, 84),
      step("G4", 1, 84), step("F#4", 1, 84), step("E4", 2, 84),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-ode-to-joy-1",
    name: "Ode to Joy",
    key: "D",
    mode: "major",
    bpm: 126,
    instrument: "gm_flute",
    steps: [
      step("F#4", 1, 126), step("F#4", 1, 126), step("G4", 1, 126), step("A4", 1, 126),
      step("A4", 1, 126), step("G4", 1, 126), step("F#4", 1, 126), step("E4", 1, 126),
      step("D4", 1, 126), step("D4", 1, 126), step("E4", 1, 126), step("F#4", 1, 126),
      step("F#4", 1.5, 126), step("E4", 0.5, 126), step("E4", 2, 126),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-ruthlessness-melody-1",
    name: "Ruthlessness Melody",
    key: "E",
    mode: "minor",
    bpm: 135,
    instrument: "gm_electric_guitar_jazz",
    strudel: `E6@0.0833 D6@0.0833 C6@0.0833 D6@0.0833
C6@0.0833 B5@0.0833 C6@0.0833 B5@0.0833
A5@0.0833 B5@0.0833 A5@0.0833 G5@0.0833
E6@0.0833 D6@0.0833 C6@0.0833 D6@0.0833
C6@0.0833 B5@0.0833 C6@0.0833 B5@0.0833
A5@0.0833 B5@0.0833 A5@0.0833 G5@0.0833
E6@0.0833 D6@0.0833 C6@0.0833 D6@0.0833
C6@0.0833 B5@0.0833 C6@0.0833 B5@0.0833
A5@0.0833 B5@0.0833 A5@0.0833 G5@0.0833
E6@0.0833 D6@0.0833 C6@0.0833 D6@0.0833
C6@0.0833 B5@0.0833 ~@0.5,
B4@0.0833 ~@0.1667 B4@0.0833 ~@0.1667
B4@0.0833 ~@0.1667 B4@0.0833 ~@0.1667
B4@0.0833 ~@0.1667 B4@0.0833 ~@0.1667
B4@0.0833 ~@0.1667 B4@0.0833 ~@0.1667
B4@0.0833 ~@0.1667 B4@0.0833 ~@0.1667
B4@0.0833 ~@0.1667 B4@0.0833 ~@0.1667
B4@0.0833 ~@0.1667 B4@0.0833 ~@0.6667,
E4@0.0833 ~@0.1667 E4@0.0833 ~@0.1667
E4@0.0833 ~@0.1667 E4@0.0833 ~@0.1667
E4@0.0833 ~@0.1667 E4@0.0833 ~@0.1667
E4@0.0833 ~@0.1667 E4@0.0833 ~@0.1667
E4@0.0833 ~@0.1667 E4@0.0833 ~@0.1667
E4@0.0833 ~@0.1667 E4@0.0833 ~@0.1667
E4@0.0833 ~@0.1667 E4@0.0833 ~@0.6667,
E3@0.0833 G3@0.0833 B3@0.0833 E3@0.0833
G3@0.0833 B3@0.0833 E3@0.0833 G3@0.0833
B3@0.0833 E3@0.0833 G3@0.0833 B3@0.0833
D3@0.0833 G3@0.0833 B3@0.0833 D3@0.0833
G3@0.0833 B3@0.0833 D3@0.0833 G3@0.0833
D4@0.0833 D3@0.0833 G3@0.0833 B3@0.0833
C3@0.0833 G3@0.0833 B3@0.0833 C3@0.0833
G3@0.0833 B3@0.0833 C3@0.0833 G3@0.0833
B3@0.0833 C3@0.0833 G3@0.0833 B3@0.0833
C3@0.0833 G3@0.0833 B3@0.0833 C3@0.0833
G3@0.0833 B3@0.0833 D3@0.0833 G3@0.0833
B3@0.0833 D3@0.0833 G3@0.0833 B3@0.0833`,
  }),
  buildDefaultPattern({
    id: "pattern-warrior-theme-1",
    name: "Warrior of the Mind (Theme)",
    key: "E",
    mode: "major",
    bpm: 125,
    instrument: "gm_epiano1",
    strudel: `G#3@0.125 C#3@0.0625 D#3@0.0625 E3@0.0625
G#3@0.0625 F#3@0.125 D#3@0.125 E3@0.125
D#3@0.125 C#3@0.125 G#3@0.125 C#3@0.0625
D#3@0.0625 E3@0.0625 G#3@0.0625 E3@0.125
C#3@0.125 D#3@0.125 B3@0.25 G#3@0.125
C#3@0.0625 D#3@0.0625 E3@0.0625 G#3@0.0625
F#3@0.125 D#3@0.125 E3@0.125 D#3@0.125
C#3@0.125 G#3@0.125 C#3@0.0625 D#3@0.0625
E3@0.0625 G#3@0.0625 E3@0.125 C#3@0.125
D#3@0.125 B3@0.25 G#3@0.125 C#3@0.0625
D#3@0.0625 E3@0.0625 G#3@0.0625 F#3@0.125
D#3@0.125 E3@0.125 D#3@0.125 C#3@0.125
G#3@0.125 C#3@0.0625 D#3@0.0625 E3@0.0625
G#3@0.0625 E3@0.125 C#3@0.125 D#3@0.125
B3@0.25 G#3@0.125 C#3@0.0625 D#3@0.0625
E3@0.0625 G#3@0.0625 F#3@0.125 D#3@0.125
E3@0.125 D#3@0.125 C#3@0.125 G#3@0.125
C#3@0.0625 D#3@0.0625 E3@0.0625 G#3@0.0625
E3@0.125 C#3@0.125 D#3@0.125 B3@0.25`,
  }),
  buildDefaultPattern({
    id: "pattern-warrior-chorus-1",
    name: "Warrior of the Mind (Chorus)",
    key: "E",
    mode: "major",
    bpm: 125,
    instrument: "gm_violin",
    strudel: `E4@0.125 B4@0.1875 F#4@0.1875 G#4@0.25
E4@0.25 E4@0.125 B4@0.1875 F#4@0.1875
G#4@0.5 E4@0.125 B4@0.1875 F#4@0.1875
G#4@0.25 E4@0.125 E4@0.125 G#4@0.125
F#4@0.1875 D#4@0.1875 C#4@0.25 ~@0.375`,
  }),
  buildDefaultPattern({
    id: "pattern-warrior-bassline-1",
    name: "Warrior of the Mind (Bassline)",
    key: "E",
    mode: "major",
    bpm: 125,
    instrument: "gm_synth_bass_1",
    strudel: `C#2@0.0625 D#2@0.0625 E2@0.0625 F#2@0.0625
E2@0.0625 ~@0.125 E2@0.125 ~@0.0625
F#2@0.0625 ~@0.125 F#2@0.125 ~@0.0625
F#2@0.25 E2@0.0625 ~@0.125 E2@0.125
~@0.0625 F#2@0.0625 ~@0.125 F#2@0.125
~@0.0625 C#2@0.0625 D#2@0.0625 E2@0.0625
F#2@0.0625 G#2@0.0625 ~@0.125 G#2@0.125
~@0.0625 B2@0.0625 ~@0.125 B2@0.125
~@0.0625 B2@0.25 B2@0.0625 ~@0.125
B2@0.125 ~@0.0625 G#2@0.0625 ~@0.125
G#2@0.125 ~@0.0625 C#2@0.0625 D#2@0.0625
E2@0.0625 F#2@0.0625 G#2@0.0625 ~@0.125
G#2@0.125 ~@0.0625 F#2@0.0625 ~@0.125
F#2@0.125 ~@0.0625 F#2@0.25 G#2@0.0625
~@0.125 G#2@0.125 ~@0.0625 F#2@0.0625
~@0.125 F#2@0.125 ~@0.0625 C#2@0.0625
D#2@0.0625 E2@0.0625 F#2@0.0625 G#2@0.0625
~@0.125 G#2@0.125 ~@0.0625 F#2@0.0625
~@0.125 F#2@0.125 ~@0.0625 F#2@0.25
G#2@0.125 ~@0.0625 G#2@0.125 ~@0.0625
F#2@0.125 ~@0.0625 F#2@0.125 ~@0.0625
F#2@0.25 ~@0.0625 C#3@0.0625 D#3@0.0625
E3@0.0625 F#3@0.0625 G#3@0.0625 ~@0.125
G#3@0.125 ~@0.0625 C#3@0.0625 ~@0.125
F#3@0.125 ~@0.0625 C#3@0.0625 ~@0.1875
C#3@0.0625 ~@0.125 C#3@0.125 ~@0.0625
C#3@0.0625 ~@0.125 C#3@0.0625 ~@0.125
C#3@0.0625 D#3@0.0625 E3@0.0625 F#3@0.0625
G#3@0.0625 ~@0.125 G#2@0.125 ~@0.0625
G#2@0.0625 ~@0.125 G#2@0.125 ~@0.0625
F#3@0.0625 ~@0.9375`,
  }),
  buildDefaultPattern({
    id: "pattern-warrior-verse-1",
    name: "Warrior of the Mind (Verse)",
    key: "E",
    mode: "major",
    bpm: 125,
    instrument: "gm_electric_guitar_clean",
    strudel: `A4@0.25 A4@0.25 A4@0.1875 G#4@0.1875
E4@0.125 D#4@0.25 D#4@0.25 D#4@0.1875
E4@0.1875 F#4@0.125 G#4@0.25 G#4@0.25
G#4@0.1875 F#4@0.1875 E4@0.125 C#4@0.25
C#4@0.25 C#4@0.1875 D#4@0.1875 E4@0.125
A4@0.25 A4@0.25 A4@0.1875 G#4@0.1875
E4@0.125 D#4@0.25 D#4@0.25 D#4@0.1875
E4@0.1875 F#4@0.125 G#4@0.1875 F#4@0.1875
E4@0.25 B3@0.375 B4@0.375`,
  }),
  buildDefaultPattern({
    id: "pattern-midnight-dorian-1",
    name: "Midnight Dorian",
    key: "D",
    mode: "dorian",
    bpm: 80,
    instrument: "gm_epiano1",
    steps: [
      step("D4", 1, 80), step("F4", 0.5, 80), step("G4", 0.5, 80), step("A4", 1, 80), step("B4", 1, 80),
      step("C5", 0.5, 80), step("B4", 0.5, 80), step("A4", 1, 80), step("F4", 1, 80), step("E4", 1, 80), step("D4", 2, 80),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-flamenco-sun-1",
    name: "Flamenco Sun",
    key: "E",
    mode: "phrygian",
    bpm: 108,
    instrument: "gm_acoustic_guitar_nylon",
    steps: [
      step("E4", 1, 108), step("F4", 0.5, 108), step("G4", 1, 108), step("F4", 0.5, 108), step("E4", 1, 108), step("D4", 1, 108), step("E4", 2, 108),
      step("F4", 0.5, 108), step("E4", 0.5, 108), step("D4", 0.5, 108), step("C4", 0.5, 108), step("B3", 1, 108), step("C4", 0.5, 108), step("D4", 0.5, 108), step("E4", 2, 108),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-floating-aurora-1",
    name: "Floating Aurora",
    key: "F",
    mode: "lydian",
    bpm: 72,
    instrument: "gm_pad_warm",
    steps: [
      step("F4", 1, 72), step("A4", 1, 72), step("C5", 1, 72), step("B4", 2, 72),
      step("C5", 1, 72), step("E5", 1, 72), step("D5", 1, 72), step("C5", 1, 72), step("B4", 1, 72), step("A4", 1, 72), step("F4", 2, 72),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-highland-reel-1",
    name: "Highland Reel",
    key: "G",
    mode: "mixolydian",
    bpm: 120,
    instrument: "gm_recorder",
    steps: [
      step("G4", 1, 120), step("A4", 0.5, 120), step("B4", 0.5, 120), step("D5", 1, 120), step("C5", 0.5, 120), step("B4", 0.5, 120),
      step("A4", 1, 120), step("F4", 1, 120), step("G4", 1, 120), step("B4", 0.5, 120), step("D5", 0.5, 120),
      step("C5", 1, 120), step("B4", 0.5, 120), step("A4", 0.5, 120), step("G4", 2, 120),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-desert-mirage-1",
    name: "Desert Mirage",
    key: "A",
    mode: "harmonic minor",
    bpm: 100,
    instrument: "gm_sitar",
    steps: [
      step("A4", 1, 100), step("B4", 0.5, 100), step("C5", 0.5, 100), step("E5", 1, 100), step("F5", 1, 100), step("G#5", 1, 100), step("A5", 2, 100),
      step("G#5", 0.5, 100), step("F5", 0.5, 100), step("E5", 1, 100), step("D5", 0.5, 100), step("C5", 0.5, 100), step("B4", 1, 100), step("A4", 2, 100),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-cyber-pulse-1",
    name: "Cyber Pulse",
    key: "C",
    mode: "minor",
    bpm: 136,
    instrument: "gm_synth_bass_1",
    steps: [
      step("C3", 0.5, 136), step("C3", 0.5, 136), step("D#3", 1, 136), step("G3", 1, 136),
      step("A#3", 0.5, 136), step("C4", 1, 136), step("A#3", 0.5, 136), step("G3", 1, 136),
      step("F3", 0.5, 136), step("D#3", 0.5, 136), step("D3", 0.5, 136), step("C3", 2, 136),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-delta-blues-1",
    name: "Delta Blues",
    key: "A",
    mode: "minor pentatonic",
    bpm: 90,
    instrument: "gm_electric_guitar_clean",
    steps: [
      step("A3", 1, 90), step("C4", 0.5, 90), step("D4", 0.5, 90), step("E4", 1, 90),
      step("G4", 0.5, 90), step("A4", 1, 90), step("G4", 0.5, 90), step("E4", 1, 90),
      step("D4", 0.5, 90), step("C4", 0.5, 90), step("A3", 2, 90),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-moonlight-nocturne-1",
    name: "Moonlight Nocturne",
    key: "C#",
    mode: "minor",
    bpm: 66,
    instrument: "piano",
    steps: [
      step("G#4", 1, 66), step("C#5", 1, 66), step("E5", 1, 66), step("D#5", 1.5, 66), step("C#5", 0.5, 66), step("B4", 1, 66),
      step("A4", 1, 66), step("G#4", 1, 66), step("F#4", 1, 66), step("E4", 1, 66), step("D#4", 1, 66), step("C#4", 2, 66),
    ],
  }),
  buildDefaultPattern({
    id: "pattern-golden-sun-1",
    name: "Golden Sun",
    key: "C",
    mode: "major pentatonic",
    bpm: 104,
    instrument: "gm_kalimba",
    steps: [
      step("C4", 0.5, 104), step("D4", 0.5, 104), step("E4", 1, 104), step("G4", 1, 104), step("A4", 0.5, 104), step("G4", 0.5, 104),
      step("E4", 1, 104), step("G4", 1, 104), step("A4", 0.5, 104), step("C5", 1, 104), step("A4", 0.5, 104),
      step("G4", 1, 104), step("E4", 0.5, 104), step("D4", 0.5, 104), step("C4", 2, 104),
    ],
  }),
];
