<template>
  <div class="bg-white/10 backdrop-blur-sm border">
    <!-- Octave Controls with Flick Handle -->
    <div
      class="flex items-center justify-center gap-4 p-3 bg-gray-800 cursor-grab active:cursor-grabbing select-none h-3"
      @wheel="handleWheel"
      @touchstart="handleTouchStart"
      @touchmove="handleTouchMove"
      @touchend="handleTouchEnd"
      @mousedown="handleMouseDown"
      @mousemove="handleMouseMove"
      @mouseup="handleMouseUp"
      @mouseleave="handleMouseUp"
    >
      <!-- Drag Handle (3 lines) -->
      <div
        class="flex flex-col gap-1 opacity-60 hover:opacity-100 transition-opacity duration-150 absolute inset-0 py-1"
      >
        <div class="w-full h-0.5 bg-white rounded-full"></div>
        <div class="w-full h-0.5 bg-white rounded-full"></div>
        <div class="w-full h-0.5 bg-white rounded-full"></div>
      </div>
    </div>

    <!-- Solfege Buttons with 3-Row Layout -->
    <div class="grid grid-cols-8 gap-[1px]">
      <div
        v-for="(solfege, index) in musicStore.solfegeData"
        :key="solfege.name"
        class="btn-solfege-container bg-white/20 hover:bg-white/30 text-black font-semibold transition-all duration-150 backdrop-blur-sm select-none overflow-hidden relative min-h-[12rem] max-h-[12rem]"
        :style="{
          background: isNoteActiveForSolfege(solfege.name)
            ? getReactiveGradient(solfege.name)
            : undefined,
          transform: isNoteActiveForSolfege(solfege.name)
            ? 'scale(0.98)'
            : undefined,
        }"
      >
        <!-- Animated octave container -->
        <div
          class="octave-scroll-container grid inset-0 transition-transform duration-300 ease-out"
          :style="{
            transform: `translateY(${getOctaveOffset()}px)`,
          }"
        >
          <template v-for="octave in [8, 7, 6, 5, 4, 3, 2, 1]" :key="octave">
            <button
              class="octave-button flex items-center justify-center transition-all duration-150 select-none bg-transparent hover:bg-white/10"
              :class="{
                'main-octave opacity-100': octave === mainOctave,
              }"
              :style="{
                background: !isNoteActiveForSolfege(solfege.name)
                  ? getStaticPrimaryColor(
                      solfege.name,
                      musicStore.currentMode,
                      octave
                    )
                  : 'transparent',
                height: octave === mainOctave ? '5rem' : '3.5rem',
                minHeight: octave === mainOctave ? '5rem' : '3.5rem',
              }"
              @mousedown="(e) => attackNoteWithOctave(index, octave, e)"
              @mouseup="(e) => releaseActiveNote(e)"
              @mouseleave="(e) => releaseActiveNote(e)"
              @touchstart.prevent="
                (e) => attackNoteWithOctave(index, octave, e)
              "
              @touchend.prevent="(e) => releaseActiveNote(e)"
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
                  {{ musicStore.currentScaleNotes[index] }}{{ octave }}
                </div>
              </div>
              <div v-else class="text-xs pointer-events-none">
                {{ musicStore.currentScaleNotes[index] }}{{ octave }}
              </div>
            </button>
          </template>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";

const musicStore = useMusicStore();
const {
  getGradient,
  getPrimaryColor,
  getStaticPrimaryColor,
  isDynamicColorsEnabled,
} = useColorSystem();

// Main octave state (default to 4, can range from 2 to 6)
const mainOctave = ref(4);

// Functions to change octave range
const increaseOctave = () => {
  if (mainOctave.value < 7) {
    mainOctave.value++;
  }
};

const decreaseOctave = () => {
  if (mainOctave.value > 3) {
    mainOctave.value--;
  }
};

// Calculate the offset for smooth scrolling animation
// Main octave is 5rem (80px), others are 3.5rem (56px)
// We want the main octave to be centered in the 12rem (192px) container
const getOctaveOffset = () => {
  const mainHeight = 80; // 5rem in pixels
  const otherHeight = 56; // 3.5rem in pixels
  const containerHeight = 192; // 12rem in pixels

  // Calculate total height above the main octave (reversed order: 8,7,6,5,4,3,2,1)
  // For octave 4: octaves 8,7,6,5 are above it = 4 octaves above
  const octavesAbove = 8 - mainOctave.value;
  const heightAbove = octavesAbove * otherHeight;

  // Center the main octave in the container
  const centerOffset = containerHeight / 2 - mainHeight / 2;

  return centerOffset - heightAbove;
};

