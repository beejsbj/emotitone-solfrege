<template>
  <div class="bg-white/10 backdrop-blur-sm rounded-2xl border border-white/20 p-6">
    <h2 class="text-2xl text-white mb-4 text-center font-weight-oscillate-lg">
      Pattern Player
    </h2>
    <p class="text-gray-300 mb-6 text-center font-weight-oscillate-md">
      Play melodic patterns and intervals to explore emotional relationships
    </p>

    <!-- Pattern Categories -->
    <div class="mb-6">
      <div class="flex justify-center gap-4 mb-4">
        <button
          @click="selectedCategory = 'intervals'"
          :class="[
            'px-4 py-2 rounded-lg transition-all duration-200 font-weight-oscillate-md',
            selectedCategory === 'intervals'
              ? 'bg-blue-500/80 text-white'
              : 'bg-white/20 text-white/80 hover:bg-white/30'
          ]"
        >
          Intervals
        </button>
        <button
          @click="selectedCategory = 'patterns'"
          :class="[
            'px-4 py-2 rounded-lg transition-all duration-200 font-weight-oscillate-md',
            selectedCategory === 'patterns'
              ? 'bg-blue-500/80 text-white'
              : 'bg-white/20 text-white/80 hover:bg-white/30'
          ]"
        >
          Patterns
        </button>
      </div>
    </div>

    <!-- Pattern Selection -->
    <div class="mb-6">
      <div class="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto">
        <button
          v-for="pattern in filteredPatterns"
          :key="pattern.name"
          @click="selectPattern(pattern)"
          :class="[
            'p-3 rounded-lg text-left transition-all duration-200 border',
            selectedPattern?.name === pattern.name
              ? 'bg-purple-500/80 border-purple-400 text-white'
              : 'bg-white/10 border-white/20 text-white/90 hover:bg-white/20'
          ]"
        >
          <div class="font-semibold font-weight-oscillate-md">{{ pattern.name }}</div>
          <div class="text-sm opacity-75 font-weight-oscillate-sm">{{ pattern.emotion }}</div>
          <div class="text-xs opacity-60 mt-1 font-weight-oscillate-sm">
            {{ pattern.sequence.join(' → ') }}
          </div>
        </button>
      </div>
    </div>

    <!-- Playback Controls -->
    <div v-if="selectedPattern" class="mb-6">
      <div class="bg-white/5 rounded-xl p-4 border border-white/10">
        <h3 class="text-lg text-white mb-2 font-weight-oscillate-lg">
          {{ selectedPattern.name }}
        </h3>
        <p class="text-white/80 text-sm mb-3 font-weight-oscillate-md">
          {{ selectedPattern.description }}
        </p>
        
        <!-- Tempo Control -->
        <div class="flex items-center gap-4 mb-4">
          <label class="text-white/80 text-sm font-weight-oscillate-md">Tempo:</label>
          <input
            v-model="tempo"
            type="range"
            min="60"
            max="180"
            step="10"
            class="flex-1 h-2 bg-white/20 rounded-lg appearance-none cursor-pointer"
          />
          <span class="text-white/80 text-sm font-weight-oscillate-md w-12">{{ tempo }} BPM</span>
        </div>

        <!-- Octave Control -->
        <div class="flex items-center gap-4 mb-4">
          <label class="text-white/80 text-sm font-weight-oscillate-md">Octave:</label>
          <select
            v-model="baseOctave"
            class="bg-white/20 text-white rounded-lg px-3 py-1 border border-white/30 font-weight-oscillate-md"
          >
            <option value="3">3</option>
            <option value="4">4</option>
            <option value="5">5</option>
          </select>
        </div>

        <!-- Play Controls -->
        <div class="flex gap-3">
          <button
            @click="playPattern"
            :disabled="isPlaying"
            :class="[
              'px-6 py-2 rounded-lg font-semibold transition-all duration-200 font-weight-oscillate-md',
              isPlaying
                ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                : 'bg-green-500/80 hover:bg-green-500 text-white'
            ]"
          >
            {{ isPlaying ? 'Playing...' : 'Play Pattern' }}
          </button>
          <button
            @click="stopPattern"
            :disabled="!isPlaying"
            :class="[
              'px-6 py-2 rounded-lg font-semibold transition-all duration-200 font-weight-oscillate-md',
              !isPlaying
                ? 'bg-gray-500/50 text-gray-300 cursor-not-allowed'
                : 'bg-red-500/80 hover:bg-red-500 text-white'
            ]"
          >
            Stop
          </button>
        </div>
      </div>
    </div>

    <!-- Current Pattern Visualization -->
    <div v-if="selectedPattern && currentNoteIndex >= 0" class="mb-4">
      <div class="bg-white/5 rounded-xl p-4 border border-white/10">
        <h4 class="text-white/80 text-sm mb-2 font-weight-oscillate-md">Now Playing:</h4>
        <div class="flex flex-wrap gap-2">
          <span
            v-for="(note, index) in selectedPattern.sequence"
            :key="index"
            :class="[
              'px-2 py-1 rounded text-sm font-weight-oscillate-md',
              index === currentNoteIndex
                ? 'bg-yellow-500/80 text-white'
                : index < currentNoteIndex
                ? 'bg-green-500/50 text-white/80'
                : 'bg-white/20 text-white/60'
            ]"
          >
            {{ note }}
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import type { MelodicPattern } from "@/types/music";
import * as Tone from "tone";

const musicStore = useMusicStore();

// State
const selectedCategory = ref<'intervals' | 'patterns'>('intervals');
const selectedPattern = ref<MelodicPattern | null>(null);
const isPlaying = ref(false);
const tempo = ref(120);
const baseOctave = ref(4);
const currentNoteIndex = ref(-1);
const currentScheduleIds = ref<number[]>([]);

// Computed
const allPatterns = computed(() => musicStore.getMelodicPatterns());

const filteredPatterns = computed(() => {
  if (selectedCategory.value === 'intervals') {
    return allPatterns.value.filter(pattern => 
      pattern.intervals && pattern.intervals.length === 1
    );
  } else {
    return allPatterns.value.filter(pattern => 
      !pattern.intervals || pattern.intervals.length !== 1
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
      const solfegeIndex = musicStore.solfegeData.findIndex(s => s.name === solfegeName);
      
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
  currentScheduleIds.value.forEach(id => transport.clear(id));
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
