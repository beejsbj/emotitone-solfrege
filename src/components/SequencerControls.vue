<template>
  <div
    class="relative transition-all duration-300 ease-in-out"
    :class="{
      'transform translate-y-full': isCollapsed,
      'transform translate-y-0': !isCollapsed,
    }"
  >
    <!-- Floating Toggle Button -->
    <button
      @click="toggleCollapsed"
      class="absolute top-2 right-4 -translate-y-full px-4 z-10 bg-gradient-to-b from-gray-700/80 to-black inset-shadow-lg p-2 hover:bg-white/40 transition-all duration-200 group rounded-lg flex items-center gap-2"
    >
      Player
      <ChevronDown
        :size="16"
        class="text-white/80 transition-transform duration-300"
        :class="{ 'rotate-180': isCollapsed }"
      />
    </button>

    <!-- Main Controls Container -->
    <div
      class="bg-black/70 backdrop-blur-sm rounded-sm border border-white/20 p-4 overflow-hidden"
    >
      <!-- Melody Management Row -->
      <div
        class="grid grid-cols-2 items-center gap-1 pb-4 border-b border-white/10"
      >
        <!-- Melody Library Dropdown -->
        <MelodyLibrary />

        <!-- Save Melody Section -->
        <div class="grid grid-cols-[1fr_auto] items-center gap-[1px]">
          <input
            v-model="newMelodyName"
            placeholder="Melody name..."
            class="bg-gray-800/80 text-white border border-white/20 rounded-sm px-3 py-2 text-sm placeholder-white/60 w-40"
          />
          <button
            @click="saveCurrentMelody"
            :disabled="!newMelodyName || beatCount === 0"
            class="p-3 bg-blue-500/80 hover:bg-blue-500 disabled:bg-gray-500/50 text-white rounded-sm font-bold transition-all duration-200"
          >
            <Save :size="14" />
          </button>
        </div>
      </div>
      <!-- Main Controls Row -->
      <div class="grid grid-cols-3 items-center gap-1">
        <!-- Playback Controls -->
        <div class="flex gap-2">
          <button
            @click="togglePlayback"
            :class="[
              'px-4 py-2 rounded-sm font-bold transition-all duration-200 flex items-center gap-2',
              isPlaying
                ? 'bg-red-500/80 hover:bg-red-500 text-white'
                : 'bg-green-500/80 hover:bg-green-500 text-white',
            ]"
          >
            <CircleStop v-if="isPlaying" :size="16" />
            <Play v-else :size="16" />
          </button>

          <button
            @click="clearSequencer"
            class="px-4 py-2 bg-gray-500/80 hover:bg-gray-500 text-white rounded-sm font-bold transition-all duration-200 flex items-center gap-2"
          >
            <Trash :size="16" />
          </button>
        </div>

        <!-- Tempo Control -->
        <div class="flex items-center justify-self-center gap-2">
          <Knob
            :value="tempo"
            :min="60"
            :max="180"
            :step="10"
            param-name="Tempo"
            :format-value="formatTempo"
            :is-disabled="isPlaying"
            @update:value="updateTempo"
            class="w-16 h-16"
          />
        </div>

        <!-- Octave Control -->
        <div class="flex items-center justify-self-center gap-2">
          <Knob
            :value="baseOctave"
            :min="3"
            :max="5"
            :step="1"
            param-name="Octave"
            :format-value="formatOctave"
            :is-disabled="isPlaying"
            @update:value="updateOctave"
            class="w-16 h-16"
          />
        </div>

        <div class="flex items-center gap-2">
          <!-- Beat Count -->
          <div class="flex items-center gap-2 text-white/80 text-sm">
            <span class="font-bold">Beats:</span>
            <span class="bg-blue-500/20 px-2 py-1 rounded text-blue-200">
              {{ beatCount }}
            </span>
          </div>
          <!-- Steps Display -->
          <div class="flex items-center gap-2 text-white/80 text-sm">
            <span class="font-bold">Steps:</span>
            <span>{{ steps }}</span>
          </div>

          <!-- Current Step Indicator -->
          <div
            v-if="isPlaying"
            class="flex items-center gap-2 text-white/80 text-sm"
          >
            <span class="font-bold">Current:</span>
            <span class="bg-yellow-500/20 px-2 py-1 rounded text-yellow-200">
              {{ currentStep + 1 }}/{{ steps }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { SequencerTransport } from "@/utils/sequencer";
import { calculateNoteDuration } from "@/utils/duration";
import Knob from "./Knob.vue";
import MelodyLibrary from "./MelodyLibrary.vue";
import { Save, CircleStop, Play, Trash, ChevronDown } from "lucide-vue-next";

// Remove function props - component is now self-contained
const musicStore = useMusicStore();

// Transport management - moved from parent component
let sequencerTransport: SequencerTransport | null = null;

// Local state for melody saving
const newMelodyName = ref("");

// Collapse state
const isCollapsed = ref(false);

// Computed values from store
const isPlaying = computed(() => musicStore.sequencerConfig.isPlaying);
const tempo = computed(() => musicStore.sequencerConfig.tempo);
const baseOctave = computed(() => musicStore.sequencerConfig.baseOctave);
const steps = computed(() => musicStore.sequencerConfig.steps);
const currentStep = computed(() => musicStore.sequencerConfig.currentStep);
const beatCount = computed(() => musicStore.sequencerBeats.length);
const beats = computed(() => musicStore.sequencerBeats);
const config = computed(() => musicStore.sequencerConfig);

// Format functions for knobs
const formatTempo = (value: number) => `${value}`;
const formatOctave = (value: number) => `${value}`;

// Toggle collapse function
const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value;
};

