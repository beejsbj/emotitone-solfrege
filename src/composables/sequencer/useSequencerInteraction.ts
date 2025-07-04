import { ref, computed } from "vue";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import type { SequencerBeat } from "@/types/music";

/**
 * Shared sequencer interaction logic
 * Handles touch/mouse events, drag detection, and double-tap deletion
 */
export function useSequencerInteraction() {
  // Interaction state
  const isDragging = ref(false);
  const selectedIndicator = ref<any>(null);
  const lastTapTime = ref<number>(0);

  const dragStart = ref({
    x: 0,
    y: 0,
    startAngle: 0,
    endAngle: 0,
    time: 0,
    moved: false,
  });

  // Configuration
  const interactionConfig = {
    doubleTapThreshold: 300, // Max time between taps for double-tap delete (ms)
    movementThreshold: 10, // Min pixel movement to register as drag (px)
    horizontalSensitivity: 0.8, // Horizontal drag responsiveness
    durationSensitivity: 0.02, // Vertical drag responsiveness for duration
  };

  /**
   * Detect double-tap for deletion
   */
  const isDoubleTap = (): boolean => {
    const now = Date.now();
    const isDouble =
      lastTapTime.value > 0 &&
      now - lastTapTime.value < interactionConfig.doubleTapThreshold;
    lastTapTime.value = now;
    return isDouble;
  };

  /**
   * Get client coordinates from mouse or touch event
   */
  const getClientCoords = (e: MouseEvent | TouchEvent) => {
    return {
      clientX: "touches" in e ? e.touches[0].clientX : e.clientX,
      clientY: "touches" in e ? e.touches[0].clientY : e.clientY,
    };
  };

  /**
   * Start drag interaction
   */
  const startDrag = (
    e: MouseEvent | TouchEvent,
    indicator: any,
    onDelete?: (id: string) => void
  ) => {
    e.preventDefault();
    e.stopPropagation();

    // Select indicator immediately
    selectedIndicator.value = indicator;

    // Check for double tap to delete
    if (isDoubleTap() && onDelete) {
      onDelete(indicator.id);
      return;
    }

    isDragging.value = true;
    const { clientX, clientY } = getClientCoords(e);

    dragStart.value = {
      x: clientX,
      y: clientY,
      startAngle: indicator.startAngle || 0,
      endAngle: indicator.endAngle || 0,
      time: Date.now(),
      moved: false,
    };

    // Add global event listeners
    if ("touches" in e) {
      document.addEventListener("touchmove", handleMove, { passive: false });
      document.addEventListener("touchend", handleEnd);
    } else {
      document.addEventListener("mousemove", handleMove);
      document.addEventListener("mouseup", handleEnd);
    }

    triggerUIHaptic();
  };

  /**
   * Handle drag movement
   */
  const handleMove = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value || !selectedIndicator.value) return;

    e.preventDefault();
    e.stopPropagation();

    const { clientX, clientY } = getClientCoords(e);
    const deltaX = clientX - dragStart.value.x;
    const deltaY = clientY - dragStart.value.y;

    // Mark as moved if significant movement
    if (
      Math.abs(deltaX) > interactionConfig.movementThreshold ||
      Math.abs(deltaY) > interactionConfig.movementThreshold
    ) {
      dragStart.value.moved = true;
    }

    // Return delta values for component-specific handling
    return {
      deltaX,
      deltaY,
      moved: dragStart.value.moved,
      horizontalSensitivity: interactionConfig.horizontalSensitivity,
      durationSensitivity: interactionConfig.durationSensitivity,
    };
  };

  /**
   * End drag interaction
   */
  const handleEnd = (e: MouseEvent | TouchEvent) => {
    if (!isDragging.value) return;

    e.preventDefault();
    e.stopPropagation();

    isDragging.value = false;

    // Remove global event listeners
    if ("touches" in e) {
      document.removeEventListener("touchmove", handleMove);
      document.removeEventListener("touchend", handleEnd);
    } else {
      document.removeEventListener("mousemove", handleMove);
      document.removeEventListener("mouseup", handleEnd);
    }
  };

  /**
   * Cleanup function for components
   */
  const cleanup = () => {
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleEnd);
    document.removeEventListener("touchmove", handleMove);
    document.removeEventListener("touchend", handleEnd);
  };

  /**
   * Long press detection for mobile
   */
  const longPressTimer = ref<ReturnType<typeof setTimeout> | null>(null);

  const startLongPress = (callback: () => void, delay = 500) => {
    longPressTimer.value = setTimeout(() => {
      callback();
      triggerUIHaptic();
    }, delay);
  };

  const cancelLongPress = () => {
    if (longPressTimer.value) {
      clearTimeout(longPressTimer.value);
      longPressTimer.value = null;
    }
  };

  return {
    // State
    isDragging: computed(() => isDragging.value),
    selectedIndicator: computed(() => selectedIndicator.value),
    dragStart: computed(() => dragStart.value),

    // Methods
    startDrag,
    handleMove,
    handleEnd,
    cleanup,
    isDoubleTap,
    getClientCoords,
    startLongPress,
    cancelLongPress,

    // Setters
    setSelectedIndicator: (indicator: any) => {
      selectedIndicator.value = indicator;
    },
    clearSelection: () => {
      selectedIndicator.value = null;
    },

    // Config
    interactionConfig,
  };
}