// Flick interaction state
const isDragging = ref(false);
const startY = ref(0);
const startTime = ref(0);

// Touch/Mouse event handlers for flick interaction
const handleTouchStart = (e: TouchEvent) => {
  isDragging.value = true;
  startY.value = e.touches[0].clientY;
  startTime.value = Date.now();
};

const handleMouseDown = (e: MouseEvent) => {
  isDragging.value = true;
  startY.value = e.clientY;
  startTime.value = Date.now();
  e.preventDefault();
};

const handleTouchMove = (e: TouchEvent) => {
  if (!isDragging.value) return;
  e.preventDefault();
};

const handleMouseMove = (e: MouseEvent) => {
  if (!isDragging.value) return;
  e.preventDefault();
};

const handleTouchEnd = (e: TouchEvent) => {
  if (!isDragging.value) return;
  handleFlickEnd(e.changedTouches[0].clientY);
};

const handleMouseUp = (e: MouseEvent) => {
  if (!isDragging.value) return;
  handleFlickEnd(e.clientY);
};

const handleFlickEnd = (endY: number) => {
  const deltaY = startY.value - endY;
  const deltaTime = Date.now() - startTime.value;
  const velocity = Math.abs(deltaY) / deltaTime;

  // Flick threshold: minimum distance and velocity
  if (Math.abs(deltaY) > 30 && velocity > 0.3) {
    if (deltaY > 0) {
      // Flicked up - increase octave
      increaseOctave();
    } else {
      // Flicked down - decrease octave
      decreaseOctave();
    }
  }

  isDragging.value = false;
};

const handleWheel = (e: WheelEvent) => {
  e.preventDefault();
  if (e.deltaY > 0) {
    decreaseOctave();
  } else {
    increaseOctave();
  }
};

// Dynamic keyboard mapping for solfege notes across 3 octaves
// Top row (qwertyu) -> Above main octave
// Middle row (asdfghj) -> Main octave
// Bottom row (zxcvbnm) -> Below main octave
const getKeyboardMapping = () => {
  return {
    // Above main octave - Top row
    q: { solfegeIndex: 0, octave: mainOctave.value + 1 },
    w: { solfegeIndex: 1, octave: mainOctave.value + 1 },
    e: { solfegeIndex: 2, octave: mainOctave.value + 1 },
    r: { solfegeIndex: 3, octave: mainOctave.value + 1 },
    t: { solfegeIndex: 4, octave: mainOctave.value + 1 },
    y: { solfegeIndex: 5, octave: mainOctave.value + 1 },
    u: { solfegeIndex: 6, octave: mainOctave.value + 1 },

    // Main octave - Middle row
    a: { solfegeIndex: 0, octave: mainOctave.value },
    s: { solfegeIndex: 1, octave: mainOctave.value },
    d: { solfegeIndex: 2, octave: mainOctave.value },
    f: { solfegeIndex: 3, octave: mainOctave.value },
    g: { solfegeIndex: 4, octave: mainOctave.value },
    h: { solfegeIndex: 5, octave: mainOctave.value },
    j: { solfegeIndex: 6, octave: mainOctave.value },

    // Below main octave - Bottom row
    z: { solfegeIndex: 0, octave: mainOctave.value - 1 },
    x: { solfegeIndex: 1, octave: mainOctave.value - 1 },
    c: { solfegeIndex: 2, octave: mainOctave.value - 1 },
    v: { solfegeIndex: 3, octave: mainOctave.value - 1 },
    b: { solfegeIndex: 4, octave: mainOctave.value - 1 },
    n: { solfegeIndex: 5, octave: mainOctave.value - 1 },
    m: { solfegeIndex: 6, octave: mainOctave.value - 1 },
  };
};

// Track which keys are currently pressed to prevent key repeat
const pressedKeys = ref<Set<string>>(new Set());

// Track keyboard-triggered notes separately from mouse-triggered notes
const keyboardNoteIds = ref<Map<string, string>>(new Map());

// Create a reactive animation frame counter to trigger re-renders for dynamic colors
const animationFrame = ref(0);
let animationId: number | null = null;

// Start animation loop when dynamic colors are enabled
const startAnimation = () => {
  if (animationId) return;

  const animate = () => {
    animationFrame.value++;
    animationId = requestAnimationFrame(animate);
  };

  animate();
};

// Stop animation loop
const stopAnimation = () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
};

// Create a reactive computed property that updates with animation frames
const getReactiveGradient = computed(() => {
  return (noteName: string) => {
    // Force reactivity by accessing animation frame when dynamic colors are enabled
    if (isDynamicColorsEnabled.value) {
      animationFrame.value; // This triggers re-computation on every frame
    }
    return getGradient(noteName, musicStore.currentMode);
  };
});

