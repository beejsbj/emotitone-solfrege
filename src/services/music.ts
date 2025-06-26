// Music Theory Service for Emotitone Solfege
// Handles all music theory calculations, scales, and emotional mappings

import {
  CHROMATIC_NOTES,
  MAJOR_SOLFEGE,
  MINOR_SOLFEGE,
  MELODIC_PATTERNS,
  MAJOR_SCALE,
  MINOR_SCALE,
  type SolfegeData,
  type Scale,
  type MelodicPattern,
} from "@/data";
import type { Note, MusicalMode } from "@/types/music";
import { Note as TonalNote, Scale as TonalScale } from "@tonaljs/tonal";

// Re-export types for backward compatibility
export type { SolfegeData, Scale, MelodicPattern, Note, MusicalMode };

// Re-export the imported constants for backward compatibility
export {
  CHROMATIC_NOTES,
  MAJOR_SOLFEGE,
  MINOR_SOLFEGE,
  MELODIC_PATTERNS,
  MAJOR_SCALE,
  MINOR_SCALE,
};

export class MusicTheoryService {
  private currentKey: string = "C";
  private currentMode: MusicalMode = "major";

  constructor() {}

  // Get the current key
  getCurrentKey(): string {
    return this.currentKey;
  }

  // Set the current key
  setCurrentKey(key: string): void {
    if (CHROMATIC_NOTES.includes(key as any)) {
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

  // Get note names for the current scale using Tonal.js for accuracy
  getCurrentScaleNotes(): string[] {
    const scaleName = this.currentMode === "major" ? "major" : "minor";
    const scaleNotes = TonalScale.get(`${this.currentKey} ${scaleName}`).notes;

    // Ensure we have 7 notes (some scales might return 8 with octave)
    return scaleNotes.slice(0, 7);
  }

  // Calculate the correct octave for a note to ensure ascending scale order
  private calculateCorrectOctave(
    noteName: string,
    rootKey: string,
    baseOctave: number
  ): number {
    const noteIndex = CHROMATIC_NOTES.indexOf(noteName as any);
    const rootIndex = CHROMATIC_NOTES.indexOf(rootKey as any);

    // If the note comes before the root in the chromatic sequence, it needs to be in the next octave
    if (noteIndex < rootIndex) {
      return baseOctave + 1;
    }

    return baseOctave;
  }

  // Get frequency for a note in the current scale (now using Tonal.js for accuracy)
  getNoteFrequency(solfegeIndex: number, octave: number = 4): number {
    const scaleNotes = this.getCurrentScaleNotes();
    const noteName = scaleNotes[solfegeIndex];

    // Handle octave note (Do') - use the root note but one octave higher
    let actualOctave = octave;
    let actualNoteName = noteName;

    if (solfegeIndex === 7) {
      // The octave Do'
      actualOctave = octave + 1;
      actualNoteName = scaleNotes[0]; // Use the root note (Do)
    } else {
      // Handle octave wrapping for ascending scales
      actualOctave = this.calculateCorrectOctave(
        noteName,
        this.currentKey,
        octave
      );
    }

    // Use Tonal.js for accurate frequency calculation
    const noteWithOctave = `${actualNoteName}${actualOctave}`;
    const tonalNote = TonalNote.get(noteWithOctave);

    // Return Tonal.js frequency or fallback to manual calculation
    if (tonalNote.freq) {
      return tonalNote.freq;
    }

    // Fallback to manual calculation if Tonal.js fails
    const noteIndex = CHROMATIC_NOTES.indexOf(actualNoteName as any);
    const A4_INDEX = 9; // A is at index 9 in CHROMATIC_NOTES
    const A4_FREQUENCY = 440;
    const semitonesFromA4 = (actualOctave - 4) * 12 + (noteIndex - A4_INDEX);
    return A4_FREQUENCY * Math.pow(2, semitonesFromA4 / 12);
  }

  // Get note name with octave for Tone.js compatibility
  getNoteName(solfegeIndex: number, octave: number = 4): string {
    const scaleNotes = this.getCurrentScaleNotes();
    const noteName = scaleNotes[solfegeIndex];

    // Handle octave note (Do') - use the root note but one octave higher
    let actualOctave = octave;
    let actualNoteName = noteName;

    if (solfegeIndex === 7) {
      // The octave Do'
      actualOctave = octave + 1;
      actualNoteName = scaleNotes[0]; // Use the root note (Do)
    } else {
      // Handle octave wrapping for ascending scales
      actualOctave = this.calculateCorrectOctave(
        noteName,
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

  // Get all melodic patterns
  getMelodicPatterns(): MelodicPattern[] {
    return MELODIC_PATTERNS;
  }

  // Get melodic patterns by category
  getMelodicPatternsByCategory(
    category: "intervals" | "patterns"
  ): MelodicPattern[] {
    if (category === "intervals") {
      return MELODIC_PATTERNS.filter(
        (pattern: MelodicPattern) =>
          pattern.intervals && pattern.intervals.length === 1
      );
    } else {
      return MELODIC_PATTERNS.filter(
        (pattern: MelodicPattern) =>
          !pattern.intervals || pattern.intervals.length !== 1
      );
    }
  }
}

// Export a singleton instance
export const musicTheory = new MusicTheoryService();
