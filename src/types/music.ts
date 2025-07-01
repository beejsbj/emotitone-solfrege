/**
 * Music Theory Types
 * Centralized type definitions for all music-related data structures
 */

/**
 * Core solfege note data structure with emotional and visual properties
 * Colors are now handled by the unified color system and not stored in the data structure
 */
export interface SolfegeData {
  /** Solfege name (Do, Re, Mi, etc.) */
  name: string;
  /** Scale degree number (1-8) */
  number: number;
  /** Emotional character description */
  emotion: string;
  /** Detailed description of the note's character */
  description: string;
  /** Shape of visual flecks */
  fleckShape: "circle" | "star" | "diamond" | "sparkle" | "mist";
  /** Textural description for visual effects */
  texture: string;
}

/**
 * Musical scale definition with intervals and solfege data
 */
export interface Scale {
  /** Scale name (Major, Minor, etc.) */
  name: string;
  /** Semitone intervals from root note */
  intervals: number[];
  /** Associated solfege data for each scale degree */
  solfege: SolfegeData[];
}

/**
 * Enhanced Tonal.js analysis data for musical patterns
 */
export interface TonalAnalysis {
  /** Full interval name from Tonal.js */
  intervalName: string;
  /** Consonance classification */
  consonance: "perfect" | "imperfect consonant" | "dissonant";
  /** Tension level (0-10 scale) */
  tension: number;
  /** Optional additional Tonal.js properties */
  quality?: string;
  semitones?: number;
}

/**
 * Enhanced melodic pattern definition with Tonal.js analysis
 */
export interface MelodicPattern {
  /** Pattern name */
  name: string;
  /** Pattern description */
  description: string;
  /** Emotional character of the pattern */
  emotion: string;
  /** Sequence of solfege names */
  sequence: string[];
  /** Optional interval pattern in semitones */
  intervals?: number[];
  /** Enhanced Tonal.js analysis data */
  tonalAnalysis?: TonalAnalysis;
  /** Optional scale pattern generated from Tonal.js */
  scalePattern?: string[];
  /** Optional harmonic context */
  harmonicContext?: {
    /** Roman numeral analysis */
    romanNumerals?: string[];
    /** Functional harmony labels */
    functions?: string[];
    /** Key center if applicable */
    keyCenter?: string;
  };
}

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
 * Musical mode type
 */
export type MusicalMode = "major" | "minor";

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
}

/**
 * Enhanced note color relationships interface
 */
export interface NoteColorRelationships {
  /** Primary color for the note */
  primary: string;
  /** Accent color (complementary) */
  accent: string;
  /** Secondary color (triadic) */
  secondary: string;
  /** Tertiary color (split-complementary) */
  tertiary: string;
}

/**
 * Music theory analysis result from Tonal.js
 */
export interface MusicAnalysis {
  /** Key signature analysis */
  key?: {
    /** Detected key center */
    keyCenter: string;
    /** Scale type (major, minor, etc.) */
    scaleType: string;
    /** Confidence score (0-1) */
    confidence: number;
  };
  /** Chord analysis */
  chords?: {
    /** Chord symbol */
    symbol: string;
    /** Root note */
    root: string;
    /** Chord quality */
    quality: string;
    /** Extensions */
    extensions: string[];
  }[];
  /** Scale analysis */
  scale?: {
    /** Scale notes */
    notes: string[];
    /** Scale intervals */
    intervals: string[];
    /** Scale modes */
    modes: string[];
  };
}
