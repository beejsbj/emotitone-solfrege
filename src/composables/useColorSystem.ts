/**
 * Unified Color System
 * Single source of truth for all color-related functionality in the application
 * Combines dynamic color generation with reactive Vue composable patterns
 */

import { ref, computed, onUnmounted } from "vue";
import { useVisualConfig } from "./useVisualConfig";
import type {
  NoteColorRelationships,
  DynamicColorConfig,
  MusicalMode,
} from "@/types";
import { CHROMATIC_NOTES, SOLFEGE_NOTES } from "@/data";

/**
 * Solfege note names for mapping
 */

/**
 * Calculate base hue for a note index (center of the hue interval)
 */
function calculateBaseHue(
  noteIndex: number,
  chromaticMapping: boolean
): number {
  const totalNotes = chromaticMapping ? 12 : 7;
  const hueInterval = 360 / totalNotes;
  // Place hue at the center of the interval
  return (noteIndex * hueInterval + hueInterval / 2) % 360;
}

/**
 * Calculate octave-based lightness
 */

function calculateOctaveLightness(
  octave: number,
  baseLightness: number,
  lightnessRange: number
): number {
  // Map octaves 2-8 to lightness range with more dramatic differences
  const normalizedOctave = Math.max(2, Math.min(8, octave));
  const octaveRatio = (normalizedOctave - 2) / 6; // 0 to 1 across 6 octaves

  // Use a more dramatic lightness curve for better visual distinction
  // Lower octaves are much darker, higher octaves are much lighter
  const minLightness = Math.max(0.15, baseLightness - lightnessRange / 2); // Ensure minimum 15%
  const maxLightness = Math.min(0.85, baseLightness + lightnessRange / 2); // Ensure maximum 85%

  // Apply a slight curve to make the differences more pronounced
  // This makes lower octaves darker and higher octaves lighter more dramatically
  const curvedRatio = Math.pow(octaveRatio, 0.8); // Slight curve for better distribution

  const lightness = minLightness + curvedRatio * (maxLightness - minLightness);

  // Ensure lightness stays within valid range
  return Math.max(0.1, Math.min(0.9, lightness));
}

/**
 * Generate color relationships from hue, saturation, and lightness
 */
function generateColorRelationships(
  hue: number,
  saturation: number,
  lightness: number
): NoteColorRelationships {
  // Primary: base color
  const primary = `hsla(${hue}, ${saturation * 100}%, ${lightness * 100}%, 1)`;

  // Accent: complementary hue (180° opposite)
  const accentHue = (hue + 180) % 360;
  const accent = `hsla(${accentHue}, ${saturation * 100}%, ${
    lightness * 100
  }%, 1)`;

  // Secondary: triadic harmony (+120°)
  const secondaryHue = (hue + 120) % 360;
  const secondary = `hsla(${secondaryHue}, ${saturation * 100}%, ${
    lightness * 100
  }%, 1)`;

  // Tertiary: triadic harmony (-120°)
  const tertiaryHue = (hue + 240) % 360;
  const tertiary = `hsla(${tertiaryHue}, ${saturation * 100}%, ${
    lightness * 100
  }%, 1)`;

  return { primary, accent, secondary, tertiary };
}

/**
 * Generate animated hue within the note's range
 */
function generateAnimatedHue(
  baseHue: number,
  amplitude: number,
  time: number,
  speed: number,
  chromaticMapping: boolean
): number {
  const totalNotes = chromaticMapping ? 12 : 7;
  const hueInterval = 360 / totalNotes;

  // Ensure amplitude doesn't exceed half the interval to prevent overlap
  const maxAmplitude = hueInterval / 2;
  const clampedAmplitude = Math.min(amplitude, maxAmplitude);

  // Use sine wave for smooth animation
  const animationOffset = Math.sin(time * speed * 0.001) * clampedAmplitude;

  return (baseHue + animationOffset + 360) % 360;
}

/**
 * Get note index from name
 */
