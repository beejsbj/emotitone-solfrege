/**
 * Default Musical Patterns for Pattern System V2
 *
 * V2 Changes:
 * - Deterministic IDs to prevent duplicates
 * - Simplified pattern generation
 * - Consistent with PatternEngine expectations
 * - Single source of truth for default patterns
 */

import type { Pattern, HistoryNote } from "@/types/patterns";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";

/**
 * Generates a deterministic ID for default patterns (V2)
 * This ensures no duplicates when patterns are loaded multiple times
 */
function generateDeterministicId(name: string): string {
  return `default_${name.toLowerCase().replace(/[^a-z0-9]/g, "_")}`;
}

/**
 * Creates a minimal SolfegeData object for default patterns
 */
function createSolfegeData(name: string): SolfegeData {
  return {
    name,
    number: getSolfegeScaleDegree(name),
    emotion: "neutral",
    description: `Default pattern note: ${name}`,
    fleckShape: "circle",
    texture: "smooth",
  };
}

/**
 * Converts a melody sequence to simplified history notes for pattern display
 * Note: These are simplified and don't represent actual played notes
 */
function sequenceToNotes(
  sequence: Array<{ note: string; duration: string }>,
  key: ChromaticNote = "C",
  mode: MusicalMode = "major"
): HistoryNote[] {
  // Use a fixed base time for deterministic patterns
  const baseTime = 1640995200000; // Fixed timestamp: 2022-01-01
  let currentTime = baseTime;

  return sequence.map((item, index) => {
    const noteDuration = parseDuration(item.duration);
    const note: HistoryNote = {
      id: `default_note_${index}_${item.note}`,
      note: item.note,
      key,
      mode,
      scaleDegree: getSolfegeScaleDegree(item.note),
      solfege: createSolfegeData(item.note),
      solfegeIndex: getSolfegeIndex(item.note),
      octave: 4, // Default octave
      frequency: 440, // Simplified - would need proper calculation
      instrument: "piano",
      pressTime: currentTime,
      releaseTime: currentTime + noteDuration,
      duration: noteDuration,
      sessionId: "default_session",
    };
    currentTime += noteDuration;
    return note;
  });
}

/**
 * Parses a duration string to milliseconds
 */
function parseDuration(duration: string): number {
  const durationMap: Record<string, number> = {
    "1n": 2000,
    "2n": 1000,
    "4n": 500,
    "8n": 250,
    "16n": 125,
    "32n": 62.5,
  };
  return durationMap[duration] || 500;
}

/**
 * Gets the scale degree from a solfege name
 */
function getSolfegeScaleDegree(solfege: string): number {
  const degreeMap: Record<string, number> = {
    Do: 1,
    Ra: 2,
    Re: 2,
    Me: 3,
    Mi: 3,
    Fa: 4,
    Fi: 5,
    Sol: 5,
    Le: 6,
    La: 6,
    Te: 7,
    Ti: 7,
    C4: 1,
    D4: 2,
    E4: 3,
    F4: 4,
    G4: 5,
    A4: 6,
    B4: 7,
    C5: 1,
    D5: 2,
    E5: 3,
    F5: 4,
    G5: 5,
    A5: 6,
    B5: 7,
    "C#5": 1,
    "D#4": 2,
    "D#5": 2,
    "F#4": 4,
    "F#5": 4,
    "G#4": 5,
    "A#4": 6,
  };
  return degreeMap[solfege] || 1;
}

/**
 * Gets the solfege index (0-6) from a solfege name
 */
function getSolfegeIndex(solfege: string): number {
  const indexMap: Record<string, number> = {
    Do: 0,
    Ra: 1,
    Re: 1,
    Me: 2,
    Mi: 2,
    Fa: 3,
    Fi: 4,
    Sol: 4,
    Le: 5,
    La: 5,
    Te: 6,
    Ti: 6,
    C4: 0,
    D4: 1,
    E4: 2,
    F4: 3,
    G4: 4,
    A4: 5,
    B4: 6,
    C5: 0,
    D5: 1,
    E5: 2,
    F5: 3,
    G5: 4,
    A5: 5,
    B5: 6,
    "C#5": 0,
    "D#4": 1,
    "D#5": 1,
    "F#4": 3,
    "F#5": 3,
    "G#4": 4,
    "A#4": 5,
  };
  return indexMap[solfege] || 0;
}

/**
 * Creates a default pattern from melody data (V2)
 */
