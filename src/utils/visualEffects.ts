// Utility functions for frequency-based visual effects
import type { FrequencyMapping } from "@/types/audio";
import type { VisualEffectsConfig } from "@/types/config";
// Color extraction is now handled by unified color system

/**
 * Maps a frequency to a visual value using linear interpolation
 * @param frequency - The input frequency in Hz
 * @param mapping - The frequency mapping configuration
 * @returns The mapped visual value
 */
export function mapFrequencyToValue(
  frequency: number,
  mapping: FrequencyMapping
): number {
  const { minFreq, maxFreq, minValue, maxValue } = mapping;

  // Clamp frequency to the specified range
  const clampedFreq = Math.max(minFreq, Math.min(maxFreq, frequency));

  // Normalize frequency to 0-1 range
  const normalizedFreq = (clampedFreq - minFreq) / (maxFreq - minFreq);

  // Map to output range
  return Math.round(minValue + normalizedFreq * (maxValue - minValue));
}

/**
 * Creates a frequency mapping from config
 * @param config - Visual effects configuration
 * @returns FrequencyMapping configuration for font weights
 */
export function createFontWeightMapping(
  config?: VisualEffectsConfig
): FrequencyMapping {
  if (config) {
    return config.frequencyMapping;
  }

  // Fallback to default values
  return {
    minFreq: 200,
    maxFreq: 600,
    minValue: 400,
    maxValue: 700,
  };
}

/**
 * Creates a default frequency mapping for visual oscillation frequency
 * @param divisor - How much to divide the audio frequency for visual frequency
 * @returns The visual frequency
 */
export function createVisualFrequency(
  audioFrequency: number,
  divisor: number = 100
): number {
  return audioFrequency / divisor;
}

/**
 * Clamps a value between min and max bounds
 * @param value - The value to clamp
 * @param min - Minimum allowed value
 * @param max - Maximum allowed value
 * @returns The clamped value
 */
export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/**
 * Creates an oscillating value using sine wave
 * @param elapsed - Elapsed time in seconds
 * @param frequency - Oscillation frequency
 * @param amplitude - Oscillation amplitude
 * @param baseValue - Base value to oscillate around
 * @param phase - Phase offset (default: 0)
 * @returns The oscillating value
 */
export function createOscillation(
  elapsed: number,
  frequency: number,
  amplitude: number,
  baseValue: number,
  phase: number = 0
): number {
  const oscillation = Math.sin(elapsed * frequency * 2 * Math.PI + phase);
  return baseValue + oscillation * amplitude;
}

// Color extraction is now handled by ColorService

/**
 * Creates damping effect for string-like animations
 * @param normalizedPosition - Position along the string (0-1)
 * @returns Damping factor (0-1)
 */
export function createStringDamping(normalizedPosition: number): number {
  return Math.sin(normalizedPosition * Math.PI);
}

/**
 * Creates multiple harmonic vibrations for realistic string effect
 * @param elapsed - Elapsed time in seconds
 * @param baseFrequency - Base vibration frequency
 * @param amplitude - Base amplitude
 * @param position - Position along the string
 * @param phase - Phase offset
 * @returns Combined vibration value
 */
export function createHarmonicVibration(
  elapsed: number,
  baseFrequency: number,
  amplitude: number,
  position: number,
  phase: number = 0
): number {
  // Primary vibration
  const vibration1 =
    Math.sin(elapsed * baseFrequency * 2 * Math.PI + phase + position * 0.005) *
    amplitude;

  // Second harmonic (more subtle)
  const vibration2 =
    Math.sin(
      elapsed * baseFrequency * 4 * Math.PI + phase * 1.2 + position * 0.008
    ) *
    amplitude *
    0.15;

  // Third harmonic (very subtle)
  const vibration3 =
    Math.sin(
      elapsed * baseFrequency * 6 * Math.PI + phase * 1.8 + position * 0.012
    ) *
    amplitude *
    0.05;

  return vibration1 + vibration2 + vibration3;
}

/**
 * Creates a blob size based on screen dimensions and config
 * @param screenWidth - Screen width in pixels
 * @param screenHeight - Screen height in pixels
 * @param config - Visual effects configuration
 * @returns Calculated blob size
 */
export function calculateBlobSize(
  screenWidth: number,
  screenHeight: number,
  config: VisualEffectsConfig
): number {
  const screenBasedSize =
    Math.min(screenWidth, screenHeight) * config.blobs.baseSizeRatio;
  return Math.max(
    config.blobs.minSize,
    Math.min(config.blobs.maxSize, screenBasedSize)
  );
}

/**
 * Creates particle properties based on config
 * @param config - Visual effects configuration
 * @returns Particle configuration object
 */
export function createParticleProperties(config: VisualEffectsConfig) {
  return {
    size:
      config.particles.sizeMin +
      Math.random() * (config.particles.sizeMax - config.particles.sizeMin),
    lifetime:
      config.particles.lifetimeMin +
      Math.random() *
        (config.particles.lifetimeMax - config.particles.lifetimeMin),
    velocity: {
      x: (Math.random() - 0.5) * config.particles.speed,
      y: (Math.random() - 0.5) * config.particles.speed,
    },
  };
}

// Ambient colors are now handled directly in the canvas rendering
