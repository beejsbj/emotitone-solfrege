/**
 * Music Theory Types
 * Centralized type definitions for all music-related data structures
 */

/**
 * Musical mode families used for UI grouping and keyboard behavior
 */
export type MusicalModeFamily =
  | "heptatonic"
  | "hexatonic"
  | "pentatonic"
  | "chromatic";

/**
 * Core solfege note data structure with emotional and visual properties
 * Colors are now handled by the unified color system and not stored in the data structure
 */
export interface SolfegeData {
  /** Solfege name (Do, Re, Mi, etc.) */
  name: string;
  /** Scale degree number within the current mode (1-based) */
  number: number;
  /** Emotional character description */
  emotion: string;
  /** Detailed description of the note's character */
  description: string;
  /** Shape of visual flecks */
  fleckShape: "circle" | "star" | "diamond" | "sparkle" | "mist";
  /** Textural description for visual effects */
  texture: string;
  /** Tonal interval name from the tonic (for example 3m or 5P) */
  intervalName?: string;
  /** Semitone offset from the tonic */
  semitones?: number;
}

/**
 * Supported musical modes
 */
export type MusicalMode =
  | "major"
  | "minor"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "locrian"
  | "harmonic minor"
  | "melodic minor"
  | "major pentatonic"
  | "minor pentatonic"
  | "major blues"
  | "minor blues"
  | "chromatic";

/**
 * Central mode catalog entry
 */
export interface ModeDefinition {
  mode: MusicalMode;
  label: string;
  tonalName: string;
  family: MusicalModeFamily;
  degreeCount: number;
}

/**
 * Musical scale definition with generated intervals and solfege data
 */
export interface Scale {
  /** Display name (Major, Dorian, etc.) */
  name: string;
  /** Application mode id */
  mode: MusicalMode;
  /** Tonal.js scale name */
  tonalName: string;
  /** Mode family */
  family: MusicalModeFamily;
  /** Number of scale degrees before the octave */
  degreeCount: number;
  /** Tonal interval names from the tonic */
  intervalNames: string[];
  /** Semitone intervals from root note */
  intervals: number[];
  /** Associated solfege data for each scale degree */
  solfege: SolfegeData[];
}

/**
 * Individual note in a sequence with duration
 */

/**
 * Melody Categories
 */
export type MelodyCategory =
  | "intervals"
  | "patterns"
  | "complete"
  | "userCreated";

/**
 * Basic note structure with frequency and MIDI data
 */
export interface Note {
  /** Note name (C, D, E, etc.) */
  name: string;
  /** Frequency in Hz */
  frequency: number;
  /** MIDI note number */
  midiNumber: number;
}

/**
 * Chromatic note names
 */
export type ChromaticNote =
  | "C"
  | "C#"
  | "D"
  | "D#"
  | "E"
  | "F"
  | "F#"
  | "G"
  | "G#"
  | "A"
  | "A#"
  | "B";

/**
 * Interface for tracking active notes in the music store
 */
export interface ActiveNote {
  /** Index of the solfege note in the scale */
  solfegeIndex: number;
  /** Solfege data for the note */
  solfege: SolfegeData;
  /** Frequency of the note in Hz */
  frequency: number;
  /** Octave number */
  octave: number;
  /** Unique identifier for the note */
  noteId: string;
  /** Note name with octave (e.g., "C4", "E5") */
  noteName: string;
  /** Harmonic context snapshot for downstream visuals */
  mode: MusicalMode;
  /** Key snapshot for downstream visuals */
  key: ChromaticNote;
}
