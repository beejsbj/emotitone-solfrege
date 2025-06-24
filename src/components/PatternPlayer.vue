<template>
  <div
    class="bg-white/10 backdrop-blur-sm rounded-sm border border-white/20 grid items-start gap-1 grid-cols-2 relative"
  >
    <!-- Pattern Categories -->
    <div class="mb-1 sticky top-0 grid gap-1">
      <div
        class="bg-white/5 rounded-sm p-1 border border-white/10"
        v-if="selectedPattern"
      >
        <div class="grid gap-1 bg-slate-700">
          <h3 class="text-lg text-white font-900">
            {{ selectedPattern.name }}
          </h3>
          <p class="text-white/80 text-md font-800">
            {{ selectedPattern.description }}
          </p>
        </div>

        <!-- Tempo Control -->
        <div class="flex items-center gap-1 mb-1">
          <label class="text-white/80 text-xs font-bold"
            >Tempo:
            <span class="text-white/80 text-xs font-bold w-12"
              >{{ tempo }} BPM</span
            ></label
          >

          <input
            v-model="tempo"
            type="range"
            min="60"
            max="180"
            step="10"
            class="flex-1 h-2 bg-white/20 rounded-sm appearance-none cursor-pointer"
          />
        </div>

        <!-- Octave Control -->
        <div class="flex items-center gap-1 mb-1">
          <label class="text-white/80 text-xs font-bold"
            >Octave:

            <span class="text-white/80 text-xs font-bold w-12">{{
              baseOctave
            }}</span>
          </label>

          <input
            v-model="baseOctave"
            type="range"
            min="3"
            max="5"
            step="1"
            class="flex-1 h-2 bg-white/20 rounded-sm appearance-none cursor-pointer"
          />
        </div>

        <!-- Play Controls -->
        <div class="grid grid-cols-2 gap-1">
          <button
            @click="playPattern"
            :disabled="isPlaying"
            :class="[
              'px-1 py-[1px] text-xs  rounded-sm  transition-all duration-200 font-bold',
              isPlaying
                ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                : 'bg-green-500/80 hover:bg-green-500 text-white',
            ]"
          >
            {{ isPlaying ? "Playing..." : "Play Pattern" }}
          </button>
          <button
            @click="stopPattern"
            :disabled="!isPlaying"
            :class="[
              'px-1 py-[1px] text-xs  rounded-sm  transition-all duration-200 font-bold',
              !isPlaying
                ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                : 'bg-red-500/80 hover:bg-red-500 text-white',
            ]"
          >
            Stop
          </button>
        </div>
      </div>
      <div
        class="bg-white/5 rounded-sm p-1 border border-white/10"
        v-if="isPlaying && selectedPattern"
      >
        <h4 class="text-white/80 text-xs mb-1 font-bold">Now Playing:</h4>
        <div class="flex flex-wrap gap-1">
          <span
            v-for="(note, index) in selectedPattern.sequence"
            :key="index"
            :class="[
              'p-2 rounded text-xs font-bold ',
              index === currentNoteIndex
                ? 'bg-yellow-500/80 text-white'
                : index < currentNoteIndex
                ? 'bg-green-500/50 text-white/80'
                : 'bg-white/20 text-white/60',
            ]"
          >
            {{ note }}
          </span>
        </div>
      </div>
    </div>

    <!-- Pattern Selection -->
    <div class="">
      <div class="grid grid-cols-2 gap-1 mb-1">
        <button
          @click="selectedCategory = 'intervals'"
          :class="[
            'px-1 py-[1px] text-xs rounded-sm transition-all duration-200 font-bold',
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
            'px-1 py-[1px] text-xs rounded-sm transition-all duration-200 font-bold',
            selectedCategory === 'patterns'
              ? 'bg-blue-500/80 text-white'
              : 'bg-white/20 text-white/80 hover:bg-white/30',
          ]"
        >
          Patterns
        </button>
      </div>
      <div class="grid gap-1 max-h-full overflow-y-auto">
        <button
          v-for="pattern in filteredPatterns"
          :key="pattern.name"
          @click="selectPattern(pattern)"
          :class="[
            'p-3 rounded-sm text-left transition-all duration-200 border',
            selectedPattern?.name === pattern.name
              ? 'bg-purple-500/80 border-purple-400 text-white'
              : 'bg-white/10 border-white/20 text-white/90 hover:bg-white/20',
          ]"
        >
          <div class="font-bold">
            {{ pattern.name }}
          </div>
          <div class="text-xs opacity-75 font-weight-oscillate-sm">
            {{ pattern.emotion }}
          </div>
          <div class="text-2xs opacity-60 mt-1 font-weight-oscillate-sm">
            {{ pattern.sequence.join(" → ") }}
          </div>
        </button>
      </div>
    </div>

    <!-- Playback Controls -->
    <div v-if="selectedPattern" class="mb-1"></div>

    <!-- Current Pattern Visualization -->
    <div class="mb-1"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import type { MelodicPattern } from "@/types/music";
import * as Tone from "tone";

const musicStore = useMusicStore();

// State
const selectedCategory = ref<"intervals" | "patterns">("intervals");
const selectedPattern = ref<MelodicPattern | null>(null);
const isPlaying = ref(false);
const tempo = ref(120);
const baseOctave = ref(4);
const currentNoteIndex = ref(-1);
const currentScheduleIds = ref<number[]>([]);

// Computed
const allPatterns = computed(() => musicStore.getMelodicPatterns());

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

const playPattern = async () => {
  if (!selectedPattern.value || isPlaying.value) return;

  try {
    await Tone.start();
    const transport = Tone.getTransport();

    // Clear any existing schedules
    transport.cancel();
    transport.stop();
    transport.position = 0;
    transport.bpm.value = tempo.value;

    isPlaying.value = true;
    currentNoteIndex.value = -1;
    currentScheduleIds.value = [];

    let currentTime = 0;
    const noteDuration = 0.5; // Half second per note

    selectedPattern.value.sequence.forEach((solfegeName, index) => {
      // Find the solfege index
      const solfegeIndex = musicStore.solfegeData.findIndex(
        (s) => s.name === solfegeName
      );

      if (solfegeIndex >= 0) {
        // Schedule note start
        const startId = transport.schedule((time) => {
          currentNoteIndex.value = index;
          musicStore.attackNoteWithOctave(solfegeIndex, baseOctave.value);
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
