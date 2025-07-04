// Music Theory Service for Emotitone Solfege
// Handles all music theory calculations, scales, and emotional mappings

import {
  CHROMATIC_NOTES,
  MAJOR_SCALE,
  MINOR_SCALE,
  type SolfegeData,
  type Scale,
  getAllMelodicPatterns,
  getPatternsByEmotion,
  getIntervalPatterns,
  getMelodicPatterns,
  getCompleteMelodies,
} from "@/data";
import type {
  Note,
  MusicalMode,
  Melody,
  ChromaticNote,
  MelodyCategory,
  CategorizedMelody,
} from "@/types/music";
import { Note as TonalNote, Scale as TonalScale } from "@tonaljs/tonal";

// Re-export types for backward compatibility
export type {
  SolfegeData,
  Scale,
  Melody,
  Note,
  MusicalMode,
  MelodyCategory,
  CategorizedMelody,
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
  private melodyCache: Map<string, CategorizedMelody[]> = new Map();

  constructor() {
    this.initializeMelodyCache();
  }

  private initializeMelodyCache(): void {
    // Initialize melody cache with categorized melodies
    const allMelodies = this.categorizeMelodies();
    this.melodyCache.set("all", allMelodies);

    // Cache by category
    const categories: MelodyCategory[] = [
      "intervals",
      "patterns",
      "complete",
      "userCreated",
    ];
    categories.forEach((category) => {
      this.melodyCache.set(
        category,
        allMelodies.filter((m) => m.category === category)
      );
    });
  }

  private categorizeMelodies(): CategorizedMelody[] {
    const melodies: CategorizedMelody[] = [];

    // Categorize interval patterns
    const intervals = getIntervalPatterns().map((melody) => ({
      ...melody,
      category: "intervals" as MelodyCategory,
    }));

    // Categorize melodic patterns
    const patterns = getMelodicPatterns().map((melody) => ({
      ...melody,
      category: "patterns" as MelodyCategory,
    }));

    // Categorize complete melodies
    const complete = getCompleteMelodies().map((melody) => ({
      ...melody,
      category: "complete" as MelodyCategory,
    }));

    return [...intervals, ...patterns, ...complete];
  }

  // Get all melodies with categories
  getAllMelodies(): CategorizedMelody[] {
    return this.melodyCache.get("all") || this.categorizeMelodies();
  }

  // Get melodies by category
  getMelodiesByCategory(category: MelodyCategory): CategorizedMelody[] {
    return this.melodyCache.get(category) || [];
  }

  // Get melodies by emotion
  getMelodiesByEmotion(emotion: string): CategorizedMelody[] {
    const allMelodies = this.getAllMelodies();
    return allMelodies.filter((melody) =>
      melody.emotion?.toLowerCase().includes(emotion.toLowerCase())
    );
  }

  // Search melodies by text
  searchMelodies(query: string): CategorizedMelody[] {
    const searchTerm = query.toLowerCase();
    return this.getAllMelodies().filter(
      (melody) =>
        melody.name.toLowerCase().includes(searchTerm) ||
        melody.description?.toLowerCase().includes(searchTerm) ||
        melody.emotion?.toLowerCase().includes(searchTerm)
    );
  }

  // Add a user-created melody
  addUserMelody(melody: Omit<Melody, "category">): CategorizedMelody {
    const categorizedMelody: CategorizedMelody = {
      ...melody,
      category: "userCreated",
    };

    // Update cache
    const allMelodies = this.getAllMelodies();
    allMelodies.push(categorizedMelody);
    this.melodyCache.set("all", allMelodies);

    const userMelodies = this.getMelodiesByCategory("userCreated");
    userMelodies.push(categorizedMelody);
    this.melodyCache.set("userCreated", userMelodies);

    return categorizedMelody;
  }

  // Remove a user-created melody
  removeUserMelody(melodyName: string): void {
    const allMelodies = this.getAllMelodies().filter(
      (m) => m.name !== melodyName
    );
    this.melodyCache.set("all", allMelodies);

    const userMelodies = this.getMelodiesByCategory("userCreated").filter(
      (m) => m.name !== melodyName
    );
    this.melodyCache.set("userCreated", userMelodies);
  }

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

  // Get all melodic patterns
  getMelodicPatterns(): Melody[] {
    return getAllMelodicPatterns();
  }

  // Get melodic patterns by category
  getMelodicPatternsByCategory(category: "intervals" | "patterns"): Melody[] {
    if (category === "intervals") {
      return getAllMelodicPatterns().filter(
        (pattern: Melody) => pattern.intervals && pattern.intervals.length === 1
      );
    } else {
      return getAllMelodicPatterns().filter(
        (pattern: Melody) =>
          !pattern.intervals || pattern.intervals.length !== 1
      );
    }
  }
}

// Export a singleton instance
export const musicTheory = new MusicTheoryService();
