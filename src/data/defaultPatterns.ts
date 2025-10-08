/**
 * Default Musical Patterns for Pattern System
 * Pre-defined patterns that are loaded into the pattern service on initialization
 */

import type { Pattern, HistoryNote } from "@/types/patterns";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";

/**
 * Generates a unique ID for default patterns
 */
function generateDefaultPatternId(name: string): string {
  // Use a deterministic ID for default patterns to avoid duplicates
  return `default_${name.toLowerCase().replace(/\s+/g, "_")}_${Date.now()}`;
}

/**
 * Creates a minimal SolfegeData object for default patterns
 */
function createSolfegeData(name: string): SolfegeData {
  return {
    name,
    number: 1,
    emotion: "neutral",
    description: name,
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
  const baseTime = Date.now();
  let currentTime = baseTime;

  return sequence.map((item, index) => {
    const noteDuration = parseDuration(item.duration);
    const note: HistoryNote = {
      id: `default_note_${index}`,
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
 * Creates a default pattern from melody data
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

  return {
    id: generateDefaultPatternId(name),
    notes,
    totalDuration,
    noteCount: notes.length,
    key,
    mode,
    instrument: "piano",
    createdAt: Date.now(),
    lastPlayedAt: Date.now(),
    isSaved: true, // Always saved to prevent auto-deletion
    isDefault: true, // Mark as default pattern
    playCount: 0,
    name,
    tags: [emotion.toLowerCase(), "default", patternType],
    averageNoteDuration: totalDuration / notes.length,
    patternType,
    detectionConfidence: 1.0, // Default patterns have full confidence
    // Add description as part of the name for now
    color: undefined, // Will be set by color system
  };
}

/**
 * Default interval patterns
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
    "Minor Second",
    "Dissonant tension seeking resolution",
    "Anxious",
    [
      { note: "Do", duration: "4n" },
      { note: "Ra", duration: "4n" },
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
    "Tritone",
    "The devil's interval - maximum tension",
    "Unsettling",
    [
      { note: "Do", duration: "4n" },
      { note: "Fi", duration: "4n" },
    ],
    "melody",
    "C",
    "major"
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
    "Minor Sixth",
    "Longing and romantic yearning",
    "Yearning",
    [
      { note: "Do", duration: "4n" },
      { note: "Le", duration: "4n" },
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
    "Minor Seventh",
    "Sophisticated tension and color",
    "Sophisticated",
    [
      { note: "Do", duration: "4n" },
      { note: "Te", duration: "4n" },
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
 * Default melodic patterns
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
    "Joy Pattern",
    "Exuberant leap and playful return",
    "Exuberant",
    [
      { note: "Do", duration: "4n" },
      { note: "Mi", duration: "4n" },
      { note: "Sol", duration: "4n" },
      { note: "Do", duration: "2n" },
    ],
    "arpeggio"
  ),
  createDefaultPattern(
    "Sadness Pattern",
    "Gentle descent into melancholy",
    "Melancholic",
    [
      { note: "Do", duration: "4n" },
      { note: "Te", duration: "4n" },
      { note: "Le", duration: "4n" },
      { note: "Sol", duration: "2n" },
    ],
    "melody"
  ),
  createDefaultPattern(
    "Mystery Pattern",
    "Chromatic whispers and hidden paths",
    "Mysterious",
    [
      { note: "Do", duration: "8n" },
      { note: "Ra", duration: "8n" },
      { note: "Re", duration: "8n" },
      { note: "Me", duration: "8n" },
      { note: "Mi", duration: "4n" },
      { note: "Fa", duration: "4n" },
    ],
    "melody",
    "C",
    "minor"
  ),
  createDefaultPattern(
    "Triumph Pattern",
    "Bold ascending fifths of victory",
    "Victorious",
    [
      { note: "Do", duration: "4n" },
      { note: "Sol", duration: "4n" },
      { note: "Do", duration: "4n" },
      { note: "Sol", duration: "2n" },
    ],
    "melody"
  ),
  createDefaultPattern(
    "Peaceful Pattern",
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
    "Tension Pattern",
    "Dissonant climbs and urgent pulses",
    "Tense",
    [
      { note: "Do", duration: "16n" },
      { note: "Ra", duration: "16n" },
      { note: "Fi", duration: "16n" },
      { note: "Te", duration: "16n" },
      { note: "Ti", duration: "8n" },
      { note: "Do", duration: "4n" },
    ],
    "melody",
    "C",
    "minor"
  ),
  createDefaultPattern(
    "Playful Pattern",
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
  createDefaultPattern(
    "Longing Pattern",
    "Reaching upward with heartfelt yearning",
    "Yearning",
    [
      { note: "Do", duration: "4n" },
      { note: "Re", duration: "8n" },
      { note: "Mi", duration: "8n" },
      { note: "Sol", duration: "4n" },
      { note: "La", duration: "2n" },
    ],
    "melody"
  ),
];

/**
 * Famous melodies as patterns
 */
export const defaultCompleteMelodies: Pattern[] = [
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
  createDefaultPattern(
    "Six Hundred Men",
    "Epic the Musical - Energetic and dramatic theme",
    "Epic",
    [
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
    "melody",
    "D#",
    "minor"
  ),
  createDefaultPattern(
    "Full Speed Ahead",
    "Epic the Musical - Fast and determined adventure theme",
    "Adventurous",
    [
      { note: "D#4", duration: "8n" },
      { note: "G4", duration: "8n" },
      { note: "G#4", duration: "8n" },
      { note: "F4", duration: "4n" },
    ],
    "melody",
    "D#",
    "minor"
  ),
];

/**
 * All default patterns combined
 */
export const defaultPatterns: Pattern[] = [
  ...defaultIntervalPatterns,
  ...defaultMelodicPatterns,
  ...defaultCompleteMelodies,
];

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
