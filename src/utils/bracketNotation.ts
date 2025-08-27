/**
 * Bracket Notation Utilities V2
 *
 * Simplified and normalized bracket notation generation with relative timing.
 * V2 Changes:
 * - Timing normalized to pattern start (relative, not absolute)
 * - Simplified initial rest handling
 * - Cleaner notation output
 * - Better performance with reduced complexity
 */

import type { Pattern, HistoryNote } from "@/types/patterns";

interface RelativeNote {
  name: string;
  relativeStart: number; // Seconds from pattern start
  relativeDuration: number; // Duration in seconds
  velocity: number;
  originalNote: HistoryNote;
}

interface BracketNotationOptions {
  isChromatic?: boolean; // Use note names instead of scale degrees
  includeVelocity?: boolean; // Include velocity pattern
  trimLongRests?: boolean; // Trim very long rests at start/end
  maxInitialRest?: number; // Max initial rest duration (seconds)
}

interface BracketNotationResult {
  notation: string;
  velocityPattern?: string;
  scaleString: string;
  stats: {
    totalDuration: number;
    noteCount: number;
    restCount: number;
    trimmedInitialRest: number;
  };
}

/**
 * Convert Pattern to clean bracket notation with relative timing
 */
export function patternToBracketNotation(
  pattern: Pattern,
  options: BracketNotationOptions = {}
): BracketNotationResult {
  // Default options
  const opts = {
    isChromatic: false,
    includeVelocity: false,
    trimLongRests: true,
    maxInitialRest: 2.0, // Max 2 seconds initial rest
    ...options,
  };

  if (!pattern.notes || pattern.notes.length === 0) {
    return {
      notation: "~",
      scaleString: `${pattern.key || "C"} ${
        pattern.mode || "major"
      }`.toLowerCase(),
      stats: {
        totalDuration: 0,
        noteCount: 0,
        restCount: 0,
        trimmedInitialRest: 0,
      },
    };
  }

  // Step 1: Normalize timing to be relative to pattern start
  const relativeNotes = normalizePatternTiming(pattern.notes, opts);

  // Step 2: Generate notation from relative notes
  const notation = generateCleanNotation(relativeNotes, opts);

  // Step 3: Generate velocity pattern if requested
  const velocityPattern = opts.includeVelocity
    ? generateVelocityPattern(relativeNotes, opts)
    : undefined;

  // Step 4: Calculate statistics
  const stats = calculateNotationStats(relativeNotes, pattern);

  return {
    notation,
    velocityPattern,
    scaleString: `${pattern.key || "C"} ${
      pattern.mode || "major"
    }`.toLowerCase(),
    stats,
  };
}

/**
 * Normalize pattern timing to be relative to pattern start
 */
function normalizePatternTiming(
  notes: HistoryNote[],
  options: BracketNotationOptions
): RelativeNote[] {
  if (notes.length === 0) return [];

  // Find pattern start time
  const patternStartTime = Math.min(...notes.map((n) => n.pressTime));

  // Convert to relative timing
  const relativeNotes: RelativeNote[] = notes.map((note) => {
    const relativeStart = (note.pressTime - patternStartTime) / 1000; // Convert to seconds
    const duration = note.duration || 500; // Default 500ms if no duration
    const relativeDuration = duration / 1000; // Convert to seconds

    return {
      name: options.isChromatic ? note.note : String(note.scaleDegree - 1), // 0-indexed for Strudel
      relativeStart,
      relativeDuration,
      velocity: note.velocity || 0.8,
      originalNote: note,
    };
  });

  // Sort by start time
  return relativeNotes.sort((a, b) => a.relativeStart - b.relativeStart);
}

/**
 * Generate clean bracket notation from relative notes
 */
function generateCleanNotation(
  notes: RelativeNote[],
  options: BracketNotationOptions
): string {
  if (notes.length === 0) return "~";

  const parts: string[] = [];
  let currentTime = 0;
  let trimmedInitialRest = 0;

  for (let i = 0; i < notes.length; i++) {
    const note = notes[i];
    const restDuration = note.relativeStart - currentTime;

    // Handle rest before this note
    if (restDuration > 0.001) {
      // Ignore tiny gaps
      if (
        i === 0 &&
        options.trimLongRests &&
        restDuration > options.maxInitialRest!
      ) {
        // Trim long initial rest
        const trimmedRest = Math.min(restDuration, options.maxInitialRest!);
        if (trimmedRest > 0.001) {
          parts.push(`~@${formatDuration(trimmedRest)}`);
        }
        trimmedInitialRest = restDuration - trimmedRest;
      } else {
        parts.push(`~@${formatDuration(restDuration)}`);
      }
    }

    // Add the note
    if (note.relativeDuration > 0.001) {
      const notePart =
        note.relativeDuration === 1.0
          ? note.name // Whole note doesn't need @duration
          : `${note.name}@${formatDuration(note.relativeDuration)}`;
      parts.push(notePart);
    }

    currentTime = note.relativeStart + note.relativeDuration;
  }

  return parts.join(" ");
}

/**
 * Generate velocity pattern matching the note structure
 */
