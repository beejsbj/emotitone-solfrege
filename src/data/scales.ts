/**
 * Musical Scales Data
 * Contains scale definitions and interval patterns
 */

import type { Scale } from "@/types/music";
import { MAJOR_SOLFEGE, MINOR_SOLFEGE } from "./solfege";

// Re-export types for backward compatibility
export type { Scale };

/**
 * Major scale definition
 * W-W-H-W-W-W-H pattern + octave
 */
export const MAJOR_SCALE: Scale = {
  name: "Major",
  intervals: [0, 2, 4, 5, 7, 9, 11, 12],
  solfege: MAJOR_SOLFEGE,
};

/**
 * Minor scale definition
 * W-H-W-W-H-W-W pattern (natural minor) + octave
 */
export const MINOR_SCALE: Scale = {
  name: "Minor",
  intervals: [0, 2, 3, 5, 7, 8, 10, 12],
  solfege: MINOR_SOLFEGE,
};