function createDefaultPattern(
  name: string,
  description: string,
  emotion: string,
  sequence: Array<{ note: string; duration: string }>,
  patternType: Pattern["patternType"] = "melody",
  key: ChromaticNote = "C",
  mode: MusicalMode = "major"
): Pattern {
  const notes = sequenceToNotes(sequence, key, mode);
  const totalDuration = notes.reduce(
    (sum, note) => sum + (note.duration || 0),
    0
  );

  // Fixed creation time for deterministic patterns
  const fixedCreationTime = 1640995200000; // 2022-01-01

  return {
    id: generateDeterministicId(name),
    notes,
    totalDuration,
    noteCount: notes.length,
    key,
    mode,
    instrument: "piano",
    createdAt: fixedCreationTime,
    lastPlayedAt: fixedCreationTime,
    isSaved: true, // Always saved to prevent auto-deletion
    isDefault: true, // Mark as default pattern
    playCount: 0,
    name,
    tags: [emotion.toLowerCase(), "default", patternType],
    averageNoteDuration: totalDuration / notes.length,
    patternType,
    detectionConfidence: 1.0, // Default patterns have full confidence
    complexityScore: calculateComplexityScore(notes),
    dominantScaleDegree: findDominantScaleDegree(notes),
    color: undefined, // Will be set by color system
  };
}

/**
 * Calculate complexity score for a pattern
 */
function calculateComplexityScore(notes: HistoryNote[]): number {
  if (notes.length === 0) return 0;

  const uniqueNotes = new Set(notes.map((n) => n.note)).size;
  const pitchVariety = uniqueNotes / notes.length;

  const durations = notes
    .map((n) => n.duration)
    .filter((d): d is number => d !== undefined);
  const rhythmVariety =
    durations.length > 0
      ? new Set(durations.map((d) => Math.round(d / 100))).size /
        durations.length
      : 0;

  return (pitchVariety + rhythmVariety) / 2;
}

/**
 * Find the dominant scale degree in a pattern
 */
function findDominantScaleDegree(notes: HistoryNote[]): number {
  const scaleDegreeCounts = new Map<number, number>();
  notes.forEach((note) => {
    const current = scaleDegreeCounts.get(note.scaleDegree) || 0;
    scaleDegreeCounts.set(note.scaleDegree, current + 1);
  });

  return (
    Array.from(scaleDegreeCounts.entries()).reduce((a, b) =>
      b[1] > a[1] ? b : a
    )[0] || 1
  );
}

// ============================================================================
// DEFAULT PATTERN DEFINITIONS
// ============================================================================

/**
 * Essential interval patterns for music theory education
 */
export const defaultIntervalPatterns: Pattern[] = [
  createDefaultPattern(
    "Unison",
    "The foundation - perfect unity and stability",
    "Grounded",
    [
      { note: "Do", duration: "2n" },
      { note: "Do", duration: "2n" },
    ],
    "melody"
  ),
  createDefaultPattern(
    "Major Second",
    "Step forward with gentle momentum",
    "Hopeful",
    [
      { note: "Do", duration: "4n" },
      { note: "Re", duration: "4n" },
    ],
    "melody"
  ),
  createDefaultPattern(
    "Minor Third",
    "Melancholic beauty and introspection",
    "Wistful",
    [
      { note: "Do", duration: "4n" },
      { note: "Me", duration: "4n" },
    ],
    "melody"
  ),
  createDefaultPattern(
    "Major Third",
    "Bright and optimistic foundation",
    "Joyful",
    [
      { note: "Do", duration: "4n" },
      { note: "Mi", duration: "4n" },
    ],
    "melody"
  ),
  createDefaultPattern(
    "Perfect Fourth",
    "Stable and noble - the cornerstone interval",
    "Noble",
    [
      { note: "Do", duration: "4n" },
      { note: "Fa", duration: "4n" },
    ],
    "melody"
  ),
  createDefaultPattern(
    "Perfect Fifth",
    "Pure and powerful - the most consonant",
    "Triumphant",
    [
      { note: "Do", duration: "4n" },
      { note: "Sol", duration: "4n" },
    ],
    "melody"
  ),
  createDefaultPattern(
    "Major Sixth",
    "Sweet and warm embrace",
    "Warm",
    [
      { note: "Do", duration: "4n" },
      { note: "La", duration: "4n" },
    ],
    "melody"
  ),
  createDefaultPattern(
    "Major Seventh",
    "Dreamy and ethereal floating",
    "Ethereal",
    [
      { note: "Do", duration: "4n" },
      { note: "Ti", duration: "4n" },
    ],
    "melody"
  ),
  createDefaultPattern(
    "Octave",
    "Perfect unity across dimensions",
    "Complete",
    [
      { note: "Do", duration: "4n" },
      { note: "Do", duration: "4n" },
    ],
    "melody"
  ),
];

/**
 * Essential melodic patterns for musical expression
 */
