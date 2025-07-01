<template>
  <div
    ref="floatingPopup"
    class="absolute top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out"
    :class="
      !shouldShowPopup
        ? 'translate-y-full opacity-0'
        : '-translate-y-full opacity-100'
    "
    :style="animationStyle"
  >
    <div
      class="floating-popup w-screen h-screen backdrop-blur-xs rounded-b-2xl px-6 py-4 shadow-2xl grid items-end"
      :style="backdropBlurStyle"
    >
      <div
        v-if="shouldShowPopup"
        class="grid gap-[1px] text-center max-w-[300px] mx-auto"
      >
        <!-- Chord Display -->
        <div
          v-if="
            displayedChord && visualConfigStore.config.floatingPopup.showChord
          "
          class="rounded-sm py-2 px-6 text-center glass-morph backdrop-blur-md border border-white/20 shadow-lg"
          :style="{
            background: createChordGlassmorphBackgroundLocal(),
            boxShadow: createChordGlassmorphShadowLocal(),
          }"
        >
          <span
            class="text-2xl p-1 rounded-xs text-white font-bold drop-shadow-lg"
          >
            {{ displayedChord }}
          </span>
        </div>

        <!-- Notes Display -->
        <div class="flex gap-[1px] justify-center">
          <div
            v-for="note in displayedNotes"
            :key="note.noteId"
            class="flex-1 grid gap-[1px] items-center rounded-sm px-3 py-2 glass-morph backdrop-blur-md border border-white/20 shadow-lg"
            :style="{
              background: createGlassmorphBackground(
                getNoteColor(note),
                visualConfigStore.config.floatingPopup.glassmorphOpacity
              ),
              boxShadow: createGlassmorphShadow(getNoteColor(note)),
            }"
          >
            <span
              class="text-xl p-1 rounded-xs text-white font-bold drop-shadow-lg"
            >
              {{ note.solfege.name }}
            </span>
            <div class="h-[1px] bg-white/30"></div>
            <span class="text-sm p-1 rounded-xs text-white drop-shadow">
              {{ note.noteName }}
            </span>
          </div>
        </div>

        <!-- Intervals Display -->
        <div
          v-if="
            displayedIntervalRows.length > 0 &&
            visualConfigStore.config.floatingPopup.showIntervals
          "
          class="grid gap-[1px]"
        >
          <div
            v-for="row in displayedIntervalRows"
            :key="row.rowIndex"
            class="flex gap-[1px]"
          >
            <div
              v-for="interval in row.intervals"
              :key="`${interval.fromIndex}-${interval.toIndex}`"
              class="rounded-sm py-1 px-2 text-center flex-grow glass-morph backdrop-blur-md border border-white/20 shadow-lg"
              :style="{
                background: createIntervalGlassmorphBackgroundLocal(interval),
                boxShadow: createGlassmorphShadow(
                  getIntervalGradient(interval)
                ),
              }"
            >
              <span class="text-sm text-white font-bold drop-shadow-lg">
                {{ interval.interval }}
              </span>
            </div>
          </div>
        </div>

        <!-- Emotional Description -->
        <div
          v-if="
            displayedEmotionalDescription &&
            visualConfigStore.config.floatingPopup.showEmotionalDescription
          "
          class="mt-4"
        >
          <div
            class="inline-flex rounded-sm px-4 py-2 glass-morph backdrop-blur-md border border-white/20 shadow-lg"
            :style="{
              background: createChordGlassmorphBackgroundLocal(),
              boxShadow: createChordGlassmorphShadowLocal(),
            }"
          >
            <span class="text-lg text-white font-bold drop-shadow-lg">
              {{ displayedEmotionalDescription }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { Chord, Interval } from "@tonaljs/tonal";

const musicStore = useMusicStore();
const {
  getGradient,
  getPrimaryColor,
  withAlpha,
  createGlassmorphBackground,
  createGlassmorphShadow,
  createChordGlassmorphBackground,
  createChordGlassmorphShadow,
  createIntervalGlassmorphBackground,
  createGradient,
} = useColorSystem();
const visualConfigStore = useVisualConfigStore();
const floatingPopup = ref<HTMLElement | null>(null);

// Visibility control with timer
const isVisible = ref(false);
let hideTimer: number | null = null;
let accumulationTimer: number | null = null;

// Store accumulated notes with better tracking
const accumulatedNotes = ref<Map<string, any>>(new Map());
const displayOrder = ref<string[]>([]);

// Core computed properties
const activeNotes = computed(() => musicStore.getActiveNotes());

// Check if popup should be shown based on config
const shouldShowPopup = computed(
  () => visualConfigStore.config.floatingPopup.isEnabled && isVisible.value
);

// Displayed notes from accumulated notes in order
const displayedNotes = computed(() => {
  return displayOrder.value
    .map((noteId) => accumulatedNotes.value.get(noteId))
    .filter(Boolean);
});

// Watch for changes in active notes with improved accumulation logic
watch(
  () => [...activeNotes.value],
  (newNotes, oldNotes) => {
    if (!visualConfigStore.config.floatingPopup.isEnabled) return;

    const oldNoteIds = new Set((oldNotes || []).map((n) => n.noteId));
    const newNoteIds = new Set(newNotes.map((n) => n.noteId));

    // Add new notes to accumulation
    newNotes.forEach((note) => {
      if (!accumulatedNotes.value.has(note.noteId)) {
        accumulatedNotes.value.set(note.noteId, note);
        displayOrder.value.push(note.noteId);

        // Limit to configured max notes
        if (
          displayOrder.value.length >
          visualConfigStore.config.floatingPopup.maxNotes
        ) {
          const oldestNoteId = displayOrder.value.shift();
          if (oldestNoteId) {
            accumulatedNotes.value.delete(oldestNoteId);
          }
        }
      }
    });

    // If we have any notes (new or continuing)
    if (newNotes.length > 0 || accumulatedNotes.value.size > 0) {
      isVisible.value = true;

      // Clear existing timers
      if (hideTimer !== null) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (accumulationTimer !== null) {
        clearTimeout(accumulationTimer);
      }

      // Extend accumulation window when new notes are added
      accumulationTimer = window.setTimeout(() => {
        // Start hide timer after accumulation period
        hideTimer = window.setTimeout(() => {
          isVisible.value = false;
          hideTimer = null;
          // Clear accumulated notes after hiding
          accumulatedNotes.value.clear();
          displayOrder.value = [];
        }, visualConfigStore.config.floatingPopup.hideDelay) as unknown as number;

        accumulationTimer = null;
      }, visualConfigStore.config.floatingPopup.accumulationWindow) as unknown as number;
    }
  },
  { deep: true }
);

// Update computed properties to use displayedNotes
const displayedChord = computed(() => {
  if (!visualConfigStore.config.floatingPopup.showChord) return null;

  const notes = displayedNotes.value.map((note) => note.noteName);
  if (notes.length < 2) return null;
  const chords = Chord.detect(notes);
  return chords.length > 0 ? chords[0] : null;
});

// Note colors and gradients
const getNoteColor = (note: any): string => {
  return getPrimaryColor(
    note.solfege.name,
    musicStore.currentMode,
    note.octave || 3
  );
};

// Create chord-specific glassmorphism background using gradient of all note colors
const createChordGlassmorphBackgroundLocal = (): string => {
  const colors = displayedNotes.value.map(getNoteColor);
  return createChordGlassmorphBackground(
    colors,
    visualConfigStore.config.floatingPopup.glassmorphOpacity
  );
};

// Create chord-specific shadow
const createChordGlassmorphShadowLocal = (): string => {
  const colors = displayedNotes.value.map(getNoteColor);
  return createChordGlassmorphShadow(colors);
};

const displayedNotesGradient = computed(() => {
  const colors = displayedNotes.value.map(getNoteColor);
  return createGradient(colors);
});

// Update interval calculations to use displayedNotes
const displayedIntervals = computed(() => {
  if (!visualConfigStore.config.floatingPopup.showIntervals) return [];

  const notes = displayedNotes.value;
  if (notes.length < 2) return [];

  const result: Array<{
    fromIndex: number;
    toIndex: number;
    interval: string;
    row: number;
  }> = [];

  for (let i = 0; i < notes.length; i++) {
    for (let j = i + 1; j < notes.length; j++) {
      const interval = Interval.distance(notes[i].noteName, notes[j].noteName);
      result.push({
        fromIndex: i,
        toIndex: j,
        interval,
        row: j - i - 1,
      });
    }
  }

  return result;
});

const displayedIntervalRows = computed(() => {
  const intervalsByRow: Record<number, typeof displayedIntervals.value> = {};

  displayedIntervals.value.forEach((interval) => {
    if (!intervalsByRow[interval.row]) {
      intervalsByRow[interval.row] = [];
    }
    intervalsByRow[interval.row].push(interval);
  });

  return Object.keys(intervalsByRow)
    .map(Number)
    .sort((a, b) => a - b)
    .map((rowIndex) => ({
      rowIndex,
      intervals: intervalsByRow[rowIndex],
    }));
});

const getIntervalGradient = (interval: any) => {
  const fromColor = getNoteColor(displayedNotes.value[interval.fromIndex]);
  const toColor = getNoteColor(displayedNotes.value[interval.toIndex]);
  return createGradient([fromColor, toColor], "90deg");
};

// Create glassmorphism background for intervals
const createIntervalGlassmorphBackgroundLocal = (interval: any): string => {
  const fromColor = getNoteColor(displayedNotes.value[interval.fromIndex]);
  const toColor = getNoteColor(displayedNotes.value[interval.toIndex]);
  return createIntervalGlassmorphBackground(
    fromColor,
    toColor,
    visualConfigStore.config.floatingPopup.glassmorphOpacity
  );
};

// Update emotional description to use displayedNotes
const displayedEmotionalDescription = computed(() => {
  if (!visualConfigStore.config.floatingPopup.showEmotionalDescription)
    return "";

  const notes = displayedNotes.value;
  if (notes.length === 0) return "";

  const emotions = [...new Set(notes.map((note) => note.solfege.emotion))];

  if (emotions.length === 1) return emotions[0];
  if (emotions.length === 2) return `${emotions[0]} & ${emotions[1]}`;
  return "Complex harmonic blend";
});

// Computed style for backdrop blur
const backdropBlurStyle = computed(() => ({
  backdropFilter: `blur(${visualConfigStore.config.floatingPopup.backdropBlur}px)`,
  WebkitBackdropFilter: `blur(${visualConfigStore.config.floatingPopup.backdropBlur}px)`,
}));

// Computed style for animation duration
const animationStyle = computed(() => ({
  transitionDuration: `${visualConfigStore.config.floatingPopup.animationDuration}ms`,
}));
</script>

<style scoped>
.floating-popup {
  /* Add transition for opacity */
  transition: opacity 300ms ease-out;
}

.glass-morph {
  position: relative;
  overflow: hidden;
}

.glass-morph::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  /* Backdrop blur is now applied dynamically via :style */
  pointer-events: none;
  z-index: -1;
}
</style>
