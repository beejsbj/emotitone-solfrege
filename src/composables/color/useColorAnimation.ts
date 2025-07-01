/**
 * Color Animation
 * Handles animated color generation with performance optimizations
 */

import { ref } from "vue";
import { 
  calculateBaseHue, 
  generateColorRelationships, 
  calculateOctaveLightness,
  getNoteIndex 
} from "./useColorGeneration";
import type { NoteColorRelationships } from "@/types";

// Singleton animation state
let animationId: number | null = null;
const animationTime = ref(0);
const isAnimating = ref(false);

/**
 * Generate animated hue within the note's range
 */
function generateAnimatedHue(
  baseHue: number,
  amplitude: number,
  time: number,
  speed: number,
  chromaticMapping: boolean = false
): number {
  const totalNotes = chromaticMapping ? 12 : 7;
  const hueInterval = 360 / totalNotes;
  
  const maxAmplitude = hueInterval / 2;
  const clampedAmplitude = Math.min(amplitude, maxAmplitude);
  
  const animationOffset = Math.sin(time * speed * 0.001) * clampedAmplitude;
  
  return (baseHue + animationOffset + 360) % 360;
}

/**
 * Generate dynamic colors for a note with animation
 */
export function generateAnimatedNoteColors(
  noteName: string,
  octave: number = 3,
  options: {
    chromaticMapping?: boolean;
    hueAnimationAmplitude?: number;
    animationSpeed?: number;
    saturation?: number;
    baseLightness?: number;
    lightnessRange?: number;
  } = {}
): NoteColorRelationships {
  const {
    chromaticMapping = false,
    hueAnimationAmplitude = 15,
    animationSpeed = 1,
    saturation = 0.8,
    baseLightness = 0.5,
    lightnessRange = 0.4
  } = options;

  const noteIndex = getNoteIndex(noteName, chromaticMapping);
  
  if (noteIndex === -1) {
    return {
      primary: "hsla(0, 80%, 50%, 1)",
      accent: "hsla(180, 80%, 50%, 1)",
      secondary: "hsla(120, 80%, 50%, 1)",
      tertiary: "hsla(240, 80%, 50%, 1)",
    };
  }

  const baseHue = calculateBaseHue(noteIndex, chromaticMapping);
  const currentHue = isAnimating.value 
    ? generateAnimatedHue(
        baseHue,
        hueAnimationAmplitude,
        animationTime.value,
        animationSpeed,
        chromaticMapping
      )
    : baseHue;

  const lightness = calculateOctaveLightness(octave, baseLightness, lightnessRange);

  return generateColorRelationships(currentHue, saturation, lightness);
}

/**
 * Start global animation loop
 */
export function startColorAnimation() {
  if (animationId) return;

  isAnimating.value = true;
  
  const animate = () => {
    animationTime.value = Date.now();
    animationId = requestAnimationFrame(animate);
  };

  animate();
}

/**
 * Stop global animation loop
 */
export function stopColorAnimation() {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  isAnimating.value = false;
}

/**
 * Get current animation time (for external use)
 */
export function getAnimationTime(): number {
  return animationTime.value;
}

/**
 * Check if animation is currently running
 */
export function isColorAnimationRunning(): boolean {
  return isAnimating.value;
}

/**
 * Cleanup function for animation resources
 */
export function cleanupColorAnimation() {
  stopColorAnimation();
}