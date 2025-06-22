// Composable for vibrating string-like animations
import { ref, reactive } from "vue";
import { useMusicStore } from "@/stores/music";
import { useAnimationLifecycle } from "./useAnimationLifecycle";
import {
  createVisualFrequency,
  createHarmonicVibration,
  createStringDamping,
  extractColorFromGradient,
} from "@/utils/visualEffects";
import { gsap } from "gsap";
import type { VibratingStringConfig } from "./types";

/**
 * Composable for managing vibrating string animations
 * @param canvasRef - Reference to the canvas element
 * @param stringCount - Number of strings to create
 * @returns Object with animation control methods and string data
 */
export function useVibratingAnimation(
  canvasRef: Ref<HTMLCanvasElement | null>,
  stringCount: number = 8
) {
  const musicStore = useMusicStore();

  // String configurations
  const strings = ref<VibratingStringConfig[]>([]);
  const canvasWidth = ref(window.innerWidth);
  const canvasHeight = ref(window.innerHeight);

  // Animation lifecycle
  const { startAnimation, stopAnimation, isAnimating } = useAnimationLifecycle({
    onFrame: (timestamp, elapsed) => {
      animateStrings(elapsed);
    },
    autoCleanup: true,
  });

  /**
   * Initializes the string configurations
   */
  const initializeStrings = () => {
    if (!canvasRef.value) return;

    const canvas = canvasRef.value;
    canvas.width = canvasWidth.value;
    canvas.height = canvasHeight.value;

    // Create string configurations
    strings.value = Array.from({ length: stringCount }, (_, index) => ({
      x: (canvasWidth.value / (stringCount + 1)) * (index + 1),
      baseY: 0,
      amplitude: 0,
      frequency: 0,
      phase: Math.random() * Math.PI * 2,
      color: "#ffffff",
      opacity: 0.15,
      isActive: false,
      noteIndex: index,
    }));

    // Start animation if not already running
    if (!isAnimating.value) {
      startAnimation();
    }
  };

  /**
   * Updates string properties based on current music state
   */
  const updateStringProperties = () => {
    strings.value.forEach((string, index) => {
      const solfege = musicStore.solfegeData[index];
      if (!solfege) return;

      // Update string properties based on current note
      if (musicStore.currentNote === solfege.name) {
        string.isActive = true;
        string.amplitude = gsap.utils.interpolate(string.amplitude, 15, 0.15);
        string.opacity = gsap.utils.interpolate(string.opacity, 0.9, 0.1);
        string.color = solfege.colorGradient;

        // Get the actual musical frequency for this note and scale it for visual vibration
        const noteFrequency = musicStore.getNoteFrequency(index, 4);
        string.frequency = createVisualFrequency(noteFrequency, 100);
      } else {
        string.isActive = false;
        string.amplitude = gsap.utils.interpolate(string.amplitude, 0, 0.08);
        string.opacity = gsap.utils.interpolate(string.opacity, 0.15, 0.05);

        // Keep a subtle base frequency when inactive
        const noteFrequency = musicStore.getNoteFrequency(index, 4);
        string.frequency = createVisualFrequency(noteFrequency, 400);
      }
    });
  };

  /**
   * Renders a single vibrating string
   */
  const renderString = (
    ctx: CanvasRenderingContext2D,
    string: VibratingStringConfig,
    elapsed: number
  ) => {
    const canvas = ctx.canvas;

    // Extract base color from gradient
    const baseColor = extractColorFromGradient(string.color);

    // Set drawing properties
    ctx.globalAlpha = string.opacity;
    ctx.strokeStyle = baseColor;
    ctx.lineWidth = string.isActive ? 2 : 1;
    ctx.lineCap = "round";

    ctx.beginPath();

    // Create vibrating line with realistic frequency-based movement
    const segments = 100;
    for (let i = 0; i <= segments; i++) {
      const y = i * (canvas.height / segments);
      const normalizedY = y / canvas.height;

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
      ctx.shadowColor = baseColor;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    ctx.globalAlpha = 1;
  };

  /**
   * Main animation loop for all strings
   */
  const animateStrings = (elapsed: number) => {
    const canvas = canvasRef.value;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Update string properties
    updateStringProperties();

    // Render all strings
    strings.value.forEach((string) => {
      renderString(ctx, string, elapsed);
    });
  };

  /**
   * Handles window resize
   */
  const handleResize = () => {
    canvasWidth.value = window.innerWidth;
    canvasHeight.value = window.innerHeight;

    // Re-initialize strings with new dimensions
    initializeStrings();
  };

  /**
   * Starts the vibrating animation
   */
  const startVibratingAnimation = () => {
    initializeStrings();
  };

  /**
   * Stops the vibrating animation
   */
  const stopVibratingAnimation = () => {
    stopAnimation();
  };

  return {
    // State
    strings: readonly(strings),
    canvasWidth: readonly(canvasWidth),
    canvasHeight: readonly(canvasHeight),
    isAnimating,

    // Methods
    initializeStrings,
    startVibratingAnimation,
    stopVibratingAnimation,
    handleResize,
  };
}

// Re-export types for convenience
import type { Ref } from "vue";
import { readonly } from "vue";
