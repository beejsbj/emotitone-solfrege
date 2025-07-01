<template>
  <div class="space-y-4">
    <!-- Pattern Selection Panel -->
    <div
      class="bg-white/10 backdrop-blur-sm rounded-sm border border-white/20 p-4 max-w-2xl mx-auto"
    >
      <h2 class="text-xl font-bold text-white mb-4">Pattern Library</h2>

      <!-- Pattern Categories -->
      <div class="grid grid-cols-2 gap-2 mb-4">
        <button
          @click="selectedCategory = 'intervals'"
          :class="[
            'px-3 py-2 text-sm rounded-sm transition-all duration-200 font-bold',
            selectedCategory === 'intervals'
              ? 'bg-blue-500/80 text-white'
              : 'bg-white/20 text-white/80 hover:bg-white/30',
          ]"
        >
          Intervals
        </button>
        <button
          @click="selectedCategory = 'patterns'"
          :class="[
            'px-3 py-2 text-sm rounded-sm transition-all duration-200 font-bold',
            selectedCategory === 'patterns'
              ? 'bg-blue-500/80 text-white'
              : 'bg-white/20 text-white/80 hover:bg-white/30',
          ]"
        >
          Patterns
        </button>
      </div>

      <!-- Pattern List -->
      <div class="max-h-[50vh] overflow-y-auto space-y-2">
        <div
          v-for="pattern in filteredPatterns"
          :key="pattern.name"
          :class="[
            'rounded-sm border transition-all duration-200 cursor-pointer',
            selectedPattern?.name === pattern.name
              ? 'bg-purple-500/80 border-purple-400 text-white'
              : 'bg-white/10 border-white/20 text-white/90 hover:bg-white/20',
          ]"
          @click="selectPattern(pattern)"
        >
          <div class="font-bold bg-black/50 px-3 py-2">
            {{ pattern.name }}
          </div>
          <div class="text-sm opacity-75 px-3 py-1 bg-slate-800/50">
            {{ pattern.emotion }}
          </div>
          <div class="px-3 py-2 bg-slate-800/50 flex flex-wrap gap-1">
            <template v-for="(note, index) in pattern.sequence" :key="note">
              <span
                :style="{ background: getPrimaryColor(note) }"
                class="px-2 py-1 text-xs font-bold text-black rounded"
              >
                {{ note }}
              </span>
              <span
                v-if="index !== pattern.sequence.length - 1"
                class="text-white/60 self-center"
                >→</span
              >
            </template>
          </div>
          <div class="px-3 py-2 border-t border-white/10">
            <button
              @click.stop="loadPatternToSequencer(pattern)"
              class="w-full px-3 py-1 bg-green-500/80 hover:bg-green-500 text-white rounded-sm text-sm font-bold transition-all duration-200"
            >
              Load to Sequencer
            </button>
          </div>
        </div>
      </div>

      <!-- Selected Pattern Details -->
      <div
        v-if="selectedPattern"
        class="mt-4 bg-white/5 rounded-sm p-3 border border-white/10"
      >
        <h3 class="text-lg text-white font-bold mb-2">
          {{ selectedPattern.name }}
        </h3>
        <p class="text-white/80 text-sm mb-3">
          {{ selectedPattern.description }}
        </p>

        <!-- Quick Play Controls -->
        <div class="grid grid-cols-2 gap-2">
          <button
            @click="playPattern"
            :disabled="isPlaying"
            :class="[
              'px-3 py-2 text-sm rounded-sm transition-all duration-200 font-bold',
              isPlaying
                ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                : 'bg-green-500/80 hover:bg-green-500 text-white',
            ]"
          >
            {{ isPlaying ? "Playing..." : "Quick Play" }}
          </button>
          <button
            @click="stopPattern"
            :disabled="!isPlaying"
            :class="[
              'px-3 py-2 text-sm rounded-sm transition-all duration-200 font-bold',
              !isPlaying
                ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                : 'bg-red-500/80 hover:bg-red-500 text-white',
            ]"
          >
            Stop
          </button>
        </div>

        <!-- Now Playing Indicator -->
        <div
          v-if="isPlaying && selectedPattern"
          class="mt-3 p-2 bg-yellow-500/20 rounded-sm border border-yellow-500/30"
        >
          <h4 class="text-yellow-200 text-xs mb-2 font-bold">Now Playing:</h4>
          <div class="flex flex-wrap gap-1">
            <span
              v-for="(note, index) in selectedPattern.sequence"
              :key="index"
              :class="[
                'px-2 py-1 rounded text-xs font-bold transition-all duration-200',
                index === currentNoteIndex
                  ? 'bg-yellow-500 text-black'
                  : index < currentNoteIndex
                  ? 'bg-green-500/50 text-white'
                  : 'bg-white/20 text-white/60',
              ]"
            >
              {{ note }}
            </span>
          </div>
        </div>
      </div>
    </div>

    <!-- Updated Circular Sequencer (Full Width) -->
    <CircularSequencer />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import type { MelodicPattern } from "@/types/music";
