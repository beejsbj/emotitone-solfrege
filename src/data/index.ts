/**
 * Data Module Exports
 * Centralized exports for all music theory data
 */

// Notes
export { CHROMATIC_NOTES } from "./notes";
export type { ChromaticNote } from "./notes";
export { SOLFEGE_NOTES, ALL_SOLFEGE_NOTES } from "./notes";

// Solfege
export {
  INTERVAL_IDENTITY_MAP,
  INTERVAL_TO_SOLFEGE,
  MAJOR_SOLFEGE,
  MINOR_SOLFEGE,
  MOVABLE_DO_SOLFEGE_NOTES,
  createSolfegeData,
  getSolfegeLabelForInterval,
} from "./solfege";
export type { SolfegeData } from "./solfege";

// Modes
export {
  MODE_DEFINITIONS,
  MODE_OPTIONS,
  MODE_ORDER,
  getModeDefinition,
} from "./modes";

// Scales
export {
  MAJOR_SCALE,
  MINOR_SCALE,
  SCALE_MAP,
  getScaleForMode,
  getSolfegeNameForMode,
} from "./scales";
export type { Scale } from "./scales";

// Patterns - updated exports

// Instruments
export { DEFAULT_INSTRUMENT } from "./instruments";

// Backward compatibility - re-export everything from musicData for existing imports
export * from "./musicData";
