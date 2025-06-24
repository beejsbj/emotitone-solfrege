<template>
  <div
    class="btn-solfege-container bg-white/20 hover:bg-white/30 text-black font-semibold transition-all duration-150 backdrop-blur-sm select-none overflow-hidden relative"
    :style="{
      height: `${buttonHeight}px`,
      minHeight: `${buttonHeight}px`,
      maxHeight: `${buttonHeight}px`,
    }"
  >
    <!-- Animated octave container -->
    <div
      class="octave-scroll-container grid inset-0 transition-transform duration-300 ease-out"
      :style="{
        transform: `translateY(${octaveOffset}px)`,
      }"
    >
      <template v-for="octave in visibleOctaves" :key="octave">
        <button
          class="octave-button flex items-center justify-center transition-all duration-150 select-none bg-transparent hover:bg-white/10"
          :class="{
            'main-octave opacity-100': octave === mainOctave,
          }"
          :style="{
            background: !isNoteActiveForSolfege(solfege.name, octave)
              ? getStaticPrimaryColor(solfege.name, currentMode, octave)
              : reactiveGradient,
            transform: isNoteActiveForSolfege(solfege.name, octave)
              ? 'scale(0.98)'
              : undefined,

            height:
              octave === mainOctave
                ? `${getOctaveHeights.main}px`
                : `${getOctaveHeights.other}px`,
            minHeight:
              octave === mainOctave
                ? `${getOctaveHeights.main}px`
                : `${getOctaveHeights.other}px`,
          }"
          @mousedown="(e) => handleAttack(octave, e)"
          @mouseup="(e) => handleRelease(e)"
          @mouseleave="(e) => handleRelease(e)"
          @touchstart.prevent="(e) => handleAttack(octave, e)"
          @touchend.prevent="(e) => handleRelease(e)"
          @contextmenu.prevent
          @dragstart.prevent
        >
          <div
            v-if="octave === mainOctave"
            class="flex flex-col items-center justify-center pointer-events-none"
          >
            <div class="text-lg font-bold">
              {{ solfege.name }}
            </div>
            <div class="text-xs opacity-75">
              {{ currentScaleNote }}{{ octave }}
            </div>
          </div>
          <div v-else class="text-xs pointer-events-none">
            {{ currentScaleNote }}{{ octave }}
          </div>
        </button>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import type { SolfegeData, MusicalMode } from "@/types/music";
import { useColorSystem } from "@/composables/useColorSystem";
import { useSolfegeInteraction } from "@/composables/useSolfegeInteraction";
import { triggerNoteHaptic } from "@/utils/hapticFeedback";

// Props
interface Props {
  solfege: SolfegeData;
  solfegeIndex: number;
  mainOctave: number;
  currentMode: MusicalMode;
  currentScaleNote: string;
  buttonHeight: number;
}

const props = defineProps<Props>();

// Color system
const { getStaticPrimaryColor } = useColorSystem();

// Solfege interaction composable
const {
  getReactiveGradient,
  attackNoteWithOctave,
  releaseActiveNote,
  isNoteActiveForSolfege,
} = useSolfegeInteraction();

const reactiveGradient = computed(() =>
  getReactiveGradient.value(props.solfege.name, props.currentMode)
);

// Base octave heights that scale slightly with palette size
const getOctaveHeights = computed(() => {
  const containerHeight = props.buttonHeight;
  const scaleFactor = Math.max(1, Math.min(1.5, containerHeight / 192)); // Scale between 1x and 1.5x based on container height

  return {
    main: Math.round(80 * scaleFactor), // Base 5rem, scales up to 7.5rem
    other: Math.round(56 * scaleFactor), // Base 3.5rem, scales up to 5.25rem
  };
});

// Calculate how many octaves can fit in the container
const visibleOctaves = computed(() => {
  const containerHeight = props.buttonHeight;
  const totalOctaves = 8; // octaves 1-8
  const heights = getOctaveHeights.value;

  // Calculate how many octaves we can show based on container height
  // We need at least space for the main octave
  const availableHeight = containerHeight;
  const maxOctavesFromHeight =
    Math.floor((availableHeight - heights.main) / heights.other) + 1;

  // Show at least 3 octaves (main + 1 above + 1 below), up to all 8
  const numOctaves = Math.max(3, Math.min(totalOctaves, maxOctavesFromHeight));

  // Center the range around the main octave
  const mainOctave = props.mainOctave;
  const halfRange = Math.floor((numOctaves - 1) / 2);

  const startOctave = Math.max(1, mainOctave - halfRange);
  const endOctave = Math.min(8, startOctave + numOctaves - 1);

  // Generate the range in descending order (8,7,6,5,4,3,2,1)
  const octaves = [];
  for (let i = endOctave; i >= startOctave; i--) {
    octaves.push(i);
  }

  return octaves;
});

// Calculate the offset for smooth scrolling animation
const octaveOffset = computed(() => {
  const containerHeight = props.buttonHeight;
  const octaves = visibleOctaves.value;
  const mainOctave = props.mainOctave;
  const heights = getOctaveHeights.value;

  // Find the index of the main octave in our visible octaves
  const mainOctaveIndex = octaves.indexOf(mainOctave);
  if (mainOctaveIndex === -1) return 0; // Fallback

  // Calculate total height above the main octave
  const octavesAbove = mainOctaveIndex;
  const heightAbove = octavesAbove * heights.other;

  // Center the main octave in the container
  const centerOffset = containerHeight / 2 - heights.main / 2;

  return centerOffset - heightAbove;
});

// Event handlers
const handleAttack = (octave: number, event?: Event) => {
  // Trigger haptic feedback on note attack
  triggerNoteHaptic();
  attackNoteWithOctave(props.solfegeIndex, octave, event);
};

const handleRelease = (event?: Event) => {
  // Trigger lighter haptic feedback on note release
  triggerNoteHaptic();
  releaseActiveNote(event);
};
</script>

<style scoped>
/* Component-specific styles */
.btn-solfege-container {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
  touch-action: manipulation;
}

.btn-solfege-container:active {
  transform: scale(0.95);
}

/* Octave buttons */
.octave-button {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
  touch-action: manipulation;
  scroll-snap-align: center;
  cursor: pointer;
}

/* Prevent text selection and context menus on mobile */
.btn-solfege-container * {
  pointer-events: none;
}

.octave-button {
  pointer-events: auto;
}
</style>
