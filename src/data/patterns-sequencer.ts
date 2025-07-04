/**
 * Melodic Patterns Data
 * Contains common melodic patterns and interval relationships
 */

import type { Melody } from "@/types/music";

// Re-export types for backward compatibility
export type { Melody };
export type MelodicPattern = Melody; // Backward compatibility

/**
 * Emotional Melodic Patterns
 * Each pattern represents specific emotional states using solfege sequences
 * Updated to use the new SequenceNote structure for cleaner data organization
 */

export const melodicPatterns: Melody[] = [
  // === INTERVALS ===
  {
    name: "Unison",
    description: "The foundation - perfect unity and stability",
    emotion: "Grounded",
    sequence: [
      { note: "Do", duration: "2n" },
      { note: "Do", duration: "2n" },
    ],
    intervals: [0],
  },
  {
    name: "Minor Second",
    description: "Dissonant tension seeking resolution",
    emotion: "Anxious",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Ra", duration: "4n" },
    ],
    intervals: [1],
  },
  {
    name: "Major Second",
    description: "Step forward with gentle momentum",
    emotion: "Hopeful",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Re", duration: "4n" },
    ],
    intervals: [2],
  },
  {
    name: "Minor Third",
    description: "Melancholic beauty and introspection",
    emotion: "Wistful",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Me", duration: "4n" },
    ],
    intervals: [3],
  },
  {
    name: "Major Third",
    description: "Bright and optimistic foundation",
    emotion: "Joyful",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Mi", duration: "4n" },
    ],
    intervals: [4],
  },
  {
    name: "Perfect Fourth",
    description: "Stable and noble - the cornerstone interval",
    emotion: "Noble",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Fa", duration: "4n" },
    ],
    intervals: [5],
  },
  {
    name: "Tritone",
    description: "The devil's interval - maximum tension",
    emotion: "Unsettling",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Fi", duration: "4n" },
    ],
    intervals: [6],
  },
  {
    name: "Perfect Fifth",
    description: "Pure and powerful - the most consonant",
    emotion: "Triumphant",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Sol", duration: "4n" },
    ],
    intervals: [7],
  },
  {
    name: "Minor Sixth",
    description: "Longing and romantic yearning",
    emotion: "Yearning",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Le", duration: "4n" },
    ],
    intervals: [8],
  },
  {
    name: "Major Sixth",
    description: "Sweet and warm embrace",
    emotion: "Warm",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "La", duration: "4n" },
    ],
    intervals: [9],
  },
  {
    name: "Minor Seventh",
    description: "Sophisticated tension and color",
    emotion: "Sophisticated",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Te", duration: "4n" },
    ],
    intervals: [10],
  },
  {
    name: "Major Seventh",
    description: "Dreamy and ethereal floating",
    emotion: "Ethereal",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Ti", duration: "4n" },
    ],
    intervals: [11],
  },
  {
    name: "Octave",
    description: "Perfect unity across dimensions",
    emotion: "Complete",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Do", duration: "4n" },
    ],
    intervals: [12],
  },

  // === MELODIC PATTERNS ===
  {
    name: "Ascending Scale",
    description: "Rising journey from earth to sky",
    emotion: "Ascending",
    sequence: [
      { note: "Do", duration: "8n" },
      { note: "Re", duration: "8n" },
      { note: "Mi", duration: "8n" },
      { note: "Fa", duration: "8n" },
      { note: "Sol", duration: "8n" },
      { note: "La", duration: "8n" },
      { note: "Ti", duration: "8n" },
      { note: "Do", duration: "4n" },
    ],
  },
  {
    name: "Descending Scale",
    description: "Graceful descent back to foundation",
    emotion: "Settling",
    sequence: [
      { note: "Do", duration: "8n" },
      { note: "Ti", duration: "8n" },
      { note: "La", duration: "8n" },
      { note: "Sol", duration: "8n" },
      { note: "Fa", duration: "8n" },
      { note: "Mi", duration: "8n" },
      { note: "Re", duration: "8n" },
      { note: "Do", duration: "4n" },
    ],
  },
  {
    name: "Joy Pattern",
    description: "Exuberant leap and playful return",
    emotion: "Exuberant",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Mi", duration: "4n" },
      { note: "Sol", duration: "4n" },
      { note: "Do", duration: "2n" },
    ],
  },
  {
    name: "Sadness Pattern",
    description: "Gentle descent into melancholy",
    emotion: "Melancholic",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Te", duration: "4n" },
      { note: "Le", duration: "4n" },
      { note: "Sol", duration: "2n" },
    ],
  },
  {
    name: "Mystery Pattern",
    description: "Chromatic whispers and hidden paths",
    emotion: "Mysterious",
    sequence: [
      { note: "Do", duration: "8n" },
      { note: "Ra", duration: "8n" },
      { note: "Re", duration: "8n" },
      { note: "Me", duration: "8n" },
      { note: "Mi", duration: "4n" },
      { note: "Fa", duration: "4n" },
    ],
  },
  {
    name: "Triumph Pattern",
    description: "Bold ascending fifths of victory",
    emotion: "Victorious",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Sol", duration: "4n" },
      { note: "Do", duration: "4n" },
      { note: "Sol", duration: "2n" },
    ],
  },
  {
    name: "Peaceful Pattern",
    description: "Gentle waves of tranquil thirds",
    emotion: "Serene",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Mi", duration: "4n" },
      { note: "Re", duration: "4n" },
      { note: "Fa", duration: "4n" },
      { note: "Mi", duration: "2n" },
    ],
  },
  {
    name: "Tension Pattern",
    description: "Dissonant climbs and urgent pulses",
    emotion: "Tense",
    sequence: [
      { note: "Do", duration: "16n" },
      { note: "Ra", duration: "16n" },
      { note: "Fi", duration: "16n" },
      { note: "Te", duration: "16n" },
      { note: "Ti", duration: "8n" },
      { note: "Do", duration: "4n" },
    ],
  },
  {
    name: "Playful Pattern",
    description: "Bouncing skips and cheerful leaps",
    emotion: "Playful",
    sequence: [
      { note: "Do", duration: "8n" },
      { note: "Mi", duration: "8n" },
      { note: "Re", duration: "8n" },
      { note: "Fa", duration: "8n" },
      { note: "Mi", duration: "8n" },
      { note: "Sol", duration: "8n" },
      { note: "Do", duration: "4n" },
    ],
  },
  {
    name: "Longing Pattern",
    description: "Reaching upward with heartfelt yearning",
    emotion: "Yearning",
    sequence: [
      { note: "Do", duration: "4n" },
      { note: "Re", duration: "8n" },
      { note: "Mi", duration: "8n" },
      { note: "Sol", duration: "4n" },
      { note: "La", duration: "2n" },
    ],
  },
];

