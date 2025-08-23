// Local duration type since sequencer types were removed
interface NoteDurationResult {
  toneNotation: string;
  seconds: number;
  fraction: number;
}

/**
 * Duration Calculation Utilities for Circular Sequencer
 * 
 * The circular sequencer is divided into 16 steps total (one full bar)
 * which is further divided into 4 sections of 4 steps each.
 * Each step represents a 16th note, so:
 * - 1 step = 16th note (1/16 of a whole note)
 * - 2 steps = 8th note (1/8 of a whole note)
 * - 4 steps = quarter note (1/4 of a whole note)
 * - 8 steps = half note (1/2 of a whole note)
 * - 16 steps = whole note (1/1 of a whole note)
 */

/**
 * Calculate the duration in various formats based on step count
 * @param stepDuration Number of steps the note spans
 * @param totalSteps Total steps in the sequence (usually 16)
 * @param tempo Tempo in BPM
 * @returns SequencerDuration object with multiple format options
 */
export function calculateNoteDuration(
  stepDuration: number,
  totalSteps: number = 16,
  tempo: number = 120
): NoteDurationResult {
  // Calculate fraction of a whole note
  // Since 16 steps = 1 whole note (4/4 bar), each step = 1/16
  const fraction = stepDuration / totalSteps;
  
  // Calculate duration in seconds
  // At 120 BPM: 1 quarter note = 0.5 seconds, so 1 whole note = 2 seconds
  const wholeNoteDuration = (60 / tempo) * 4; // 4 quarter notes per whole note
  const seconds = fraction * wholeNoteDuration;
  
  // Convert to Tone.js notation
  const toneNotation = convertToToneNotation(stepDuration, totalSteps);
  
  return {
    toneNotation,
    seconds,
    fraction
  };
}

/**
 * Convert step duration to Tone.js notation
 * @param stepDuration Number of steps
 * @param totalSteps Total steps in sequence
 * @returns Tone.js duration string
 */
function convertToToneNotation(stepDuration: number, totalSteps: number = 16): string {
  // Calculate the note value based on step duration
  // 16 steps = whole note, 8 steps = half note, etc.
  const noteValue = totalSteps / stepDuration;
  
  // Handle common note values
  if (noteValue >= 16) {
    return "16n"; // 16th note or shorter
  } else if (noteValue >= 8) {
    return "8n"; // 8th note
  } else if (noteValue >= 4) {
    return "4n"; // Quarter note
  } else if (noteValue >= 2) {
    return "2n"; // Half note
  } else if (noteValue >= 1) {
    return "1n"; // Whole note
  } else {
    // For durations longer than a whole note, use multiple measures
    return "1n"; // Cap at whole note for now
  }
}

/**
 * Get a human-readable description of the note duration
 * @param stepDuration Number of steps
 * @param totalSteps Total steps in sequence
 * @returns Human-readable duration description
 */
export function getDurationDescription(stepDuration: number, totalSteps: number = 16): string {
  const noteValue = totalSteps / stepDuration;
  
  if (noteValue >= 16) {
    return "Sixteenth note";
  } else if (noteValue >= 8) {
    return "Eighth note";
  } else if (noteValue >= 4) {
    return "Quarter note";
  } else if (noteValue >= 2) {
    return "Half note";
  } else if (noteValue >= 1) {
    return "Whole note";
  } else {
    return `${stepDuration} steps`;
  }
}

/**
 * Calculate the ideal step duration for a given Tone.js notation
 * @param toneNotation Tone.js duration string (e.g., "4n", "8n")
 * @param totalSteps Total steps in sequence
 * @returns Number of steps
 */
export function stepsFromToneNotation(toneNotation: string, totalSteps: number = 16): number {
  const noteValueMatch = toneNotation.match(/(\d+)n/);
  if (!noteValueMatch) return 1;
  
  const noteValue = parseInt(noteValueMatch[1]);
  return Math.max(1, totalSteps / noteValue);
}