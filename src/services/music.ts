// Music Theory Service for Emotitone Solfege
// Handles all music theory calculations, scales, and emotional mappings

import {
  CHROMATIC_NOTES,
  MAJOR_SCALE,
  MINOR_SCALE,
  type SolfegeData,
  type Scale,
} from "@/data";
import type {
  Note,
  MusicalMode,
  ChromaticNote,
} from "@/types/music";
import { Note as TonalNote, Scale as TonalScale } from "@tonaljs/tonal";

// Re-export types for backward compatibility
export type {
  SolfegeData,
  Scale,
  Note,
  MusicalMode,
};

// Re-export the imported constants for backward compatibility
export { CHROMATIC_NOTES, MAJOR_SCALE, MINOR_SCALE };

// Add flat to sharp conversion map and edge case handling
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

  // Get the current key
  getCurrentKey(): string {
    return this.currentKey;
  }

  // Set the current key
  setCurrentKey(key: ChromaticNote): void {
    if (CHROMATIC_NOTES.includes(key)) {
      this.currentKey = key;
    } else {
      throw new Error(`Invalid key: ${key}`);
    }
  }

  // Get the current mode
  getCurrentMode(): MusicalMode {
    return this.currentMode;
  }

  // Set the current mode
  setCurrentMode(mode: MusicalMode): void {
    this.currentMode = mode;
  }

  // Get the current scale
  getCurrentScale(): Scale {
    return this.currentMode === "major" ? MAJOR_SCALE : MINOR_SCALE;
  }

  // Helper function to convert flat notes to sharp notes
  private normalizeToSharp(note: string): ChromaticNote {
    // Remove any octave numbers that might be present
    const baseNote = note.replace(/\d/g, "");

    // Check double accidentals first (F## -> G, Gbb -> F)
    if (DOUBLE_ACCIDENTAL_MAP[baseNote]) {
      return DOUBLE_ACCIDENTAL_MAP[baseNote];
    }

    // Check single accidental edge cases (E# -> F, B# -> C)
    if (EDGE_CASE_MAP[baseNote]) {
      return EDGE_CASE_MAP[baseNote];
    }

    // If it's already a valid note, return it
    if (CHROMATIC_NOTES.includes(baseNote as ChromaticNote)) {
      return baseNote as ChromaticNote;
    }

    // Convert flat to sharp if it exists in our map
    const sharpVersion = FLAT_TO_SHARP_MAP[baseNote];
    if (sharpVersion) {
      return sharpVersion;
    }

    throw new Error(`Unable to normalize note: ${note}`);
  }

  // Update getCurrentScaleNotes to use the new normalizeToSharp function
  getCurrentScaleNotes(): ChromaticNote[] {
    const scaleName = this.currentMode === "major" ? "major" : "minor";
    const scaleNotes = TonalScale.get(`${this.currentKey} ${scaleName}`).notes;

    // Ensure we have 7 notes and normalize them to sharps
    return scaleNotes.slice(0, 7).map((note) => {
      try {
        return this.normalizeToSharp(note);
      } catch (error) {
        console.warn(
          `Note normalization failed for ${note}, attempting direct conversion...`
        );
        // If normalization fails, try direct conversion from Tonal.js note
        const tonalNote = TonalNote.get(note);
        if (
          tonalNote.pc &&
          CHROMATIC_NOTES.includes(tonalNote.pc as ChromaticNote)
        ) {
          return tonalNote.pc as ChromaticNote;
        }
        throw new Error(`Invalid note ${note} returned by Tonal.js`);
      }
    });
  }

  // Calculate the correct octave for a note to ensure ascending scale order
  private calculateCorrectOctave(
    noteName: ChromaticNote,
    rootKey: ChromaticNote,
    baseOctave: number
  ): number {
    const noteIndex = CHROMATIC_NOTES.indexOf(noteName);
    const rootIndex = CHROMATIC_NOTES.indexOf(rootKey);

    // If the note comes before the root in the chromatic sequence, it needs to be in the next octave
    if (noteIndex < rootIndex) {
      return baseOctave + 1;
    }

    return baseOctave;
  }

  // Update getNoteFrequency to use normalizeToSharp
  getNoteFrequency(solfegeIndex: number, octave: number = 4): number {
    const scaleNotes = this.getCurrentScaleNotes();
    const noteName = scaleNotes[solfegeIndex] as ChromaticNote;

    // Handle octave note (Do') - use the root note but one octave higher
    let actualOctave = octave;
    let actualNoteName = noteName;

    if (solfegeIndex === 7) {
      actualOctave = octave + 1;
      actualNoteName = scaleNotes[0] as ChromaticNote;
    } else {
      actualOctave = this.calculateCorrectOctave(
        actualNoteName,
        this.currentKey,
        octave
      );
    }

    // Use Tonal.js for accurate frequency calculation
    const noteWithOctave = `${actualNoteName}${actualOctave}`;
    const tonalNote = TonalNote.get(noteWithOctave);

    if (tonalNote.freq) {
      return tonalNote.freq;
    }

    // Fallback calculation remains the same
    const noteIndex = CHROMATIC_NOTES.indexOf(actualNoteName);
    const A4_INDEX = 9;
    const A4_FREQUENCY = 440;
    const semitonesFromA4 = (actualOctave - 4) * 12 + (noteIndex - A4_INDEX);
    return A4_FREQUENCY * Math.pow(2, semitonesFromA4 / 12);
  }

  // Update getNoteName to use normalizeToSharp
  getNoteName(solfegeIndex: number, octave: number = 4): string {
    const scaleNotes = this.getCurrentScaleNotes();
    const noteName = scaleNotes[solfegeIndex];

    let actualOctave = octave;
    let actualNoteName = noteName;

    if (solfegeIndex === 7) {
      actualOctave = octave + 1;
      actualNoteName = scaleNotes[0];
    } else {
      actualOctave = this.calculateCorrectOctave(
        actualNoteName,
        this.currentKey,
        octave
      );
    }

    return `${actualNoteName}${actualOctave}`;
  }

  // Get solfege data for a specific degree
  getSolfegeData(degree: number): SolfegeData | null {
    const scale = this.getCurrentScale();
    return scale.solfege[degree] || null;
  }

}

// Export a singleton instance
export const musicTheory = new MusicTheoryService();
