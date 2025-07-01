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
 * Melodic pattern definition for emotional expression
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
 * Circular sequencer beat definition
 */
export interface SequencerBeat {
  /** Unique identifier for the beat */
  id: string;
  /** Ring number (0 = outermost, 6 = innermost for 7-note scale) */
  ring: number;
  /** Step position (0-15 for 16 steps) */
  step: number;
  /** Duration in steps */
  duration: number;
  /** Solfege name */
  solfegeName: string;
  /** Solfege index in the scale */
  solfegeIndex: number;
  /** Octave for the note */
  octave: number;
}

/**
 * Saved melody definition for the circular sequencer
 */
export interface SavedMelody {
  /** Unique identifier for the melody */
  id: string;
  /** Melody name */
  name: string;
  /** Description of the melody */
  description: string;
  /** Emotional character */
  emotion: string;
  /** Array of beats in the melody */
  beats: SequencerBeat[];
  /** Tempo (BPM) */
  tempo: number;
  /** Base octave */
  baseOctave: number;
  /** Total number of steps (usually 16) */
  steps: number;
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  modifiedAt: Date;
}

/**
 * Sequencer configuration
 */
export interface SequencerConfig {
  /** Number of steps in the sequence */
  steps: number;
  /** Number of rings (based on scale size) */
  rings: number;
  /** Tempo in BPM */
  tempo: number;
  /** Base octave */
  baseOctave: number;
  /** Whether the sequencer is currently playing */
  isPlaying: boolean;
  /** Current step position during playback */
  currentStep: number;
}
