/**
 * Dynamic Color System Utilities
 * Provides functions for calculating dynamic colors based on solfege/chromatic mapping
 */

import type { NoteColorRelationships, OctaveConfig, DynamicColorConfig } from "@/types/visual";

/**
 * Solfege note names for mapping
 */
export const SOLFEGE_NOTES = ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];

/**
 * Chromatic note names for mapping
 */
export const CHROMATIC_NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

/**
 * Default octave configurations (5 octaves with lightness 20-80)
 */
export const DEFAULT_OCTAVE_CONFIGS: OctaveConfig[] = [
  { octave: 1, lightness: 0.2 }, // 20%
  { octave: 2, lightness: 0.35 }, // 35%
  { octave: 3, lightness: 0.5 }, // 50% - middle octave
  { octave: 4, lightness: 0.65 }, // 65%
  { octave: 5, lightness: 0.8 }, // 80%
];

/**
 * Calculate the base hue for a note index
 * @param noteIndex - Index of the note (0-6 for solfege, 0-11 for chromatic)
 * @param chromaticMapping - Whether to use chromatic (12) or solfege (7) mapping
 * @returns Base hue in degrees (0-360)
 */
export function calculateBaseHue(noteIndex: number, chromaticMapping: boolean): number {
  const totalNotes = chromaticMapping ? 12 : 7;
  const hueInterval = 360 / totalNotes;
  
  // Calculate base hue, starting from 0° and distributing evenly
  return (noteIndex * hueInterval) % 360;
}

/**
 * Calculate the hue range for a note (for animation)
 * @param baseHue - Base hue in degrees
 * @param amplitude - Animation amplitude in degrees (±)
 * @param chromaticMapping - Whether using chromatic mapping
 * @returns Object with min and max hue values
 */
export function calculateHueRange(
  baseHue: number, 
  amplitude: number, 
  chromaticMapping: boolean
): { min: number; max: number; center: number } {
  const totalNotes = chromaticMapping ? 12 : 7;
  const hueInterval = 360 / totalNotes;
  
  // Ensure amplitude doesn't exceed half the interval to prevent overlap
  const maxAmplitude = hueInterval / 2;
  const clampedAmplitude = Math.min(amplitude, maxAmplitude);
  
  return {
    min: (baseHue - clampedAmplitude + 360) % 360,
    max: (baseHue + clampedAmplitude) % 360,
    center: baseHue
  };
}

/**
 * Generate an animated hue within the note's range
 * @param baseHue - Base hue in degrees
 * @param amplitude - Animation amplitude in degrees (±)
 * @param time - Current time for animation
 * @param speed - Animation speed multiplier
 * @param chromaticMapping - Whether using chromatic mapping
 * @returns Animated hue in degrees
 */
export function generateAnimatedHue(
  baseHue: number,
  amplitude: number,
  time: number,
  speed: number,
  chromaticMapping: boolean
): number {
  const range = calculateHueRange(baseHue, amplitude, chromaticMapping);
  
  // Use sine wave for smooth animation
  const animationOffset = Math.sin(time * speed * 0.001) * amplitude;
  
  return (baseHue + animationOffset + 360) % 360;
}

/**
 * Calculate lightness for a specific octave
 * @param octave - Octave number (1-5)
 * @param baseLightness - Base lightness for middle octave
 * @param lightnessRange - Range of lightness variation
 * @returns Lightness value (0-1)
 */
export function calculateOctaveLightness(
  octave: number,
  baseLightness: number = 0.5,
  lightnessRange: number = 0.6
): number {
  // Map octave 1-5 to lightness range
  const normalizedOctave = (octave - 1) / 4; // 0-1 range
  const minLightness = baseLightness - (lightnessRange / 2);
  const maxLightness = baseLightness + (lightnessRange / 2);
  
  const lightness = minLightness + (normalizedOctave * lightnessRange);
  
  // Clamp to valid range
  return Math.max(0.1, Math.min(0.9, lightness));
}

