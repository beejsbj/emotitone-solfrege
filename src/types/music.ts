/**
 * Music Theory Types
 * Centralized type definitions for all music-related data structures
 */

/**
 * Core solfege note data structure with emotional and visual properties
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
  
  // Enhanced color system
  /** Primary gradient CSS variable reference */
  colorGradient: string;
  /** Main color CSS variable reference */
  colorPrimary: string;
  /** Supporting color CSS variable reference */
  colorSecondary: string;
  /** Accent/highlight color CSS variable reference */
  colorAccent: string;
  /** Bright highlight color CSS variable reference */
  colorHighlight: string;
  /** Fleck color CSS variable reference */
  colorFlecks: string;
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
export type ChromaticNote = "C" | "C#" | "D" | "D#" | "E" | "F" | "F#" | "G" | "G#" | "A" | "A#" | "B";