function generateVelocityPattern(
  notes: RelativeNote[],
  options: BracketNotationOptions
): string {
  if (notes.length === 0) return "~";

  const parts: string[] = [];
  let currentTime = 0;

  for (const note of notes) {
    const restDuration = note.relativeStart - currentTime;

    // Handle rest before this note
    if (restDuration > 0.001) {
      parts.push(`~@${formatDuration(restDuration)}`);
    }

    // Add velocity value
    if (note.relativeDuration > 0.001) {
      const velocityPart =
        note.relativeDuration === 1.0
          ? note.velocity.toFixed(2)
          : `${note.velocity.toFixed(2)}@${formatDuration(
              note.relativeDuration
            )}`;
      parts.push(velocityPart);
    }

    currentTime = note.relativeStart + note.relativeDuration;
  }

  return parts.join(" ");
}

/**
 * Calculate notation statistics
 */
function calculateNotationStats(
  notes: RelativeNote[],
  pattern: Pattern
): BracketNotationResult["stats"] {
  if (notes.length === 0) {
    return {
      totalDuration: 0,
      noteCount: 0,
      restCount: 0,
      trimmedInitialRest: 0,
    };
  }

  const lastNote = notes[notes.length - 1];
  const totalDuration = lastNote.relativeStart + lastNote.relativeDuration;

  // Count rests (simplified - just count gaps between notes)
  let restCount = 0;
  for (let i = 1; i < notes.length; i++) {
    const prevNote = notes[i - 1];
    const currentNote = notes[i];
    const gap =
      currentNote.relativeStart -
      (prevNote.relativeStart + prevNote.relativeDuration);
    if (gap > 0.001) restCount++;
  }

  return {
    totalDuration,
    noteCount: notes.length,
    restCount,
    trimmedInitialRest: 0, // TODO: Track this if needed
  };
}

/**
 * Convert a single HistoryNote to simple notation
 */
export function historyNoteToBracketNotation(note: HistoryNote): string {
  return note.solfege.name.toLowerCase();
}

/**
 * Convert an array of HistoryNotes to display-friendly string
 * Simplified version that just shows the sequence
 */
export function historyNotesToDisplay(notes: HistoryNote[]): string {
  if (notes.length === 0) return "";

  // Simple approach: just show note names with basic chord detection
  const result: string[] = [];
  let i = 0;

  while (i < notes.length) {
    const currentNote = notes[i];
    const chordNotes = [currentNote];

    // Look for notes that start very close together (chord)
    while (i + 1 < notes.length) {
      const nextNote = notes[i + 1];
      if (nextNote.pressTime - currentNote.pressTime < 100) {
        // 100ms window
        chordNotes.push(nextNote);
        i++;
      } else {
        break;
      }
    }

    // Format as chord or single note
    if (chordNotes.length === 1) {
      result.push(chordNotes[0].solfege.name);
    } else {
      const chordNames = chordNotes.map((n) => n.solfege.name).join(",");
      result.push(`[${chordNames}]`);
    }

    i++;
  }

  return result.join(" ");
}

/**
 * Generate Strudel code from bracket notation
 */
export function generateStrudelCode(
  notation: string,
  scaleString: string,
  options: {
    isChromatic?: boolean;
    sound?: string;
    velocityPattern?: string;
  } = {}
): string {
  const sound = options.sound ?? "piano";

  let code: string;
  if (options.isChromatic) {
    // Chromatic mode - use note() with note names
    code = `note(\`${notation}\`).sound("${sound}")`;
  } else {
    // Scale degree mode - use n() with scale
    code = `n(\`${notation}\`).scale("${scaleString}").sound("${sound}")`;
  }

  // Add velocity if available
  if (options.velocityPattern) {
    code += `.velocity(\`${options.velocityPattern}\`)`;
  }

  return code;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Format duration to clean string representation
 */
function formatDuration(duration: number): string {
  // Handle common musical durations
  if (Math.abs(duration - 1.0) < 0.001) return "1";
  if (Math.abs(duration - 0.5) < 0.001) return "0.5";
  if (Math.abs(duration - 0.25) < 0.001) return "0.25";
  if (Math.abs(duration - 0.125) < 0.001) return "0.125";

  // Round to reasonable precision
  return duration.toFixed(3).replace(/\.?0+$/, "");
}

/**
 * Parse time signature string
 */
function parseTimeSignature(timeSig: string): {
  numerator: number;
  denominator: number;
} {
  const [num, denom] = timeSig.split("/").map(Number);
  return {
    numerator: num || 4,
    denominator: denom || 4,
  };
}

// ============================================================================
// LEGACY COMPATIBILITY
// ============================================================================

/**
 * Legacy function for backward compatibility
 * @deprecated Use patternToBracketNotation instead
 */
export function patternToBracketNotationLegacy(
  pattern: Pattern,
  options: any = {}
): any {
  console.warn(
    "patternToBracketNotationLegacy is deprecated, use patternToBracketNotation"
  );
  const result = patternToBracketNotation(pattern, options);
  return {
    notation: result.notation,
    velocityPattern: result.velocityPattern,
    scaleString: result.scaleString,
  };
}
