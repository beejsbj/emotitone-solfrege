// Pattern Analysis Utility
// Provides tonal analysis for melodic patterns using music theory

import type { Melody, TonalAnalysis, EnhancedMelody } from "@/types/music";
import { Interval } from "@tonaljs/tonal";
import { logger } from "@/utils/logger";

/**
 * Analyze the consonance of an interval
 */
function analyzeConsonance(semitones: number): "perfect" | "imperfect consonant" | "dissonant" {
  const interval = Math.abs(semitones) % 12;
  
  // Perfect consonances
  if ([0, 7].includes(interval)) {
    return "perfect";
  }
  
  // Imperfect consonances
  if ([3, 4, 8, 9].includes(interval)) {
    return "imperfect consonant";
  }
  
  // Dissonances
  return "dissonant";
}

/**
 * Calculate tension level for an interval (0-10 scale)
 */
function calculateTension(semitones: number): number {
  const interval = Math.abs(semitones) % 12;
  
  const tensionMap: Record<number, number> = {
    0: 0,   // Unison - no tension
    1: 9,   // Minor 2nd - high tension
    2: 6,   // Major 2nd - moderate tension
    3: 3,   // Minor 3rd - low tension
    4: 2,   // Major 3rd - very low tension
    5: 4,   // Perfect 4th - some tension
    6: 10,  // Tritone - maximum tension
    7: 1,   // Perfect 5th - minimal tension
    8: 5,   // Minor 6th - moderate tension
    9: 3,   // Major 6th - low tension
    10: 7,  // Minor 7th - high tension
    11: 8,  // Major 7th - very high tension
  };
  
  return tensionMap[interval] ?? 5;
}

/**
 * Analyze a single interval and return tonal analysis
 */
export function analyzeInterval(fromNote: string, toNote: string): TonalAnalysis {
  try {
    const interval = Interval.distance(fromNote, toNote);
    const semitones = Interval.semitones(interval);
    
    // Handle case where semitones might be undefined
    if (semitones === undefined) {
      return {
        intervalName: interval || "unknown",
        consonance: "dissonant",
        tension: 5,
      };
    }
    
    return {
      intervalName: interval,
      consonance: analyzeConsonance(semitones),
      tension: calculateTension(semitones),
    };
  } catch (error) {
    logger.warn("Interval analysis failed:", error);
    return {
      intervalName: "unknown",
      consonance: "dissonant",
      tension: 5,
    };
  }
}

/**
 * Enhance a melody with tonal analysis
 */
export function enhanceMelodyWithAnalysis(melody: Melody): EnhancedMelody {
  // If the melody has intervals defined, analyze the first interval
  if (melody.intervals && melody.intervals.length > 0) {
    const semitones = melody.intervals[0];
    
    return {
      ...melody,
      tonalAnalysis: {
        intervalName: Interval.fromSemitones(semitones),
        consonance: analyzeConsonance(semitones),
        tension: calculateTension(semitones),
      },
    };
  }
  
  // If the melody has a sequence, analyze the overall contour
  if (melody.sequence && melody.sequence.length >= 2) {
    // For now, just analyze the first interval in the sequence
    // This could be expanded to analyze the entire melodic contour
    const firstNote = melody.sequence[0].note;
    const lastNote = melody.sequence[melody.sequence.length - 1].note;
    
    // Only analyze if notes include octave information
    if (firstNote.match(/\d/) && lastNote.match(/\d/)) {
      return {
        ...melody,
        tonalAnalysis: analyzeInterval(firstNote, lastNote),
      };
    }
  }
  
  return melody;
}

/**
 * Get patterns filtered by interval type
 */
export function getPatternsByInterval(
  patterns: Melody[],
  type: "consonant" | "dissonant"
): EnhancedMelody[] {
  return patterns
    .map(enhanceMelodyWithAnalysis)
    .filter((pattern) => {
      if (!pattern.tonalAnalysis) return false;
      
      if (type === "consonant") {
        return pattern.tonalAnalysis.consonance !== "dissonant";
      } else {
        return pattern.tonalAnalysis.consonance === "dissonant";
      }
    });
}

/**
 * Get patterns filtered by tension range
 */
export function getPatternsByTension(
  patterns: Melody[],
  minTension: number,
  maxTension: number
): EnhancedMelody[] {
  return patterns
    .map(enhanceMelodyWithAnalysis)
    .filter((pattern) => {
      if (!pattern.tonalAnalysis) return false;
      
      const tension = pattern.tonalAnalysis.tension;
      return tension >= minTension && tension <= maxTension;
    });
}

/**
 * Analyze all patterns and add tonal analysis
 */
export function analyzeAllPatterns(patterns: Melody[]): EnhancedMelody[] {
  logger.dev(`Analyzing ${patterns.length} patterns for tonal characteristics`);
  return patterns.map(enhanceMelodyWithAnalysis);
}