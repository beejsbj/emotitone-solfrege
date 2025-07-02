<template>
  <FloatingDropdown position="top-left" max-height="80vh" :floating="false">
    <!-- Trigger Button -->
    <template #trigger="{ toggle }">
      <button
        @click="toggle"
        class="p-2 sm:px-3 bg-black/80 border border-gray-600 rounded-md text-white cursor-pointer text-xs flex items-center gap-1.5 sm:gap-2 transition-all duration-200 backdrop-blur-sm min-w-fit justify-center hover:bg-black/90 hover:border-gray-500 hover:scale-105"
      >
        <span class="text-base leading-none">🎼</span>
        <span class="font-medium text-xs whitespace-nowrap"
          >Melody Library</span
        >
        <ChevronDown :size="14" />
      </button>
    </template>

    <!-- Dropdown Panel -->
    <template #panel="{ close, toggle, position }">
      <div class="w-full flex flex-col min-h-0 flex-1">
        <!-- Header -->
        <div
          class="sticky top-0 flex items-center justify-between p-3 border-b border-gray-600 bg-black/95 backdrop-blur-sm z-10"
          :class="{ 'flex-row-reverse': position === 'top-left' }"
        >
          <h3
            class="m-0 text-sm text-emerald-400 flex items-center gap-1.5 font-semibold"
          >
            <Music :size="16" />
            Melody Library
          </h3>
          <button
            @click="toggle"
            class="bg-transparent border-0 text-red-400 cursor-pointer p-1 flex items-center justify-center rounded transition-all duration-200 hover:bg-red-400/20 hover:rotate-180"
            title="Close Library"
          >
            <ChevronDown :size="18" />
          </button>
        </div>

        <div class="p-4 overflow-y-auto flex-1">
          <!-- Search Bar -->
          <div class="mb-5">
            <input
              v-model="searchTerm"
              placeholder="Search patterns, intervals, melodies..."
              class="w-full p-2 sm:px-3 bg-black/60 border border-white/20 rounded-md text-white text-xs placeholder-white/50 focus:outline-none focus:border-emerald-400 focus:bg-black/80"
            />
          </div>

          <!-- Content Sections -->
          <div class="flex flex-col gap-5">
            <!-- Intervals Section -->
            <div class="flex flex-col gap-2.5">
              <h4
                class="m-0 text-xs text-yellow-300 uppercase tracking-wider font-semibold border-b border-yellow-300/30 pb-1"
              >
                Intervals
              </h4>
              <div class="grid grid-cols-1 gap-2">
                <div
                  v-for="pattern in filteredIntervals"
                  :key="pattern.name"
                  class="bg-white/5 border border-white/10 rounded-md p-2.5 transition-all duration-200 hover:bg-white/8 hover:border-white/20"
                >
                  <div class="flex justify-between items-center mb-1.5">
                    <h5 class="m-0 text-xs text-white font-semibold">
                      {{ pattern.name }}
                    </h5>
                    <span
                      class="text-xs text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-sm"
                      >{{ pattern.emotion }}</span
                    >
                  </div>
                  <div class="text-xs text-white/70 mb-2 leading-tight">
                    {{ pattern.description }}
                  </div>
                  <div class="flex flex-wrap items-center gap-1 mb-2">
                    <template
                      v-for="(note, index) in pattern.sequence"
                      :key="index"
                    >
                      <span
                        :style="{ background: getPrimaryColor(note.note) }"
                        class="inline-flex flex-col items-center px-1.5 py-1 rounded text-black text-xs font-semibold leading-none"
                      >
                        {{ note.note }}
                        <span class="text-xs opacity-80 mt-0.5">{{
                          note.duration
                        }}</span>
                      </span>
                      <span
                        v-if="index !== pattern.sequence.length - 1"
                        class="text-white/50 text-xs"
                        >→</span
                      >
                    </template>
                  </div>
                  <div class="flex gap-1">
                    <button
                      @click="playPattern(pattern, close)"
                      :disabled="currentlyPlaying === pattern.name"
                      class="flex-1 px-2 py-1 border-0 rounded text-xs font-semibold cursor-pointer transition-all duration-200 bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {{
                        currentlyPlaying === pattern.name
                          ? "Playing..."
                          : "▶ Play"
                      }}
                    </button>
                    <button
                      @click="loadToSequencer(pattern, close)"
                      class="flex-1 px-2 py-1 border-0 rounded text-xs font-semibold cursor-pointer transition-all duration-200 bg-blue-500/20 text-blue-500 border border-blue-500/30 hover:bg-blue-500/30"
                    >
                      Load
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Patterns Section -->
            <div class="flex flex-col gap-2.5">
              <h4
                class="m-0 text-xs text-yellow-300 uppercase tracking-wider font-semibold border-b border-yellow-300/30 pb-1"
              >
                Melodic Patterns
              </h4>
              <div class="grid grid-cols-1 gap-2">
                <div
                  v-for="pattern in filteredPatterns"
                  :key="pattern.name"
                  class="bg-white/5 border border-white/10 rounded-md p-2.5 transition-all duration-200 hover:bg-white/8 hover:border-white/20"
                >
                  <div class="flex justify-between items-center mb-1.5">
                    <h5 class="m-0 text-xs text-white font-semibold">
                      {{ pattern.name }}
                    </h5>
                    <span
                      class="text-xs text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-sm"
                      >{{ pattern.emotion }}</span
                    >
                  </div>
                  <div class="text-xs text-white/70 mb-2 leading-tight">
                    {{ pattern.description }}
                  </div>
                  <div class="flex flex-wrap items-center gap-1 mb-2">
                    <template
                      v-for="(note, index) in pattern.sequence"
                      :key="index"
                    >
                      <span
                        :style="{ background: getPrimaryColor(note.note) }"
                        class="inline-flex flex-col items-center px-1.5 py-1 rounded text-black text-xs font-semibold leading-none"
                      >
                        {{ note.note }}
                        <span class="text-xs opacity-80 mt-0.5">{{
                          note.duration
                        }}</span>
                      </span>
                      <span
                        v-if="index !== pattern.sequence.length - 1"
                        class="text-white/50 text-xs"
                        >→</span
                      >
                    </template>
                  </div>
                  <div class="flex gap-1">
                    <button
                      @click="playPattern(pattern, close)"
                      :disabled="currentlyPlaying === pattern.name"
                      class="flex-1 px-2 py-1 border-0 rounded text-xs font-semibold cursor-pointer transition-all duration-200 bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 hover:bg-emerald-400/30 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {{
                        currentlyPlaying === pattern.name
                          ? "Playing..."
                          : "▶ Play"
                      }}
                    </button>
                    <button
                      @click="loadToSequencer(pattern, close)"
                      class="flex-1 px-2 py-1 border-0 rounded text-xs font-semibold cursor-pointer transition-all duration-200 bg-blue-500/20 text-blue-500 border border-blue-500/30 hover:bg-blue-500/30"
                    >
                      Load
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <!-- Saved Melodies Section -->
            <div v-if="savedMelodies.length > 0" class="flex flex-col gap-2.5">
              <h4
                class="m-0 text-xs text-yellow-300 uppercase tracking-wider font-semibold border-b border-yellow-300/30 pb-1"
              >
                User Melodies
              </h4>
              <div class="grid grid-cols-1 gap-2">
                <div
                  v-for="melody in filteredSavedMelodies"
                  :key="(melody as any).id"
                  class="bg-white/5 border border-white/10 rounded-md p-2.5 transition-all duration-200 hover:bg-white/8 hover:border-white/20"
                >
                  <div class="flex justify-between items-center mb-1.5">
                    <h5 class="m-0 text-xs text-white font-semibold">
                      {{ (melody as any).name }}
                    </h5>
                    <span
                      class="text-xs text-emerald-400 bg-emerald-400/10 px-1.5 py-0.5 rounded-sm"
                      >{{ (melody as any).beats?.length || 0 }} beats</span
                    >
                  </div>
                  <div class="text-xs text-white/70 mb-2 leading-tight">
                    {{ (melody as any).description }}
                  </div>
                  <div class="flex gap-1">
                    <button
                      @click="loadMelody((melody as any).id, close)"
                      class="flex-1 px-2 py-1 border-0 rounded text-xs font-semibold cursor-pointer transition-all duration-200 bg-blue-500/20 text-blue-500 border border-blue-500/30 hover:bg-blue-500/30"
                    >
                      Load
                    </button>
                    <button
                      @click="deleteMelody((melody as any).id)"
                      class="flex-1 px-2 py-1 border-0 rounded text-xs font-semibold cursor-pointer transition-all duration-200 bg-red-500/20 text-red-500 border border-red-500/30 hover:bg-red-500/30"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
  </FloatingDropdown>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { useMultiSequencerStore } from "@/stores/multiSequencer";
