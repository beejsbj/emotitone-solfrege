/**
 * Data Module Exports
 * Centralized exports for all music theory data
 */

// Notes
export { CHROMATIC_NOTES } from "./notes";
export type { ChromaticNote } from "./notes";
export { SOLFEGE_NOTES } from "./notes";

// Solfege
export { MAJOR_SOLFEGE, MINOR_SOLFEGE } from "./solfege";
export type { SolfegeData } from "./solfege";

// Scales
export { MAJOR_SCALE, MINOR_SCALE } from "./scales";
export type { Scale } from "./scales";

// Patterns - updated exports
export {
  melodicPatterns as MELODIC_PATTERNS, // Export new structure with old name for compatibility
  getAllMelodicPatterns,
  getPatternsByEmotion,
  getIntervalPatterns,
  getMelodicPatterns,
  completeMelodies,
  allMelodies,
  getCompleteMelodies,
  getMelodyByName,
  getAllMelodiesByEmotion,
} from "./patterns";
export type { MelodicPattern, Melody } from "./patterns";

// Instruments
export {
  AVAILABLE_INSTRUMENTS,
  DEFAULT_INSTRUMENT,
  MAX_POLYPHONY,
  PIANO_ENVELOPE,
  STANDARD_COMPRESSOR,
  PIANO_SAMPLER_CONFIG,
  SYNTH_CONFIGS,
  CATEGORY_DISPLAY_NAMES,
  getInstrumentConfig,
  getInstrumentsByCategory,
  getAvailableInstrumentNames,
  isValidInstrument,
} from "./instruments";

// Backward compatibility - re-export everything from musicData for existing imports
export * from "./musicData";
