/**
 * String Renderer Composable
 * Renders vibrating string visualizations
 */

import { ref } from "vue";
import type {
  VibratingStringConfig,
  StringConfig,
  AnimationConfig,
} from "@/types";
import { useColorSystem } from "../useColorSystem";
import {
  createVisualFrequency,
  createHarmonicVibration,
  createStringDamping,
} from "@/utils/visualEffects";
import { gsap } from "gsap";

export function useStringRenderer() {
  const { getPrimaryColor } = useColorSystem();

  // String state
  const strings = ref<VibratingStringConfig[]>([]);

  /**
   * Initialize string configurations
   */
  const initializeStrings = (
    stringConfig: StringConfig,
    canvasWidth: number,
    _canvasHeight: number,
    solfegeData: any[]
  ) => {
    if (!stringConfig.isEnabled) return;

    // Use the configured count, but limit to available solfege data
    const stringCount = Math.min(stringConfig.count, solfegeData.length);
    const stringsToCreate = solfegeData.slice(0, stringCount);

    strings.value = stringsToCreate.map((solfege, index) => ({
      x: (canvasWidth / (stringCount + 1)) * (index + 1),
      baseY: 0,
      amplitude: 0,
      frequency: 1,
      phase: Math.random() * Math.PI * 2,
      color: getPrimaryColor(solfege.name, "major"),
      opacity: stringConfig.baseOpacity,
      isActive: false,
      noteIndex: index,
    }));
  };

  /**
   * Update string properties based on current note
   */
  const updateStringProperties = (
    stringConfig: StringConfig,
    animationConfig: AnimationConfig,
    musicStore: any
  ) => {
    strings.value.forEach((string, index) => {
      const solfege = musicStore.solfegeData[index];
      if (!solfege) return;

      // Check if this string's note is currently active in any octave
      const activeNotes = musicStore.getActiveNotes();
      const isStringActive = activeNotes.some(
        (activeNote: any) => activeNote.solfegeIndex === index
      );

      // Update string properties based on active notes
      if (isStringActive) {
        string.isActive = true;
        string.amplitude = gsap.utils.interpolate(
          string.amplitude,
          stringConfig.maxAmplitude,
          stringConfig.interpolationSpeed
        );
        string.opacity = gsap.utils.interpolate(
          string.opacity,
          stringConfig.activeOpacity,
          stringConfig.opacityInterpolationSpeed
        );
        string.color = getPrimaryColor(solfege.name, musicStore.currentMode);

        // Get the highest octave frequency for visual vibration if multiple notes
        const activeStringNotes = activeNotes.filter(
          (activeNote: any) => activeNote.solfegeIndex === index
        );
        const highestOctaveNote = activeStringNotes.reduce(
          (highest: any, current: any) =>
            current.octave > highest.octave ? current : highest
        );

        string.frequency = createVisualFrequency(
          highestOctaveNote.frequency,
          animationConfig.visualFrequencyDivisor
        );
      } else {
        string.isActive = false;
        string.amplitude = gsap.utils.interpolate(
          string.amplitude,
          0,
          stringConfig.dampingFactor
        );
        string.opacity = gsap.utils.interpolate(
          string.opacity,
          stringConfig.baseOpacity,
          0.05
        );

        // Keep a subtle base frequency when inactive
        const noteFrequency = musicStore.getNoteFrequency(index, 4);
        string.frequency = createVisualFrequency(noteFrequency, 200);
      }
    });
  };

  /**
   * Render strings
   */
  const renderStrings = (
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    canvasHeight: number
  ) => {
    if (!ctx) return;

    strings.value.forEach((string) => {
      if (!ctx) return;

      ctx.globalAlpha = string.opacity;
      ctx.strokeStyle = string.color;
      ctx.lineWidth = 2;
      ctx.beginPath();

      // Create vibrating line with realistic frequency-based movement
      const segments = 100;
      for (let i = 0; i <= segments; i++) {
        const y = i * (canvasHeight / segments);
        const normalizedY = y / canvasHeight;

        // Create harmonic vibration
        const totalVibration = createHarmonicVibration(
          elapsed,
          string.frequency,
          string.amplitude,
          y,
          string.phase
        );

        // Apply damping effect towards the ends (like a real string fixed at both ends)
        const damping = createStringDamping(normalizedY);
        const dampedVibration = totalVibration * damping;

        const x = string.x + dampedVibration;

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();

      // Add glow effect for active strings
      if (string.isActive && string.amplitude > 5) {
        ctx.shadowColor = string.color;
        ctx.shadowBlur = 10;
        ctx.stroke();
        ctx.shadowBlur = 0;
      }

      ctx.globalAlpha = 1;
    });
  };

  /**
   * Get active string count
   */
  const getActiveStringCount = () => {
    return strings.value.filter((string) => string.isActive).length;
  };

  /**
   * Clear all strings
   */
  const clearAllStrings = () => {
    strings.value = [];
  };

  return {
    // State
    strings,

    // Methods
    initializeStrings,
    updateStringProperties,
    renderStrings,
    getActiveStringCount,
    clearAllStrings,
  };
}