export const defaultMelodicPatterns: Pattern[] = [
  createDefaultPattern(
    "Ascending Scale",
    "Rising journey from earth to sky",
    "Ascending",
    [
      { note: "Do", duration: "8n" },
      { note: "Re", duration: "8n" },
      { note: "Mi", duration: "8n" },
      { note: "Fa", duration: "8n" },
      { note: "Sol", duration: "8n" },
      { note: "La", duration: "8n" },
      { note: "Ti", duration: "8n" },
      { note: "Do", duration: "4n" },
    ],
    "scale"
  ),
  createDefaultPattern(
    "Descending Scale",
    "Graceful descent back to foundation",
    "Settling",
    [
      { note: "Do", duration: "8n" },
      { note: "Ti", duration: "8n" },
      { note: "La", duration: "8n" },
      { note: "Sol", duration: "8n" },
      { note: "Fa", duration: "8n" },
      { note: "Mi", duration: "8n" },
      { note: "Re", duration: "8n" },
      { note: "Do", duration: "4n" },
    ],
    "scale"
  ),
  createDefaultPattern(
    "Major Triad",
    "Exuberant leap and playful return",
    "Joyful",
    [
      { note: "Do", duration: "4n" },
      { note: "Mi", duration: "4n" },
      { note: "Sol", duration: "4n" },
      { note: "Do", duration: "2n" },
    ],
    "arpeggio"
  ),
  createDefaultPattern(
    "Minor Triad",
    "Gentle descent into melancholy",
    "Melancholic",
    [
      { note: "Do", duration: "4n" },
      { note: "Me", duration: "4n" },
      { note: "Sol", duration: "4n" },
      { note: "Do", duration: "2n" },
    ],
    "arpeggio"
  ),
  createDefaultPattern(
    "Peaceful Melody",
    "Gentle waves of tranquil thirds",
    "Serene",
    [
      { note: "Do", duration: "4n" },
      { note: "Mi", duration: "4n" },
      { note: "Re", duration: "4n" },
      { note: "Fa", duration: "4n" },
      { note: "Mi", duration: "2n" },
    ],
    "melody"
  ),
  createDefaultPattern(
    "Playful Melody",
    "Bouncing skips and cheerful leaps",
    "Playful",
    [
      { note: "Do", duration: "8n" },
      { note: "Mi", duration: "8n" },
      { note: "Re", duration: "8n" },
      { note: "Fa", duration: "8n" },
      { note: "Mi", duration: "8n" },
      { note: "Sol", duration: "8n" },
      { note: "Do", duration: "4n" },
    ],
    "melody"
  ),
];

/**
 * Famous melodies as educational patterns
 */
export const defaultFamousMelodies: Pattern[] = [
  createDefaultPattern(
    "Twinkle Twinkle Little Star",
    "Classic children's lullaby with gentle, comforting melody",
    "Peaceful",
    [
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
    "melody",
    "C",
    "major"
  ),
];

/**
 * All default patterns combined - SINGLE SOURCE OF TRUTH
 */
export const defaultPatterns: Pattern[] = [
  ...defaultIntervalPatterns,
  ...defaultMelodicPatterns,
  ...defaultFamousMelodies,
];

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Get default patterns by type
 */
export function getDefaultPatternsByType(
  patternType: Pattern["patternType"]
): Pattern[] {
  return defaultPatterns.filter((p) => p.patternType === patternType);
}

/**
 * Get default patterns by emotion
 */
export function getDefaultPatternsByEmotion(emotion: string): Pattern[] {
  return defaultPatterns.filter((p) =>
    p.tags?.some((tag) => tag.toLowerCase() === emotion.toLowerCase())
  );
}

/**
 * Get pattern by deterministic ID
 */
export function getDefaultPatternById(name: string): Pattern | undefined {
  const id = generateDeterministicId(name);
  return defaultPatterns.find((p) => p.id === id);
}

/**
 * Validate that all default patterns have unique IDs
 */
export function validateDefaultPatterns(): {
  isValid: boolean;
  duplicates: string[];
} {
  const ids = defaultPatterns.map((p) => p.id);
  const uniqueIds = new Set(ids);
  const duplicates = ids.filter((id, index) => ids.indexOf(id) !== index);

  return {
    isValid: ids.length === uniqueIds.size,
    duplicates: Array.from(new Set(duplicates)),
  };
}

// Validate patterns on module load (development only)
if (typeof window !== "undefined" && import.meta.env?.DEV) {
  const validation = validateDefaultPatterns();
  if (!validation.isValid) {
    console.error("❌ Default patterns validation failed!");
    console.error("Duplicate IDs:", validation.duplicates);
  } else {
    console.log(
      `✅ Default patterns validated: ${defaultPatterns.length} unique patterns`
    );
  }
}
