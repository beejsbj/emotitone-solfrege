/**
 * Dynamic Color System Composable
 * Provides reactive dynamic color generation for solfege notes
 */

import { computed, ref } from "vue";
import { useVisualConfig } from "./useVisualConfig";
import type { SolfegeData } from "@/types/music";
import type { NoteColorRelationships } from "@/types/visual";
import {
  generateDynamicNoteColors,
  getNoteIndex,
  solfegeNameToIndex,
} from "@/utils/dynamicColors";

/**
 * Composable for dynamic color generation
 */
export function useDynamicColors() {
  const { dynamicColorConfig } = useVisualConfig();
  
  // Current animation time for hue animation
  const animationTime = ref(0);
  
  // Start animation loop
  let animationId: number | null = null;
  
  const startAnimation = () => {
    if (animationId) return;
    
    const animate = () => {
      animationTime.value = Date.now();
      animationId = requestAnimationFrame(animate);
    };
    
    animate();
  };
  
  const stopAnimation = () => {
    if (animationId) {
      cancelAnimationFrame(animationId);
      animationId = null;
    }
  };
  
  /**
   * Generate colors for a solfege note
   * @param solfegeName - Name of the solfege note
   * @param octave - Octave number (1-5, defaults to 3)
   * @param animated - Whether to use animated hue (defaults to true)
   * @returns Color relationships for the note
   */
  const generateNoteColors = (
    solfegeName: string,
    octave: number = 3,
    animated: boolean = true
  ): NoteColorRelationships => {
    const config = dynamicColorConfig.value;
    
    if (!config.isEnabled) {
      // Return empty colors when dynamic colors are disabled
      // The calling code should fall back to static colors
      return {
        primary: "",
        accent: "",
        secondary: "",
        tertiary: "",
        gradient: "",
      };
    }
    
    const noteIndex = getNoteIndex(solfegeName, config.chromaticMapping);
    
    if (noteIndex === -1) {
      // Invalid note name, return default colors
      return {
        primary: "hsl(0, 80%, 50%)",
        accent: "hsl(180, 80%, 50%)",
        secondary: "hsl(120, 80%, 50%)",
        tertiary: "hsl(240, 80%, 50%)",
        gradient: "linear-gradient(135deg, hsl(0, 80%, 50%) 0%, hsl(120, 80%, 50%) 50%, hsl(180, 80%, 50%) 100%)",
      };
    }
    
    const time = animated ? animationTime.value : undefined;
    
    return generateDynamicNoteColors(noteIndex, octave, config, time);
  };
  
  /**
   * Generate colors for a solfege data object
   * @param solfege - Solfege data object
   * @param octave - Octave number (defaults to 3)
   * @param animated - Whether to use animated hue (defaults to true)
   * @returns Enhanced solfege data with dynamic colors
   */
  const generateSolfegeColors = (
    solfege: SolfegeData,
    octave: number = 3,
    animated: boolean = true
  ): SolfegeData => {
    const colors = generateNoteColors(solfege.name, octave, animated);
    
    // If dynamic colors are disabled, return original solfege data
    if (!dynamicColorConfig.value.isEnabled) {
      return solfege;
    }
    
    // Return enhanced solfege data with dynamic colors
    return {
      ...solfege,
      colorGradient: colors.gradient,
      colorPrimary: colors.primary,
      colorSecondary: colors.secondary,
      colorAccent: colors.accent,
      colorHighlight: colors.tertiary, // Use tertiary as highlight
      colorFlecks: colors.accent, // Use accent for flecks
    };
  };
  
  /**
   * Check if dynamic colors are enabled
   */
  const isDynamicColorsEnabled = computed(() => dynamicColorConfig.value.isEnabled);
  
  /**
   * Check if chromatic mapping is enabled
   */
  const isChromaticMappingEnabled = computed(() => dynamicColorConfig.value.chromaticMapping);
  
  /**
   * Get the current hue range for a note (useful for debugging/visualization)
   * @param solfegeName - Name of the solfege note
   * @returns Object with hue range information
   */
  const getNoteHueRange = (solfegeName: string) => {
    const config = dynamicColorConfig.value;
    const noteIndex = getNoteIndex(solfegeName, config.chromaticMapping);
    
    if (noteIndex === -1) return null;
    
    const totalNotes = config.chromaticMapping ? 12 : 7;
    const hueInterval = 360 / totalNotes;
    const baseHue = (noteIndex * hueInterval) % 360;
    
    return {
      baseHue,
      minHue: (baseHue - config.hueAnimationAmplitude + 360) % 360,
      maxHue: (baseHue + config.hueAnimationAmplitude) % 360,
      amplitude: config.hueAnimationAmplitude,
    };
  };
  
  /**
   * Get color preview for all notes (useful for UI display)
   * @param octave - Octave to preview (defaults to 3)
   * @returns Array of note names and their colors
   */
  const getColorPreview = (octave: number = 3) => {
    const config = dynamicColorConfig.value;
    const notes = config.chromaticMapping 
      ? ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"]
      : ["Do", "Re", "Mi", "Fa", "Sol", "La", "Ti"];
    
    return notes.map((noteName, index) => ({
      name: noteName,
      index,
      colors: generateNoteColors(noteName, octave, false), // Static preview
      hueRange: getNoteHueRange(noteName),
    }));
  };
  
  // Auto-start animation when dynamic colors are enabled
  computed(() => {
    if (dynamicColorConfig.value.isEnabled) {
      startAnimation();
    } else {
      stopAnimation();
    }
  });
  
  return {
    // Core functions
    generateNoteColors,
    generateSolfegeColors,
    
    // State
    isDynamicColorsEnabled,
    isChromaticMappingEnabled,
    animationTime,
    
    // Utility functions
    getNoteHueRange,
    getColorPreview,
    
    // Animation control
    startAnimation,
    stopAnimation,
  };
}
