// Music Theory Service for Emotitone Solfege
// Handles all music theory calculations, scales, and interval-driven identities.

import {
  CHROMATIC_NOTES,
  MAJOR_SCALE,
  MINOR_SCALE,
  SCALE_MAP,
  getModeDefinition,
  getScaleForMode,
  type SolfegeData,
  type Scale,
} from "@/data";
import type { ChromaticNote, ModeDefinition, MusicalMode, Note } from "@/types/music";
import { Note as TonalNote, Scale as TonalScale } from "@tonaljs/tonal";

export type { ChromaticNote, ModeDefinition, MusicalMode, Note, Scale, SolfegeData };

export { CHROMATIC_NOTES, MAJOR_SCALE, MINOR_SCALE, SCALE_MAP };

const FLAT_TO_SHARP_MAP: Record<string, ChromaticNote> = {
  Db: "C#",
  Eb: "D#",
  Gb: "F#",
  Ab: "G#",
  Bb: "A#",
};

const EDGE_CASE_MAP: Record<string, ChromaticNote> = {
  "E#": "F",
  "B#": "C",
  Fb: "E",
  Cb: "B",
};

const DOUBLE_ACCIDENTAL_MAP: Record<string, ChromaticNote> = {
  "F##": "G",
  "C##": "D",
  "G##": "A",
  "D##": "E",
  "A##": "B",
  "E##": "F#",
  "B##": "C#",
  Gbb: "F",
  Dbb: "C",
  Abb: "G",
  Ebb: "D",
  Bbb: "A",
  Fbb: "E",
  Cbb: "B",
};

export class MusicTheoryService {
  private currentKey: ChromaticNote = "C";
  private currentMode: MusicalMode = "major";

  getCurrentKey(): string {
    return this.currentKey;
  }

  setCurrentKey(key: ChromaticNote): void {
    if (!CHROMATIC_NOTES.includes(key)) {
      throw new Error(`Invalid key: ${key}`);
    }

    this.currentKey = key;
  }

  getCurrentMode(): MusicalMode {
    return this.currentMode;
  }

  setCurrentMode(mode: MusicalMode): void {
    this.currentMode = mode;
  }

  getCurrentModeDefinition(): ModeDefinition {
    return getModeDefinition(this.currentMode);
  }

  getCurrentScale(): Scale {
    return getScaleForMode(this.currentMode);
  }

  getCurrentScaleDegreeCount(): number {
    return this.getCurrentScale().degreeCount;
  }

  getCurrentScaleSemitoneOffsets(): number[] {
    return this.getCurrentScale().intervals;
  }

  private normalizeToSharp(note: string): ChromaticNote {
    const baseNote = note.replace(/\d/g, "");

    if (DOUBLE_ACCIDENTAL_MAP[baseNote]) {
      return DOUBLE_ACCIDENTAL_MAP[baseNote];
    }

    if (EDGE_CASE_MAP[baseNote]) {
      return EDGE_CASE_MAP[baseNote];
    }

    if (CHROMATIC_NOTES.includes(baseNote as ChromaticNote)) {
      return baseNote as ChromaticNote;
    }

    const sharpVersion = FLAT_TO_SHARP_MAP[baseNote];
    if (sharpVersion) {
      return sharpVersion;
    }

    throw new Error(`Unable to normalize note: ${note}`);
  }

  private normalizeScaleNote(note: string): ChromaticNote {
    try {
      return this.normalizeToSharp(note);
    } catch {
      const tonalNote = TonalNote.get(note);
      if (
        tonalNote.pc &&
        CHROMATIC_NOTES.includes(tonalNote.pc as ChromaticNote)
      ) {
        return tonalNote.pc as ChromaticNote;
      }

      throw new Error(`Invalid note ${note} returned by Tonal.js`);
    }
  }

  getCurrentScaleNotes(): ChromaticNote[] {
    const currentScale = this.getCurrentScale();
    const scaleNotes = TonalScale.get(
      `${this.currentKey} ${currentScale.tonalName}`
    ).notes;

    if (!scaleNotes.length) {
      return currentScale.intervalNames.map((_, index) => {
        const semitoneOffset = currentScale.intervals[index] ?? 0;
        const noteIndex =
          (CHROMATIC_NOTES.indexOf(this.currentKey) + semitoneOffset) % 12;
        return CHROMATIC_NOTES[noteIndex];
      });
    }

    return scaleNotes.map((note) => this.normalizeScaleNote(note));
  }