import * as Tone from "tone";
import { useColorSystem } from "@/composables/useColorSystem";
import CircularSequencer from "./CircularSequencer.vue";

const musicStore = useMusicStore();
const { getPrimaryColor } = useColorSystem();

// State
const selectedCategory = ref<"intervals" | "patterns">("intervals");
const selectedPattern = ref<MelodicPattern | null>(null);
const isPlaying = ref(false);
const currentNoteIndex = ref(-1);
const currentScheduleIds = ref<number[]>([]);

// Computed
const allPatterns = computed(() => [...musicStore.getMelodicPatterns()]);

const filteredPatterns = computed(() => {
  if (selectedCategory.value === "intervals") {
    return allPatterns.value.filter(
      (pattern) => pattern.intervals && pattern.intervals.length === 1
    );
  } else {
    return allPatterns.value.filter(
      (pattern) => !pattern.intervals || pattern.intervals.length !== 1
    );
  }
});

// Methods
const selectPattern = (pattern: MelodicPattern) => {
  if (isPlaying.value) {
    stopPattern();
  }
  selectedPattern.value = pattern;
  currentNoteIndex.value = -1;
};

const loadPatternToSequencer = (pattern: MelodicPattern) => {
  musicStore.loadPatternToSequencer(pattern);
};

const playPattern = async () => {
  if (!selectedPattern.value || isPlaying.value) return;

  try {
    await Tone.start();
    const transport = Tone.getTransport();

    // Clear any existing schedules
    transport.cancel();
    transport.stop();
    transport.position = 0;
    transport.bpm.value = 120; // Fixed tempo for quick preview

    isPlaying.value = true;
    currentNoteIndex.value = -1;
    currentScheduleIds.value = [];

    let currentTime = 0;
    const noteDuration = 0.5; // Half second per note

    selectedPattern.value.sequence.forEach((solfegeName, index) => {
              // Find the solfege index
        const solfegeIndex = [...musicStore.solfegeData].findIndex(
          (s) => s.name === solfegeName
        );

      if (solfegeIndex >= 0) {
        // Schedule note start
        const startId = transport.schedule((time) => {
          currentNoteIndex.value = index;
          musicStore.attackNoteWithOctave(solfegeIndex, 4); // Fixed octave for quick preview
        }, currentTime);

        // Schedule note stop
        const stopId = transport.schedule((time) => {
          musicStore.releaseAllNotes();
        }, currentTime + noteDuration * 0.8); // Release slightly before next note

        currentScheduleIds.value.push(startId, stopId);
        currentTime += noteDuration;
      }
    });

    // Schedule playback end
    const endId = transport.schedule(() => {
      stopPattern();
    }, currentTime);

    currentScheduleIds.value.push(endId);
    transport.start();
  } catch (error) {
    console.error("Error playing pattern:", error);
    stopPattern();
  }
};

const stopPattern = () => {
  const transport = Tone.getTransport();

  // Clear all scheduled events
  currentScheduleIds.value.forEach((id) => transport.clear(id));
  currentScheduleIds.value = [];

  // Stop transport and release all notes
  transport.cancel();
  transport.stop();
  transport.position = 0;

  musicStore.releaseAllNotes();

  isPlaying.value = false;
  currentNoteIndex.value = -1;
};

// Cleanup on unmount
onUnmounted(() => {
  stopPattern();
});
</script>

<style scoped>
/* Custom slider styles */
input[type="range"] {
  -webkit-appearance: none;
  appearance: none;
}

input[type="range"]::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

input[type="range"]::-moz-range-thumb {
  height: 16px;
  width: 16px;
  border-radius: 50%;
  background: #ffffff;
  cursor: pointer;
  border: 2px solid rgba(255, 255, 255, 0.3);
}

/* Custom select styles */
select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 32px;
}

/* Scrollbar styles */
.overflow-y-auto::-webkit-scrollbar {
  width: 6px;
}

.overflow-y-auto::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.3);
  border-radius: 3px;
}

.overflow-y-auto::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.5);
}
</style>
