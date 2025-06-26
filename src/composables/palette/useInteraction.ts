/**
 * Palette Interaction System
 * Handles user interactions with the canvas palette
 */

import { type Ref } from "vue";
import { useSolfegeInteraction } from "@/composables/useSolfegeInteraction";
import {
  triggerNoteHaptic,
  triggerControlHaptic,
  triggerUIHaptic,
} from "@/utils/hapticFeedback";
import { PALETTE_STYLES } from "./index";
import type {
  PaletteState,
  ButtonLayout,
  ControlLayout,
  AnimationState,
} from "@/types";

export function usePaletteInteraction(
  paletteState: Ref<PaletteState>,
  animationState: Ref<AnimationState>,
  calculateButtonLayouts: () => ButtonLayout[],
  calculateControlLayouts: () => ControlLayout,
  calculateOctaveOffset: () => number,
  animateOctaveTransition: (
    targetOffset: number,
    currentOffset?: number
  ) => void,
  startButtonPressAnimation: (buttonKey: string) => void,
  startButtonReleaseAnimation: (buttonKey: string) => void,
  visibleSolfegeData: Ref<any[]>,
  snapHeightToRows: (height: number) => number
) {
  const { attackNoteWithOctave, releaseActiveNote } = useSolfegeInteraction();

  /**
   * Hit test for buttons
   */
  const hitTestButton = (x: number, y: number): ButtonLayout | null => {
    const buttonLayouts = calculateButtonLayouts();

    for (const layout of buttonLayouts) {
      if (
        layout.isVisible &&
        x >= layout.x &&
        x <= layout.x + layout.width &&
        y >= layout.y &&
        y <= layout.y + layout.height
      ) {
        return layout;
      }
    }

    return null;
  };

  /**
   * Hit test for controls
   */
  const hitTestControl = (x: number, y: number): keyof ControlLayout | null => {
    const controls = calculateControlLayouts();

    for (const [controlName, layout] of Object.entries(controls)) {
      if (
        x >= layout.x &&
        x <= layout.x + layout.width &&
        y >= layout.y &&
        y <= layout.y + layout.height
      ) {
        return controlName as keyof ControlLayout;
      }
    }

    return null;
  };

  /**
   * Handle button press with visual feedback
   */
  const handleButtonPress = (layout: ButtonLayout, event?: Event) => {
    const solfege = visibleSolfegeData.value[layout.solfegeIndex];
    const buttonKey = `${solfege.name}-${layout.octave}`;
    console.log(`Button pressed: ${solfege.name} (Octave ${layout.octave})`); // Add this line

    // Add to pressed buttons for visual feedback
    animationState.value.pressedButtons.add(buttonKey);

    // Start smooth press animation
    startButtonPressAnimation(buttonKey);

    triggerNoteHaptic();
    attackNoteWithOctave(layout.solfegeIndex, layout.octave, event);
  };

  /**
   * Handle button release
   */
  const handleButtonRelease = (event?: Event) => {
    // Start release animations for all pressed buttons
    for (const buttonKey of animationState.value.pressedButtons) {
      startButtonReleaseAnimation(buttonKey);
    }

    // Clear all pressed buttons immediately to prevent stuck state
    animationState.value.pressedButtons.clear();

    // Force release any stuck button animations
    for (const [buttonKey, animation] of animationState.value
      .buttonAnimations) {
      if (
        animation.isPressed &&
        !animationState.value.pressedButtons.has(buttonKey)
      ) {
        startButtonReleaseAnimation(buttonKey);
      }
    }

    triggerNoteHaptic();
    releaseActiveNote(event);
  };

  /**
   * Handle keyboard press (for external keyboard controls)
   */
  const handleKeyboardPress = (solfegeIndex: number, octave: number) => {
    const solfege = visibleSolfegeData.value[solfegeIndex];
    if (!solfege) return;

    const buttonKey = `${solfege.name}-${octave}`;
    animationState.value.pressedButtons.add(buttonKey);

    // Start smooth press animation
    startButtonPressAnimation(buttonKey);
  };

  /**
   * Handle keyboard release (for external keyboard controls)
   */
  const handleKeyboardRelease = () => {
    // Start release animations for all pressed buttons
    for (const buttonKey of animationState.value.pressedButtons) {
      startButtonReleaseAnimation(buttonKey);
    }

    animationState.value.pressedButtons.clear();
  };

  /**
   * Handle control interactions with smooth animations
   */
  const handleControlPress = (
    controlName: keyof ControlLayout,
    _event?: Event
  ) => {
    const state = paletteState.value;

    switch (controlName) {
      case "leftFlick":
        // Decrease main octave with animation
        if (state.mainOctave > 2) {
          // Get current offset before changing octave
          const currentOffset = calculateOctaveOffset();

          // Change to target octave
          const targetOctave = state.mainOctave - 1;
          state.mainOctave = targetOctave;

          // Calculate the new offset and animate from current to new
          const newOffset = calculateOctaveOffset();
          animateOctaveTransition(newOffset, currentOffset);
          triggerControlHaptic();
        }
        break;

      case "rightFlick":
        // Increase main octave with animation
        if (state.mainOctave < 6) {
          // Get current offset before changing octave
          const currentOffset = calculateOctaveOffset();

          // Change to target octave
          const targetOctave = state.mainOctave + 1;
          state.mainOctave = targetOctave;

          // Calculate the new offset and animate from current to new
          const newOffset = calculateOctaveOffset();
          animateOctaveTransition(newOffset, currentOffset);
          triggerControlHaptic();
        }
        break;

      case "solfegeToggle":
        // Toggle last solfege note
        state.showLastSolfege = !state.showLastSolfege;
        triggerUIHaptic();
        break;

      case "dragHandle":
        // Start dragging (for future implementation)
        state.isDragging = true;
        triggerUIHaptic();
        break;

      case "resizeHandle":
        // Start resizing with proper initialization
        state.isResizing = true;
        state.resizeStartHeight = state.height;
        state.dragStartY = paletteState.value.dragStartY; // Ensure we have the start position
        triggerUIHaptic();
        console.log("Resize started:", {
          startHeight: state.height,
          startY: state.dragStartY,
        });
        break;
    }
  };

  /**
   * Handle resize dragging with correct logic and snapping
   */
  const handleResizeDrag = (deltaY: number) => {
    if (!paletteState.value.isResizing) return;

    // Calculate new height - dragging up (negative deltaY) increases height
    // Drag up = negative deltaY = should increase height = subtract negative = add
    // Drag down = positive deltaY = should decrease height = subtract positive = subtract
    const rawHeight = Math.max(
      PALETTE_STYLES.dimensions.minHeight,
      Math.min(
        PALETTE_STYLES.dimensions.maxHeight,
        paletteState.value.resizeStartHeight - deltaY
      )
    );

    // Apply the new height immediately for smooth feedback
    paletteState.value.height = rawHeight;
  };

  /**
   * Handle resize end with snapping to discrete row counts
   */
  const handleResizeEnd = () => {
    if (!paletteState.value.isResizing) return;

    // Snap to the nearest row count for better UX
    const snappedHeight = snapHeightToRows(paletteState.value.height);
    paletteState.value.height = snappedHeight;

    // Reset resize state
    paletteState.value.isResizing = false;
  };

  /**
   * Handle mouse/touch events
   */
  const handlePointerDown = (x: number, y: number, event?: Event) => {
    // Check control hit FIRST (controls have higher priority/z-index)
    const controlHit = hitTestControl(x, y);
    if (controlHit) {
      // Store initial position for dragging/resizing
      paletteState.value.dragStartY = y;
      handleControlPress(controlHit, event);
      return true;
    }

    // Check button hit only if no control was hit
    const buttonHit = hitTestButton(x, y);
    if (buttonHit) {
      handleButtonPress(buttonHit, event);
      return true;
    }

    return false;
  };

  const handlePointerUp = (_x: number, _y: number, event?: Event) => {
    // Handle resize end with snapping before releasing
    if (paletteState.value.isResizing) {
      handleResizeEnd();
    }

    // Always release active notes on pointer up
    handleButtonRelease(event);

    // Reset interaction states
    paletteState.value.isDragging = false;
    paletteState.value.isResizing = false;

    // Force cleanup any stuck button states after a short delay
    setTimeout(() => {
      for (const [buttonKey, animation] of animationState.value
        .buttonAnimations) {
        if (animation.isPressed) {
          startButtonReleaseAnimation(buttonKey);
        }
      }
      animationState.value.pressedButtons.clear();
    }, 50);
  };

  return {
    // Interaction functions
    hitTestButton,
    hitTestControl,
    handleButtonPress,
    handleButtonRelease,
    handleKeyboardPress,
    handleKeyboardRelease,
    handleControlPress,
    handlePointerDown,
    handlePointerUp,
    handleResizeDrag,
  };
}
