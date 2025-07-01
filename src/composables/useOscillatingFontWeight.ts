// Simple font weight oscillation utility
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { logger } from "@/utils/logger";
import {
  mapFrequencyToValue,
  createFontWeightMapping,
  createVisualFrequency,
  createOscillation,
  clamp,
} from "@/utils/visualEffects";

// Configuration is now managed by useVisualConfig composable

let animationId: number | null = null;
let startTime: number | null = null;
let currentFrequency = 0;
let baseFontWeight = 500;
let visualFrequency = 0;
let musicStore: any = null;

// Cache DOM elements to avoid repeated queries
let cachedElements: HTMLElement[] = [];
let lastElementCount = 0;

/**
 * Cache DOM elements for font weight oscillation
 */
function cacheOscillationElements() {
  const elements = document.querySelectorAll(
    ".font-weight-oscillate-sm, .font-bold, .font-weight-oscillate-lg, .font-weight-oscillate-full"
  );
  cachedElements = Array.from(elements) as HTMLElement[];
  lastElementCount = cachedElements.length;
}

/**
 * Updates font weights for all elements with oscillation classes (optimized)
 */
function updateFontWeights(elapsed: number) {
  const visualConfigStore = useVisualConfigStore();
  if (!visualConfigStore.config.fontOscillation.isEnabled) return;

  // Check if we need to refresh the element cache
  const currentElementCount = document.querySelectorAll(
    ".font-weight-oscillate-sm, .font-bold, .font-weight-oscillate-lg, .font-weight-oscillate-full"
  ).length;

  if (currentElementCount !== lastElementCount || cachedElements.length === 0) {
    cacheOscillationElements();
  }

  cachedElements.forEach((element) => {
    const htmlElement = element;
    let config;

    if (htmlElement.classList.contains("font-weight-oscillate-sm")) {
      config = visualConfigStore.config.fontOscillation.sm;
    } else if (htmlElement.classList.contains("font-bold")) {
      config = visualConfigStore.config.fontOscillation.md;
    } else if (htmlElement.classList.contains("font-weight-oscillate-lg")) {
      config = visualConfigStore.config.fontOscillation.lg;
    } else if (htmlElement.classList.contains("font-weight-oscillate-full")) {
      config = visualConfigStore.config.fontOscillation.full;
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

// Store cleanup function for proper disposal
let unsubscribe: (() => void) | null = null;

/**
 * Cleanup function for font weight oscillation
 */
export function cleanupFontWeightOscillation() {
  stopOscillation();
  cachedElements = [];
  lastElementCount = 0;

  if (unsubscribe) {
    unsubscribe();
    unsubscribe = null;
  }
}

/**
 * Initialize the font weight oscillation system
 * Call this once in your app to set up automatic oscillation
 */
export function initializeFontWeightOscillation() {
  // Clean up any existing subscription
  if (unsubscribe) {
    unsubscribe();
  }

  musicStore = useMusicStore();

  // Watch for note changes
  unsubscribe = musicStore.$subscribe((_mutation: any, state: any) => {
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
      logger.warn("Font weight oscillation initialization failed:", error);
    }
  }, 100);
}
