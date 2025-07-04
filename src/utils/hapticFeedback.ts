/**
 * Haptic Feedback Utility
 * Provides cross-platform haptic feedback for touch interactions
 */

export type HapticIntensity =
  | "lighter"
  | "light"
  | "medium"
  | "heavy"
  | "string";

interface HapticFeedback {
  impact(intensity: HapticIntensity): void;
}

interface WindowWithHaptics extends Window {
  hapticFeedback?: HapticFeedback;
}

/**
 * Triggers haptic feedback on supported devices
 * @param intensity - The intensity of the haptic feedback
 */
export const triggerHapticFeedback = (
  intensity: HapticIntensity = "lighter"
): void => {
  // Check if the device supports basic vibration
  if ("vibrate" in navigator) {
    // Different vibration patterns for different intensities
    const patterns: Record<HapticIntensity, number[]> = {
      lighter: [10],
      light: [50],
      medium: [70],
      heavy: [100],
      string: [20, 10, 20, 10],
    };
    navigator.vibrate(patterns[intensity]);
  }

  // For devices with more advanced haptic feedback (iOS Safari with Haptic Engine)
  const win = window as WindowWithHaptics;
  if (win.hapticFeedback) {
    try {
      win.hapticFeedback.impact(intensity);
    } catch (e) {
      // Fallback to vibration if haptic feedback fails
      console.debug(
        "Advanced haptic feedback not available, using vibration fallback"
      );
    }
  }
};

/**
 * Triggers haptic feedback for note interactions
 */
export const triggerNoteHaptic = (): void => {
  triggerHapticFeedback("light");
};

/**
 * Triggers haptic feedback for control interactions (octave changes, etc.)
 */
export const triggerControlHaptic = (): void => {
  triggerHapticFeedback("medium");
};

/**
 * Triggers haptic feedback for UI interactions (resize, etc.)
 */
export const triggerUIHaptic = (): void => {
  triggerHapticFeedback("lighter");
};
