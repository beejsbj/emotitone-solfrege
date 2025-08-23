/**
 * Main Palette Composable
 * Combines all palette modules into a unified interface
 */

import { ref, watch } from "vue";
import { useMusicStore } from "@/stores/music";
import { usePaletteLayout } from "./useLayout";
import { usePaletteAnimation } from "./useAnimation";
import { usePaletteRenderer } from "./useRenderer";
import { usePaletteInteraction } from "./useInteraction";
import { PALETTE_STYLES } from "./index";
import type { PaletteState } from "@/types";

export function usePalette(
  getKeyboardLetterForNote?: (
    solfegeIndex: number,
    octave: number
  ) => string | null
) {
  const musicStore = useMusicStore();

  // Palette state
  const paletteState = ref<PaletteState>({
    x: 0, // Full width - start from left edge
    y: 0, // Will be calculated to stick to bottom
    width: window.innerWidth, // Full screen width
    height: 264, // Height for controls (20px) + 3 octave rows (80+56+56 = 192px) + sustain hooks (24px) + padding

    mainOctave: 4,

    controlsHeight: PALETTE_STYLES.dimensions.controlsHeight,
    buttonGap: PALETTE_STYLES.dimensions.buttonGap,

    isDragging: false,
    isResizing: false,
    dragStartY: 0,
    resizeStartHeight: 0,

    lastTouchY: 0,
    touchStartTime: 0,
    activeTouches: new Map<number, string>(),

    // Sustain hooks
    sustainHooksHeight: PALETTE_STYLES.dimensions.sustainHooksHeight,
    activeSustainHooks: new Set<string>(),
  });

  // Initialize animation system
  const {
    animationState,
    animateOctaveTransition,
    updateAnimation,
    startButtonPressAnimation,
    startButtonReleaseAnimation,
  } = usePaletteAnimation();

  // Initialize layout system
  const {
    visibleSolfegeData,
    buttonCount,
    buttonWidth,
    buttonHeight,
    getOctaveHeights,
    visibleOctaves,
    visibleRowCount,
    calculateButtonLayouts,
    calculateControlLayouts,
    calculateOctaveOffset,
    calculateHeightForRows,
    snapHeightToRows,
  } = usePaletteLayout(paletteState, animationState);

  // Initialize renderer system
  const {
    renderPalette,
    renderPaletteBackground,
    renderControls,
    renderButton,
  } = usePaletteRenderer(
    paletteState,
    animationState,
    calculateButtonLayouts,
    calculateControlLayouts,
    visibleSolfegeData,
    getKeyboardLetterForNote
  );

  // Initialize interaction system
  const {
    hitTestButton,
    hitTestControl,
    handleButtonPress,
    handleButtonRelease,
    handleTouchButtonPress,
    handleTouchButtonRelease,
    handleKeyboardPress,
    handleKeyboardRelease,
    handleControlPress,
    handlePointerDown,
    handlePointerUp,
    handleResizeDrag,
  } = usePaletteInteraction(
    paletteState,
    animationState,
    calculateButtonLayouts,
    calculateControlLayouts,
    calculateOctaveOffset,
    animateOctaveTransition,
    startButtonPressAnimation,
    startButtonReleaseAnimation,
    visibleSolfegeData,
    snapHeightToRows
  );

  /**
   * Update palette dimensions (for responsive design)
   */
  const updateDimensions = (width: number, height?: number) => {
    paletteState.value.width = width;
    if (height !== undefined) {
      paletteState.value.height = Math.max(128, Math.min(400, height)); // Min 8rem, max 25rem
    }
  };

  /**
   * Update palette position
   */
  const updatePosition = (x: number, y: number) => {
    paletteState.value.x = x;
    paletteState.value.y = y;
  };

  /**
   * Position palette at bottom of screen (sticky)
   */
  const positionAtBottom = (canvasHeight: number) => {
    paletteState.value.x = 0;
    paletteState.value.y = canvasHeight - paletteState.value.height;
    paletteState.value.width = window.innerWidth;
  };

  /**
   * Handle window resize to maintain full width and bottom position
   */
  const handleWindowResize = (canvasWidth: number, canvasHeight: number) => {
    paletteState.value.width = canvasWidth;
    paletteState.value.y = canvasHeight - paletteState.value.height;
  };

  /**
   * Set main octave
   */
  const setMainOctave = (octave: number) => {
    paletteState.value.mainOctave = Math.max(2, Math.min(6, octave));
  };

  // Watch for music store changes to update pressed button states
  watch(
    () => musicStore.activeNotes,
    (newActiveNotes) => {
      // Update pressed buttons based on active notes
      animationState.value.pressedButtons.clear();
      newActiveNotes.forEach((note) => {
        const buttonKey = `${note.solfege.name}-${note.octave}`;
        animationState.value.pressedButtons.add(buttonKey);
      });
    },
    { deep: true }
  );

  // Add visual feedback for sequencer playback (inert)
  const handleSequencerNotePlayed = (event: CustomEvent) => {
    const { note, octave, solfegeIndex } = event.detail;

    // Only respond if this note is in our visible range
    const solfege = visibleSolfegeData.value[solfegeIndex];
    if (
      solfege &&
      octave >= paletteState.value.mainOctave - 1 &&
      octave <= paletteState.value.mainOctave + 1
    ) {
      const buttonKey = `${solfege.name}-${octave}`;

      // Add temporary visual press
      animationState.value.pressedButtons.add(buttonKey);
      startButtonPressAnimation(buttonKey);

      // Auto-release after a short duration (slightly longer than the note to feel natural)
      setTimeout(() => {
        animationState.value.pressedButtons.delete(buttonKey);
        startButtonReleaseAnimation(buttonKey);
      }, 200); // 200ms visual feedback duration
    }
  };

  // Sequencer removed: keep inert listeners to maintain API shape
  const addSequencerListeners = () => {};
  const removeSequencerListeners = () => {};

  // Enhanced render function that includes animation updates
  const renderPaletteWithAnimation = (
    ctx: CanvasRenderingContext2D,
    currentTime?: number
  ) => {
    renderPalette(ctx, currentTime, updateAnimation);
  };

  return {
    // State
    paletteState,
    animationState,

    // Computed properties
    visibleSolfegeData,
    buttonCount,
    buttonWidth,
    buttonHeight,
    getOctaveHeights,
    visibleOctaves,

    // Layout calculations
    calculateButtonLayouts,
    calculateControlLayouts,
    calculateOctaveOffset,

    // Animation functions
    animateOctaveTransition,
    updateAnimation,

    // Rendering functions
    renderPalette: renderPaletteWithAnimation,
    renderPaletteBackground,
    renderControls,
    renderButton,

    // Interaction functions
    hitTestButton,
    hitTestControl,
    handleButtonPress,
    handleButtonRelease,
    handleTouchButtonPress,
    handleTouchButtonRelease,
    handleKeyboardPress,
    handleKeyboardRelease,
    handleControlPress,
    handlePointerDown,
    handlePointerUp,
    handleResizeDrag,

    // State management
    updateDimensions,
    updatePosition,
    positionAtBottom,
    handleWindowResize,
    setMainOctave,

    // Layout utilities
    visibleRowCount,
    calculateHeightForRows,
    snapHeightToRows,

    // Sequencer integration
    addSequencerListeners,
    removeSequencerListeners,

    // Style configuration (for external access)
    PALETTE_STYLES,
  };
}
