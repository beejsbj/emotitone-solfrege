/**
 * Enhanced Melody Generator using Tonal.js
 * Generates musically coherent melodies based on scales, modes, and harmonic progressions
 */

import { 
  Scale, 
  Note, 
  Interval, 
  Chord, 
  Mode,
  Progression 
} from "@tonaljs/tonal";
import type { MusicalMode } from "@/types/music";
import { logger } from "./logger";

export interface MelodyOptions {
  /** Key center for the melody */
  keyCenter?: string;
  /** Scale type (major, minor, dorian, etc.) */
  scaleType?: string;
  /** Number of notes in the melody */
  length?: number;
  /** Octave range */
  octaveRange?: [number, number];
  /** Preferred melodic intervals (in semitones) */
  preferredIntervals?: number[];
  /** Emotional character to emphasize */
  emotionalCharacter?: "bright" | "dark" | "mysterious" | "peaceful" | "energetic";
  /** Whether to use chord tones more frequently */
  emphasizeChordTones?: boolean;
  /** Optional chord progression to follow */
  chordProgression?: string[];
}

export interface GeneratedNote {
  /** Note name with octave */
  noteName: string;
  /** Solfege name */
  solfege: string;
  /** Scale degree (1-7) */
  scaleDegree: number;
  /** Frequency in Hz */
  frequency: number;
  /** Emotional weight (0-1) */
  emotionalWeight: number;
}

export class MelodyGenerator {
  private keyCenter: string = "C";
  private scaleType: string = "major";
  private currentScale: string[] = [];

  constructor(keyCenter: string = "C", scaleType: string = "major") {
    this.setScale(keyCenter, scaleType);
  }

  /**
   * Set the scale for melody generation
   */
  setScale(keyCenter: string, scaleType: string): void {
    try {
      const note = Note.get(keyCenter);
      if (note.empty) {
        throw new Error(`Invalid key center: ${keyCenter}`);
      }

      const scale = Scale.get(`${keyCenter} ${scaleType}`);
      if (scale.empty) {
        throw new Error(`Invalid scale: ${keyCenter} ${scaleType}`);
      }

      this.keyCenter = keyCenter;
      this.scaleType = scaleType;
      this.currentScale = scale.notes;
      
      logger.debug(`Melody generator set to ${keyCenter} ${scaleType}`);
    } catch (error) {
      logger.warn("Scale setting failed:", error);
      // Fallback to C major
      this.keyCenter = "C";
      this.scaleType = "major";
      this.currentScale = ["C", "D", "E", "F", "G", "A", "B"];
    }
  }

  /**
   * Generate a melody with the given options
   */
  generateMelody(options: MelodyOptions = {}): GeneratedNote[] {
    const {
      keyCenter = this.keyCenter,
      scaleType = this.scaleType,
      length = 8,
      octaveRange = [3, 5],
      preferredIntervals = [1, 2, 3, 4, 5], // Prefer smaller intervals
      emotionalCharacter = "peaceful",
      emphasizeChordTones = false,
      chordProgression = []
    } = options;

    // Update scale if different from current
    if (keyCenter !== this.keyCenter || scaleType !== this.scaleType) {
      this.setScale(keyCenter, scaleType);
    }

    const melody: GeneratedNote[] = [];
    const availableNotes = this.generateAvailableNotes(octaveRange);
    
    // Generate starting note (usually tonic)
    const startingNote = this.selectStartingNote(availableNotes, emotionalCharacter);
    melody.push(startingNote);

    // Generate subsequent notes
    for (let i = 1; i < length; i++) {
      const previousNote = melody[i - 1];
      const chordContext = chordProgression[Math.floor(i / 2)] || null;
      
      const nextNote = this.selectNextNote(
        previousNote,
        availableNotes,
        preferredIntervals,
        emotionalCharacter,
        emphasizeChordTones,
        chordContext
      );
      
      melody.push(nextNote);
    }

    // Ensure melodic closure (end on tonic or stable note)
    if (length > 1) {
      melody[melody.length - 1] = this.selectClosingNote(availableNotes, emotionalCharacter);
    }

    logger.debug(`Generated melody with ${melody.length} notes in ${keyCenter} ${scaleType}`);
    return melody;
  }

