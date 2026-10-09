// Utility functions for frequency-based visual effects

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
