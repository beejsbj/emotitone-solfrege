<template>
  <div
    ref="floatingPopup"
    class="absolute top-0 left-1/2 transform -translate-x-1/2 z-50 transition-all duration-300 ease-out"
    :class="!hasActiveNotes ? 'translate-y-full' : '-translate-y-full'"
    :style="{
      background: primaryActiveNote
        ? getGradient(primaryActiveNote.solfege.name, musicStore.currentMode)
        : 'rgba(0, 0, 0, 0.8)',
    }"
  >
    <div
      class="floating-popup bg-black/40 backdrop-blur-sm rounded-b-2xl px-6 py-4 border-b border-white/20 shadow-2xl min-w-[300px] max-w-[90vw]"
    >
      <div class="text-center">
        <!-- Multiple Notes Display -->
        <div v-if="activeNotes.length > 1" class="mb-3">
          <h3
            class="text-lg text-white mb-2 drop-shadow-lg font-weight-oscillate-lg"
          >
            {{
              detectedChord
                ? detectedChord
                : `Playing ${activeNotes.length} Notes`
            }}
          </h3>
          <div class="flex flex-wrap justify-center gap-2 mb-2">
            <span
              v-for="note in activeNotes"
              :key="note.noteId"
              class="px-2 py-1 bg-white/20 rounded-sm text-sm text-white font-bold"
            >
              {{ note.noteName }}
            </span>
          </div>
          <p class="text-white/90 text-sm mb-1 drop-shadow font-bold">
            {{ getPolyphonicDescription() }}
          </p>
        </div>

        <!-- Single Note Display -->
        <div v-else-if="primaryActiveNote" class="mb-3">
          <h3
            class="text-2xl text-white mb-2 drop-shadow-lg font-weight-oscillate-lg"
          >
            {{ primaryActiveNote.solfege.name }}
          </h3>
          <p class="text-white/80 text-lg mb-2 drop-shadow font-bold">
            {{ primaryActiveNote.noteName }}
          </p>
          <p class="text-white/90 text-sm mb-1 drop-shadow font-bold">
            {{ primaryActiveNote.solfege.emotion }}
          </p>
          <p class="text-white/70 text-xs drop-shadow font-weight-oscillate-sm">
            {{ primaryActiveNote.solfege.description }}
          </p>
        </div>
      </div>

      <!-- Subtle peek indicator -->
      <div
        class="absolute bottom-0 left-1/2 transform -translate-x-1/2 translate-y-full"
      >
        <div
          class="w-0 h-0 border-l-[8px] border-r-[8px] border-t-[8px] border-l-transparent border-r-transparent border-t-white/20"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, computed } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";
import { gsap } from "gsap";
import { Chord } from "@tonaljs/tonal";

const musicStore = useMusicStore();
const { getGradient } = useColorSystem();
const floatingPopup = ref<HTMLElement | null>(null);

// Computed properties for polyphonic display
const activeNotes = computed(() => musicStore.getActiveNotes());
const hasActiveNotes = computed(() => activeNotes.value.length > 0);
console.log(activeNotes.value);
const primaryActiveNote = computed(() => activeNotes.value[0] || null);

// Detect chord from active notes
const detectedChord = computed(() => {
  const notes = activeNotes.value.map((note) => note.noteName);
  if (notes.length < 2) return null;

  // Get possible chord names
  const chords = Chord.detect(notes);
  return chords.length > 0 ? chords[0] : null;
});

// Generate description for polyphonic notes
const getPolyphonicDescription = () => {
  const notes = activeNotes.value;
  if (notes.length === 0) return "";
  if (notes.length === 1) return notes[0].solfege.emotion;

  // For multiple notes, check if it forms a chord first
  const chord = detectedChord.value;
  if (chord) {
    return `${chord} chord`;
  }

  // If no chord detected, use the existing emotion-based description
  const emotions = notes.map((note) => note.solfege.emotion);
  const uniqueEmotions = [...new Set(emotions)];

  if (uniqueEmotions.length === 1) {
    return `${uniqueEmotions[0]} (harmony)`;
  } else if (uniqueEmotions.length === 2) {
    return `${uniqueEmotions[0]} & ${uniqueEmotions[1]}`;
  } else {
    return "Complex harmonic blend";
  }
};
</script>

<style scoped>
/* Floating popup styles */
.floating-popup {
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

/* Enhanced drop shadows for better readability */
.drop-shadow-lg {
  filter: drop-shadow(0 10px 8px rgb(0 0 0 / 0.04))
    drop-shadow(0 4px 3px rgb(0 0 0 / 0.1));
}

.drop-shadow {
  filter: drop-shadow(0 1px 2px rgb(0 0 0 / 0.1))
    drop-shadow(0 1px 1px rgb(0 0 0 / 0.06));
}

/* Responsive adjustments for mobile */
@media (max-width: 640px) {
  .floating-popup {
    min-width: 280px;
    max-width: 95vw;
  }
}
</style>