  /**
   * Generate arpeggios based on chord progressions
   */
  generateArpeggio(chordSymbol: string, octave: number = 4, pattern: "up" | "down" | "upDown" = "up"): GeneratedNote[] {
    try {
      const chord = Chord.get(chordSymbol);
      if (chord.empty) {
        throw new Error(`Invalid chord: ${chordSymbol}`);
      }

      const notes = chord.notes.map((noteName, index) => ({
        noteName: `${noteName}${octave}`,
        solfege: this.noteToSolfege(noteName),
        scaleDegree: this.getScaleDegree(noteName),
        frequency: this.calculateFrequency(`${noteName}${octave}`),
        emotionalWeight: index === 0 ? 1.0 : 0.7 // Root has highest weight
      }));

      // Apply pattern
      switch (pattern) {
        case "down":
          return notes.reverse();
        case "upDown":
          return [...notes, ...notes.slice(1, -1).reverse()];
        default:
          return notes;
      }
    } catch (error) {
      logger.warn("Arpeggio generation failed:", error);
      return [];
    }
  }

  /**
   * Generate scale passages
   */
  generateScalePassage(
    direction: "ascending" | "descending" | "both" = "ascending",
    startOctave: number = 4,
    noteCount: number = 8
  ): GeneratedNote[] {
    const notes: GeneratedNote[] = [];
    const scaleNotes = this.currentScale;

    for (let i = 0; i < noteCount; i++) {
      let scaleIndex: number;
      let octave = startOctave;

      if (direction === "ascending") {
        scaleIndex = i % scaleNotes.length;
        octave += Math.floor(i / scaleNotes.length);
      } else if (direction === "descending") {
        scaleIndex = (scaleNotes.length - 1 - (i % scaleNotes.length));
        octave += Math.floor(i / scaleNotes.length);
      } else { // both
        const halfPoint = Math.floor(noteCount / 2);
        if (i < halfPoint) {
          scaleIndex = i % scaleNotes.length;
          octave += Math.floor(i / scaleNotes.length);
        } else {
          const reverseIndex = noteCount - 1 - i;
          scaleIndex = reverseIndex % scaleNotes.length;
          octave += Math.floor(reverseIndex / scaleNotes.length);
        }
      }

      const noteName = scaleNotes[scaleIndex];
      const noteWithOctave = `${noteName}${octave}`;

      notes.push({
        noteName: noteWithOctave,
        solfege: this.noteToSolfege(noteName),
        scaleDegree: scaleIndex + 1,
        frequency: this.calculateFrequency(noteWithOctave),
        emotionalWeight: this.calculateEmotionalWeight(scaleIndex + 1)
      });
    }

    return notes;
  }

  // Private helper methods

  private generateAvailableNotes(octaveRange: [number, number]): GeneratedNote[] {
    const notes: GeneratedNote[] = [];
    
    for (let octave = octaveRange[0]; octave <= octaveRange[1]; octave++) {
      this.currentScale.forEach((noteName, index) => {
        const noteWithOctave = `${noteName}${octave}`;
        notes.push({
          noteName: noteWithOctave,
          solfege: this.noteToSolfege(noteName),
          scaleDegree: index + 1,
          frequency: this.calculateFrequency(noteWithOctave),
          emotionalWeight: this.calculateEmotionalWeight(index + 1)
        });
      });
    }

    return notes;
  }

  private selectStartingNote(availableNotes: GeneratedNote[], character: string): GeneratedNote {
    // Prefer tonic (Do) for most characters, dominant (Sol) for energetic
    const preferredDegrees = character === "energetic" ? [5, 1, 3] : [1, 3, 5];
    
    for (const degree of preferredDegrees) {
      const candidates = availableNotes.filter(note => note.scaleDegree === degree);
      if (candidates.length > 0) {
        // Prefer middle register
        const middleIndex = Math.floor(candidates.length / 2);
        return candidates[middleIndex];
      }
    }

    return availableNotes[0]; // Fallback
  }

