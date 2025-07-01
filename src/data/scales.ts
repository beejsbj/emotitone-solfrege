/**
 * Enhanced Musical Scales Data using Tonal.js
 * Leverages Tonal.js for accurate scale generation and validation
 */

import { Scale as TonalScale, Interval } from "@tonaljs/tonal";
import type { Scale } from "@/types";
import { MAJOR_SOLFEGE, MINOR_SOLFEGE } from "./solfege";

// Re-export types for backward compatibility
export type { Scale };

/**
 * Generate scale intervals using Tonal.js
 */
function generateScaleIntervals(scaleType: string): number[] {
  try {
    const scale = TonalScale.get(`C ${scaleType}`);
    return scale.intervals.map((interval) => {
      const semitones = Interval.semitones(interval);
      return semitones ?? 0;
    });
  } catch (error) {
    console.warn(
      `Failed to generate intervals for ${scaleType}, using fallback`
    );
    return scaleType === "major"
      ? [0, 2, 4, 5, 7, 9, 11, 12]
      : [0, 2, 3, 5, 7, 8, 10, 12];
  }
}

/**
 * Enhanced Major scale definition using Tonal.js
 * W-W-H-W-W-W-H pattern + octave (validated by Tonal.js)
 */
export const MAJOR_SCALE: Scale = {
  name: "Major",
  intervals: generateScaleIntervals("major"),
  solfege: MAJOR_SOLFEGE,
};

/**
 * Enhanced Minor scale definition using Tonal.js
 * W-H-W-W-H-W-W pattern (natural minor) + octave (validated by Tonal.js)
 */
export const MINOR_SCALE: Scale = {
  name: "Minor",
  intervals: generateScaleIntervals("minor"),
  solfege: MINOR_SOLFEGE,
};
