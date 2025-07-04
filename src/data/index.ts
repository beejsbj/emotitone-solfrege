/**
 * Music Theory Data for Emotitone Solfege
 * Consolidated exports from modular data files
 * This file maintains backward compatibility while the data is now organized in separate modules
 */

// Import from modular files
export { 
  CHROMATIC_NOTES, 
  SOLFEGE_NOTES, 
  EXTENDED_SOLFEGE_NOTES,
  validateNote,
  getSemitoneDistance,
  transposeNote,
  getPitchClass,
  noteToSolfege,
} from "./notes";
export { MAJOR_SOLFEGE, MINOR_SOLFEGE } from "./solfege";
export { MAJOR_SCALE, MINOR_SCALE } from "./scales";
export { 
  MELODIC_PATTERNS,
  getPatternsByInterval,
  getPatternsByTension,
} from "./patterns";

// Patterns - updated exports (remove duplicates and invalid exports)
export {
  melodicPatterns as MELODIC_PATTERNS_NEW, // Export new structure with different name to avoid conflict
  getAllMelodicPatterns,
  getPatternsByEmotion,
  getIntervalPatterns,
  getMelodicPatterns,
  getCompleteMelodies,
  getMelodyByName,
  getAllMelodiesByEmotion,
  allMelodies,
  getMelodiesByCategory,
} from "./patterns";
export type { MelodicPattern, Melody, MelodyCategory, CategorizedMelody } from "./patterns";

// Re-export types for backward compatibility
export type {
  SolfegeData,
  Scale,
  ChromaticNote,
  TonalAnalysis,
  MusicAnalysis,
} from "@/types/music";

export type {
  NoteColorRelationships,
} from "@/types/color";

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

// Sequencer
export {
  SEQUENCER_ICONS,
  SEQUENCER_COLOR_PALETTES,
  getColorPaletteById,
  getDefaultColorPalette,
} from "./sequencer";

// Backward compatibility - re-export everything from musicData for existing imports
export * from "./musicData";