  private selectNextNote(
    previousNote: GeneratedNote,
    availableNotes: GeneratedNote[],
    preferredIntervals: number[],
    character: string,
    emphasizeChordTones: boolean,
    chordContext: string | null
  ): GeneratedNote {
    const candidates = availableNotes.filter(note => {
      const interval = this.calculateInterval(previousNote.noteName, note.noteName);
      return preferredIntervals.some(pref => Math.abs(interval) <= pref);
    });

    if (candidates.length === 0) {
      return availableNotes[0]; // Fallback
    }

    // Score candidates based on various factors
    const scoredCandidates = candidates.map(note => ({
      note,
      score: this.calculateNoteScore(note, previousNote, character, emphasizeChordTones, chordContext)
    }));

    // Sort by score and add some randomness
    scoredCandidates.sort((a, b) => b.score - a.score);
    
    // Select from top candidates with weighted randomness
    const topCandidates = scoredCandidates.slice(0, Math.min(3, scoredCandidates.length));
    const randomIndex = Math.floor(Math.random() * topCandidates.length);
    
    return topCandidates[randomIndex].note;
  }

  private selectClosingNote(availableNotes: GeneratedNote[], character: string): GeneratedNote {
    // Prefer tonic for closure
    const tonicCandidates = availableNotes.filter(note => note.scaleDegree === 1);
    if (tonicCandidates.length > 0) {
      const middleIndex = Math.floor(tonicCandidates.length / 2);
      return tonicCandidates[middleIndex];
    }

    return availableNotes[0]; // Fallback
  }

  private calculateInterval(note1: string, note2: string): number {
    try {
      const interval = Interval.distance(note1, note2);
      return Interval.semitones(interval) || 0;
    } catch {
      return 0;
    }
  }

  private calculateNoteScore(
    note: GeneratedNote,
    previousNote: GeneratedNote,
    character: string,
    emphasizeChordTones: boolean,
    chordContext: string | null
  ): number {
    let score = note.emotionalWeight;

    // Character-based scoring
    switch (character) {
      case "bright":
        if ([1, 3, 5].indexOf(note.scaleDegree) !== -1) score += 0.3;
        break;
      case "dark":
        if ([2, 4, 6, 7].indexOf(note.scaleDegree) !== -1) score += 0.3;
        break;
      case "mysterious":
        if ([4, 6, 7].indexOf(note.scaleDegree) !== -1) score += 0.4;
        break;
      case "energetic":
        if ([5, 7].indexOf(note.scaleDegree) !== -1) score += 0.3;
        break;
    }

    // Chord tone emphasis
    if (emphasizeChordTones && chordContext) {
      try {
        const chord = Chord.get(chordContext);
        const notePC = Note.get(note.noteName).pc;
        if (chord.notes.some(chordNote => Note.get(chordNote).pc === notePC)) {
          score += 0.4;
        }
      } catch {
        // Ignore chord analysis errors
      }
    }

    return score;
  }

  private noteToSolfege(noteName: string): string {
    const scaleDegree = this.getScaleDegree(noteName);
    const solfegeMap = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];
    return solfegeMap[scaleDegree - 1] || "Do";
  }

  private getScaleDegree(noteName: string): number {
    const notePC = Note.get(noteName).pc;
    let scaleIndex = -1;
    
    for (let i = 0; i < this.currentScale.length; i++) {
      if (Note.get(this.currentScale[i]).pc === notePC) {
        scaleIndex = i;
        break;
      }
    }
    
    return scaleIndex !== -1 ? scaleIndex + 1 : 1;
  }

  private calculateFrequency(noteWithOctave: string): number {
    try {
      const note = Note.get(noteWithOctave);
      return note.freq || 440; // Default to A4
    } catch {
      return 440;
    }
  }

  private calculateEmotionalWeight(scaleDegree: number): number {
    // Emotional weights based on solfege characteristics
    const weights = {
      1: 1.0,   // Do - foundation
      2: 0.6,   // Re - motion
      3: 0.8,   // Mi - joy
      4: 0.4,   // Fa - tension
      5: 0.9,   // Sol - strength
      6: 0.7,   // La - longing
      7: 0.3,   // Ti - urgency
    };
    return weights[scaleDegree as keyof typeof weights] || 0.5;
  }
}

// Export default instance
export const melodyGenerator = new MelodyGenerator();