  getChromaticNoteForScaleIndex(scaleIndex: number): ChromaticNote | null {
    const scaleNotes = this.getCurrentScaleNotes();
    return scaleNotes[scaleIndex] ?? null;
  }

  private getRelativeSemitoneFromKey(noteName: ChromaticNote): number {
    const keyIndex = CHROMATIC_NOTES.indexOf(this.currentKey);
    const noteIndex = CHROMATIC_NOTES.indexOf(noteName);

    if (keyIndex === -1 || noteIndex === -1) {
      return -1;
    }

    return (noteIndex - keyIndex + 12) % 12;
  }

  getScaleIndexForChromaticNote(noteName: string): number | null {
    let chromaticNote: ChromaticNote;

    try {
      chromaticNote = this.normalizeToSharp(noteName);
    } catch {
      return null;
    }

    const scaleNotes = this.getCurrentScaleNotes();
    const exactIndex = scaleNotes.indexOf(chromaticNote);
    if (exactIndex !== -1) {
      return exactIndex;
    }

    const relativeSemitone = this.getRelativeSemitoneFromKey(chromaticNote);
    if (relativeSemitone === -1) {
      return null;
    }

    const scaleIntervals = this.getCurrentScaleSemitoneOffsets();
    let fallbackIndex = 0;

    for (let index = 0; index < scaleIntervals.length; index++) {
      if (scaleIntervals[index] <= relativeSemitone) {
        fallbackIndex = index;
      } else {
        break;
      }
    }

    return fallbackIndex;
  }

  private calculateCorrectOctave(
    noteName: ChromaticNote,
    rootKey: ChromaticNote,
    baseOctave: number
  ): number {
    const noteIndex = CHROMATIC_NOTES.indexOf(noteName);
    const rootIndex = CHROMATIC_NOTES.indexOf(rootKey);

    return noteIndex < rootIndex ? baseOctave + 1 : baseOctave;
  }

  getNoteFrequency(solfegeIndex: number, octave: number = 4): number {
    const scaleNotes = this.getCurrentScaleNotes();
    const scaleLength = scaleNotes.length;

    let actualOctave = octave;
    let actualNoteName = scaleNotes[solfegeIndex];

    if (solfegeIndex === scaleLength) {
      actualOctave = octave + 1;
      actualNoteName = scaleNotes[0];
    } else if (actualNoteName) {
      actualOctave = this.calculateCorrectOctave(
        actualNoteName,
        this.currentKey,
        octave
      );
    } else {
      actualNoteName = scaleNotes[0] ?? this.currentKey;
    }

    const noteWithOctave = `${actualNoteName}${actualOctave}`;
    const tonalNote = TonalNote.get(noteWithOctave);

    if (tonalNote.freq) {
      return tonalNote.freq;
    }

    const noteIndex = CHROMATIC_NOTES.indexOf(actualNoteName);
    const A4_INDEX = 9;
    const A4_FREQUENCY = 440;
    const semitonesFromA4 = (actualOctave - 4) * 12 + (noteIndex - A4_INDEX);
    return A4_FREQUENCY * Math.pow(2, semitonesFromA4 / 12);
  }

  getNoteName(solfegeIndex: number, octave: number = 4): string {
    const scaleNotes = this.getCurrentScaleNotes();
    const scaleLength = scaleNotes.length;

    let actualOctave = octave;
    let actualNoteName = scaleNotes[solfegeIndex];

    if (solfegeIndex === scaleLength) {
      actualOctave = octave + 1;
      actualNoteName = scaleNotes[0];
    } else if (actualNoteName) {
      actualOctave = this.calculateCorrectOctave(
        actualNoteName,
        this.currentKey,
        octave
      );
    } else {
      actualNoteName = scaleNotes[0] ?? this.currentKey;
    }

    return `${actualNoteName}${actualOctave}`;
  }

  getSolfegeData(degree: number): SolfegeData | null {
    return this.getCurrentScale().solfege[degree] || null;
  }
}

export const musicTheory = new MusicTheoryService();
