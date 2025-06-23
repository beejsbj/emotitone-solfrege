/**
 * Melodic Patterns Data
 * Contains common melodic patterns and interval relationships
 */

import type { MelodicPattern } from "@/types/music";

// Re-export types for backward compatibility
export type { MelodicPattern };

/**
 * Common melodic patterns and intervals with emotional characteristics
 */
export const MELODIC_PATTERNS: MelodicPattern[] = [
  // Emotional Character of Intervals
  {
    name: "Unison/Octave",
    description: "Unity, completion",
    emotion: "Unity, completion",
    sequence: ["Do", "Do"],
    intervals: [0],
  },
  {
    name: "Minor 2nd",
    description: "Dissonance, yearning, pain",
    emotion: "Dissonance, yearning, pain",
    sequence: ["Do", "Re"],
    intervals: [1],
  },
  {
    name: "Major 2nd",
    description: "Gentle tension, stepping forward",
    emotion: "Gentle tension, stepping forward",
    sequence: ["Do", "Re"],
    intervals: [2],
  },
  {
    name: "Minor 3rd",
    description: "Sadness, introspection",
    emotion: "Sadness, introspection",
    sequence: ["Do", "Me"],
    intervals: [3],
  },
  {
    name: "Major 3rd",
    description: "Joy, brightness",
    emotion: "Joy, brightness",
    sequence: ["Do", "Mi"],
    intervals: [4],
  },
  {
    name: "Perfect 4th",
    description: "Stability, openness",
    emotion: "Stability, openness",
    sequence: ["Do", "Fa"],
    intervals: [5],
  },
  {
    name: "Tritone",
    description: "Tension, mystery, unrest",
    emotion: "Tension, mystery, unrest",
    sequence: ["Do", "Fi"],
    intervals: [6],
  },
  {
    name: "Perfect 5th",
    description: "Power, openness, clarity",
    emotion: "Power, openness, clarity",
    sequence: ["Do", "Sol"],
    intervals: [7],
  },
  // Common Melodic Patterns
  {
    name: "Scale Ascent",
    description: "The classic scale journey up",
    emotion: "Rising, building energy",
    sequence: ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti", "Do"],
  },
  {
    name: "Scale Descent",
    description: "The classic scale journey down",
    emotion: "Falling, releasing energy",
    sequence: ["Do", "Ti", "La", "Sol", "Fa", "Mi", "Re", "Do"],
  },
  {
    name: "Do-Sol-Do",
    description: "Perfect fifth leap, triumphant",
    emotion: "Triumphant, powerful",
    sequence: ["Do", "Sol", "Do"],
  },
  {
    name: "Do-Ti-Do",
    description: "Leading tone resolution, urgent",
    emotion: "Urgent resolution",
    sequence: ["Do", "Ti", "Do"],
  },
  {
    name: "Do-La-Sol",
    description: "Descending sadness",
    emotion: "Melancholic descent",
    sequence: ["Do", "La", "Sol"],
  },
  {
    name: "Sol-Ti-Do",
    description: "Dominant resolution, satisfying",
    emotion: "Satisfying resolution",
    sequence: ["Sol", "Ti", "Do"],
  },
  {
    name: "La-Ti-Do",
    description: "Longing to resolution",
    emotion: "Yearning to home",
    sequence: ["La", "Ti", "Do"],
  },
  {
    name: "Do-Mi-Sol",
    description: "Major triad, bright and stable",
    emotion: "Bright, stable harmony",
    sequence: ["Do", "Mi", "Sol"],
  },
  {
    name: "Do-Re-Mi",
    description: "Optimistic ascent",
    emotion: "Optimistic, rising",
    sequence: ["Do", "Re", "Mi"],
  },
  {
    name: "Mi-Re-Do",
    description: "Gentle descent home",
    emotion: "Gentle return",
    sequence: ["Mi", "Re", "Do"],
  },
  {
    name: "Fa-Mi",
    description: "Tension release, sigh",
    emotion: "Relief, sighing",
    sequence: ["Fa", "Mi"],
  },
  {
    name: "Ti-Do-Ti-Do",
    description: "Restless resolution",
    emotion: "Restless, unsettled",
    sequence: ["Ti", "Do", "Ti", "Do"],
  },
];
