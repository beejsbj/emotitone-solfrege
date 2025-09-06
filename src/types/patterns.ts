/**
 * Pattern Logging Types
 * Type definitions for logging and analyzing musical patterns
 */

import type { ChromaticNote, MusicalMode, SolfegeData, Note } from "./music";

/**
 * Pattern store state interface
 */
export interface PatternsStoreState {
  /** Array of logged notes */
  loggedNotes: LogNote[];
  /** Current session identifier */
  currentSessionId: string;
  /** Whether pattern logging is enabled */
  isLoggingEnabled: boolean;
}

/**
 * Configuration for pattern detection and logging
 */
export interface PatternConfig {
  /** Minimum silence gap (ms) to consider starting a new pattern */
  silenceGapThreshold: number; //30sec
  /** Maximum time (ms) to keep logged notes before purging */
  maxRetentionTime: number; //24hrs
}

/**
 * Logged note interaction with comprehensive musical and timing context
 */
export interface LogNote {
  /** Unique identifier for this note interaction */
  id: string;
  /** Note name with octave (e.g., "C4", "F#5") */
  note: string;

  /* Musical Context */
  /** Current musical key */
  key: ChromaticNote;
  /** Current musical scale/mode */
  mode: MusicalMode;

  /** Scale degree root = 1 */
  scaleDegree: number;

  /** Scale index in current scale root = 0 */
  scaleIndex: number;

  /** Solfège information for this note */
  solfege: SolfegeData;

  /** Octave number */
  octave: number;
  /** Frequency in Hz */
  frequency?: number;

  /* Audio Context */
  /** Current instrument identifier */
  instrument: string;
  /** Velocity/volume (0-1) */
  velocity?: number;

  /* Timing Information */
  /** Timestamp when note was pressed (Date.now()) */
  pressTime: number;
  /** Timestamp when note was released (Date.now()) */
  releaseTime: number;
  /** Calculated duration in milliseconds (releaseTime - pressTime) */
  duration: number;

  /* Additional Metadata */
  /** Session identifier to group related interactions */
  sessionId: string;

  /**
   * keeping this key for later.
   * Calculated at the time of logging based on there being a note before this one,
   * and there being silence gap from the previous one, or a new key/mode,
   * or maybe i manually click a button to start a new pattern,
   * or maybe i press a toggle that prevents changing new patterns
   */
  isStartingNewPattern?: boolean;
}

export interface PatternNote {
  /** Unique identifier for this note interaction */
  id: string;
  /** Note name with octave (e.g., "C4", "F#5") */
  note: string;

  /** Scale degree root = 1 */
  scaleDegree: number;

  /** Scale index in current scale root = 0 */
  scaleIndex: number;

  /** Octave number */
  octave: number;
  /** Frequency in Hz */
  frequency?: number;

  /** Velocity/volume (0-1) */
  velocity?: number;

  /* Timing Information */
  /** Timestamp when note was pressed (Date.now()) */
  pressTime: number;
  /** Timestamp when note was released (Date.now()) */
  releaseTime: number;
  /** Calculated duration in milliseconds (releaseTime - pressTime) */
  duration: number;
}

export interface Pattern {
  //  Unique pattern identifier /
  id: string;
  //  Optional user-assigned name. default name Day Mo ppatern-1 /
  name?: string;

  //  Optional user-assigned tags /
  tags?: string[];

  //  Pattern Content /
  //  Array of notes that make up this pattern. PatternNote is history note without the musical context since the pattern holds that now. /
  notes: PatternNote[];

  // generated from bracketNotation
  notation?: string;

  //  Total duration of pattern in milliseconds, presstime of first note - releast time of last /
  duration?: number;

  //  Number of notes in pattern /
  noteCount?: number;

  //  Tempo information /
  bpm?: number;
  //  Time signature /
  timeSignature?: string;

  //   Musical Context, initally extracted from notes but can be changed*/
  // * Primary key for this pattern /
  key: ChromaticNote;
  //  Primary scale/mode for this pattern /
  mode: MusicalMode;
  //  Primary instrument for this pattern /
  instrument: string;

  //  Visual color associated with this pattern (from color system) /
  color?: string;

  //  Pattern Metadata /
  //  When this pattern was first detected /
  createdAt: number;

  //  Whether user has explicitly saved this pattern /
  isSaved?: boolean;
  //  Whether this is a default pattern from the library */
  isDefault?: boolean;

  //   ui related. when a pattern is selected then played notes go directly into the pattern, allowing me to edit.
  isSelected?: boolean;
}
