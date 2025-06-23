<template>
  <div class="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20">
    <h2 class="text-2xl text-white mb-4 text-center font-weight-oscillate-lg">
      Solfege Palette
    </h2>
    <p class="text-gray-300 mb-6 text-center font-weight-oscillate-md">
      Tap the solfege degrees to hear their emotional character in
      {{ musicStore.currentKeyDisplay }}
    </p>

    <!-- Solfege Buttons with Octave Controls -->
    <div class="grid grid-cols-8 gap-[1px]">
      <div
        v-for="(solfege, index) in musicStore.solfegeData"
        :key="solfege.name"
        class="relative btn-solfege-container bg-white/20 hover:bg-white/30 text-white font-semibold rounded-xl transition-all duration-150 backdrop-blur-sm border border-white/30 min-h-[6rem] aspect-[9/30] select-none"
        :style="{
          background: isNoteActiveForSolfege(solfege.name)
            ? getReactiveGradient(solfege.name)
            : undefined,
          transform: isNoteActiveForSolfege(solfege.name)
            ? 'scale(0.98)'
            : undefined,
          boxShadow: isNoteActiveForSolfege(solfege.name)
            ? '0 8px 25px rgba(255, 255, 255, 0.25)'
            : undefined,
        }"
      >
        <!-- Upper Octave (Octave 5) -->
        <button
          class="absolute top-0 left-0 right-0 h-1/3 bg-transparent hover:bg-white/10 rounded-t-xl transition-all duration-150 flex items-center justify-center text-xs opacity-60 hover:opacity-100"
          @mousedown="(e) => attackNoteWithOctave(index, 5, e)"
          @mouseup="(e) => releaseActiveNote(e)"
          @mouseleave="(e) => releaseActiveNote(e)"
          @touchstart.prevent="(e) => attackNoteWithOctave(index, 5, e)"
          @touchend.prevent="(e) => releaseActiveNote(e)"
          @contextmenu.prevent
          @dragstart.prevent
        >
          {{ musicStore.currentScaleNotes[index] }}5
        </button>

        <!-- Main Octave (Octave 4) -->
        <button
          class="absolute top-1/3 left-0 right-0 h-1/3 bg-transparent hover:bg-white/10 transition-all duration-150 flex flex-col items-center justify-center"
          @mousedown="(e) => attackNoteWithOctave(index, 4, e)"
          @mouseup="(e) => releaseActiveNote(e)"
          @mouseleave="(e) => releaseActiveNote(e)"
          @touchstart.prevent="(e) => attackNoteWithOctave(index, 4, e)"
          @touchend.prevent="(e) => releaseActiveNote(e)"
          @contextmenu.prevent
          @dragstart.prevent
        >
          <div class="text-lg font-weight-oscillate-lg">
            {{ solfege.name }}
          </div>
          <div class="text-xs opacity-75 font-weight-oscillate-md">
            {{ musicStore.currentScaleNotes[index] }}4
          </div>
        </button>

        <!-- Lower Octave (Octave 3) -->
        <button
          class="absolute bottom-0 left-0 right-0 h-1/3 bg-transparent hover:bg-white/10 rounded-b-xl transition-all duration-150 flex items-center justify-center text-xs opacity-60 hover:opacity-100"
          @mousedown="(e) => attackNoteWithOctave(index, 3, e)"
          @mouseup="(e) => releaseActiveNote(e)"
          @mouseleave="(e) => releaseActiveNote(e)"
          @touchstart.prevent="(e) => attackNoteWithOctave(index, 3, e)"
          @touchend.prevent="(e) => releaseActiveNote(e)"
          @contextmenu.prevent
          @dragstart.prevent
        >
          {{ musicStore.currentScaleNotes[index] }}3
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";

const musicStore = useMusicStore();
const { getGradient, isDynamicColorsEnabled } = useColorSystem();

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

// Lifecycle hooks
onMounted(() => {
  if (shouldAnimate.value) {
    startAnimation();
  }
});

onUnmounted(() => {
  stopAnimation();
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

.btn-solfege-container:hover {
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.15);
}

/* Individual octave buttons */
.btn-solfege-container button {
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

.btn-solfege-container button:active {
  transform: scale(0.95);
  background-color: rgba(255, 255, 255, 0.2) !important;
}

/* Prevent text selection and context menus on mobile */
.btn-solfege-container * {
  pointer-events: none;
}

.btn-solfege-container button {
  pointer-events: auto;
}

/* Visual separation between octave sections */
.btn-solfege-container button:not(:last-child)::after {
  content: "";
  position: absolute;
  bottom: 0;
  left: 10%;
  right: 10%;
  height: 1px;
  background: rgba(255, 255, 255, 0.1);
}

/* Responsive adjustments */
@media (max-width: 768px) {
  .btn-solfege-container {
    min-h: 5rem;
  }
}
</style>
