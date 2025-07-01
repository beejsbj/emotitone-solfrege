/**
 * Core Color Generation
 * Pure color calculation functions without animation or complex abstractions
 */

import { CHROMATIC_NOTES, SOLFEGE_NOTES } from "@/data";
import type { MusicalMode, NoteColorRelationships } from "@/types";

/**
 * Calculate base hue for a note index
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
 * Calculate octave-based lightness
 */
export function calculateOctaveLightness(
  octave: number,
  baseLightness: number = 0.5,
  lightnessRange: number = 0.4
): number {
  const normalizedOctave = Math.max(2, Math.min(8, octave));
  const octaveRatio = (normalizedOctave - 2) / 6;
  
  const minLightness = Math.max(0.15, baseLightness - lightnessRange / 2);
  const maxLightness = Math.min(0.85, baseLightness + lightnessRange / 2);
  
  const curvedRatio = Math.pow(octaveRatio, 0.8);
  const lightness = minLightness + curvedRatio * (maxLightness - minLightness);
  
  return Math.max(0.1, Math.min(0.9, lightness));
}

/**
 * Generate color relationships from HSL values
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
 * Get note index from name
 */
export function getNoteIndex(noteName: string, chromaticMapping: boolean = false): number {
  const cleanName = noteName.replace("'", "");
  
  if (chromaticMapping) {
    return CHROMATIC_NOTES.indexOf(cleanName as any);
  } else {
    return SOLFEGE_NOTES.indexOf(cleanName);
  }
}

/**
 * Generate static colors for a note (no animation)
 */
export function generateNoteColors(
  noteName: string,
  octave: number = 3,
  options: {
    chromaticMapping?: boolean;
    saturation?: number;
    baseLightness?: number;
    lightnessRange?: number;
  } = {}
): NoteColorRelationships {
  const {
    chromaticMapping = false,
    saturation = 0.8,
    baseLightness = 0.5,
    lightnessRange = 0.4
  } = options;

  const noteIndex = getNoteIndex(noteName, chromaticMapping);
  
  if (noteIndex === -1) {
    // Invalid note name, return default colors
    return {
      primary: "hsla(0, 80%, 50%, 1)",
      accent: "hsla(180, 80%, 50%, 1)",
      secondary: "hsla(120, 80%, 50%, 1)",
      tertiary: "hsla(240, 80%, 50%, 1)",
    };
  }

  const baseHue = calculateBaseHue(noteIndex, chromaticMapping);
  const lightness = calculateOctaveLightness(octave, baseLightness, lightnessRange);

  return generateColorRelationships(baseHue, saturation, lightness);
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
 * Generate CSS gradient from note colors
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
  } = {}
): string {
  const colors = generateNoteColors(noteName, octave, options);
  const cssDirection = typeof direction === "number" ? `${direction}deg` : direction;
  
  return `linear-gradient(${cssDirection}, ${colors.primary} 60%, ${colors.accent}, ${colors.secondary}, ${colors.tertiary})`;
}