import { useColorSystem } from "@/composables/useColorSystem";
import type { MelodicPattern } from "@/types/music";
import { ChevronDown, Music } from "lucide-vue-next";
import FloatingDropdown from "./FloatingDropdown.vue";
import { getAllMelodicPatterns } from "@/data";

const musicStore = useMusicStore();
const multiSequencerStore = useMultiSequencerStore();
const { getPrimaryColor } = useColorSystem();

// Local state
const searchTerm = ref("");
const currentlyPlaying = ref<string | null>(null);

// Computed properties
const allPatterns = computed(() => getAllMelodicPatterns());
const activeSequencer = computed(() => multiSequencerStore.activeSequencer);

// Get saved melodies from the old sequencer store for backward compatibility
// TODO: Implement multi-sequencer project save/load
const savedMelodies = computed(() => []);

// Filter patterns by type
const intervalPatterns = computed(() => {
  return allPatterns.value.filter(
    (pattern) => pattern.intervals && pattern.intervals.length === 1
  );
});

const melodicPatterns = computed(() => {
  return allPatterns.value.filter(
    (pattern) => !pattern.intervals || pattern.intervals.length !== 1
  );
});

// Search filtering
const filteredIntervals = computed(() => {
  if (!searchTerm.value) return intervalPatterns.value;
  const term = searchTerm.value.toLowerCase();
  return intervalPatterns.value.filter(
    (pattern) =>
      pattern.name.toLowerCase().includes(term) ||
      pattern.emotion?.toLowerCase().includes(term) ||
      pattern.description?.toLowerCase().includes(term)
  );
});

