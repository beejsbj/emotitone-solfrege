/**
 * Visual Effects Types
 * Centralized type definitions for all visual effect configurations and states
 */

import type { Ref } from 'vue';

/**
 * Font weight oscillation configuration
 */
export interface OscillationConfig {
  /** Base font weight when not oscillating */
  baseWeight: number;
  /** Minimum font weight allowed */
  minWeight: number;
  /** Maximum font weight allowed */
  maxWeight: number;
  /** Amplitude of the oscillation */
  amplitude: number;
  /** Frequency multiplier for visual oscillation */
  frequencyMultiplier: number;
}

/**
 * Font weight element with reactive properties
 */
export interface FontWeightElement {
  /** Reactive font weight value */
  weight: Ref<number>;
  /** Configuration for this element's oscillation */
  config: OscillationConfig;
}

/**
 * Frequency to value mapping configuration
 */
export interface FrequencyMapping {
  /** Minimum frequency for mapping */
  minFreq: number;
  /** Maximum frequency for mapping */
  maxFreq: number;
  /** Minimum output value */
  minValue: number;
  /** Maximum output value */
  maxValue: number;
}

/**
 * Vibrating string configuration for string-like animations
 */
export interface VibratingStringConfig {
  /** X position of the string */
  x: number;
  /** Base Y position of the string */
  baseY: number;
  /** Current amplitude of vibration */
  amplitude: number;
  /** Vibration frequency */
  frequency: number;
  /** Phase offset for the vibration */
  phase: number;
  /** Color of the string */
  color: string;
  /** Opacity of the string */
  opacity: number;
  /** Whether the string is currently active */
  isActive: boolean;
  /** Index of the associated note */
  noteIndex: number;
}

/**
 * Animation lifecycle callback options
 */
export interface AnimationLifecycleOptions {
  /** Callback when animation starts */
  onStart?: () => void;
  /** Callback when animation stops */
  onStop?: () => void;
  /** Callback for each animation frame */
  onFrame?: (timestamp: number, elapsed: number) => void;
  /** Whether to automatically cleanup on component unmount */
  autoCleanup?: boolean;
}

/**
 * Visual effect state configuration
 */
export interface VisualEffectConfig {
  /** Whether the effect is currently active */
  isActive: boolean;
  /** Current note being played */
  currentNote: string | null;
  /** Frequency of the current note */
  frequency: number;
  /** Index of the current solfege note */
  solfegeIndex: number;
}

/**
 * Blob visual effect configuration
 */
export interface BlobConfig {
  /** Whether blob effects are enabled */
  isEnabled: boolean;
  /** Base size ratio relative to screen size */
  baseSizeRatio: number;
  /** Minimum blob size in pixels */
  minSize: number;
  /** Maximum blob size in pixels */
  maxSize: number;
  /** Blob opacity (0-1) */
  opacity: number;
  /** Blur radius in pixels */
  blurRadius: number;
  /** Oscillation amplitude (0-1) */
  oscillationAmplitude: number;
}

/**
 * Ambient lighting effect configuration
 */
export interface AmbientConfig {
  /** Whether ambient effects are enabled */
  isEnabled: boolean;
  /** Opacity for major scale notes */
  opacityMajor: number;
  /** Opacity for minor scale notes */
  opacityMinor: number;
  /** Brightness for major scale notes */
  brightnessMajor: number;
  /** Brightness for minor scale notes */
  brightnessMinor: number;
  /** Saturation for major scale notes */
  saturationMajor: number;
  /** Saturation for minor scale notes */
  saturationMinor: number;
}

/**
 * Particle system configuration
 */
export interface ParticleConfig {
  /** Whether particle effects are enabled */
  isEnabled: boolean;
  /** Number of particles to generate */
  count: number;
  /** Minimum particle size */
  sizeMin: number;
  /** Maximum particle size */
  sizeMax: number;
  /** Minimum particle lifetime in milliseconds */
  lifetimeMin: number;
  /** Maximum particle lifetime in milliseconds */
  lifetimeMax: number;
  /** Particle movement speed */
  speed: number;
}

/**
 * String visual effect configuration
 */
export interface StringConfig {
  /** Whether string effects are enabled */
  isEnabled: boolean;
  /** Number of strings to render */
  count: number;
  /** Base opacity when inactive */
  baseOpacity: number;
  /** Opacity when active */
  activeOpacity: number;
  /** Maximum vibration amplitude */
  maxAmplitude: number;
  /** Damping factor for vibration decay */
  dampingFactor: number;
  /** Speed of amplitude interpolation */
  interpolationSpeed: number;
  /** Speed of opacity interpolation */
  opacityInterpolationSpeed: number;
}

/**
 * Font oscillation configuration for different sizes
 */
export interface FontOscillationConfig {
  /** Whether font oscillation is enabled */
  isEnabled: boolean;
  /** Small text oscillation settings */
  sm: { amplitude: number; baseWeight: number };
  /** Medium text oscillation settings */
  md: { amplitude: number; baseWeight: number };
  /** Large text oscillation settings */
  lg: { amplitude: number; baseWeight: number };
  /** Full range oscillation settings */
  full: { amplitude: number; baseWeight: number };
}

/**
 * Animation timing and performance configuration
 */
export interface AnimationConfig {
  /** Divisor for converting audio frequency to visual frequency */
  visualFrequencyDivisor: number;
  /** Target frame rate for animations */
  frameRate: number;
  /** Smoothing factor for animations (0-1) */
  smoothingFactor: number;
}

/**
 * Frequency mapping configuration for visual effects
 */
export interface FrequencyMappingConfig {
  /** Minimum frequency in Hz */
  minFreq: number;
  /** Maximum frequency in Hz */
  maxFreq: number;
  /** Minimum mapped value */
  minValue: number;
  /** Maximum mapped value */
  maxValue: number;
}

/**
 * Main visual effects configuration interface
 */
export interface VisualEffectsConfig {
  /** Blob effect configuration */
  blobs: BlobConfig;
  /** Ambient lighting configuration */
  ambient: AmbientConfig;
  /** Particle system configuration */
  particles: ParticleConfig;
  /** String effect configuration */
  strings: StringConfig;
  /** Font oscillation configuration */
  fontOscillation: FontOscillationConfig;
  /** Animation configuration */
  animation: AnimationConfig;
  /** Frequency mapping configuration */
  frequencyMapping: FrequencyMappingConfig;
}
