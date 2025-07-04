import { ref, computed } from "vue";

export interface TooltipOptions {
  content: string;
  track?: boolean;
  longPressDuration?: number; // Duration for long press (default 300ms)
  showOnDrag?: boolean; // Show immediately on drag vs long press
  offset?: { x: number; y: number };
  className?: string;
}

export interface TooltipState {
  isVisible: boolean;
  content: string;
  position: { x: number; y: number };
  touchPosition: { x: number; y: number };
  targetRect: DOMRect | null;
  relativePosition: { x: number; y: number }; // Position relative to element center
  isDragMode: boolean; // Whether tooltip should follow finger directly
  previousPosition: { x: number; y: number }; // For calculating movement direction
  velocity: { x: number; y: number }; // Movement velocity for lag effect
  inertiaOffset: { x: number; y: number }; // Overshoot offset for inertia effect
  targetTouchPosition: { x: number; y: number }; // Where tooltip wants to be
}

export function useTooltip() {
  const tooltipState = ref<TooltipState>({
    isVisible: false,
    content: "",
    position: { x: 0, y: 0 },
    touchPosition: { x: 0, y: 0 },
    targetRect: null,
    relativePosition: { x: 0, y: 0 },
    isDragMode: false,
    previousPosition: { x: 0, y: 0 },
    velocity: { x: 0, y: 0 },
    inertiaOffset: { x: 0, y: 0 },
    targetTouchPosition: { x: 0, y: 0 },
  });

  let longPressTimeout: number | null = null;

  // Calculate rotation based on movement velocity and mode
  const rotation = computed<number>(() => {
    const { relativePosition, isDragMode, velocity } = tooltipState.value;

    if (isDragMode) {
      // In drag mode, rotate based on velocity direction (both X and Y)
      const horizontalRotation = velocity.x * -0.6; // Horizontal movement
      const verticalInfluence = velocity.y * -0.2; // Vertical adds subtle tilt
      const totalRotation = horizontalRotation + verticalInfluence;
      return Math.max(-25, Math.min(25, totalRotation)); // Clamp rotation
    } else {
      // In press mode, rotate based on relative position
      return (relativePosition.x / 100) * 30;
    }
  });

  // Calculate translation based on relative touch position (only for press mode)
  const translation = computed<number>(() => {
    const { relativePosition, isDragMode } = tooltipState.value;
    if (isDragMode) return 0; // No translation in drag mode
    return (relativePosition.x / 100) * 25; // Reduced translation
  });

  const showTooltip = (
    element: HTMLElement,
    content: string,
    touchEvent?: TouchEvent,
    options: Partial<TooltipOptions> = {}
  ) => {
    const rect = element.getBoundingClientRect();

    // Get touch position or use element center
    let touchX = rect.left + rect.width / 2;
    let touchY = rect.top + rect.height / 2;

    if (touchEvent && touchEvent.touches.length > 0) {
      touchX = touchEvent.touches[0].clientX;
      touchY = touchEvent.touches[0].clientY;
    }

    // Calculate relative position from element center
    const relativeX = touchX - rect.left - rect.width / 2;
    const relativeY = touchY - rect.top - rect.height / 2;

    const isDragMode = options.showOnDrag || false;

    tooltipState.value = {
      isVisible: true,
      content,
      position: isDragMode
        ? { x: touchX, y: touchY - 60 } // Center on finger for drag mode
        : { x: rect.left + rect.width / 2, y: rect.top - 16 }, // Above element for press mode
      touchPosition: { x: touchX, y: touchY },
      targetRect: rect,
      relativePosition: { x: relativeX, y: relativeY },
      isDragMode,
      previousPosition: { x: touchX, y: touchY },
      velocity: { x: 0, y: 0 },
      inertiaOffset: { x: 0, y: 0 },
      targetTouchPosition: { x: touchX, y: touchY },
    };
  };

  const hideTooltip = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      longPressTimeout = null;
    }
    tooltipState.value.isVisible = false;
    // Reset physics when hiding
    tooltipState.value.velocity = { x: 0, y: 0 };
    tooltipState.value.inertiaOffset = { x: 0, y: 0 };
  };

  const updateTouchPosition = (touchEvent: TouchEvent) => {
    if (!touchEvent.touches.length || !tooltipState.value.targetRect) return;

    const touch = touchEvent.touches[0];
    const rect = tooltipState.value.targetRect;
    const currentState = tooltipState.value;

    // Calculate velocity based on position change
    const deltaX = touch.clientX - currentState.previousPosition.x;
    const deltaY = touch.clientY - currentState.previousPosition.y;

    // Heavy air resistance - more dramatic lagging effect
    const dampingFactor = 0.85; // Higher damping = more air resistance
    const newVelocityX =
      currentState.velocity.x * dampingFactor + deltaX * (1 - dampingFactor);
    const newVelocityY =
      currentState.velocity.y * dampingFactor + deltaY * (1 - dampingFactor);

    // Update touch position
    tooltipState.value.touchPosition = {
      x: touch.clientX,
      y: touch.clientY,
    };

    // Update velocity
    tooltipState.value.velocity = {
      x: newVelocityX,
      y: newVelocityY,
    };

    // Update previous position for next calculation
    tooltipState.value.previousPosition = {
      x: touch.clientX,
      y: touch.clientY,
    };

    // Update relative position from element center
    const relativeX = touch.clientX - rect.left - rect.width / 2;
    const relativeY = touch.clientY - rect.top - rect.height / 2;

    tooltipState.value.relativePosition = { x: relativeX, y: relativeY };

    // Update target position
    tooltipState.value.targetTouchPosition = {
      x: touch.clientX,
      y: touch.clientY,
    };

    // Update inertia offset based on velocity (overshoot effect)
    const inertiaStrength = 0.3; // How much overshoot
    tooltipState.value.inertiaOffset = {
      x: newVelocityX * inertiaStrength,
      y: newVelocityY * inertiaStrength,
    };

    // Update tooltip position based on mode
    if (tooltipState.value.isDragMode) {
      // In drag mode, tooltip follows finger with inertia overshoot
      tooltipState.value.position = {
        x: touch.clientX + tooltipState.value.inertiaOffset.x,
        y: touch.clientY - 60 + tooltipState.value.inertiaOffset.y, // Stay above finger + overshoot
      };
    } else {
      // In press mode, tooltip stays above element but rotates/translates
      tooltipState.value.position = {
        x: rect.left + rect.width / 2,
        y: rect.top - 16,
      };
    }
  };

  const startLongPress = (
    element: HTMLElement,
    content: string,
    touchEvent: TouchEvent,
    options: Partial<TooltipOptions> = {}
  ) => {
    const duration = options.longPressDuration || 300;

    longPressTimeout = window.setTimeout(() => {
      showTooltip(element, content, touchEvent, options);
    }, duration);
  };

  const cancelLongPress = () => {
    if (longPressTimeout) {
      clearTimeout(longPressTimeout);
      longPressTimeout = null;
    }
  };

  return {
    tooltipState,
    rotation,
    translation,
    showTooltip,
    hideTooltip,
    updateTouchPosition,
    startLongPress,
    cancelLongPress,
  };
}
