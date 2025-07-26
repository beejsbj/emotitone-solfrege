import { computed, reactive } from "vue";
import { useVisualConfigStore } from "@/stores/visualConfig";
import type {
  BlobConfig,
  AmbientConfig,
  ParticleConfig,
  StringConfig,
  FontOscillationConfig,
  AnimationConfig,
  FrequencyMappingConfig,
  DynamicColorConfig,
  PaletteConfig,
  FloatingPopupConfig,
  HilbertScopeConfig,
  VisualEffectsConfig,
} from "@/types/visual";

/**
 * Unified Visual Effects Configuration System
 * Centralizes all visual effect parameters for consistent management
 */

// Re-export types for backward compatibility
export type {
  BlobConfig,
  AmbientConfig,
  ParticleConfig,
  StringConfig,
  FontOscillationConfig,
  AnimationConfig,
  FrequencyMappingConfig,
  DynamicColorConfig,
  PaletteConfig,
  FloatingPopupConfig,
  HilbertScopeConfig,
  VisualEffectsConfig,
};

// Default configuration values
const DEFAULT_CONFIG: VisualEffectsConfig = {
  blobs: {
    isEnabled: true,
    baseSizeRatio: 0.2, // 40% of screen size
    minSize: 100,
    maxSize: 400,
    opacity: 0.4,
    blurRadius: 5,
    oscillationAmplitude: 1, // Increased for more visible vibration
    fadeOutDuration: 1.5, // 1.5 seconds fade-out
    scaleInDuration: 0.3, // 0.3 seconds scale-in animation
    scaleOutDuration: 0.4, // 0.4 seconds scale-out animation
    driftSpeed: 10, // 20 pixels per second max drift
    vibrationFrequencyDivisor: 80, // Lower divisor for more noticeable vibration
    edgeSegments: 48, // Number of segments for blob edge
    vibrationAmplitude: 15, // Amplitude of edge vibration
    glowEnabled: true, // Enable glow effect
    glowIntensity: 5, // Glow blur intensity
  },

  ambient: {
    isEnabled: true,
    opacityMajor: 0.6,
    opacityMinor: 0.4,
    brightnessMajor: 0.5,
    brightnessMinor: 0.3,
    saturationMajor: 0.8,
    saturationMinor: 0.6,
  },

  particles: {
    isEnabled: true,
    count: 10,
    sizeMin: 2,
    sizeMax: 6,
    lifetimeMin: 2000, // milliseconds
    lifetimeMax: 3000,
    speed: 4,
    gravity: 0, // Gravity effect
    airResistance: 0.99, // Air resistance (0.99 = 1% loss per frame)
  },

  strings: {
    isEnabled: true,
    count: 7,
    baseOpacity: 0.05,
    activeOpacity: 0.9,
    maxAmplitude: 15,
    dampingFactor: 0.08,
    interpolationSpeed: 0.15,
    opacityInterpolationSpeed: 0.1,
  },

  fontOscillation: {
    isEnabled: false,
    sm: { amplitude: 50, baseWeight: 400 },
    md: { amplitude: 100, baseWeight: 500 },
    lg: { amplitude: 150, baseWeight: 600 },
    full: { amplitude: 400, baseWeight: 500 }, // 100-900 range
  },

  animation: {
    visualFrequencyDivisor: 100,
    frameRate: 60,
    smoothingFactor: 0.1,
  },

  frequencyMapping: {
    minFreq: 200,
    maxFreq: 600,
    minValue: 400,
    maxValue: 700,
  },

  dynamicColors: {
    isEnabled: true, // Start with static colors by default
    chromaticMapping: false, // Start with solfege (7 notes) mapping
    hueAnimationAmplitude: 15, // ±15° animation range
    animationSpeed: 1, // Normal animation speed
    saturation: 0.8, // 80% saturation
    baseLightness: 0.5, // 50% lightness for middle octave (octave 5)
    lightnessRange: 0.7, // 70% range (15-85% lightness across octaves 2-8)
  },

  palette: {
    isEnabled: true, // Enable palette gradient effects
    gradientDirection: 225, // 45-degree gradient direction
    useGlassmorphism: true, // Use glassmorphism effects by default
    glassmorphOpacity: 0.4, // 40% glassmorphism opacity for palette keys
  },

  floatingPopup: {
    isEnabled: true,
    accumulationWindow: 500, // 500ms accumulation window for arpeggios
    hideDelay: 2000, // Show for 2 seconds after last note
    maxNotes: 7, // Limit to 2 notes maximum for sequential intervals
    showChord: true, // Show chord information
    showIntervals: true, // Show interval information
    showEmotionalDescription: true, // Show emotional descriptions
    backdropBlur: 1, // 12px backdrop blur
    glassmorphOpacity: 0.4, // 40% glassmorphism opacity
    animationDuration: 300, // 300ms animation duration
  },

  hilbertScope: {
    isEnabled: true, // Enabled by default
    sizeRatio: 0.6, // 60% of screen - much larger!
    minSize: 600,
    maxSize: 1400,
    opacity: 0.7,
    scaleInDuration: 0.5,
    scaleOutDuration: 0.5,
    driftSpeed: 5,
    glowEnabled: true,
    glowIntensity: 10,
    history: 0.85, // Trail strength
    lineWidth: 3,
    colorMode: 'amplitude' as const, // Amplitude-based coloring by default
  },
};

/**
 * Composable for managing unified visual effects configuration
 * Now uses Pinia store for persistence and centralized state management
 */
export function useVisualConfig() {
  // Use the Pinia store
  const store = useVisualConfigStore();

  // Individual config sections as computed refs for convenience
  const blobConfig = computed(() => store.config.blobs);
  const ambientConfig = computed(() => store.config.ambient);
  const particleConfig = computed(() => store.config.particles);
  const stringConfig = computed(() => store.config.strings);
  const fontOscillationConfig = computed(() => store.config.fontOscillation);
  const animationConfig = computed(() => store.config.animation);
  const frequencyMappingConfig = computed(() => store.config.frequencyMapping);
  const dynamicColorConfig = computed(() => store.config.dynamicColors);
  const paletteConfig = computed(() => store.config.palette);
  const floatingPopupConfig = computed(() => store.config.floatingPopup);
  const hilbertScopeConfig = computed(() => store.config.hilbertScope);

  return {
    // Configuration state
    config: store.config,
    visualsEnabled: store.visualsEnabled,

    // Individual sections
    blobConfig,
    ambientConfig,
    particleConfig,
    stringConfig,
    fontOscillationConfig,
    animationConfig,
    frequencyMappingConfig,
    dynamicColorConfig,
    paletteConfig,
    floatingPopupConfig,
    hilbertScopeConfig,

    // Methods from store
    updateConfig: store.updateConfig,
    resetConfig: store.resetToDefaults,
    resetSection: store.resetSection,
    getConfigSnapshot: store.getConfigSnapshot,
    loadConfigSnapshot: store.loadConfigSnapshot,
  };
}

// Export default configuration for reference
export { DEFAULT_CONFIG };
