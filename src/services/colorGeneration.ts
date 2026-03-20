import type { DynamicColorConfig, NoteColorRelationships } from "@/types";
import { CHROMATIC_NOTES, SOLFEGE_NOTES } from "@/data";

/**
 * Calculate base hue for a note index (center of the hue interval).
 */
export function calculateBaseHue(
  noteIndex: number,
  chromaticMapping: boolean
): number {
  const totalNotes = chromaticMapping ? 12 : 7;
  const hueInterval = 360 / totalNotes;

  return (noteIndex * hueInterval + hueInterval / 2) % 360;
}

/**
 * Calculate octave-based lightness.
 */
export function calculateOctaveLightness(
  octave: number,
  baseLightness: number,
  lightnessRange: number
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
 * Generate color relationships from hue, saturation, and lightness.
 */
export function generateColorRelationships(
  hue: number,
  saturation: number,
  lightness: number
): NoteColorRelationships {
  const primary = `hsla(${hue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;
  const accentHue = (hue + 180) % 360;
  const accent = `hsla(${accentHue}, ${saturation * 100}%, ${
    lightness * 100
  }%, 1)`;
  const secondaryHue = (hue + 120) % 360;
  const secondary = `hsla(${secondaryHue}, ${saturation * 100}%, ${
    lightness * 100
  }%, 1)`;
  const tertiaryHue = (hue + 240) % 360;
  const tertiary = `hsla(${tertiaryHue}, ${saturation * 100}%, ${
    lightness * 100
  }%, 1)`;

  return { primary, accent, secondary, tertiary };
}

/**
 * Generate animated hue within the note's range.
 */
export function generateAnimatedHue(
  baseHue: number,
  amplitude: number,
  time: number,
  speed: number,
  chromaticMapping: boolean
): number {
  const totalNotes = chromaticMapping ? 12 : 7;
  const hueInterval = 360 / totalNotes;
  const maxAmplitude = hueInterval / 2;
  const clampedAmplitude = Math.min(amplitude, maxAmplitude);
  const animationOffset = Math.sin(time * speed * 0.001) * clampedAmplitude;

  return (baseHue + animationOffset + 360) % 360;
}

/**
 * Resolve a note name to its index within the configured mapping.
 */
export function getNoteIndex(
  noteName: string,
  chromaticMapping: boolean
): number {
  const cleanName = noteName.replace("'", "");

  if (chromaticMapping) {
    return CHROMATIC_NOTES.indexOf(cleanName as (typeof CHROMATIC_NOTES)[number]);
  }

  return SOLFEGE_NOTES.indexOf(cleanName);
}

/**
 * Generate dynamic colors for a note index.
 */
export function generateDynamicNoteColors(
  noteIndex: number,
  octave: number,
  config: DynamicColorConfig,
  time?: number
): NoteColorRelationships {
  const baseHue = calculateBaseHue(noteIndex, config.chromaticMapping);
  const currentHue =
    time !== undefined
      ? generateAnimatedHue(
          baseHue,
          config.hueAnimationAmplitude,
          time,
          config.animationSpeed,
          config.chromaticMapping
        )
      : baseHue;
  const lightness = calculateOctaveLightness(
    octave,
    config.baseLightness,
    config.lightnessRange
  );

  return generateColorRelationships(currentHue, config.saturation, lightness);
}
