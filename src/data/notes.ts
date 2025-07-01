/**
 * Musical Notes Data using Tonal.js
 * Leverages Tonal.js for accurate note definitions and validation
 */

import { Note, Interval } from "@tonaljs/tonal";
import type { ChromaticNote } from "@/types";

// Re-export types for backward compatibility
export type { ChromaticNote };

/**
 * Generate chromatic notes using Tonal.js for accuracy
 * This ensures we get the correct enharmonic spellings
 */
function generateChromaticNotes(): ChromaticNote[] {
  const chromaticNotes: ChromaticNote[] = [];
  
  // Generate 12 chromatic notes starting from C
  for (let i = 0; i < 12; i++) {
    const interval = Interval.fromSemitones(i);
    const note = Note.transpose("C", interval);
    
    // Prefer sharp notation for consistency
    const normalizedNote = Note.simplify(note);
    chromaticNotes.push(normalizedNote as ChromaticNote);
  }
  
  return chromaticNotes;
}

/**
 * Validate and normalize a note name using Tonal.js
 */
export function validateNote(noteName: string): string | null {
  const note = Note.get(noteName);
  return note.name || null;
}

/**
 * Get the semitone distance between two notes
 */
export function getSemitoneDistance(note1: string, note2: string): number {
  const interval = Interval.distance(note1, note2);
  return Interval.semitones(interval) || 0;
}

/**
 * Transpose a note by a given interval
 */
export function transposeNote(note: string, interval: string | number): string {
  if (typeof interval === "number") {
    // Convert semitones to interval
    const intervalName = Interval.fromSemitones(interval);
    return Note.transpose(note, intervalName);
  }
  return Note.transpose(note, interval);
}

/**
 * Get the pitch class (note without octave) using Tonal.js
 */
export function getPitchClass(noteName: string): string {
  const note = Note.get(noteName);
  return note.pc || noteName;
}

/**
 * The 12 chromatic notes using Tonal.js for accuracy
 */
export const CHROMATIC_NOTES: ChromaticNote[] = generateChromaticNotes();

/**
 * Traditional solfege note names
 */
export const SOLFEGE_NOTES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];

/**
 * Extended solfege notes including chromatic alterations
 */
export const EXTENDED_SOLFEGE_NOTES = [
  "Do", "Di", "Re", "Ri", "Mi", "Fa", "Fi", "Sol", "Si", "La", "Li", "Ti"
];

/**
 * Convert note name to solfege in a given key
 */
export function noteToSolfege(noteName: string, keyCenter: string = "C"): string {
  const keyNote = Note.get(keyCenter);
  const targetNote = Note.get(noteName);
  
  if (!keyNote.pc || !targetNote.pc) {
    return "Do"; // fallback
  }
  
  const interval = Interval.distance(keyNote.pc, targetNote.pc);
  const semitones = Interval.semitones(interval) || 0;
  
  // Map semitones to solfege (simplified major scale mapping)
  const solfegeMap: Record<number, string> = {
    0: "Do", 1: "Di", 2: "Re", 3: "Ri", 4: "Mi", 5: "Fa",
    6: "Fi", 7: "Sol", 8: "Si", 9: "La", 10: "Li", 11: "Ti"
  };
  
  return solfegeMap[semitones % 12] || "Do";
}
