/**
 * Enhanced Color Generation using Tonal.js
 * Leverages music theory for accurate color mapping based on pitch relationships
 */

import { Note, Interval } from "@tonaljs/tonal";
import { CHROMATIC_NOTES, SOLFEGE_NOTES, getPitchClass } from "@/data";
import type { MusicalMode, NoteColorRelationships } from "@/types";
import { logger } from "@/utils/logger";

/**
 * Calculate base hue using Tonal.js pitch class analysis
 */
export function calculateBaseHue(
  noteIndex: number,
  chromaticMapping: boolean = false
): number {
  const totalNotes = chromaticMapping ? 12 : 7;
  const hueInterval = 360 / totalNotes;
  return (noteIndex * hueInterval + hueInterval / 2) % 360;
}

/**
 * Enhanced hue calculation using Tonal.js for pitch-based color mapping
 */
export function calculateHueFromNote(
  noteName: string,
  referenceNote: string = "C",
  mode: MusicalMode = "major"
): number {
  try {
    const note = Note.get(noteName);
    const reference = Note.get(referenceNote);
    
    if (note.empty || reference.empty) {
      logger.warn(`Invalid note for color mapping: ${noteName} or ${referenceNote}`);
      return 0;
    }

    // Calculate interval in semitones from reference
    const interval = Interval.distance(reference.pc || "C", note.pc || "C");
    const semitones = Interval.semitones(interval) || 0;
    
    // Map semitones to hue (0-360°)
    // Use different mapping for major vs minor to reflect emotional character
    if (mode === "major") {
      // Brighter, more saturated colors for major
      return (semitones * 30) % 360; // 30° per semitone
    } else {
      // Shift hue for minor to create cooler, more subdued palette
      return ((semitones * 30) + 180) % 360; // Offset by 180° for minor
    }
  } catch (error) {
    logger.warn("Hue calculation failed, using fallback:", error);
    return calculateBaseHue(0);
  }
}

/**
 * Calculate saturation based on interval consonance
 */
export function calculateConsonanceSaturation(
  noteName: string,
  referenceNote: string = "C"
): number {
  try {
    const interval = Interval.distance(referenceNote, noteName);
    const semitones = Interval.semitones(interval) || 0;
    
    // Map interval consonance to saturation
    const consonanceMap: Record<number, number> = {
      0: 0.9,  // Unison - very saturated
      1: 0.3,  // Minor 2nd - very dissonant, low saturation
      2: 0.5,  // Major 2nd - mildly dissonant
      3: 0.7,  // Minor 3rd - consonant
      4: 0.8,  // Major 3rd - consonant
      5: 0.8,  // Perfect 4th - consonant
      6: 0.2,  // Tritone - most dissonant, lowest saturation
      7: 0.9,  // Perfect 5th - most consonant
      8: 0.6,  // Minor 6th - somewhat consonant
      9: 0.7,  // Major 6th - consonant
      10: 0.4, // Minor 7th - dissonant
      11: 0.3, // Major 7th - dissonant
    };
    
    return consonanceMap[semitones % 12] || 0.5;
  } catch (error) {
    logger.warn("Consonance calculation failed:", error);
    return 0.8; // Default saturation
  }
}

/**
 * Calculate octave-based lightness with music theory awareness
 */
export function calculateOctaveLightness(
  octave: number,
  baseLightness: number = 0.5,
  lightnessRange: number = 0.4
): number {
  // Ensure octave is within reasonable range (0-9)
  const normalizedOctave = Math.max(0, Math.min(9, octave));
  const octaveRatio = normalizedOctave / 9;
  
  const minLightness = Math.max(0.15, baseLightness - lightnessRange / 2);
  const maxLightness = Math.min(0.85, baseLightness + lightnessRange / 2);
  
  // Use a gentle curve that emphasizes middle register
  const curvedRatio = Math.sin((octaveRatio * Math.PI) / 2);
  const lightness = minLightness + curvedRatio * (maxLightness - minLightness);
  
  return Math.max(0.1, Math.min(0.9, lightness));
}

/**
 * Generate harmonically-related color relationships using Tonal.js
 */
