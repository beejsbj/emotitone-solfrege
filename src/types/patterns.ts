/**
 * Pattern Recording and Storage Types
 * Defines interfaces for the automatic pattern detection and history tracking system
 */

import type { ChromaticNote, MusicalMode, SolfegeData } from './music'

/**
 * Individual note interaction record with complete musical context
 * Records every key press and release with timing and musical information
 */
export interface HistoryNote {
  /** Unique identifier for this note interaction */
  id: string
  
  /** Musical Context */
  /** Note name with octave (e.g., "C4", "F#5") */
  note: string
  /** Current musical key */
  key: ChromaticNote
  /** Current musical scale/mode */
  mode: MusicalMode
  /** Scale degree (1-7) */
  scaleDegree: number
  /** Solfège information for this note */
  solfege: SolfegeData
  /** Solfège index in current scale (0-6) */
  solfegeIndex: number
  /** Octave number */
  octave: number
  /** Frequency in Hz */
  frequency: number
  
  /** Audio Context */
  /** Current instrument identifier */
  instrument: string
  /** Velocity/volume (0-1) */
  velocity?: number
  
  /** Timing Information */
  /** Timestamp when note was pressed (Date.now()) */
  pressTime: number
  /** Timestamp when note was released (Date.now()) */
  releaseTime?: number
  /** Calculated duration in milliseconds */
  duration?: number
  
  /** Additional Metadata */
  /** Session identifier to group related interactions */
  sessionId: string
  /** Unique note ID from audio service for polyphonic tracking */
  audioNoteId?: string
}

/**
 * Detected musical pattern from user interactions
 * Automatically created from history when silence gaps or context changes occur
 */
export interface Pattern {
  /** Unique pattern identifier */
  id: string
  
  /** Pattern Content */
  /** Array of notes that make up this pattern */
  notes: HistoryNote[]
  /** Total duration of pattern in milliseconds */
  totalDuration: number
  /** Number of notes in pattern */
  noteCount: number
  
  /** Musical Context */
  /** Primary key for this pattern */
  key: ChromaticNote
  /** Primary scale/mode for this pattern */
  mode: MusicalMode
  /** Primary instrument for this pattern */
  instrument: string
  /** Visual color associated with this pattern (from color system) */
  color?: string
  
  /** Pattern Metadata */
  /** When this pattern was first detected */
  createdAt: number
  /** When this pattern was last played/accessed */
  lastPlayedAt: number
  /** Whether user has explicitly saved this pattern */
  isSaved: boolean
  /** How many times this pattern has been played */
  playCount: number
  /** Optional user-assigned name */
  name?: string
  /** Optional user-assigned tags */
  tags?: string[]
  
  /** Pattern Statistics */
  /** Average note duration in milliseconds */
  averageNoteDuration?: number
  /** Most common scale degree in pattern */
  dominantScaleDegree?: number
  /** Complexity score (0-1) based on rhythm and pitch variety */
  complexityScore?: number
  
  /** Pattern Classification */
  /** Auto-detected pattern type */
  patternType: 'melody' | 'rhythm' | 'chord' | 'scale' | 'arpeggio' | 'mixed'
  /** Confidence in auto-detection (0-1) */
  detectionConfidence?: number
}

/**
 * Configuration for pattern detection behavior
 */
export interface PatternDetectionConfig {
  /** Minimum silence duration (ms) to split patterns (default: 3000ms = 3 seconds) */
  silenceThreshold: number
  
  /** Maximum age for patterns before auto-purge (ms) (default: 24 hours) */
  autoPurgeAge: number
  
  /** Maximum number of history notes to keep in memory (default: 10000) */
  maxHistorySize: number
  
  /** Minimum pattern length to save (default: 2 notes) */
  minPatternLength: number
  
  /** Maximum pattern length before auto-splitting (default: 50 notes) */
  maxPatternLength: number
  
  /** Whether to auto-detect patterns on context changes */
  detectOnContextChange: boolean
  
  /** Whether to auto-save interesting patterns */
  autoSaveInterestingPatterns: boolean
  
  /** Minimum complexity score for auto-saving patterns */
  autoSaveComplexityThreshold: number
}

/**
 * Default configuration values
 */
export const DEFAULT_PATTERN_CONFIG: PatternDetectionConfig = {
  silenceThreshold: 3000, // 3 seconds - much shorter than 1 minute for better musical grouping
  autoPurgeAge: 24 * 60 * 60 * 1000, // 24 hours
  maxHistorySize: 10000,
  minPatternLength: 2,
  maxPatternLength: 50,
  detectOnContextChange: true,
  autoSaveInterestingPatterns: false, // Start disabled, user can enable
  autoSaveComplexityThreshold: 0.6
}

/**
 * Pattern search and filter options
 */
export interface PatternSearchOptions {
  /** Filter by key */
  key?: ChromaticNote
  /** Filter by mode */
  mode?: MusicalMode  
  /** Filter by instrument */
  instrument?: string
  /** Filter by pattern type */
  patternType?: Pattern['patternType']
  /** Filter by saved status */
  isSaved?: boolean
  /** Filter by minimum play count */
  minPlayCount?: number
  /** Filter by date range */
  dateRange?: {
    start: number
    end: number
  }
  /** Text search in name/tags */
  searchText?: string
  /** Sort field */
  sortBy?: 'createdAt' | 'lastPlayedAt' | 'playCount' | 'noteCount' | 'complexityScore'
  /** Sort direction */
  sortDirection?: 'asc' | 'desc'
  /** Maximum results to return */
  limit?: number
}

/**
 * Pattern storage statistics
 */
export interface PatternStorageStats {
  /** Total number of patterns */
  totalPatterns: number
  /** Number of saved patterns */
  savedPatterns: number
  /** Number of history notes */
  historySize: number
  /** Storage usage in bytes (estimated) */
  storageUsage: number
  /** Oldest pattern date */
  oldestPattern?: number
  /** Most recent pattern date */
  newestPattern?: number
  /** Most played pattern */
  mostPlayedPattern?: Pattern
  /** Average pattern length */
  averagePatternLength: number
}

/**
 * Pattern export/import format
 */
export interface PatternExportData {
  /** Export metadata */
  version: string
  exportedAt: number
  appVersion?: string
  
  /** Exported patterns */
  patterns: Pattern[]
  /** Configuration used */
  config: PatternDetectionConfig
  /** Statistics at export time */
  stats: PatternStorageStats
}

/**
 * Session information for grouping related interactions
 */
export interface PatternSession {
  /** Unique session identifier */
  id: string
  /** When session started */
  startTime: number
  /** When session ended */
  endTime?: number
  /** Musical context at session start */
  initialKey: ChromaticNote
  initialMode: MusicalMode
  initialInstrument: string
  /** Total notes played in session */
  noteCount: number
  /** Patterns detected in this session */
  patternIds: string[]
}
