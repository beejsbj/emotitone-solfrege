/**
 * Music Theory Data for Emotitone Solfege
 * Consolidated exports from modular data files
 * This file maintains backward compatibility while the data is now organized in separate modules
 */

// Import from modular files
export { CHROMATIC_NOTES, SOLFEGE_NOTES, ALL_SOLFEGE_NOTES } from "./notes";
export {
  INTERVAL_IDENTITY_MAP,
  INTERVAL_TO_SOLFEGE,
  MAJOR_SOLFEGE,
  MINOR_SOLFEGE,
  MOVABLE_DO_SOLFEGE_NOTES,
  createSolfegeData,
  getSolfegeLabelForInterval,
} from "./solfege";
export {
  MODE_DEFINITIONS,
  MODE_OPTIONS,
  MODE_ORDER,
  getModeDefinition,
} from "./modes";
export {
  MAJOR_SCALE,
  MINOR_SCALE,
  SCALE_MAP,
  getScaleForMode,
  getSolfegeNameForMode,
} from "./scales";

// Re-export types for backward compatibility
export type {
  ChromaticNote,
  ModeDefinition,
  MusicalMode,
  MusicalModeFamily,
  Scale,
  SolfegeData,
} from "@/types/music";
