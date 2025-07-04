<template>
  <div class="relative transition-all duration-300 ease-in-out">
    <!-- Main Controls Container -->
    <div
      class="bg-gray-900/95 backdrop-blur-sm border-t border-white/20 overflow-hidden flex items-center justify-between gap-1"
    >
      <!-- Global Controls -->
      <div class="flex items-center justify-between gap-4 p-2">
        <!-- Left: Master Play Button Knob -->
        <div class="flex items-center gap-2">
          <Knob
            type="button"
            label="Master"
            :icon="globalIsPlaying ? Square : Play"
            :ready-color="
              totalBeats > 0 ? 'hsla(120, 70%, 50%, 1)' : 'hsla(0, 0%, 40%, 1)'
            "
            :active-color="'hsla(0, 84%, 60%, 1)'"
            :is-disabled="totalBeats === 0"
            :is-active="globalIsPlaying"
            @click="toggleGlobalPlayback"
          />
        </div>

        <!-- Center: Tempo -->
        <div class="flex items-center gap-2">
          <Knob
            type="range"
            :model-value="tempo"
            :min="60"
            :max="180"
            label="Tempo"
            :format-value="(v: number) => `${v}`"
            theme-color="hsla(43, 96%, 56%, 1)"
            @update:modelValue="updateTempo"
          />
        </div>

        <!-- Current Step Display -->
        <div class="text-center">
          <Knob
            type="range"
            :is-display="true"
            :model-value="currentStep"
            :min="0"
            :max="sequencerStore.config.steps - 1"
            label="Step"
            :format-value="(v: number) => `${v + 1}`"
            theme-color="hsla(271, 91%, 65%, 1)"
          />
        </div>
      </div>

      <!-- Right: Stats & Library -->
      <!-- Stats Display Knobs -->
      <div class="p-4">
        <!-- Track Count Display -->

        <!-- Library -->
        <MelodyLibrary />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted, watch, nextTick } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { useMusicStore } from "@/stores/music";
import { MultiSequencerTransport } from "@/utils/sequencer/index";
import { AVAILABLE_INSTRUMENTS } from "@/data/instruments";
import MelodyLibrary from "./MelodyLibrary.vue";
import { Knob } from "./knobs";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import { Play, Square } from "lucide-vue-next";

// Store instances
const sequencerStore = useSequencerStore();
const musicStore = useMusicStore();

// Transport management
let multiTransport: MultiSequencerTransport | null = null;

// Local state
const isCollapsed = ref(false);

// Computed values
const sequencers = computed(() => sequencerStore.sequencers);
const activeSequencerId = computed(
  () => sequencerStore.config.activeSequencerId
);
const activeSequencer = computed(() => sequencerStore.activeSequencer);
const globalIsPlaying = computed(() => sequencerStore.config.globalIsPlaying);
const tempo = computed(() => sequencerStore.config.tempo);
const steps = computed(() => sequencerStore.config.steps);
const currentStep = computed(() => {
  const playingSequencers = sequencerStore.playingSequencers;
  return playingSequencers.length > 0 ? playingSequencers[0].currentStep : 0;
});

// Calculate total beats across all sequencers
const totalBeats = computed(() =>
  sequencers.value.reduce((total, seq) => total + seq.beats.length, 0)
);

const updateTempo = (newTempo: string | number | boolean) => {
  const tempoValue = typeof newTempo === "number" ? newTempo : Number(newTempo);
  sequencerStore.setTempo(tempoValue);
  if (multiTransport) {
    multiTransport.updateTempo(tempoValue);
  }
};

const toggleGlobalPlayback = async () => {
  if (globalIsPlaying.value) {
    stopAllPlayback();
  } else {
    await startAllPlayback();
  }
};

const startAllPlayback = async () => {
  if (totalBeats.value === 0) {
    console.log("No beats to play");
    return;
  }

  try {
    console.log("Starting all playback...", {
      totalBeats: totalBeats.value,
      sequencers: sequencers.value.length,
    });

    // Ensure Tone.js context is started
    const Tone = await import("tone");
    if (Tone.getContext().state === "suspended") {
      await Tone.start();
      console.log("Tone.js context started");
    }

    // Initialize transport if needed
    if (!multiTransport) {
      multiTransport = new MultiSequencerTransport();
      console.log("Created new MultiSequencerTransport");
    }

    // Start all sequencers in store first
    await sequencerStore.startAllSequencers();
    console.log("Store sequencers started");

    // Start transport with all playing sequencers
    const playingSeqs = sequencerStore.playingSequencers;
    console.log("Playing sequencers:", playingSeqs.length);

    await multiTransport.startAll(playingSeqs, tempo.value, steps.value);

    console.log("Transport started successfully");
  } catch (error) {
    console.error("Error starting playback:", error);
    stopAllPlayback();
  }
};

const stopAllPlayback = () => {
  if (multiTransport) {
    multiTransport.stopAll();
  }

  sequencerStore.stopAllSequencers();
  musicStore.releaseAllNotes();
};

// Handle individual sequencer play state changes
const handleSequencerInstancePlayback = async (
  sequencerId: string,
  shouldPlay: boolean
) => {
  const sequencer = sequencers.value.find((s) => s.id === sequencerId);
  if (!sequencer) return;

  if (shouldPlay) {
    try {
      if (!multiTransport) {
        multiTransport = new MultiSequencerTransport();
      }

      // Update store state first
      sequencerStore.startSequencer(sequencerId);

      // Then start transport for this specific sequencer
      await multiTransport.startSequencer(sequencer, steps.value);
    } catch (error) {
      console.error(`Error starting sequencer ${sequencerId}:`, error);
      sequencerStore.stopSequencer(sequencerId);
    }
  } else {
    // Stop transport first
    if (multiTransport) {
      multiTransport.stopSequencer(sequencerId);
    }

    // Then update store state
    sequencerStore.stopSequencer(sequencerId);
  }
};

// Delete sequencer handling
const confirmDeleteSequencer = (sequencerId: string) => {
  if (sequencers.value.length === 1) {
    // Don't delete the last sequencer
    return;
  }

  sequencerStore.deleteSequencer(sequencerId);
  triggerUIHaptic();
};

// Initialize store on mount
onMounted(async () => {
  // Wait for next tick to ensure pinia persistence is fully loaded
  await nextTick();
  sequencerStore.initialize();
});

// Cleanup on unmount
onUnmounted(() => {
  stopAllPlayback();
  if (multiTransport) {
    multiTransport.dispose();
    multiTransport = null;
  }
});

// Export for child components
defineExpose({
  handleSequencerInstancePlayback,
});
</script>
