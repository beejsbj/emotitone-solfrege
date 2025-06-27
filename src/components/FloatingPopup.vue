<template>
  <div
    ref="floatingPopup"
    class="absolute top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out"
    :class="
      !isVisible
        ? 'translate-y-full opacity-0'
        : '-translate-y-full opacity-100'
    "
  >
    <div
      class="floating-popup w-screen h-screen backdrop-blur-xs rounded-b-2xl px-6 py-4 shadow-2xl grid items-end"
    >
      <div
        v-if="isVisible"
        class="grid gap-[1px] text-center max-w-[300px] mx-auto"
      >
        <!-- Chord Display -->
        <div
          v-if="displayedChord"
          class="rounded-sm py-2 px-6 text-center glass-morph backdrop-blur-md border border-white/20 shadow-lg"
          :style="{
            background: createGlassmorphBackground(displayedNotesGradient),
            boxShadow: createGlassmorphShadow(displayedNotesGradient),
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
              background: createGlassmorphBackground(getNoteColor(note)),
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
        <div v-if="displayedIntervalRows.length > 0" class="grid gap-[1px]">
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
                background: createIntervalGlassmorphBackground(interval),
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
        <div class="mt-4">
          <div
            class="inline-flex rounded-sm px-4 py-2 glass-morph backdrop-blur-md border border-white/20 shadow-lg"
            :style="{
              background: createGlassmorphBackground(displayedNotesGradient),
              boxShadow: createGlassmorphShadow(displayedNotesGradient),
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
import { Chord, Interval } from "@tonaljs/tonal";

const musicStore = useMusicStore();
const { getGradient, getPrimaryColor, withAlpha } = useColorSystem();
const floatingPopup = ref<HTMLElement | null>(null);

// Visibility control with timer
const isVisible = ref(false);
let hideTimer: number | null = null;
let accumulationTimer: number | null = null;

// Store the last active notes for lingering display
const lastActiveNotes = ref<any[]>([]);
const accumulatedNotes = ref<any[]>([]);

// Core computed properties
const activeNotes = computed(() => musicStore.getActiveNotes());
const hasActiveNotes = computed(() => activeNotes.value.length > 0);

// Displayed notes (either current active notes or accumulated/last active notes)
const displayedNotes = computed(() => {
  if (activeNotes.value.length > 0) return activeNotes.value;
  if (accumulatedNotes.value.length > 0) return accumulatedNotes.value;
  return lastActiveNotes.value;
});

// Watch for changes in active notes
watch(
  () => [...activeNotes.value],
  (newNotes) => {
    // If we have new notes
    if (newNotes.length > 0) {
      // Add new notes to accumulated notes if they're not already there
      newNotes.forEach((note) => {
        if (!accumulatedNotes.value.some((n) => n.noteId === note.noteId)) {
          accumulatedNotes.value.push(note);
        }
      });

      isVisible.value = true;

      // Clear any existing timers
      if (hideTimer !== null) {
        clearTimeout(hideTimer);
        hideTimer = null;
      }
      if (accumulationTimer !== null) {
        clearTimeout(accumulationTimer);
      }

      // Start a new accumulation window
      accumulationTimer = window.setTimeout(() => {
        // Transfer accumulated notes to last active notes
        lastActiveNotes.value = [...accumulatedNotes.value];
        accumulatedNotes.value = [];

        // Start hide timer
        hideTimer = window.setTimeout(() => {
          isVisible.value = false;
          hideTimer = null;
          lastActiveNotes.value = [];
        }, 1500) as unknown as number;

        accumulationTimer = null;
      }, 300) as unknown as number; // 300ms accumulation window
    } else if (accumulationTimer === null) {
      // If notes were released and we're not in accumulation window
      if (hideTimer !== null) {
        clearTimeout(hideTimer);
      }

      // Transfer any remaining accumulated notes
      if (accumulatedNotes.value.length > 0) {
        lastActiveNotes.value = [...accumulatedNotes.value];
        accumulatedNotes.value = [];
      }

      hideTimer = window.setTimeout(() => {
        isVisible.value = false;
        hideTimer = null;
        lastActiveNotes.value = [];
      }, 1500) as unknown as number;
    }
  },
  { deep: true }
);

// Update computed properties to use displayedNotes
const displayedChord = computed(() => {
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

// Helper function to create glassmorphism background
const createGlassmorphBackground = (color: string): string => {
  const color1 = withAlpha(color, 0.57);
  const color2 = withAlpha(color, 0.06);
  return `radial-gradient(84.35% 70.19% at 50% 38.11%, ${color1}, ${color2})`;
};

// Helper function to create glassmorphism box shadow
const createGlassmorphShadow = (color: string): string => {
  const shadowColor = withAlpha(color, 0.09);
  return `hsla(0, 0%, 100%, 0.1) 0px 1px 0px 0px inset, hsla(0, 0%, 0%, 0.4) 0px 30px 50px 0px, ${shadowColor} 0px 4px 24px 0px, hsla(0, 0%, 100%, 0.06) 0px 0px 0px 1px inset`;
};

const displayedNotesGradient = computed(() => {
  const colors = displayedNotes.value.map(getNoteColor);
  return createGradient(colors);
});

// Gradient creation helper
const createGradient = (colors: string[], direction = "135deg"): string => {
  if (colors.length === 1) return colors[0];
  return `linear-gradient(${direction}, ${colors.join(", ")})`;
};

// Update interval calculations to use displayedNotes
const displayedIntervals = computed(() => {
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
const createIntervalGlassmorphBackground = (interval: any): string => {
  const fromColor = getNoteColor(displayedNotes.value[interval.fromIndex]);
  const toColor = getNoteColor(displayedNotes.value[interval.toIndex]);
  const fromColorAlpha = withAlpha(fromColor, 0.4);
  const toColorAlpha = withAlpha(toColor, 0.4);
  return `linear-gradient(90deg, ${fromColorAlpha}, ${toColorAlpha})`;
};

// Update emotional description to use displayedNotes
const displayedEmotionalDescription = computed(() => {
  const notes = displayedNotes.value;
  if (notes.length === 0) return "";

  const emotions = [...new Set(notes.map((note) => note.solfege.emotion))];

  if (emotions.length === 1) return emotions[0];
  if (emotions.length === 2) return `${emotions[0]} & ${emotions[1]}`;
  return "Complex harmonic blend";
});
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
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  pointer-events: none;
  z-index: -1;
}
</style>
