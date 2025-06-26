<template>
  <div
    ref="floatingPopup"
    class="absolute top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out"
    :class="!hasActiveNotes ? 'translate-y-full' : '-translate-y-full'"
  >
    <div
      class="floating-popup w-screen h-screen backdrop-blur-xs rounded-b-2xl px-6 py-4 shadow-2xl grid items-end"
    >
      <div class="text-center">
        <div v-if="hasActiveNotes" class="grid gap-[1px]">
          <!-- Chord Display -->
          <div
            v-if="detectedChord"
            class="rounded-sm py-2 px-6 text-center"
            :style="{ background: notesGradient }"
          >
            <span class="text-2xl p-1 rounded-xs text-white font-bold">
              {{ detectedChord }}
            </span>
          </div>

          <!-- Notes Display -->
          <div class="flex gap-[1px] justify-center">
            <div
              v-for="note in activeNotes"
              :key="note.noteId"
              class="grid gap-[1px] items-center rounded-sm px-3 py-2"
              :style="{ background: getNoteColor(note) }"
            >
              <span class="text-xl p-1 rounded-xs text-white font-bold">
                {{ note.solfege.name }}
              </span>
              <div class="h-[1px] bg-black/20"></div>
              <span class="text-sm p-1 rounded-xs text-white">
                {{ note.noteName }}
              </span>
            </div>
          </div>

          <!-- Intervals Display -->
          <div v-if="intervalRows.length > 0" class="grid gap-[1px]">
            <div
              v-for="row in intervalRows"
              :key="row.rowIndex"
              class="flex gap-[1px]"
            >
              <div
                v-for="interval in row.intervals"
                :key="`${interval.fromIndex}-${interval.toIndex}`"
                class="rounded-sm py-1 px-2 text-center flex-grow"
                :style="{ background: getIntervalGradient(interval) }"
              >
                <span class="text-sm text-white font-bold drop-shadow">
                  {{ interval.interval }}
                </span>
              </div>
            </div>
          </div>

          <!-- Emotional Description -->
          <div class="mt-4">
            <div
              class="inline-flex rounded-sm px-4 py-2"
              :style="{ background: notesGradient }"
            >
              <span class="text-lg text-white font-bold drop-shadow">
                {{ emotionalDescription }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";
import { Chord, Interval } from "@tonaljs/tonal";

const musicStore = useMusicStore();
const { getGradient, getPrimaryColor } = useColorSystem();
const floatingPopup = ref<HTMLElement | null>(null);

// Core computed properties
const activeNotes = computed(() => musicStore.getActiveNotes());
const hasActiveNotes = computed(() => activeNotes.value.length > 0);
const primaryActiveNote = computed(() => activeNotes.value[0] || null);

// Background styling
const popupBackground = computed(() => {
  return primaryActiveNote.value
    ? getGradient(primaryActiveNote.value.solfege.name, musicStore.currentMode)
    : "rgba(0, 0, 0, 0.8)";
});

// Chord detection - only shows "real" chords recognized by Tonal.js
const detectedChord = computed(() => {
  const notes = activeNotes.value.map((note) => note.noteName);
  if (notes.length < 2) return null;
  const chords = Chord.detect(notes);
  return chords.length > 0 ? chords[0] : null;
});

// Gradient creation helper
const createGradient = (colors: string[], direction = "135deg"): string => {
  if (colors.length === 1) return colors[0];
  return `linear-gradient(${direction}, ${colors.join(", ")})`;
};

// Note colors and gradients
const getNoteColor = (note: any): string => {
  return getPrimaryColor(
    note.solfege.name,
    musicStore.currentMode,
    note.octave || 3
  );
};

const notesGradient = computed(() => {
  const colors = activeNotes.value.map(getNoteColor);
  return createGradient(colors);
});

// Container styling
const containerStyle = computed(() => ({
  maxWidth: `${activeNotes.value.length * 100}px`,
  margin: "0 auto",
}));

// Interval calculations and display
const intervals = computed(() => {
  const notes = activeNotes.value;
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

const intervalRows = computed(() => {
  const intervalsByRow: Record<number, typeof intervals.value> = {};

  intervals.value.forEach((interval) => {
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
  const fromColor = getNoteColor(activeNotes.value[interval.fromIndex]);
  const toColor = getNoteColor(activeNotes.value[interval.toIndex]);
  return createGradient([fromColor, toColor], "90deg");
};

// Emotional description
const emotionalDescription = computed(() => {
  const notes = activeNotes.value;
  if (notes.length === 0) return "";

  const emotions = [...new Set(notes.map((note) => note.solfege.emotion))];

  if (emotions.length === 1) return emotions[0];
  if (emotions.length === 2) return `${emotions[0]} & ${emotions[1]}`;
  return "Complex harmonic blend";
});
</script>

<style scoped>
.floating-popup {
}
</style>
