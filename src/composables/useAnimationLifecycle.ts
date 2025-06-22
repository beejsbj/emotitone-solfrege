// Composable for managing animation lifecycle (start/stop/cleanup)
import { ref, onUnmounted } from 'vue';
import type { AnimationLifecycleOptions } from './types';

/**
 * Composable for managing animation lifecycle with requestAnimationFrame
 * @param options - Configuration options for the animation lifecycle
 * @returns Object with animation control methods and state
 */
export function useAnimationLifecycle(options: AnimationLifecycleOptions = {}) {
  const {
    onStart,
    onStop,
    onFrame,
    autoCleanup = true
  } = options;

  // Animation state
  const isAnimating = ref(false);
  const animationId = ref<number | null>(null);
  const startTime = ref<number>(0);

  /**
   * Starts the animation loop
   */
  const startAnimation = () => {
    if (isAnimating.value) {
      return; // Already animating
    }

    isAnimating.value = true;
    startTime.value = 0;
    
    // Call onStart callback
    onStart?.();

    const animate = (timestamp: number) => {
      if (!startTime.value) {
        startTime.value = timestamp;
      }
      
      const elapsed = (timestamp - startTime.value) / 1000;

      // Call the frame callback
      onFrame?.(timestamp, elapsed);

      // Continue animation if still active
      if (isAnimating.value) {
        animationId.value = requestAnimationFrame(animate);
      }
    };

    animationId.value = requestAnimationFrame(animate);
  };

  /**
   * Stops the animation loop
   */
  const stopAnimation = () => {
    if (!isAnimating.value) {
      return; // Not animating
    }

    isAnimating.value = false;
    
    if (animationId.value !== null) {
      cancelAnimationFrame(animationId.value);
      animationId.value = null;
    }

    startTime.value = 0;
    
    // Call onStop callback
    onStop?.();
  };

  /**
   * Toggles animation state
   */
  const toggleAnimation = () => {
    if (isAnimating.value) {
      stopAnimation();
    } else {
      startAnimation();
    }
  };

  /**
   * Cleanup function to stop animation and clear resources
   */
  const cleanup = () => {
    stopAnimation();
  };

  // Auto cleanup on component unmount if enabled
  if (autoCleanup) {
    onUnmounted(cleanup);
  }

  return {
    // State
    isAnimating: readonly(isAnimating),
    
    // Methods
    startAnimation,
    stopAnimation,
    toggleAnimation,
    cleanup
  };
}

// Re-export readonly from Vue for convenience
import { readonly } from 'vue';