/**
 * Generate color relationships for a note
 * @param hue - Base hue in degrees
 * @param saturation - Saturation level (0-1)
 * @param lightness - Lightness level (0-1)
 * @returns Object with primary, accent, secondary, and tertiary colors
 */
export function generateColorRelationships(
  hue: number,
  saturation: number,
  lightness: number
): NoteColorRelationships {
  // Convert to percentages for CSS
  const s = Math.round(saturation * 100);
  const l = Math.round(lightness * 100);
  
  // Calculate related hues
  const accentHue = (hue + 180) % 360; // Complementary
  const secondaryHue = (hue + 120) % 360; // First triadic
  const tertiaryHue = (hue + 240) % 360; // Second triadic
  
  const primary = `hsl(${Math.round(hue)}, ${s}%, ${l}%)`;
  const accent = `hsl(${Math.round(accentHue)}, ${s}%, ${l}%)`;
  const secondary = `hsl(${Math.round(secondaryHue)}, ${s}%, ${l}%)`;
  const tertiary = `hsl(${Math.round(tertiaryHue)}, ${s}%, ${l}%)`;
  
  // Create gradient combining primary and secondary
  const gradient = `linear-gradient(135deg, ${primary} 0%, ${secondary} 50%, ${accent} 100%)`;
  
  return {
    primary,
    accent,
    secondary,
    tertiary,
    gradient
  };
}

/**
 * Generate dynamic colors for a specific note
 * @param noteIndex - Index of the note (0-6 for solfege, 0-11 for chromatic)
 * @param octave - Octave number (1-5)
 * @param config - Dynamic color configuration
 * @param time - Current time for animation (optional)
 * @returns Complete color relationships for the note
 */
export function generateDynamicNoteColors(
  noteIndex: number,
  octave: number,
  config: DynamicColorConfig,
  time?: number
): NoteColorRelationships {
  const baseHue = calculateBaseHue(noteIndex, config.chromaticMapping);
  
  // Use animated hue if time is provided, otherwise use base hue
  const currentHue = time !== undefined 
    ? generateAnimatedHue(baseHue, config.hueAnimationAmplitude, time, config.animationSpeed, config.chromaticMapping)
    : baseHue;
  
  const lightness = calculateOctaveLightness(octave, config.baseLightness, config.lightnessRange);
  
  return generateColorRelationships(currentHue, config.saturation, lightness);
}

/**
 * Convert solfege name to index
 * @param solfegeName - Name of the solfege note
 * @returns Index (0-6) or -1 if not found
 */
export function solfegeNameToIndex(solfegeName: string): number {
  // Handle octave notation (Do' -> Do)
  const cleanName = solfegeName.replace("'", "");
  return SOLFEGE_NOTES.indexOf(cleanName);
}

/**
 * Convert chromatic note name to index
 * @param noteName - Name of the chromatic note
 * @returns Index (0-11) or -1 if not found
 */
export function chromaticNameToIndex(noteName: string): number {
  return CHROMATIC_NOTES.indexOf(noteName);
}

/**
 * Get the appropriate note index based on mapping type
 * @param solfegeName - Solfege note name
 * @param chromaticMapping - Whether to use chromatic mapping
 * @returns Note index for the current mapping system
 */
export function getNoteIndex(solfegeName: string, chromaticMapping: boolean): number {
  if (chromaticMapping) {
    // For chromatic mapping, we need to map solfege to chromatic notes
    // This is a simplified mapping - in a real implementation, you might want
    // to consider the current key signature
    const solfegeIndex = solfegeNameToIndex(solfegeName);
    const chromaticMapping = [0, 2, 4, 5, 7, 9, 11]; // C major mapping
    return chromaticMapping[solfegeIndex] || 0;
  } else {
    return solfegeNameToIndex(solfegeName);
  }
}
