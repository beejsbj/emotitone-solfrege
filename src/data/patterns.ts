/**
 * Enhanced Melodic Patterns Data using Tonal.js
 * Leverages Tonal.js for accurate interval calculations and pattern analysis
 */

import { Interval, Scale } from "@tonaljs/tonal";
import type { MelodicPattern } from "@/types/music";

// Re-export types for backward compatibility
export type { MelodicPattern };

/**
 * Generate interval data using Tonal.js
 */
function generateIntervalData(intervalName: string): { 
  semitones: number; 
  name: string; 
} {
  const interval = Interval.get(intervalName);
  return {
    semitones: interval.semitones || 0,
    name: interval.name || intervalName,
  };
}

/**
 * Generate melodic pattern from scale degrees using Tonal.js
 */
function generatePatternFromDegrees(
  degrees: number[], 
  key: string = "C", 
  scaleType: string = "major"
): string[] {
  const scale = Scale.get(`${key} ${scaleType}`);
  return degrees.map(degree => {
    const noteIndex = (degree - 1) % scale.notes.length;
    return scale.notes[noteIndex] || "C";
  });
}

/**
 * Common melodic patterns and intervals with enhanced Tonal.js analysis
 */
export const MELODIC_PATTERNS: MelodicPattern[] = [
  // Basic Intervals - Enhanced with Tonal.js calculations
  {
    name: "Unison",
    description: "Perfect unity, no movement",
    emotion: "Unity, completion, stillness",
    sequence: ["Do", "Do"],
    intervals: [generateIntervalData("1P").semitones], // Perfect unison
    tonalAnalysis: {
      intervalName: "Perfect Unison",
      consonance: "perfect",
      tension: 0,
    }
  },
  {
    name: "Minor 2nd",
    description: "Half-step dissonance, intense yearning",
    emotion: "Dissonance, yearning, pain, tension",
    sequence: ["Do", "Ra"],
    intervals: [generateIntervalData("2m").semitones], // Minor 2nd
    tonalAnalysis: {
      intervalName: "Minor Second",
      consonance: "dissonant",
      tension: 9,
    }
  },
  {
    name: "Major 2nd",
    description: "Whole step, gentle forward motion",
    emotion: "Gentle tension, stepping forward, hope",
    sequence: ["Do", "Re"],
    intervals: [generateIntervalData("2M").semitones], // Major 2nd
    tonalAnalysis: {
      intervalName: "Major Second",
      consonance: "dissonant",
      tension: 7,
    }
  },
  {
    name: "Minor 3rd",
    description: "The sound of melancholy and introspection",
    emotion: "Sadness, introspection, tenderness",
    sequence: ["Do", "Me"],
    intervals: [generateIntervalData("3m").semitones], // Minor 3rd
    tonalAnalysis: {
      intervalName: "Minor Third",
      consonance: "imperfect consonant",
      tension: 3,
    }
  },
  {
    name: "Major 3rd",
    description: "Bright, joyful, optimistic interval",
    emotion: "Joy, brightness, optimism",
    sequence: ["Do", "Mi"],
    intervals: [generateIntervalData("3M").semitones], // Major 3rd
    tonalAnalysis: {
      intervalName: "Major Third",
      consonance: "imperfect consonant",
      tension: 2,
    }
  },
  {
    name: "Perfect 4th",
    description: "Open, stable, foundational",
    emotion: "Stability, openness, strength",
    sequence: ["Do", "Fa"],
    intervals: [generateIntervalData("4P").semitones], // Perfect 4th
    tonalAnalysis: {
      intervalName: "Perfect Fourth",
      consonance: "imperfect consonant",
      tension: 1,
    }
  },
  {
    name: "Tritone",
    description: "The devil's interval - maximum tension",
    emotion: "Tension, mystery, unrest, instability",
    sequence: ["Do", "Fi"],
    intervals: [generateIntervalData("4A").semitones], // Tritone
    tonalAnalysis: {
      intervalName: "Tritone",
      consonance: "dissonant",
      tension: 10,
    }
  },
  {
    name: "Perfect 5th",
    description: "Pure, powerful, cosmic",
    emotion: "Power, openness, clarity, strength",
    sequence: ["Do", "Sol"],
    intervals: [generateIntervalData("5P").semitones], // Perfect 5th
    tonalAnalysis: {
      intervalName: "Perfect Fifth",
      consonance: "perfect",
      tension: 0,
    }
  },
  {
    name: "Major 6th",
    description: "Warm, embracing, romantic",
    emotion: "Warmth, romance, longing",
    sequence: ["Do", "La"],
    intervals: [generateIntervalData("6M").semitones], // Major 6th
    tonalAnalysis: {
      intervalName: "Major Sixth",
      consonance: "imperfect consonant",
      tension: 3,
    }
  },
  {
    name: "Major 7th",
    description: "Sophisticated tension, jazz color",
    emotion: "Sophisticated tension, complexity",
    sequence: ["Do", "Ti"],
    intervals: [generateIntervalData("7M").semitones], // Major 7th
    tonalAnalysis: {
      intervalName: "Major Seventh",
      consonance: "dissonant",
      tension: 8,
    }
  },
  {
    name: "Octave",
    description: "Perfect completion, return home",
    emotion: "Completion, resolution, return",
    sequence: ["Do", "Do'"],
    intervals: [generateIntervalData("8P").semitones], // Octave
    tonalAnalysis: {
      intervalName: "Perfect Octave",
      consonance: "perfect",
      tension: 0,
    }
  },

  // Enhanced Melodic Patterns
  {
    name: "Scale Ascent",
    description: "Complete major scale ascending journey",
    emotion: "Rising, building energy, optimism",
    sequence: ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti", "Do'"],
    intervals: [2, 2, 1, 2, 2, 2, 1], // Whole and half steps
    scalePattern: generatePatternFromDegrees([1, 2, 3, 4, 5, 6, 7, 8]),
  },
  {
    name: "Scale Descent",
    description: "Complete major scale descending journey",
    emotion: "Falling, releasing energy, resolution",
    sequence: ["Do'", "Ti", "La", "Sol", "Fa", "Mi", "Re", "Do"],
    intervals: [-1, -2, -2, -1, -2, -2, -2], // Negative intervals for descent
    scalePattern: generatePatternFromDegrees([8, 7, 6, 5, 4, 3, 2, 1]),
  },
  {
    name: "Do-Sol-Do (Power Leap)",
    description: "Perfect fifth leap and return - triumphant",
    emotion: "Triumphant, powerful, heroic",
    sequence: ["Do", "Sol", "Do'"],
    intervals: [7, 5], // Perfect 5th up, Perfect 4th up
    scalePattern: generatePatternFromDegrees([1, 5, 8]),
  },
  {
    name: "Leading Tone Resolution",
    description: "Ti resolving to Do - strongest resolution",
    emotion: "Urgent resolution, satisfaction",
    sequence: ["Ti", "Do'"],
    intervals: [1], // Half step up
    scalePattern: generatePatternFromDegrees([7, 8]),
  },
  {
    name: "Lament Bass",
    description: "Descending chromatic line - deeply emotional",
    emotion: "Grief, sorrow, lamenting",
    sequence: ["Do", "Ti", "La", "Sol"],
    intervals: [-1, -1, -1], // Chromatic descent
    scalePattern: generatePatternFromDegrees([1, 7, 6, 5]),
  },
  {
    name: "Circle of Fifths Progression",
    description: "Moving through keys via perfect fifths",
    emotion: "Harmonic journey, sophistication",
    sequence: ["Do", "Sol", "Re", "La", "Mi"],
    intervals: [7, 7, 7, 7], // All perfect fifths
    scalePattern: generatePatternFromDegrees([1, 5, 2, 6, 3]),
  },
  {
    name: "Picardy Third",
    description: "Minor to major resolution",
    emotion: "Unexpected brightness, hope from darkness",
    sequence: ["Me", "Mi"],
    intervals: [1], // Half step up
    scalePattern: ["Eb", "E"], // Example in C
  },
];

/**
 * Get patterns by interval type using Tonal.js classification
 */
export function getPatternsByInterval(intervalType: "consonant" | "dissonant"): MelodicPattern[] {
  return MELODIC_PATTERNS.filter(pattern => {
    if (!pattern.tonalAnalysis) return false;
    
    if (intervalType === "consonant") {
      return pattern.tonalAnalysis.consonance.includes("consonant") || 
             pattern.tonalAnalysis.consonance === "perfect";
    } else {
      return pattern.tonalAnalysis.consonance === "dissonant";
    }
  });
}

/**
 * Get patterns by tension level (0-10 scale)
 */
export function getPatternsByTension(minTension: number, maxTension: number): MelodicPattern[] {
  return MELODIC_PATTERNS.filter(pattern => {
    if (!pattern.tonalAnalysis?.tension) return false;
    return pattern.tonalAnalysis.tension >= minTension && 
           pattern.tonalAnalysis.tension <= maxTension;
  });
}
