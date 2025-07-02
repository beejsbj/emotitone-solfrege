<template>
  <div class="relative transition-all duration-300 ease-in-out">
    <!-- Main Controls Container -->
    <div
      class="bg-gray-900/95 backdrop-blur-sm border-t border-white/20 overflow-hidden"
    >
      <!-- Global Controls -->
      <div class="flex items-center justify-between gap-4 p-3 bg-black/30">
        <!-- Left: Play All -->
        <div class="flex items-center gap-2">
          <button
            @click="toggleGlobalPlayback"
            :disabled="totalBeats === 0"
            :class="[
              'px-3 py-1.5 rounded text-xs font-medium transition-all duration-200 flex items-center gap-1',
              globalIsPlaying
                ? 'bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-400'
                : totalBeats > 0
                ? 'bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-400'
                : 'bg-gray-600/20 border border-gray-600/30 text-gray-500 cursor-not-allowed',
            ]"
          >
            <CircleStop v-if="globalIsPlaying" :size="12" />
            <Play v-else :size="12" />
            <span>{{ globalIsPlaying ? "Stop All" : "Play All" }}</span>
          </button>
        </div>

        <!-- Center: Tempo -->
        <div class="flex items-center gap-2">
          <Knob
            :value="tempo"
            :min="60"
            :max="180"
            :step="10"
            param-name="Tempo"
            :format-value="formatTempo"
            :is-disabled="globalIsPlaying"
            @update:value="updateTempo"
            class="tempo-knob"
          />
        </div>

        <!-- Right: Stats & Library -->
        <div class="flex flex-col gap-2 items-end">
          <!-- Stats -->
          <div class="flex items-center gap-3 text-[10px]">
            <div class="flex items-center gap-1">
              <span class="text-white/50">Tracks:</span>
              <span class="text-white/70 font-medium">{{
                sequencers.length
              }}</span>
            </div>
            <div class="flex items-center gap-1">
              <span class="text-white/50">Beats:</span>
              <span class="text-blue-400 font-medium">{{ totalBeats }}</span>
            </div>
          </div>

          <!-- Library -->
          <MelodyLibrary />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onUnmounted, onMounted, watch, nextTick } from "vue";
import { useMultiSequencerStore } from "@/stores/multiSequencer";
import { useMusicStore } from "@/stores/music";
import { MultiSequencerTransport } from "@/utils/multiSequencer";
import { AVAILABLE_INSTRUMENTS } from "@/data/instruments";
import { Tabs, TabsList, TabsTrigger } from "./ui";
import SequencerInstanceControls from "./SequencerInstanceControls.vue";
import MelodyLibrary from "./MelodyLibrary.vue";
import Knob from "./Knob.vue";
import { CircleStop, Play, ChevronDown } from "lucide-vue-next";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

// Store instances
const multiSequencerStore = useMultiSequencerStore();
const musicStore = useMusicStore();

// Transport management
let multiTransport: MultiSequencerTransport | null = null;

// Local state
const isCollapsed = ref(false);

// Computed values
const sequencers = computed(() => multiSequencerStore.sequencers);
const activeSequencerId = computed(
  () => multiSequencerStore.config.activeSequencerId
);
const activeSequencer = computed(() => multiSequencerStore.activeSequencer);
const globalIsPlaying = computed(
  () => multiSequencerStore.config.globalIsPlaying
);
const tempo = computed(() => multiSequencerStore.config.tempo);
const steps = computed(() => multiSequencerStore.config.steps);

// Calculate total beats across all sequencers
const totalBeats = computed(() =>
  sequencers.value.reduce((total, seq) => total + seq.beats.length, 0)
);

// Create tabs for sequencer navigation
const sequencerTabs = computed(() =>
  sequencers.value.map((seq) => {
    const instrumentConfig = AVAILABLE_INSTRUMENTS[seq.instrument];
    const autoDisplayName = instrumentConfig
      ? `${instrumentConfig.displayName} ${seq.octave}`
      : `Unknown ${seq.octave}`;

    // Use custom name if set (not empty), otherwise auto-generated name
    const displayName = seq.name || autoDisplayName;

    return {
      id: seq.id,
      label: displayName,
      icon: instrumentConfig?.icon || "🎵",
      badge: seq.beats.length > 0 ? `${seq.beats.length}` : undefined,
      disabled: false,
      color: seq.color,
    };
  })
);

// Format functions
const formatTempo = (value: number) => `${value}`;

// Methods
const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value;
  triggerUIHaptic();
};

const setActiveSequencer = (id: string) => {
  multiSequencerStore.setActiveSequencer(id);
  triggerUIHaptic();
};

const updateTempo = (newTempo: number) => {
  multiSequencerStore.setTempo(newTempo);
  if (multiTransport) {
    multiTransport.updateTempo(newTempo);
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
    await multiSequencerStore.startAllSequencers();
    console.log("Store sequencers started");

    // Start transport with all playing sequencers
    const playingSeqs = multiSequencerStore.playingSequencers;
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

  multiSequencerStore.stopAllSequencers();
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
      multiSequencerStore.startSequencer(sequencerId);

      // Then start transport for this specific sequencer
      await multiTransport.startSequencer(sequencer, steps.value);
    } catch (error) {
      console.error(`Error starting sequencer ${sequencerId}:`, error);
      multiSequencerStore.stopSequencer(sequencerId);
    }
  } else {
    // Stop transport first
    if (multiTransport) {
      multiTransport.stopSequencer(sequencerId);
    }

    // Then update store state
    multiSequencerStore.stopSequencer(sequencerId);
  }
};

// Delete sequencer handling
const confirmDeleteSequencer = (sequencerId: string) => {
  if (sequencers.value.length === 1) {
    // Don't delete the last sequencer
    return;
  }

  multiSequencerStore.deleteSequencer(sequencerId);
  triggerUIHaptic();
};

// Initialize store on mount
onMounted(async () => {
  // Wait for next tick to ensure pinia persistence is fully loaded
  await nextTick();
  multiSequencerStore.initialize();
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
