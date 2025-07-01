<template>
  <div class="sequencer-player bg-gray-900/90 backdrop-blur-sm border-b border-white/20 px-4 py-3">
    <div class="flex items-center justify-between max-w-7xl mx-auto">
      <!-- Transport Controls -->
      <div class="flex items-center gap-3">
        <button
          @click="togglePlayback"
          :class="[
            'flex items-center gap-2 px-6 py-3 rounded-lg font-bold transition-all duration-200 text-lg',
            isPlaying
              ? 'bg-red-500/80 hover:bg-red-500 text-white shadow-lg shadow-red-500/20'
              : 'bg-green-500/80 hover:bg-green-500 text-white shadow-lg shadow-green-500/20',
          ]"
        >
          <span v-if="isPlaying" class="text-xl">⏹</span>
          <span v-else class="text-xl">▶</span>
          {{ isPlaying ? "Stop" : "Play" }}
        </button>
        
        <button
          @click="clearSequencer"
          class="flex items-center gap-2 px-4 py-3 bg-gray-600/80 hover:bg-gray-600 text-white rounded-lg font-bold transition-all duration-200"
        >
          <span class="text-lg">🗑</span>
          Clear
        </button>
      </div>

      <!-- Parameter Controls -->
      <div class="flex items-center gap-6">
        <!-- Tempo Control -->
        <div class="flex items-center gap-3">
          <label class="text-white font-medium text-sm">Tempo</label>
          <Knob
            :value="tempo"
            :min="60"
            :max="180"
            :step="10"
            param-name="BPM"
            :format-value="formatTempo"
            :is-disabled="false"
            :size="60"
            @update:value="updateTempo"
          />
        </div>

        <!-- Octave Control -->
        <div class="flex items-center gap-3">
          <label class="text-white font-medium text-sm">Octave</label>
          <Knob
            :value="octave"
            :min="3"
            :max="5"
            :step="1"
            param-name="Oct"
            :format-value="formatOctave"
            :is-disabled="false"
            :size="60"
            @update:value="updateOctave"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import Knob from './Knob.vue';

// Props
interface Props {
  isPlaying: boolean;
  tempo: number;
  octave: number;
}

const props = defineProps<Props>();

// Emits
interface Emits {
  (event: 'toggle-playback'): void;
  (event: 'clear-sequencer'): void;
  (event: 'update-tempo', value: number): void;
  (event: 'update-octave', value: number): void;
}

const emit = defineEmits<Emits>();

// Format functions
const formatTempo = (value: number) => `${value}`;
const formatOctave = (value: number) => `${value}`;

// Event handlers
const togglePlayback = () => emit('toggle-playback');
const clearSequencer = () => emit('clear-sequencer');
const updateTempo = (value: number) => emit('update-tempo', value);
const updateOctave = (value: number) => emit('update-octave', value);
</script>

<style scoped>
.sequencer-player {
  position: sticky;
  top: 0;
  z-index: 40;
}
</style>