export function generateHarmonicColorRelationships(
  baseNoteName: string,
  hue: number,
  saturation: number,
  lightness: number,
  mode: MusicalMode = "major"
): NoteColorRelationships {
  try {
    const baseNote = Note.get(baseNoteName);
    
    // Generate harmonically related notes
    const perfectFifth = Note.transpose(baseNote.name || "C", "5P");
    const majorThird = Note.transpose(baseNote.name || "C", mode === "major" ? "3M" : "3m");
    const perfectFourth = Note.transpose(baseNote.name || "C", "4P");
    
    // Calculate hues for related notes
    const fifthHue = calculateHueFromNote(perfectFifth, baseNote.name);
    const thirdHue = calculateHueFromNote(majorThird, baseNote.name);
    const fourthHue = calculateHueFromNote(perfectFourth, baseNote.name);
    
    const primary = `hsla(${hue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;
    const accent = `hsla(${fifthHue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;
    const secondary = `hsla(${thirdHue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;
    const tertiary = `hsla(${fourthHue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;

    return { primary, accent, secondary, tertiary };
  } catch (error) {
    logger.warn("Harmonic color generation failed, using basic relationships:", error);
    return generateColorRelationships(hue, saturation, lightness);
  }
}

/**
 * Basic color relationships (fallback)
 */
export function generateColorRelationships(
  hue: number,
  saturation: number,
  lightness: number
): NoteColorRelationships {
  const primary = `hsla(${hue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;
  const accent = `hsla(${(hue + 180) % 360}, ${saturation * 100}%, ${lightness * 100}%, 1)`;
  const secondary = `hsla(${(hue + 120) % 360}, ${saturation * 100}%, ${lightness * 100}%, 1)`;
  const tertiary = `hsla(${(hue + 240) % 360}, ${saturation * 100}%, ${lightness * 100}%, 1)`;

  return { primary, accent, secondary, tertiary };
}

/**
 * Enhanced note index retrieval with Tonal.js validation
 */
export function getNoteIndex(noteName: string, chromaticMapping: boolean = false): number {
  const cleanName = noteName.replace("'", "");
  
  // Validate note with Tonal.js
  const note = Note.get(cleanName);
  if (note.empty) {
    logger.warn(`Invalid note name: ${cleanName}`);
    return -1;
  }
  
  const pitchClass = getPitchClass(note.name || cleanName);
  
  if (chromaticMapping) {
    const index = CHROMATIC_NOTES.indexOf(pitchClass as any);
    return index !== -1 ? index : 0;
  } else {
    const index = SOLFEGE_NOTES.indexOf(cleanName);
    return index !== -1 ? index : 0;
  }
}

/**
 * Enhanced color generation with Tonal.js music theory integration
 */
export function generateNoteColors(
  noteName: string,
  octave: number = 3,
  options: {
    chromaticMapping?: boolean;
    saturation?: number;
    baseLightness?: number;
    lightnessRange?: number;
    referenceNote?: string;
    mode?: MusicalMode;
    useHarmonicColors?: boolean;
  } = {}
): NoteColorRelationships {
  const {
    chromaticMapping = false,
    saturation,
    baseLightness = 0.5,
    lightnessRange = 0.4,
    referenceNote = "C",
    mode = "major",
    useHarmonicColors = true,
  } = options;

  // Validate and clean note name
  const note = Note.get(noteName);
  if (note.empty) {
    logger.warn(`Invalid note for color generation: ${noteName}`);
    return {
      primary: "hsla(0, 80%, 50%, 1)",
      accent: "hsla(180, 80%, 50%, 1)",
      secondary: "hsla(120, 80%, 50%, 1)",
      tertiary: "hsla(240, 80%, 50%, 1)",
    };
  }

  // Calculate hue using Tonal.js
  const baseHue = calculateHueFromNote(note.name || noteName, referenceNote, mode);
  
  // Calculate saturation based on consonance if not provided
  const finalSaturation = saturation !== undefined 
    ? saturation 
    : calculateConsonanceSaturation(note.name || noteName, referenceNote);
  
  // Calculate lightness based on octave
  const lightness = calculateOctaveLightness(octave, baseLightness, lightnessRange);

  // Generate harmonically-related colors or basic relationships
  if (useHarmonicColors) {
    return generateHarmonicColorRelationships(
      note.name || noteName, 
      baseHue, 
      finalSaturation, 
      lightness, 
      mode
    );
  } else {
    return generateColorRelationships(baseHue, finalSaturation, lightness);
  }
}

/**
 * Convert HSLA color to have specific alpha
 */
export function withAlpha(color: string, alpha: number): string {
  if (color.indexOf("hsla(") === 0) {
    return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
  }
  if (color.indexOf("hsl(") === 0) {
    return color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
  }
  return color;
}

/**
 * Generate CSS gradient with enhanced color relationships
 */
export function generateGradient(
  noteName: string,
  octave: number = 3,
  direction: number | string = 45,
  options: {
    chromaticMapping?: boolean;
    saturation?: number;
    baseLightness?: number;
    lightnessRange?: number;
    referenceNote?: string;
    mode?: MusicalMode;
    useHarmonicColors?: boolean;
  } = {}
): string {
  const colors = generateNoteColors(noteName, octave, options);
  const cssDirection = typeof direction === "number" ? `${direction}deg` : direction;
  
  return `linear-gradient(${cssDirection}, ${colors.primary} 60%, ${colors.accent}, ${colors.secondary}, ${colors.tertiary})`;
}

/**
 * Generate scale-based color palette using Tonal.js
 */
export function generateScaleColorPalette(
  keyCenter: string = "C",
  scaleType: string = "major",
  octave: number = 4
): Array<{ note: string; colors: NoteColorRelationships }> {
  try {
    const scale = Note.get(keyCenter);
    if (scale.empty) {
      logger.warn(`Invalid key center: ${keyCenter}`);
      return [];
    }

    // Get scale notes (simplified - in a real implementation, you'd use Scale.get)
    const scaleNotes = ["C", "D", "E", "F", "G", "A", "B"]; // Placeholder
    
    return scaleNotes.map(noteName => ({
      note: noteName,
      colors: generateNoteColors(noteName, octave, {
        referenceNote: keyCenter,
        mode: scaleType as MusicalMode,
        useHarmonicColors: true,
      })
    }));
  } catch (error) {
    logger.warn("Scale color palette generation failed:", error);
    return [];
  }
}