// Control functions - now directly using the store
const updateTempo = (newTempo: number) => {
  musicStore.updateSequencerConfig({ tempo: newTempo });
};

const updateOctave = (newOctave: number) => {
  musicStore.updateSequencerConfig({ baseOctave: newOctave });
};

// Playback functions - moved from parent component and made internal
const togglePlayback = async () => {
  if (config.value.isPlaying) {
    stopPlayback();
  } else {
    await startPlayback();
  }
};

const startPlayback = async () => {
  if (beats.value.length === 0) return;

  try {
    // Initialize sequencer transport if not already done
    if (!sequencerTransport) {
      sequencerTransport = new SequencerTransport();
    }

    // Use improved Part for better timing and visual sync
    sequencerTransport.initWithImprovedPart(
      [...beats.value], // Convert readonly array to mutable
      config.value.steps,
      config.value.tempo,
      (beat, time) => {
        // Calculate the proper duration based on the beat's visual representation
        const noteDuration = calculateNoteDuration(
          beat.duration,
          config.value.steps,
          config.value.tempo
        );

        // Play the note with the correct duration
        musicStore.playNoteWithDuration(
          beat.solfegeIndex,
          beat.octave,
          noteDuration.toneNotation,
          time
        );
      },
      (step, time) => {
        // Update visual step indicator
        musicStore.updateSequencerConfig({ currentStep: step });
      }
    );

    musicStore.updateSequencerConfig({ isPlaying: true, currentStep: 0 });

    // Start playback
    await sequencerTransport.start();
  } catch (error) {
    console.error("Error starting playback:", error);
    stopPlayback();
  }
};

const stopPlayback = () => {
  if (sequencerTransport) {
    sequencerTransport.stop();
  }

  musicStore.releaseAllNotes();
  musicStore.updateSequencerConfig({ isPlaying: false, currentStep: 0 });
};

const clearSequencer = () => {
  // Stop playback if running and clear beats
  if (isPlaying.value) {
    stopPlayback();
  }
  musicStore.clearSequencerBeats();
};

const saveCurrentMelody = () => {
  if (!newMelodyName.value || beatCount.value === 0) return;

  musicStore.saveMelody(
    newMelodyName.value,
    `Sequencer melody with ${beatCount.value} beats`,
    "Custom"
  );

  newMelodyName.value = "";
};

// Lifecycle cleanup
onUnmounted(() => {
  stopPlayback();
  if (sequencerTransport) {
    sequencerTransport.dispose();
    sequencerTransport = null;
  }
});
</script>

<style scoped>
/* Ensure knobs are properly sized */
.w-16 {
  min-width: 4rem;
}

.h-16 {
  min-height: 4rem;
}
</style>
