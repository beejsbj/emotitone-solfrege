/**
 * Music Theory Data for Emotitone Solfege
 * Consolidated exports from modular data files
 * This file maintains backward compatibility while the data is now organized in separate modules
 */

// Import from modular files
export { CHROMATIC_NOTES } from "./notes";
export { MAJOR_SOLFEGE, MINOR_SOLFEGE } from "./solfege";
export { MAJOR_SCALE, MINOR_SCALE } from "./scales";
export { MELODIC_PATTERNS } from "./patterns";

// Re-export types for backward compatibility
export type {
  SolfegeData,
  Scale,
  MelodicPattern,
  ChromaticNote,
} from "@/types/music";