/**
 * Get all melodic patterns
 */
export function getAllMelodicPatterns(): Melody[] {
  return melodicPatterns;
}

/**
 * Get patterns by emotion
 */
export function getPatternsByEmotion(emotion: string): Melody[] {
  return melodicPatterns.filter((pattern) =>
    pattern.emotion?.toLowerCase().includes(emotion.toLowerCase())
  );
}

/**
 * Get interval patterns (single intervals)
 */
export function getIntervalPatterns(): Melody[] {
  return melodicPatterns.filter(
    (pattern) => pattern.intervals && pattern.intervals.length === 1
  );
}

/**
 * Get complex melodic patterns (not just intervals)
 */
export function getMelodicPatterns(): Melody[] {
  return melodicPatterns.filter(
    (pattern) => !pattern.intervals || pattern.intervals.length !== 1
  );
}

// Export the main patterns array as the default for backward compatibility
export default melodicPatterns;

/**
 * Complete Melodies Collection
 * Famous melodies with tempo and key information
 */
export const completeMelodies: Melody[] = [
  {
    name: "Twinkle Twinkle Little Star",
    description: "Classic children's lullaby with gentle, comforting melody",
    emotion: "Peaceful",
    defaultBpm: 100,
    defaultKey: "C",
    sequence: [
      { note: "C4", duration: "4n" },
      { note: "C4", duration: "4n" },
      { note: "G4", duration: "4n" },
      { note: "G4", duration: "4n" },
      { note: "A4", duration: "4n" },
      { note: "A4", duration: "4n" },
      { note: "G4", duration: "2n" },
      { note: "F4", duration: "4n" },
      { note: "F4", duration: "4n" },
      { note: "E4", duration: "4n" },
      { note: "E4", duration: "4n" },
      { note: "D4", duration: "4n" },
      { note: "D4", duration: "4n" },
      { note: "C4", duration: "2n" },
    ],
  },
  {
    name: "Six Hundred Men",
    description: "Epic the Musical - Energetic and dramatic theme",
    emotion: "Epic",
    defaultBpm: 140,
    defaultKey: "D#",
    sequence: [
      { note: "D#4", duration: "8n" },
      { note: "F4", duration: "8n" },
      { note: "G4", duration: "8n" },
      { note: "G#4", duration: "8n" },
      { note: "A#4", duration: "8n" },
      { note: "A#4", duration: "8n" },
      { note: "C5", duration: "4n" },
      { note: "A#4", duration: "8n" },
      { note: "G#4", duration: "8n" },
    ],
  },
  {
    name: "Full Speed Ahead",
    description: "Epic the Musical - Fast and determined adventure theme",
    emotion: "Adventurous",
    defaultBpm: 160,
    defaultKey: "D#",
    sequence: [
      { note: "D#4", duration: "8n" },
      { note: "G4", duration: "8n" },
      { note: "G#4", duration: "8n" },
      { note: "F4", duration: "4n" },
    ],
  },
  {
    name: "Magical Adventure",
    description: "Mystical journey with soaring melodic lines",
    emotion: "Mystical",
    defaultBpm: 120,
    defaultKey: "B",
    sequence: [
      { note: "B4", duration: "4n" },
      { note: "E5", duration: "4n" },
      { note: "G5", duration: "4n" },
      { note: "F#5", duration: "2n" },
      { note: "E5", duration: "4n" },
      { note: "B4", duration: "4n" },
      { note: "A4", duration: "2n" },
      { note: "F#4", duration: "4n" },
      { note: "E4", duration: "4n" },
      { note: "G4", duration: "4n" },
      { note: "F#4", duration: "2n" },
    ],
  },
  {
    name: "Hedwig's Theme",
    description: "Harry Potter - Mysterious and flowing magical theme",
    emotion: "Mysterious",
    defaultBpm: 84,
    defaultKey: "B",
    sequence: [
      { note: "B4", duration: "8n" },
      { note: "E5", duration: "4n" },
      { note: "G5", duration: "8n" },
      { note: "F#5", duration: "4n" },
      { note: "E5", duration: "2n" },
      { note: "B4", duration: "8n" },
      { note: "E5", duration: "4n" },
      { note: "G5", duration: "8n" },
      { note: "F#5", duration: "4n" },
      { note: "D#5", duration: "2n" },
      { note: "F5", duration: "8n" },
      { note: "C#5", duration: "4n" },
      { note: "E5", duration: "8n" },
      { note: "D#5", duration: "4n" },
      { note: "B4", duration: "2n" },
    ],
  },
  {
    name: "Athena's Theme",
    description:
      "Epic the Musical - Wisdom goddess's intricate and powerful theme",
    emotion: "Wise",
    defaultBpm: 120,
    defaultKey: "E",
    sequence: [
      { note: "E4", duration: "8n" },
      { note: "G#4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "E5", duration: "8n" },
      { note: "B4", duration: "16n" },
      { note: "G#4", duration: "16n" },
      { note: "E4", duration: "8n" },
      { note: "G#4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "E5", duration: "8n" },
      { note: "E4", duration: "8n" },
      { note: "G#4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "E5", duration: "8n" },
      { note: "B4", duration: "16n" },
      { note: "G#4", duration: "16n" },
      { note: "E4", duration: "8n" },
      { note: "G#4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "E5", duration: "8n" },
      { note: "E4", duration: "8n" },
      { note: "G#4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "E5", duration: "8n" },
      { note: "B4", duration: "16n" },
      { note: "G#4", duration: "16n" },
      { note: "E4", duration: "8n" },
      { note: "G#4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "E5", duration: "8n" },
      { note: "E4", duration: "8n" },
      { note: "G#4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "E5", duration: "8n" },
      { note: "B4", duration: "16n" },
      { note: "G#4", duration: "16n" },
      { note: "E4", duration: "8n" },
      { note: "G#4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "E5", duration: "8n" },
      { note: "E4", duration: "8n" },
      { note: "G#4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "E5", duration: "8n" },
      { note: "B4", duration: "16n" },
      { note: "G#4", duration: "16n" },
      { note: "E4", duration: "8n" },
      { note: "G#4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "E5", duration: "8n" },
    ],
  },
  {
    name: "Warrior of the Mind - Athena's Theme (Opening)",
    description:
      "Epic the Musical - Athena's ascending wisdom theme with rapid arpeggios",
    emotion: "Strategic",
    defaultBpm: 120,
    defaultKey: "A",
    sequence: [
      { note: "A4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "C#5", duration: "16n" },
      { note: "D5", duration: "16n" },
      { note: "E5", duration: "16n" },
      { note: "F#5", duration: "16n" },
      { note: "E5", duration: "16n" },
      { note: "C#5", duration: "16n" },
      { note: "A4", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "C#5", duration: "16n" },
      { note: "D5", duration: "16n" },
      { note: "E5", duration: "16n" },
      { note: "F#5", duration: "16n" },
      { note: "E5", duration: "16n" },
      { note: "D5", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "C#5", duration: "16n" },
      { note: "D5", duration: "16n" },
      { note: "E5", duration: "16n" },
      { note: "F#5", duration: "16n" },
      { note: "G5", duration: "16n" },
      { note: "F#5", duration: "16n" },
      { note: "D5", duration: "16n" },
      { note: "B4", duration: "16n" },
      { note: "C#5", duration: "16n" },
      { note: "D5", duration: "16n" },
      { note: "E5", duration: "16n" },
      { note: "F#5", duration: "16n" },
      { note: "G5", duration: "16n" },
      { note: "F#5", duration: "16n" },
      { note: "E5", duration: "16n" },
    ],
  },
];

/**
 * Melody Categories
 */
export type MelodyCategory =
  | "intervals"
  | "patterns"
  | "complete"
  | "userCreated";

export interface CategorizedMelody extends Melody {
  category: MelodyCategory;
  name: string;
  sequence: Array<{ note: string; duration: string }>;
}

/**
 * Helper function to categorize a melody
 */
function categorizeMelody(melody: Melody): CategorizedMelody {
  let category: MelodyCategory;

  if (melody.intervals?.length === 1) {
    category = "intervals";
  } else if (melody.defaultBpm && melody.defaultKey) {
    category = "complete";
  } else {
    category = "patterns";
  }

  return {
    ...melody,
    category,
    name: melody.name,
    sequence: melody.sequence,
  };
}

/**
 * All melodies combined with categories
 */
export const allMelodies: CategorizedMelody[] = [
  ...melodicPatterns.map((melody) => categorizeMelody(melody)),
  ...completeMelodies.map((melody) => categorizeMelody(melody)),
];

/**
 * Get melodies by category
 */
export function getMelodiesByCategory(
  category: MelodyCategory
): CategorizedMelody[] {
  return allMelodies.filter((melody) => melody.category === category);
}

/**
 * Get all complete melodies with tempo/key information
 */
export function getCompleteMelodies(): Melody[] {
  return completeMelodies;
}

/**
 * Get melody by name (searches both patterns and complete melodies)
 */
export function getMelodyByName(name: string): Melody | undefined {
  return allMelodies.find(
    (melody) => melody.name.toLowerCase() === name.toLowerCase()
  );
}

/**
 * Get melodies by emotion (searches both patterns and complete melodies)
 */
export function getAllMelodiesByEmotion(emotion: string): Melody[] {
  return allMelodies.filter((melody) =>
    melody.emotion?.toLowerCase().includes(emotion.toLowerCase())
  );
}
