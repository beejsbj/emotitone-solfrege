import { computed, reactive } from "vue";
import type {
  BlobConfig,
  AmbientConfig,
  ParticleConfig,
  StringConfig,
  FontOscillationConfig,
  AnimationConfig,
  FrequencyMappingConfig,
  DynamicColorConfig,
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
  VisualEffectsConfig,
};

// Default configuration values
const DEFAULT_CONFIG: VisualEffectsConfig = {
  blobs: {
    isEnabled: true,
    baseSizeRatio: 0.4, // 40% of screen size
    minSize: 300,
    maxSize: 800,
    opacity: 0.4,
    blurRadius: 60,
    oscillationAmplitude: 1, // Increased for more visible vibration
    fadeOutDuration: 1.5, // 1.5 seconds fade-out
    scaleInDuration: 0.3, // 0.3 seconds scale-in animation
    scaleOutDuration: 0.4, // 0.4 seconds scale-out animation
    driftSpeed: 10, // 20 pixels per second max drift
    vibrationFrequencyDivisor: 80, // Lower divisor for more noticeable vibration
    edgeSegments: 48, // Number of segments for blob edge
    vibrationAmplitude: 15, // Amplitude of edge vibration
    glowEnabled: true, // Enable glow effect
    glowIntensity: 10, // Glow blur intensity
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
    count: 8,
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
};

/**
 * Composable for managing unified visual effects configuration
 */
export function useVisualConfig() {
  // Reactive configuration state
  const config = reactive<VisualEffectsConfig>({ ...DEFAULT_CONFIG });

  // Individual config sections as computed refs for convenience
  const blobConfig = computed(() => config.blobs);
  const ambientConfig = computed(() => config.ambient);
  const particleConfig = computed(() => config.particles);
  const stringConfig = computed(() => config.strings);
  const fontOscillationConfig = computed(() => config.fontOscillation);
  const animationConfig = computed(() => config.animation);
  const frequencyMappingConfig = computed(() => config.frequencyMapping);
  const dynamicColorConfig = computed(() => config.dynamicColors);

  /**
   * Update a specific configuration section
   */
  const updateConfig = <K extends keyof VisualEffectsConfig>(
    section: K,
    updates: Partial<VisualEffectsConfig[K]>
  ) => {
    Object.assign(config[section], updates);
  };

  /**
   * Reset configuration to defaults
   */
  const resetConfig = () => {
    Object.assign(config, DEFAULT_CONFIG);
  };

  /**
   * Reset a specific section to defaults
   */
  const resetSection = <K extends keyof VisualEffectsConfig>(section: K) => {
    Object.assign(config[section], DEFAULT_CONFIG[section]);
  };

  /**
   * Get a deep copy of the current configuration
   */
  const getConfigSnapshot = (): VisualEffectsConfig => {
    return JSON.parse(JSON.stringify(config));
  };

  /**
   * Load configuration from a snapshot
   */
  const loadConfigSnapshot = (snapshot: VisualEffectsConfig) => {
    Object.assign(config, snapshot);
  };

  return {
    // Configuration state
    config,

    // Individual sections
    blobConfig,
    ambientConfig,
    particleConfig,
    stringConfig,
    fontOscillationConfig,
    animationConfig,
    frequencyMappingConfig,
    dynamicColorConfig,

    // Methods
    updateConfig,
    resetConfig,
    resetSection,
    getConfigSnapshot,
    loadConfigSnapshot,
  };
}

// Export default configuration for reference
export { DEFAULT_CONFIG };
