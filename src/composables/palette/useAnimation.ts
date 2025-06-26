/**
 * Palette Animation System
 * Handles smooth transitions and animations for the canvas palette
 */

import { ref } from "vue";
import type { AnimationState } from "@/types";
import { PALETTE_STYLES } from "./index";

export function usePaletteAnimation() {
  // Animation state for smooth transitions
  const animationState = ref<AnimationState>({
    octaveOffset: 0, // Current animated offset
    targetOctaveOffset: 0, // Target offset for animation
    isAnimating: false,
    animationStartTime: 0,
    pressedButtons: new Set<string>(), // Track pressed buttons for visual feedback
    buttonAnimations: new Map<
      string,
      {
        scale: number;
        targetScale: number;
        isAnimating: boolean;
        startTime: number;
        isPressed: boolean;
      }
    >(), // Track individual button animations
  });

  /**
   * Animate octave transition smoothly
   */
  const animateOctaveTransition = (
    targetOffset: number,
    currentOffset?: number
  ) => {
    // Get current offset (either animated, provided, or use current target)
    const startOffset = animationState.value.isAnimating
      ? animationState.value.octaveOffset
      : currentOffset !== undefined
      ? currentOffset
      : animationState.value.targetOctaveOffset || targetOffset;

    // Only animate if there's a meaningful difference
    if (Math.abs(startOffset - targetOffset) < 1) {
      animationState.value.octaveOffset = targetOffset;
      animationState.value.targetOctaveOffset = targetOffset;
      animationState.value.isAnimating = false;
      return;
    }

    animationState.value.targetOctaveOffset = targetOffset;
    animationState.value.octaveOffset = startOffset;
    animationState.value.isAnimating = true;
    animationState.value.animationStartTime = performance.now();

    console.log("Starting octave animation:", {
      from: startOffset,
      to: targetOffset,
      difference: targetOffset - startOffset,
    });
  };

  /**
   * Start button press animation
   */
  const startButtonPressAnimation = (buttonKey: string) => {
    let animation = animationState.value.buttonAnimations.get(buttonKey);
    if (!animation) {
      animation = {
        scale: 1.0,
        targetScale: 1.0,
        isAnimating: false,
        startTime: 0,
        isPressed: false,
      };
      animationState.value.buttonAnimations.set(buttonKey, animation);
    }

    // Start press animation
    animation.targetScale = 1 - PALETTE_STYLES.animations.buttonPress.scaleDown;
    animation.isAnimating = true;
    animation.startTime = performance.now();
    animation.isPressed = true;
  };

  /**
   * Start button release animation
   */
  const startButtonReleaseAnimation = (buttonKey: string) => {
    const animation = animationState.value.buttonAnimations.get(buttonKey);
    if (animation) {
      // Start release animation
      animation.targetScale = 1.0;
      animation.isAnimating = true;
      animation.startTime = performance.now();
      animation.isPressed = false;
    }
  };

  /**
   * Update animation frame
   */
  const updateAnimation = (currentTime: number) => {
    let hasActiveAnimations = false;

    // Update octave transition animation
    if (animationState.value.isAnimating) {
      const elapsed = currentTime - animationState.value.animationStartTime;
      const duration = PALETTE_STYLES.animations.octaveTransition.duration;
      const progress = Math.min(elapsed / duration, 1);

      // Ease-out animation
      const easeProgress = 1 - Math.pow(1 - progress, 3);

      const startOffset = animationState.value.octaveOffset;
      const targetOffset = animationState.value.targetOctaveOffset;

      animationState.value.octaveOffset =
        startOffset + (targetOffset - startOffset) * easeProgress;

      if (progress >= 1) {
        animationState.value.isAnimating = false;
        animationState.value.octaveOffset = targetOffset;
      } else {
        hasActiveAnimations = true;
      }
    }

    // Update button animations
    for (const [buttonKey, animation] of animationState.value
      .buttonAnimations) {
      if (animation.isAnimating) {
        const elapsed = currentTime - animation.startTime;
        const duration = animation.isPressed
          ? PALETTE_STYLES.animations.buttonPress.pressDuration
          : PALETTE_STYLES.animations.buttonPress.releaseDuration;
        const progress = Math.min(elapsed / duration, 1);

        // Use improved easing functions
        let easeProgress;
        if (animation.isPressed) {
          // Back easing with overshoot for press (cubic-bezier(0.68, -0.55, 0.265, 1.55))
          const c1 = 1.70158;
          const c3 = c1 + 1;
          easeProgress =
            c3 * progress * progress * progress - c1 * progress * progress;
        } else {
          // Smooth elastic release (cubic-bezier(0.23, 1, 0.32, 1))
          easeProgress =
            progress === 0
              ? 0
              : progress === 1
              ? 1
              : progress < 0.5
              ? Math.pow(2, 20 * progress - 10) / 2
              : (2 - Math.pow(2, -20 * progress + 10)) / 2;
        }

        const startScale = animation.scale;
        const targetScale = animation.targetScale;
        animation.scale =
          startScale + (targetScale - startScale) * easeProgress;

        if (progress >= 1) {
          animation.isAnimating = false;
          animation.scale = targetScale;

          // Clean up completed release animations to prevent stuck state
          if (!animation.isPressed && animation.targetScale === 1.0) {
            // Remove from pressed buttons set if it's a release animation
            animationState.value.pressedButtons.delete(buttonKey);
          }
        } else {
          hasActiveAnimations = true;
        }
      }
    }

    return hasActiveAnimations;
  };

  return {
    // State
    animationState,

    // Animation functions
    animateOctaveTransition,
    updateAnimation,
    startButtonPressAnimation,
    startButtonReleaseAnimation,
  };
}
