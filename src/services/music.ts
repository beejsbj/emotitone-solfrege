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

  // Get note names for the current scale
  getCurrentScaleNotes(): string[] {
    const scale = this.getCurrentScale();
    const keyIndex = CHROMATIC_NOTES.indexOf(this.currentKey as any);

    return scale.intervals.map((interval: number) => {
      const noteIndex = (keyIndex + interval) % 12;
      return CHROMATIC_NOTES[noteIndex];
    });
  }

  // Get frequency for a note in the current scale
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
    }

    const noteIndex = CHROMATIC_NOTES.indexOf(actualNoteName as any);

    // Calculate frequency using A4 = 440Hz as reference
    const A4_INDEX = 9; // A is at index 9 in CHROMATIC_NOTES
    const A4_FREQUENCY = 440;

    const semitonesFromA4 = (actualOctave - 4) * 12 + (noteIndex - A4_INDEX);
    return A4_FREQUENCY * Math.pow(2, semitonesFromA4 / 12);
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
