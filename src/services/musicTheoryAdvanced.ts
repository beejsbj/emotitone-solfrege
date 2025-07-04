// Enhanced Music Theory Service using Tonal.js
// Comprehensive music theory calculations, scales, chords, and analysis

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
  validateNote,
  getSemitoneDistance,
  transposeNote,
  getPitchClass,
  noteToSolfege,
} from "@/data";
import type { Note, MusicalMode } from "@/types/music";
import { 
  Note as TonalNote, 
  Scale as TonalScale, 
  Chord, 
  Key, 
  Interval,
  Mode,
  Progression
} from "@tonaljs/tonal";
import { logger } from "@/utils/logger";

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
  validateNote,
  getSemitoneDistance,
  transposeNote,
  getPitchClass,
  noteToSolfege,
};

export class MusicTheoryService {
  private currentKey: string = "C";
  private currentMode: MusicalMode = "major";

  constructor() {
    logger.info("Enhanced MusicTheoryService initialized with Tonal.js");
  }

  // Enhanced key management with validation
  getCurrentKey(): string {
    return this.currentKey;
  }

  setCurrentKey(key: string): void {
    const validatedKey = validateNote(key);
    if (validatedKey) {
      this.currentKey = getPitchClass(validatedKey);
      logger.debug(`Key changed to ${this.currentKey}`);
    } else {
      throw new Error(`Invalid key: ${key}`);
    }
  }

  // Enhanced mode management
  getCurrentMode(): MusicalMode {
    return this.currentMode;
  }

  setCurrentMode(mode: MusicalMode): void {
    this.currentMode = mode;
    logger.debug(`Mode changed to ${mode}`);
  }

  // Enhanced scale retrieval with Tonal.js validation
  getCurrentScale(): Scale {
    const baseScale = this.currentMode === "major" ? MAJOR_SCALE : MINOR_SCALE;
    
    // Validate with Tonal.js
    const tonalScale = TonalScale.get(`${this.currentKey} ${this.currentMode}`);
    if (tonalScale.empty) {
      logger.warn(`Invalid scale combination: ${this.currentKey} ${this.currentMode}`);
    }
    
    return baseScale;
  }

  // Enhanced scale notes with better octave handling
  getCurrentScaleNotes(): string[] {
    const scaleName = this.currentMode === "major" ? "major" : "natural minor";
    const scaleData = TonalScale.get(`${this.currentKey} ${scaleName}`);
    
    if (scaleData.empty) {
      logger.warn(`Could not generate scale for ${this.currentKey} ${scaleName}`);
      return ["C", "D", "E", "F", "G", "A", "B"]; // fallback
    }

    return scaleData.notes;
  }

  // Enhanced frequency calculation with Tonal.js
  getNoteFrequency(solfegeIndex: number, octave: number = 4): number {
    const scaleNotes = this.getCurrentScaleNotes();
    const noteName = scaleNotes[solfegeIndex % scaleNotes.length];
    
    let actualOctave = octave;
    let actualNoteName = noteName;

    // Handle octave Do'
    if (solfegeIndex === 7) {
      actualOctave = octave + 1;
      actualNoteName = scaleNotes[0];
    } else if (solfegeIndex >= scaleNotes.length) {
      // Handle extended scale degrees
      const extraOctaves = Math.floor(solfegeIndex / scaleNotes.length);
      actualOctave = octave + extraOctaves;
      actualNoteName = scaleNotes[solfegeIndex % scaleNotes.length];
    } else {
      actualOctave = this.calculateCorrectOctave(noteName, this.currentKey, octave);
    }

    const noteWithOctave = `${actualNoteName}${actualOctave}`;
    const tonalNote = TonalNote.get(noteWithOctave);

    if (tonalNote.freq) {
      return tonalNote.freq;
    }

    // Enhanced fallback calculation
    return this.calculateFrequencyFallback(actualNoteName, actualOctave);
  }

  // Enhanced note name generation
  getNoteName(solfegeIndex: number, octave: number = 4): string {
    const scaleNotes = this.getCurrentScaleNotes();
    const noteName = scaleNotes[solfegeIndex % scaleNotes.length];

    let actualOctave = octave;
    let actualNoteName = noteName;

    if (solfegeIndex === 7) {
      actualOctave = octave + 1;
      actualNoteName = scaleNotes[0];
    } else if (solfegeIndex >= scaleNotes.length) {
      const extraOctaves = Math.floor(solfegeIndex / scaleNotes.length);
      actualOctave = octave + extraOctaves;
      actualNoteName = scaleNotes[solfegeIndex % scaleNotes.length];
    } else {
      actualOctave = this.calculateCorrectOctave(noteName, this.currentKey, octave);
    }

    return `${actualNoteName}${actualOctave}`;
  }

  // NEW: Chord analysis and generation
  analyzeChord(notes: string[]): { name: string; symbol: string; quality: string } | null {
    try {
      const chord = Chord.detect(notes);
      if (chord.length > 0) {
        const primaryChord = Chord.get(chord[0]);
        return {
          name: primaryChord.name || chord[0],
          symbol: primaryChord.symbol || chord[0],
          quality: primaryChord.quality || "unknown"
        };
      }
    } catch (error) {
      logger.warn("Chord analysis failed:", error);
    }
    return null;
  }

