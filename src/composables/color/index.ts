/**
 * Simplified Color System
 * Clean API that replaces the over-abstracted original system
 */

import { computed } from "vue";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { 
  generateNoteColors, 
  generateGradient,
  withAlpha,
  calculateBaseHue,
  calculateOctaveLightness,
  getNoteIndex
} from "./useColorGeneration";
import { 
  generateAnimatedNoteColors,
  startColorAnimation,
  stopColorAnimation,
  cleanupColorAnimation
} from "./useColorAnimation";
import { 
  createGlassmorphBackground,
  createGlassmorphShadow,
  createChordGlassmorphBackground,
  createChordGlassmorphShadow,
  createConicGlassmorphBackground,
  createIntervalGlassmorphBackground
} from "./useGlassmorphism";
import type { MusicalMode, NoteColorRelationships } from "@/types";

/**
 * Simplified Color System Composable
 * Replaces the massive 596-line useColorSystem with focused modules
 */
export function useColorSystem() {
  const visualConfigStore = useVisualConfigStore();

  // Get config options for color generation
  const colorOptions = computed(() => ({
    chromaticMapping: visualConfigStore.config.dynamicColors.chromaticMapping,
    saturation: visualConfigStore.config.dynamicColors.saturation,
    baseLightness: visualConfigStore.config.dynamicColors.baseLightness,
    lightnessRange: visualConfigStore.config.dynamicColors.lightnessRange,
    hueAnimationAmplitude: visualConfigStore.config.dynamicColors.hueAnimationAmplitude,
    animationSpeed: visualConfigStore.config.dynamicColors.animationSpeed,
  }));

  /**
   * Get colors for a note (animated by default)
   */
  const getNoteColors = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    animated: boolean = true
  ): NoteColorRelationships => {
    const options = colorOptions.value;
    
    return animated 
      ? generateAnimatedNoteColors(noteName, octave, options)
      : generateNoteColors(noteName, octave, options);
  };

  /**
   * Get primary color (most commonly used)
   */
  const getPrimaryColor = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3
  ): string => {
    return getNoteColors(noteName, mode, octave, true).primary;
  };

  /**
   * Get static primary color (no animation)
   */
  const getStaticPrimaryColor = (
    noteName: string,
    mode: MusicalMode = "major", 
    octave: number = 3
  ): string => {
    return getNoteColors(noteName, mode, octave, false).primary;
  };

  /**
   * Get gradient for a note
   */
  const getGradient = (
    noteName: string,
    mode: MusicalMode = "major",
    octave: number = 3,
    direction: number | string = 45
  ): string => {
    const options = colorOptions.value;
    return generateGradient(noteName, octave, direction, options);
  };

  // Start animation when composable is used
  startColorAnimation();

  return {
    // Core functions (simplified API)
    getNoteColors,
    getPrimaryColor,
    getStaticPrimaryColor,
    getGradient,
    
    // Utility functions
    withAlpha,
    
    // Glassmorphism effects
    createGlassmorphBackground,
    createGlassmorphShadow,
    createChordGlassmorphBackground,
    createChordGlassmorphShadow,
    createConicGlassmorphBackground,
    createIntervalGlassmorphBackground,

    // Animation controls
    startColorAnimation,
    stopColorAnimation,
    
    // Low-level functions (for advanced use)
    calculateBaseHue,
    calculateOctaveLightness,
    getNoteIndex,
  };
}

/**
 * Cleanup function for the color system
 */
export function cleanupColorSystem() {
  cleanupColorAnimation();
}

// Re-export individual modules for advanced usage
export * from "./useColorGeneration";
export * from "./useColorAnimation";
export * from "./useGlassmorphism";