// Watch for dynamic colors being enabled/disabled
const shouldAnimate = computed(() => isDynamicColorsEnabled.value);

// Keyboard event handlers
const handleKeyDown = async (event: KeyboardEvent) => {
  const key = event.key; // Don't convert to lowercase to preserve shift state

  // Ignore if key is already pressed (prevents key repeat)
  if (pressedKeys.value.has(key)) {
    return;
  }

  // Get current keyboard mapping
  const keyboardMapping = getKeyboardMapping();

  // Check if this key is mapped to a solfege note
  if (key in keyboardMapping) {
    event.preventDefault();
    pressedKeys.value.add(key);

    const { solfegeIndex, octave } =
      keyboardMapping[key as keyof typeof keyboardMapping];

    // Attack the note and track the note ID for this specific key
    const noteId = await musicStore.attackNoteWithOctave(solfegeIndex, octave);
    if (noteId) {
      keyboardNoteIds.value.set(key, noteId);
    }
  }
};

const handleKeyUp = (event: KeyboardEvent) => {
  const key = event.key; // Don't convert to lowercase to preserve shift state

  if (pressedKeys.value.has(key)) {
    pressedKeys.value.delete(key);

    // Release the specific note associated with this key
    const noteId = keyboardNoteIds.value.get(key);
    if (noteId) {
      musicStore.releaseNote(noteId);
      keyboardNoteIds.value.delete(key);
    }
  }
};

// Handle window blur to release all keyboard notes (safety mechanism)
const handleWindowBlur = () => {
  // Release all keyboard-triggered notes when window loses focus
  for (const noteId of keyboardNoteIds.value.values()) {
    musicStore.releaseNote(noteId);
  }

  // Clear tracking maps
  pressedKeys.value.clear();
  keyboardNoteIds.value.clear();
};

// Lifecycle hooks
onMounted(() => {
  if (shouldAnimate.value) {
    startAnimation();
  }

  // Add keyboard event listeners
  window.addEventListener("keydown", handleKeyDown);
  window.addEventListener("keyup", handleKeyUp);
  window.addEventListener("blur", handleWindowBlur);
});

onUnmounted(() => {
  stopAnimation();

  // Remove keyboard event listeners
  window.removeEventListener("keydown", handleKeyDown);
  window.removeEventListener("keyup", handleKeyUp);
  window.removeEventListener("blur", handleWindowBlur);

  // Release any keyboard-triggered notes that are still active
  for (const noteId of keyboardNoteIds.value.values()) {
    musicStore.releaseNote(noteId);
  }

  // Clear tracking maps
  pressedKeys.value.clear();
  keyboardNoteIds.value.clear();
});

// Watch for changes in dynamic colors setting
import { watch } from "vue";
watch(shouldAnimate, (newValue) => {
  if (newValue) {
    startAnimation();
  } else {
    stopAnimation();
  }
});

// Track active note IDs for each button press
const activeNoteIds = ref<Map<string, string>>(new Map());

// Function for attacking notes with octave support
const attackNoteWithOctave = async (
  solfegeIndex: number,
  octave: number,
  event?: Event
) => {
  // Prevent context menu and other unwanted behaviors
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  const buttonKey = `${solfegeIndex}_${octave}`;

  // Don't attack if this button is already pressed
  if (activeNoteIds.value.has(buttonKey)) {
    return;
  }

  const noteId = await musicStore.attackNoteWithOctave(solfegeIndex, octave);
  if (noteId) {
    activeNoteIds.value.set(buttonKey, noteId);
  }
};

// Function for releasing the currently active note from this button
const releaseActiveNote = (event?: Event) => {
  // Prevent unwanted behaviors
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }

  // Find the button that triggered this release and release its note
  const target = event?.target as HTMLElement;
  if (target) {
    // Get the button's data attributes or find the note ID another way
    // For now, we'll release all notes (can be refined later)
    musicStore.releaseAllNotes();
    activeNoteIds.value.clear();
  }
};

// Check if any note is active for a given solfege name
const isNoteActiveForSolfege = (solfegeName: string): boolean => {
  const activeNotes = musicStore.getActiveNotes();
  return activeNotes.some((note) => note.solfege.name === solfegeName);
};

// Legacy functions for backward compatibility
const attackNote = (solfegeIndex: number, event?: Event) => {
  attackNoteWithOctave(solfegeIndex, 4, event);
};

const releaseNote = (event?: Event) => {
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

/* Hide scrollbars */
.scrollbar-hide {
  -ms-overflow-style: none; /* Internet Explorer 10+ */
  scrollbar-width: none; /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
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
