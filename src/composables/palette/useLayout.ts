/**
 * Palette Layout Calculations
 * Handles positioning and layout calculations for the canvas palette
 */

import { computed, type Ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { PALETTE_STYLES } from "./index";
import type {
  PaletteState,
  ButtonLayout,
  ControlLayout,
  OctaveHeights,
} from "@/types";

export function usePaletteLayout(
  paletteState: Ref<PaletteState>,
  animationState: Ref<any>
) {
  const musicStore = useMusicStore();

  // Computed properties for layout calculations
  const visibleSolfegeData = computed(() => {
    if (paletteState.value.showLastSolfege) {
      return musicStore.solfegeData; // Show all 8 notes
    } else {
      return musicStore.solfegeData.slice(0, -1); // Show only first 7 notes
    }
  });

  const buttonCount = computed(() => visibleSolfegeData.value.length);

  const buttonWidth = computed(() => {
    const totalGaps = (buttonCount.value - 1) * paletteState.value.buttonGap;
    return (paletteState.value.width - totalGaps) / buttonCount.value;
  });

  const buttonHeight = computed(() => {
    return paletteState.value.height - paletteState.value.controlsHeight;
  });

  // Octave calculations (matching SolfegeButton logic)
  const getOctaveHeights = computed((): OctaveHeights => {
    const containerHeight = buttonHeight.value;
    const scaleFactor = Math.max(1, Math.min(1.5, containerHeight / 192));

    return {
      main: Math.round(
        PALETTE_STYLES.dimensions.octaveHeights.main * scaleFactor
      ),
      other: Math.round(
        PALETTE_STYLES.dimensions.octaveHeights.other * scaleFactor
      ),
    };
  });

  const visibleOctaves = computed(() => {
    // Always show all 6 octaves (1-6) for full musical range
    // This allows dynamic display based on palette height
    const allOctaves = [6, 5, 4, 3, 2, 1]; // Descending order for proper stacking
    return allOctaves;
  });

  /**
   * Calculate how many octave rows are actually visible based on palette height
   */
  const visibleRowCount = computed(() => {
    const containerHeight = buttonHeight.value;
    const heights = getOctaveHeights.value;

    // Calculate how many rows can fit in the current height
    const availableHeight = containerHeight;
    const maxRowsFromHeight =
      Math.floor((availableHeight - heights.main) / heights.other) + 1;

    // Default to 3 rows minimum, but allow more when resized
    return Math.max(3, Math.min(6, maxRowsFromHeight));
  });

  /**
   * Calculate the ideal height for a given number of rows
   */
  const calculateHeightForRows = (rowCount: number): number => {
    const heights = getOctaveHeights.value;
    const controlsHeight = paletteState.value.controlsHeight;

    // Main octave + (rowCount - 1) other octaves + controls
    return controlsHeight + heights.main + (rowCount - 1) * heights.other;
  };

  /**
   * Snap palette height to discrete row counts for better UX
   */
  const snapHeightToRows = (currentHeight: number): number => {
    const heights = getOctaveHeights.value;
    const controlsHeight = paletteState.value.controlsHeight;

    // Calculate which row count this height is closest to
    const availableHeight = currentHeight - controlsHeight;
    const estimatedRows =
      Math.round((availableHeight - heights.main) / heights.other) + 1;
    const clampedRows = Math.max(3, Math.min(6, estimatedRows));

    return calculateHeightForRows(clampedRows);
  };

  /**
   * Calculate octave offset with smooth animation (matching SolfegeButton logic)
   */
  const calculateOctaveOffset = (): number => {
    const containerHeight = buttonHeight.value;
    const octaves = visibleOctaves.value;
    const mainOctave = paletteState.value.mainOctave;
    const heights = getOctaveHeights.value;

    // Find the index of the main octave in our visible octaves
    const mainOctaveIndex = octaves.indexOf(mainOctave);
    if (mainOctaveIndex === -1) return 0; // Fallback

    // Calculate total height above the main octave
    const octavesAbove = mainOctaveIndex;
    const heightAbove = octavesAbove * heights.other;

    // Center the main octave in the container
    const centerOffset = containerHeight / 2 - heights.main / 2;
    const baseOffset = centerOffset - heightAbove;

    // Return animated offset if animation is active
    if (animationState.value.isAnimating) {
      return animationState.value.octaveOffset;
    }

    return baseOffset;
  };

  /**
   * Calculate button layouts for ALL octave rows (like DOM version)
   */
  const calculateButtonLayouts = (): ButtonLayout[] => {
    const layouts: ButtonLayout[] = [];
    const state = paletteState.value;
    const octaves = visibleOctaves.value;
    const octaveOffset = calculateOctaveOffset();

    // Get proper octave heights (main octave taller than others)
    const heights = getOctaveHeights.value;

    visibleSolfegeData.value.forEach((_, solfegeIndex) => {
      const buttonX =
        state.x + solfegeIndex * (buttonWidth.value + state.buttonGap);

      // Calculate the starting Y position for the octave container (like DOM translateY)
      const containerStartY = state.y + state.controlsHeight + octaveOffset;

      // Render ALL octave rows in order (like DOM grid)
      octaves.forEach((octave, octaveIndex) => {
        const isMainOctave = octave === state.mainOctave;
        const octaveHeight = isMainOctave ? heights.main : heights.other;

        // Calculate Y position by stacking octaves from top to bottom
        let buttonY = containerStartY;

        // Add heights of all previous octaves (using proper heights)
        for (let i = 0; i < octaveIndex; i++) {
          const prevOctave = octaves[i];
          const prevIsMain = prevOctave === state.mainOctave;
          buttonY += prevIsMain ? heights.main : heights.other;
        }

        // Calculate the correct octave for this note using music service logic
        // This ensures proper ascending scale order for ALL rows (e.g., A4-B4-C5 in A minor)
        const noteNameWithOctave = musicStore.getNoteName(solfegeIndex, octave);
        const correctOctave = noteNameWithOctave.match(/\d+$/)?.[0] || octave;

        // Always create layout (render all rows like DOM)
        layouts.push({
          x: buttonX,
          y: buttonY,
          width: buttonWidth.value,
          height: octaveHeight,
          solfegeIndex,
          octave: parseInt(correctOctave.toString()),
          isMainOctave,
          // Always visible - let height changes handle the display
          isVisible: true,
        });
      });
    });

    return layouts;
  };

  /**
   * Calculate control layouts
   */
  const calculateControlLayouts = (): ControlLayout => {
    const state = paletteState.value;
    const controlWidth = state.width / 5; // Grid cols-5

    return {
      leftFlick: {
        x: state.x,
        y: state.y,
        width: controlWidth,
        height: state.controlsHeight,
      },
      solfegeToggle: {
        x: state.x + controlWidth,
        y: state.y,
        width: controlWidth,
        height: state.controlsHeight,
      },
      dragHandle: {
        x: state.x + controlWidth * 3, // Moved to 4th position
        y: state.y,
        width: controlWidth,
        height: state.controlsHeight,
      },
      resizeHandle: {
        x: state.x + controlWidth * 2, // Center position
        y: state.y,
        width: controlWidth,
        height: state.controlsHeight,
      },
      rightFlick: {
        x: state.x + controlWidth * 4,
        y: state.y,
        width: controlWidth,
        height: state.controlsHeight,
      },
    };
  };

  return {
    // Computed properties
    visibleSolfegeData,
    buttonCount,
    buttonWidth,
    buttonHeight,
    getOctaveHeights,
    visibleOctaves,
    visibleRowCount,

    // Layout calculations
    calculateButtonLayouts,
    calculateControlLayouts,
    calculateOctaveOffset,

    // Height management
    calculateHeightForRows,
    snapHeightToRows,
  };
}