const filteredPatterns = computed(() => {
  if (!searchTerm.value) return melodicPatterns.value;
  const term = searchTerm.value.toLowerCase();
  return melodicPatterns.value.filter(
    (pattern) =>
      pattern.name.toLowerCase().includes(term) ||
      pattern.emotion?.toLowerCase().includes(term) ||
      pattern.description?.toLowerCase().includes(term)
  );
});

const filteredSavedMelodies = computed(() => {
  if (!searchTerm.value) return savedMelodies.value;
  const term = searchTerm.value.toLowerCase();
  return savedMelodies.value.filter(
    (melody: any) =>
      melody.name.toLowerCase().includes(term) ||
      melody.description.toLowerCase().includes(term) ||
      melody.emotion.toLowerCase().includes(term)
  );
});

// Methods
const loadToSequencer = (
  pattern: MelodicPattern,
  closeDropdown?: () => void
) => {
  if (!activeSequencer.value) {
    // Create a new sequencer if none exists
    multiSequencerStore.createSequencer();
  }

  if (activeSequencer.value) {
    // Clear existing beats in the active sequencer
    multiSequencerStore.clearBeatsInSequencer(activeSequencer.value.id);

    // Convert pattern to beats and add them
    const newBeats = convertPatternToBeats(pattern);
    newBeats.forEach((beat) => {
      multiSequencerStore.addBeatToSequencer(activeSequencer.value!.id, beat);
    });
  }

  if (closeDropdown) closeDropdown();
};

// Convert melodic pattern to sequencer beats
const convertPatternToBeats = (pattern: MelodicPattern) => {
  const beats: any[] = [];
  let stepPosition = 0;

  pattern.sequence.forEach((noteData, index) => {
    const solfegeName = noteData.note;
    const solfegeIndex = musicStore.solfegeData.findIndex(
      (s) => s.name === solfegeName
    );

    // Only use the first 7 solfege notes
    if (solfegeIndex >= 0 && solfegeIndex < 7) {
      // Convert duration from Tone.js notation to step duration
      const noteDuration = noteData.duration;
      let stepDuration = 1; // Default to 1 step

      // Convert common durations to step lengths (assuming 16 steps = 1 bar)
      switch (noteDuration) {
        case "1n":
          stepDuration = 16;
          break; // Whole note
        case "2n":
          stepDuration = 8;
          break; // Half note
        case "4n":
          stepDuration = 4;
          break; // Quarter note
        case "8n":
          stepDuration = 2;
          break; // Eighth note
        case "16n":
          stepDuration = 1;
          break; // Sixteenth note
        case "32n":
          stepDuration = 0.5;
          break; // Thirty-second note (rare)
        default:
          stepDuration = 1;
          break; // Default to sixteenth note
      }

      // Ensure step duration is at least 1 and fits in remaining steps
      stepDuration = Math.max(1, Math.floor(stepDuration));

      const beat = {
        id: `pattern-${Date.now()}-${index}`,
        ring: 6 - solfegeIndex, // Reverse for visual representation
        step: stepPosition % 16, // Wrap around at 16 steps
        duration: stepDuration,
        solfegeName,
        solfegeIndex,
        octave: activeSequencer.value?.octave || 4,
      };
      beats.push(beat);

      // Move to next position based on the actual duration
      stepPosition += stepDuration;
    }
  });

  return beats;
};

const loadMelody = (melodyId: string, closeDropdown?: () => void) => {
  // TODO: Implement loading saved melodies in multi-sequencer context
  console.log("Loading melody:", melodyId);
  if (closeDropdown) closeDropdown();
};

const deleteMelody = (melodyId: string) => {
  // TODO: Implement deleting saved melodies in multi-sequencer context
  console.log("Deleting melody:", melodyId);
};

const playPattern = async (
  pattern: MelodicPattern,
  closeDropdown?: () => void
) => {
  if (currentlyPlaying.value === pattern.name) return;

  // TODO: Implement pattern preview playback
  currentlyPlaying.value = pattern.name;

  // Simulate playback for now
  setTimeout(() => {
    currentlyPlaying.value = null;
  }, 3000);

  if (closeDropdown) closeDropdown();
};

const stopCurrentPattern = () => {
  currentlyPlaying.value = null;
};

// Cleanup on unmount
onUnmounted(() => {
  stopCurrentPattern();
});
</script>

<style scoped>
/* Mobile responsiveness handled by Tailwind responsive classes */
</style>
