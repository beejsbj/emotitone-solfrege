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
            background: createChordGlassmorphBackground(),
            boxShadow: createChordGlassmorphShadow(),
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
              background: createChordGlassmorphBackground(),
              boxShadow: createChordGlassmorphShadow(),
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

// Store accumulated notes with better tracking
const accumulatedNotes = ref<Map<string, any>>(new Map());
const displayOrder = ref<string[]>([]);

// Core computed properties
const activeNotes = computed(() => musicStore.getActiveNotes());

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
    const oldNoteIds = new Set((oldNotes || []).map((n) => n.noteId));
    const newNoteIds = new Set(newNotes.map((n) => n.noteId));

    // Add new notes to accumulation
    newNotes.forEach((note) => {
      if (!accumulatedNotes.value.has(note.noteId)) {
        accumulatedNotes.value.set(note.noteId, note);
        displayOrder.value.push(note.noteId);

        // Limit to 2 notes maximum for sequential intervals
        if (displayOrder.value.length > 2) {
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
        }, 2000) as unknown as number; // Show for 2 seconds after accumulation

        accumulationTimer = null;
      }, 500) as unknown as number; // 500ms accumulation window for arpeggios
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

// Create chord-specific glassmorphism background using gradient of all note colors
const createChordGlassmorphBackground = (): string => {
  const colors = displayedNotes.value.map(getNoteColor);
  if (colors.length === 0) return "rgba(255, 255, 255, 0.1)";

  if (colors.length === 1) {
    return createGlassmorphBackground(colors[0]);
  }

  // Create a blended linear gradient for multiple colors
  const gradientColors = colors.map((color) => withAlpha(color, 0.4));
  const gradientColorsLight = colors.map((color) => withAlpha(color, 0.06));

  return `linear-gradient(135deg, 
    ${gradientColors.join(", ")}, 
    ${gradientColorsLight.join(", ")})`;
};

// Create chord-specific shadow
const createChordGlassmorphShadow = (): string => {
  const colors = displayedNotes.value.map(getNoteColor);
  if (colors.length === 0) return createGlassmorphShadow("#ffffff");

  // Use the first color for the shadow, or blend if multiple
  const shadowColor =
    colors.length === 1
      ? colors[0]
      : // Simple blend of first two colors for shadow
      colors.length >= 2
      ? colors[0]
      : colors[0];

  return createGlassmorphShadow(shadowColor);
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