function getNoteIndex(noteName: string, chromaticMapping: boolean): number {
  const cleanName = noteName.replace("'", "");

  if (chromaticMapping) {
    return CHROMATIC_NOTES.indexOf(cleanName as any);
  } else {
    return SOLFEGE_NOTES.indexOf(cleanName);
  }
}

/**
 * Generate dynamic colors for a note
 */
function generateDynamicNoteColors(
  noteIndex: number,
  octave: number,
  config: DynamicColorConfig,
  time?: number
): NoteColorRelationships {
  const baseHue = calculateBaseHue(noteIndex, config.chromaticMapping);

  // Use animated hue if time is provided, otherwise use base hue
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

// Singleton instance for animation management
let animationId: number | null = null;
const animationTime = ref(0);

/**
 * Start global animation loop
 */
function startGlobalAnimation() {
  if (animationId) return;

  const animate = () => {
    animationTime.value = Date.now();
    animationId = requestAnimationFrame(animate);
  };

  animate();
}

/**
 * Stop global animation loop
 */
function stopGlobalAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
}

/**
 * Unified Color System Composable
 */
export function useColorSystem() {
  const { dynamicColorConfig } = useVisualConfig();

  // Start animation when composable is used
  startGlobalAnimation();

  // Cleanup on unmount
  onUnmounted(() => {
    // Note: Don't stop global animation here as other components might be using it
    // Animation will be cleaned up when the app is destroyed
  });

  /**
   * Generate colors for a solfege note
   */
  const getNoteColors = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    animated: boolean = true
  ): NoteColorRelationships => {
    const config = dynamicColorConfig.value;
    const cleanNoteName = noteName.replace("'", "");

    const noteIndex = getNoteIndex(cleanNoteName, config.chromaticMapping);

    if (noteIndex === -1) {
      // Invalid note name, return default colors
      return {
        primary: "hsla(0, 80%, 50%, 1)",
        accent: "hsla(180, 80%, 50%, 1)",
        secondary: "hsla(120, 80%, 50%, 1)",
        tertiary: "hsla(240, 80%, 50%, 1)",
      };
    }

    const time = animated ? animationTime.value : undefined;
    return generateDynamicNoteColors(noteIndex, octave, config, time);
  };

  /**
   * Get primary color for a note
   */
  const getPrimaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3
  ): string => {
    return getNoteColors(noteName, mode, octave, true).primary;
  };

  /**
   * Get static primary color for a note (no animation)
   */
  const getStaticPrimaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3
  ): string => {
    return getNoteColors(noteName, mode, octave, false).primary;
  };

  /**
   * Get accent color for a note (used for strings/flecks)
   */
  const getAccentColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3
  ): string => {
    return getNoteColors(noteName, mode, octave, true).accent;
  };

  /**
   * Get static accent color for a note (no animation)
   */
  const getStaticAccentColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3
  ): string => {
    return getNoteColors(noteName, mode, octave, false).accent;
  };

  /**
   * Get secondary color for a note
   */
  const getSecondaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3
  ): string => {
    return getNoteColors(noteName, mode, octave, true).secondary;
  };

  /**
   * Get static secondary color for a note (no animation)
   */
  const getStaticSecondaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3
  ): string => {
    return getNoteColors(noteName, mode, octave, false).secondary;
  };

  /**
   * Get tertiary color for a note
   */
  const getTertiaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3
  ): string => {
    return getNoteColors(noteName, mode, octave, true).tertiary;
  };

  /**
   * Get static tertiary color for a note (no animation)
   */
  const getStaticTertiaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3
  ): string => {
    return getNoteColors(noteName, mode, octave, false).tertiary;
  };

  // Backward compatibility aliases
  const getStringColor = getAccentColor;
  const getFleckColor = getAccentColor;
  const getHighlightColor = getAccentColor;

  /**
   * Generate gradient string for CSS
   */
  const getGradient = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    direction: number | string = 45
  ): string => {
    const colors = getNoteColors(noteName, mode, octave, true);
    // Convert numeric direction to CSS format
    const cssDirection =
      typeof direction === "number" ? `${direction}deg` : direction;
    return `linear-gradient(${cssDirection}, ${colors.primary} 60%, ${colors.accent}, ${colors.secondary}, ${colors.tertiary})`;
  };

  /**
   * Convert HSLA color to have specific alpha
   */
  const withAlpha = (color: string, alpha: number): string => {
    // Convert hsla(h, s%, l%, a) to hsla(h, s%, l%, newAlpha)
    if (color.startsWith("hsla(")) {
      return color.replace(/,\s*[\d.]+\)$/, `, ${alpha})`);
    }
    // Convert hsl(h, s%, l%) to hsla(h, s%, l%, alpha)
    if (color.startsWith("hsl(")) {
      return color.replace("hsl(", "hsla(").replace(")", `, ${alpha})`);
    }
    return color;
  };

  /**
   * Check if dynamic colors are enabled
   */
  const isDynamicColorsEnabled = computed(() => true); // Always true in unified system

  /**
   * Get color preview for all notes
   */
  const getColorPreview = (mode: MusicalMode = "major", octave: number = 3) => {
    const config = dynamicColorConfig.value;
    const notes = config.chromaticMapping ? CHROMATIC_NOTES : SOLFEGE_NOTES;

    return notes.map((noteName: string, index: number) => ({
      name: noteName,
      index,
      colors: getNoteColors(noteName, mode, octave, false), // Static preview
    }));
  };

  /**
   * Create glassmorphism background effect
   */
  const createGlassmorphBackground = (
    color: string,
    opacity: number = 0.4
  ): string => {
    const color1 = withAlpha(color, opacity * 1.425); // 57% of base opacity
    const color2 = withAlpha(color, opacity * 0.15); // 6% of base opacity
    return `radial-gradient(84.35% 70.19% at 50% 38.11%, ${color1}, ${color2})`;
  };

  /**
   * Create glassmorphism box shadow effect
   */
  const createGlassmorphShadow = (color: string): string => {
    const shadowColor = withAlpha(color, 0.09);
    return `hsla(0, 0%, 100%, 0.1) 0px 1px 0px 0px inset, hsla(0, 0%, 0%, 0.4) 0px 30px 50px 0px, ${shadowColor} 0px 4px 24px 0px, hsla(0, 0%, 100%, 0.06) 0px 0px 0px 1px inset`;
  };

  /**
   * Create chord-specific glassmorphism background using gradient of multiple colors
   */
  const createChordGlassmorphBackground = (
    colors: string[],
    opacity: number = 0.4
  ): string => {
    if (colors.length === 0) return "rgba(255, 255, 255, 0.1)";

    if (colors.length === 1) {
      return createGlassmorphBackground(colors[0], opacity);
    }

    // Create a blended linear gradient for multiple colors
    const gradientColors = colors.map((color) => withAlpha(color, opacity));
    const gradientColorsLight = colors.map((color) =>
      withAlpha(color, opacity * 0.15)
    );

    return `linear-gradient(135deg, 
      ${gradientColors.join(", ")}, 
      ${gradientColorsLight.join(", ")})`;
  };

  /**
   * Create chord-specific glassmorphism shadow
   */
  const createChordGlassmorphShadow = (colors: string[]): string => {
    if (colors.length === 0) return createGlassmorphShadow("#ffffff");

    // Use the first color for the shadow, or blend if multiple
    const shadowColor = colors.length >= 1 ? colors[0] : "#ffffff";
    return createGlassmorphShadow(shadowColor);
  };

  /**
   * Create interval-specific glassmorphism background
   */
  const createIntervalGlassmorphBackground = (
    fromColor: string,
    toColor: string,
    opacity: number = 0.4
  ): string => {
    const fromColorAlpha = withAlpha(fromColor, opacity);
    const toColorAlpha = withAlpha(toColor, opacity);
    return `linear-gradient(90deg, ${fromColorAlpha}, ${toColorAlpha})`;
  };

  /**
   * Create gradient from multiple colors
   */
  const createGradient = (
    colors: string[],
    direction: string = "135deg"
  ): string => {
    if (colors.length === 1) return colors[0];
    return `linear-gradient(${direction}, ${colors.join(", ")})`;
  };

  /**
   * Create conical gradient from multiple colors
   */
  const createConicGradient = (
    colors: string[],
    startAngle: string = "0deg"
  ): string => {
    if (colors.length === 1) return colors[0];
    return `conic-gradient(from ${startAngle}, ${colors.join(", ")})`;
  };

  /**
   * Create conical glassmorphism background effect
   */
  const createConicGlassmorphBackground = (
    color: string,
    opacity: number = 0.4,
    startAngle: string = "0deg"
  ): string => {
    const color1 = withAlpha(color, opacity * 1.425); // 57% of base opacity
    const color2 = withAlpha(color, opacity * 0.15); // 6% of base opacity
    const color3 = withAlpha(color, opacity * 0.8); // 32% of base opacity
    return `conic-gradient(from ${startAngle}, ${color1}, ${color2}, ${color3}, ${color1})`;
  };

  /**
   * Create chord-specific conical glassmorphism background using gradient of multiple colors
   */
  const createChordConicGlassmorphBackground = (
    colors: string[],
    opacity: number = 0.4,
    startAngle: string = "0deg"
  ): string => {
    if (colors.length === 0) return "rgba(255, 255, 255, 0.1)";

    if (colors.length === 1) {
      return createConicGlassmorphBackground(colors[0], opacity, startAngle);
    }

    // Create a blended conical gradient for multiple colors
    const gradientColors = colors.map((color) => withAlpha(color, opacity));
    const gradientColorsLight = colors.map((color) =>
      withAlpha(color, opacity * 0.15)
    );

    // Interleave full and light colors for better visual effect
    const interleavedColors: string[] = [];
    for (let i = 0; i < colors.length; i++) {
      interleavedColors.push(gradientColors[i]);
      interleavedColors.push(gradientColorsLight[i]);
    }
    // Complete the circle by adding the first color again
    interleavedColors.push(gradientColors[0]);

    return `conic-gradient(from ${startAngle}, ${interleavedColors.join(
      ", "
    )})`;
  };

  /**
   * Create interval-specific conical glassmorphism background
   */
  const createIntervalConicGlassmorphBackground = (
    fromColor: string,
    toColor: string,
    opacity: number = 0.4,
    startAngle: string = "0deg"
  ): string => {
    const fromColorAlpha = withAlpha(fromColor, opacity);
    const toColorAlpha = withAlpha(toColor, opacity);
    const fromColorLight = withAlpha(fromColor, opacity * 0.15);
    const toColorLight = withAlpha(toColor, opacity * 0.15);

    return `conic-gradient(from ${startAngle}, ${fromColorAlpha}, ${toColorLight}, ${toColorAlpha}, ${fromColorLight}, ${fromColorAlpha})`;
  };

  /**
   * Generate conical gradient string for CSS
   */
  const getConicGradient = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    startAngle: number | string = 0
  ): string => {
    const colors = getNoteColors(noteName, mode, octave, true);
    // Convert numeric angle to CSS format
    const cssAngle =
      typeof startAngle === "number" ? `${startAngle}deg` : startAngle;
    return `conic-gradient(from ${cssAngle}, ${colors.primary}, ${colors.accent}, ${colors.secondary}, ${colors.tertiary}, ${colors.primary})`;
  };

  /**
   * Helper function to adjust color brightness and saturation
   */
  const adjustColorHSL = (
    color: string,
    brightness: number = 1,
    saturation: number = 1
  ): string => {
    // Parse HSLA color
    const hslaMatch = color.match(
      /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/
    );
    if (!hslaMatch) return color;

    const [, h, s, l, a = "1"] = hslaMatch;
    const adjustedS = Math.max(0, Math.min(100, parseFloat(s) * saturation));
    const adjustedL = Math.max(0, Math.min(100, parseFloat(l) * brightness));

    return `hsla(${h}, ${adjustedS}%, ${adjustedL}%, ${a})`;
  };

  /**
   * Get key background based on color mode and configuration
   */
  const getKeyBackground = (
    solfegeName: string,
    mode: "major" | "minor",
    octave: number,
    colorMode: "colored" | "monochrome" | "glassmorphism",
    isAccidental: boolean,
    config: {
      keyBrightness?: number;
      keySaturation?: number;
      glassmorphOpacity?: number;
    } = {}
  ): { background: string; primaryColor: string } => {
    const {
      keyBrightness = 1,
      keySaturation = 1,
      glassmorphOpacity = 0.4,
    } = config;

    if (colorMode === "monochrome") {
      // Monochrome: white for accidentals, black for naturals
      const baseColor = isAccidental
        ? "hsla(0, 0%, 100%, 1)"
        : "hsla(0, 0%, 10%, 1)";
      const adjustedColor = adjustColorHSL(baseColor, keyBrightness, keySaturation);
      return {
        background: adjustedColor,
        primaryColor: adjustedColor,
      };
    }

    // Get primary color for colored and glassmorphism modes
    const primaryColor = getPrimaryColor(solfegeName, mode, octave);
    if (!primaryColor) {
      // Fallback color
      const fallback = "hsla(200, 70%, 50%, 1)";
      return {
        background: fallback,
        primaryColor: fallback,
      };
    }

    if (colorMode === "glassmorphism") {
      // Glassmorphism mode
      const glassBg = createGlassmorphBackground(primaryColor, glassmorphOpacity);
      return {
        background: glassBg || `hsla(200, 70%, 50%, ${glassmorphOpacity})`,
        primaryColor,
      };
    }

    // Colored mode
    const adjustedColor = adjustColorHSL(primaryColor, keyBrightness, keySaturation);
    return {
      background: adjustedColor,
      primaryColor: adjustedColor,
    };
  };

  /**
   * Get text color for key labels
   */
  const getKeyTextColor = (
    colorMode: "colored" | "monochrome" | "glassmorphism",
    isAccidental: boolean
  ): string => {
    if (colorMode === "monochrome") {
      // Monochrome: opposite of key color
      return isAccidental ? "text-black" : "text-white";
    }
    
    // Colored and glassmorphism: black for accidentals, white for naturals
    return isAccidental ? "text-black" : "text-white";
  };

  return {
    // Core color functions
    getNoteColors,
    getPrimaryColor,
    getAccentColor,
    getSecondaryColor,
    getTertiaryColor,

    // Static color functions (no animation)
    getStaticPrimaryColor,
    getStaticAccentColor,
    getStaticSecondaryColor,
    getStaticTertiaryColor,

    // Backward compatibility aliases
    getStringColor,
    getFleckColor,
    getHighlightColor,

    // Utility functions
    getGradient,
    getConicGradient,
    withAlpha,
    createGradient,
    createConicGradient,

    // Glassmorphism functions
    createGlassmorphBackground,
    createGlassmorphShadow,
    createChordGlassmorphBackground,
    createChordGlassmorphShadow,
    createIntervalGlassmorphBackground,

    // Conical glassmorphism functions
    createConicGlassmorphBackground,
    createChordConicGlassmorphBackground,
    createIntervalConicGlassmorphBackground,

    // Key styling functions
    adjustColorHSL,
    getKeyBackground,
    getKeyTextColor,

    // State
    isDynamicColorsEnabled,

    // Preview function
    getColorPreview,

    // Animation time for external use
    animationTime: computed(() => animationTime.value),
  };
}

// Export cleanup function for app-level cleanup
export function cleanupColorSystem() {
  stopGlobalAnimation();
}
