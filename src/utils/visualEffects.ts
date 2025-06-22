// Utility functions for frequency-based visual effects
import type { FrequencyMapping } from '@/composables/types';

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
 * Creates a default frequency mapping for font weights
 * @returns FrequencyMapping configuration for font weights
 */
export function createFontWeightMapping(): FrequencyMapping {
  return {
    minFreq: 200,
    maxFreq: 600,
    minValue: 400,
    maxValue: 700
  };
}

/**
 * Creates a default frequency mapping for visual oscillation frequency
 * @param divisor - How much to divide the audio frequency for visual frequency
 * @returns The visual frequency
 */
export function createVisualFrequency(audioFrequency: number, divisor: number = 100): number {
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

/**
 * Extracts a base color from a CSS gradient string
 * @param gradient - CSS gradient string
 * @returns A hex color or fallback color
 */
export function extractColorFromGradient(gradient: string): string {
  // Try to extract the first hex color from the gradient
  const hexMatch = gradient.match(/#[0-9a-fA-F]{6}/);
  if (hexMatch) {
    return hexMatch[0];
  }
  
  // Try to extract rgb color
  const rgbMatch = gradient.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgb(${r}, ${g}, ${b})`;
  }
  
  // Fallback color
  return '#ffffff';
}

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
  const vibration1 = Math.sin(
    elapsed * baseFrequency * 2 * Math.PI + phase + position * 0.005
  ) * amplitude;

  // Second harmonic (more subtle)
  const vibration2 = Math.sin(
    elapsed * baseFrequency * 4 * Math.PI + phase * 1.2 + position * 0.008
  ) * amplitude * 0.15;

  // Third harmonic (very subtle)
  const vibration3 = Math.sin(
    elapsed * baseFrequency * 6 * Math.PI + phase * 1.8 + position * 0.012
  ) * amplitude * 0.05;

  return vibration1 + vibration2 + vibration3;
}
