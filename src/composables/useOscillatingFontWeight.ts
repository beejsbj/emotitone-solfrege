// Simple font weight oscillation utility
import { useMusicStore } from "@/stores/music";
import {
  mapFrequencyToValue,
  createFontWeightMapping,
  createVisualFrequency,
  createOscillation,
  clamp,
} from "@/utils/visualEffects";

// Configuration for different oscillation sizes
const OSCILLATION_CONFIGS = {
  sm: { amplitude: 50, baseWeight: 400 },
  md: { amplitude: 100, baseWeight: 500 },
  lg: { amplitude: 150, baseWeight: 600 },
  full: { amplitude: 400, baseWeight: 500 }, // Oscillates from 100-900
};

let animationId: number | null = null;
let startTime: number | null = null;
let currentFrequency = 0;
let baseFontWeight = 500;
let visualFrequency = 0;
let musicStore: any = null;

/**
 * Updates font weights for all elements with oscillation classes
 */
function updateFontWeights(elapsed: number) {
  const elements = document.querySelectorAll(
    ".font-weight-oscillate-sm, .font-weight-oscillate-md, .font-weight-oscillate-lg, .font-weight-oscillate-full"
  );

  elements.forEach((element) => {
    const htmlElement = element as HTMLElement;
    let config;

    if (htmlElement.classList.contains("font-weight-oscillate-sm")) {
      config = OSCILLATION_CONFIGS.sm;
    } else if (htmlElement.classList.contains("font-weight-oscillate-md")) {
      config = OSCILLATION_CONFIGS.md;
    } else if (htmlElement.classList.contains("font-weight-oscillate-lg")) {
      config = OSCILLATION_CONFIGS.lg;
    } else if (htmlElement.classList.contains("font-weight-oscillate-full")) {
      config = OSCILLATION_CONFIGS.full;
    } else {
      return;
    }

    if (currentFrequency > 0) {
      // Create oscillating font weight
      const oscillatingWeight = createOscillation(
        elapsed,
        visualFrequency,
        config.amplitude,
        baseFontWeight
      );

      const finalWeight = clamp(oscillatingWeight, 100, 900);
      htmlElement.style.fontWeight = finalWeight.toString();
    } else {
      // Return to default weight
      htmlElement.style.fontWeight = config.baseWeight.toString();
    }
  });
}

/**
 * Animation loop function
 */
function animate(timestamp: number) {
  if (startTime === null) startTime = timestamp;
  const elapsed = (timestamp - startTime) / 1000; // Convert to seconds

  updateFontWeights(elapsed);

  if (currentFrequency > 0) {
    animationId = requestAnimationFrame(animate);
  }
}

/**
 * Starts font weight oscillation for the current note
 */
function startOscillation() {
  if (!musicStore || !musicStore.currentNote) return;

  // Find the solfege index to get frequency
  const currentSolfegeIndex = musicStore.solfegeData.findIndex(
    (s: any) => s.name === musicStore.currentNote
  );
  if (currentSolfegeIndex === -1) return;

  // Get frequency for the current note
  const frequency = musicStore.getNoteFrequency(currentSolfegeIndex, 4);
  currentFrequency = frequency;

  // Map frequency to base font weight
  const fontWeightMapping = createFontWeightMapping();
  baseFontWeight = mapFrequencyToValue(frequency, fontWeightMapping);

  // Create visual frequency
  visualFrequency = createVisualFrequency(frequency);

  // Start the animation
  startTime = null;
  if (animationId === null) {
    animationId = requestAnimationFrame(animate);
  }
}

/**
 * Stops font weight oscillation and returns to default weights
 */
function stopOscillation() {
  currentFrequency = 0;

  if (animationId !== null) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }

  // Return all elements to their default weights
  updateFontWeights(0);
}

/**
 * Initialize the font weight oscillation system
 * Call this once in your app to set up automatic oscillation
 */
export function initializeFontWeightOscillation() {
  musicStore = useMusicStore();

  // Watch for note changes
  musicStore.$subscribe((_mutation: any, state: any) => {
    if (state.currentNote) {
      startOscillation();
    } else {
      stopOscillation();
    }
  });
}

// Auto-initialize when the module is imported
if (typeof window !== "undefined") {
  // Wait for Vue to be ready
  setTimeout(() => {
    try {
      initializeFontWeightOscillation();
    } catch (error) {
      console.warn("Font weight oscillation initialization failed:", error);
    }
  }, 100);
}