  // NEW: Generate chord from scale degree
  getChordFromDegree(degree: number, chordType: string = "triad"): string[] {
    const scaleNotes = this.getCurrentScaleNotes();
    const rootNote = scaleNotes[(degree - 1) % scaleNotes.length];
    
    if (!rootNote) return [];

    try {
      let chordSymbol = rootNote;
      if (chordType === "seventh") {
        chordSymbol += this.currentMode === "major" ? "maj7" : "m7";
      } else if (this.currentMode === "minor" && [1, 4, 5].includes(degree)) {
        chordSymbol += "m";
      }

      const chord = Chord.get(chordSymbol);
      return chord.notes || [];
    } catch (error) {
      logger.warn(`Chord generation failed for degree ${degree}:`, error);
      return [];
    }
  }

  // NEW: Key detection from notes
  detectKey(notes: string[]): { key: string; mode: string; confidence: number } | null {
    try {
      // Try major keys first
      const possibleKeys = ["C", "G", "D", "A", "E", "B", "F#", "F", "Bb", "Eb", "Ab", "Db"];
      
      let bestMatch = { key: "C", mode: "major", confidence: 0 };

      for (const keyCenter of possibleKeys) {
        // Check major
        const majorScale = TonalScale.get(`${keyCenter} major`);
        const majorMatch = this.calculateKeyConfidence(notes, majorScale.notes);
        if (majorMatch > bestMatch.confidence) {
          bestMatch = { key: keyCenter, mode: "major", confidence: majorMatch };
        }

        // Check minor
        const minorScale = TonalScale.get(`${keyCenter} minor`);
        const minorMatch = this.calculateKeyConfidence(notes, minorScale.notes);
        if (minorMatch > bestMatch.confidence) {
          bestMatch = { key: keyCenter, mode: "minor", confidence: minorMatch };
        }
      }

      return bestMatch.confidence > 0.5 ? bestMatch : null;
    } catch (error) {
      logger.warn("Key detection failed:", error);
      return null;
    }
  }

  // NEW: Scale mode exploration
  getScaleModes(scaleType: string = "major"): Array<{ name: string; notes: string[] }> {
    try {
      const baseScale = TonalScale.get(`${this.currentKey} ${scaleType}`);
      const modes: Array<{ name: string; notes: string[] }> = [];
      
      // Simplified mode generation - just rotate the scale
      const scaleNotes = baseScale.notes;
      const modeNames = ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"];

      for (let i = 0; i < scaleNotes.length; i++) {
        const modeName = modeNames[i] || `Mode ${i + 1}`;
        const rotatedNotes = [...scaleNotes.slice(i), ...scaleNotes.slice(0, i)];
        modes.push({ name: modeName, notes: rotatedNotes });
      }

      return modes;
    } catch (error) {
      logger.warn("Mode generation failed:", error);
      return [];
    }
  }

  // NEW: Progression analysis
  analyzeProgression(chords: string[]): Array<{ chord: string; degree: number; function: string }> {
    try {
      const key = Key.majorKey(this.currentKey);
      const analysis: Array<{ chord: string; degree: number; function: string }> = [];

      chords.forEach(chordSymbol => {
        const chord = Chord.get(chordSymbol);
        if (!chord.empty) {
          // Find scale degree
          const degree = key.scale.indexOf(chord.root) + 1;
          
          // Determine function (simplified)
          let func = "unknown";
          if (degree === 1) func = "tonic";
          else if (degree === 4) func = "subdominant";
          else if (degree === 5) func = "dominant";
          else if ([2, 3, 6].includes(degree)) func = "predominant";

          analysis.push({
            chord: chordSymbol,
            degree: degree || 0,
            function: func
          });
        }
      });

      return analysis;
    } catch (error) {
      logger.warn("Progression analysis failed:", error);
      return [];
    }
  }

  // Private helper methods
  private calculateCorrectOctave(noteName: string, rootKey: string, baseOctave: number): number {
    const noteIndex = CHROMATIC_NOTES.indexOf(getPitchClass(noteName) as any);
    const rootIndex = CHROMATIC_NOTES.indexOf(getPitchClass(rootKey) as any);

    if (noteIndex < rootIndex) {
      return baseOctave + 1;
    }
    return baseOctave;
  }

  private calculateFrequencyFallback(noteName: string, octave: number): number {
    const noteIndex = CHROMATIC_NOTES.indexOf(getPitchClass(noteName) as any);
    const A4_INDEX = 9; // A is at index 9
    const A4_FREQUENCY = 440;
    const semitonesFromA4 = (octave - 4) * 12 + (noteIndex - A4_INDEX);
    return A4_FREQUENCY * Math.pow(2, semitonesFromA4 / 12);
  }

  private calculateKeyConfidence(notes: string[], scaleNotes: string[]): number {
    const cleanNotes = notes.map(note => getPitchClass(note));
    const cleanScale = scaleNotes.map(note => getPitchClass(note));
    
    const matches = cleanNotes.filter(note => cleanScale.includes(note)).length;
    return matches / Math.max(cleanNotes.length, 1);
  }

  // Existing methods preserved for backward compatibility
  getSolfegeData(degree: number): SolfegeData | null {
    const scale = this.getCurrentScale();
    return scale.solfege[degree] || null;
  }

  getMelodicPatterns(): MelodicPattern[] {
    return MELODIC_PATTERNS;
  }

  getMelodicPatternsByCategory(category: "intervals" | "patterns"): MelodicPattern[] {
    if (category === "intervals") {
      return MELODIC_PATTERNS.filter((pattern: MelodicPattern) =>
        pattern.intervals && pattern.intervals.length === 1
      );
    } else {
      return MELODIC_PATTERNS.filter((pattern: MelodicPattern) =>
        !pattern.intervals || pattern.intervals.length !== 1
      );
    }
  }
}

// Export enhanced singleton instance
export const musicTheory = new MusicTheoryService();
