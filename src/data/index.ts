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

// Patterns
export { MELODIC_PATTERNS } from "./patterns";
export type { MelodicPattern } from "./patterns";

// Backward compatibility - re-export everything from musicData for existing imports
export * from "./musicData";
