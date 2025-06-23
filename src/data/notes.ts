/**
 * Musical Notes Data
 * Contains chromatic note definitions and basic note structures
 */

import type { ChromaticNote } from "@/types/music";

// Re-export types for backward compatibility
export type { ChromaticNote };

/**
 * The 12 chromatic notes
 */
export const CHROMATIC_NOTES: ChromaticNote[] = [
  "C",
  "C#",
  "D",
  "D#",
  "E",
  "F",
  "F#",
  "G",
  "G#",
  "A",
  "A#",
  "B",
];

export const SOLFEGE_NOTES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];
