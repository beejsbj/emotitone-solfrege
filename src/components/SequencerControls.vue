<template>
  <div class="relative transition-all duration-300 ease-in-out">
    <!-- Main Controls Container -->
    <div
      class="bg-gray-900/95 backdrop-blur-sm border-t border-white/20 overflow-hidden"
    >
      <Tabs :value="activeSequencerId || ''" @update:value="setActiveSequencer">
        <!-- Tab Navigation for Sequencers -->
        <div class="border-b border-white/10 px-2 py-1">
          <TabsList class="w-full h-auto bg-gray-800/50 p-1 gap-1">
            <TabsTrigger
              v-for="tab in sequencerTabs"
              :key="tab.id"
              :value="tab.id"
              :disabled="tab.disabled"
              class="flex items-center gap-2 px-3 py-2 text-xs data-[state=active]:bg-gray-700 data-[state=active]:text-white hover:text-white text-gray-300 bg-transparent border-0 rounded-md whitespace-nowrap"
              :style="{
                boxShadow:
                  tab.id === activeSequencerId && tab.color
                    ? `0 0 10px ${tab.color}30`
                    : undefined,
              }"
            >
              <span
                class="text-sm"
                :style="{
                  color:
                    tab.id === activeSequencerId && tab.color
                      ? tab.color
                      : undefined,
                }"
              >
                {{ tab.icon }}
              </span>
              <span>{{ tab.label }}</span>
              <span
                v-if="tab.badge"
                class="ml-1 px-1.5 py-0.5 text-xs rounded-full bg-white/10 text-white/70"
              >
                {{ tab.badge }}
              </span>
            </TabsTrigger>
          </TabsList>
        </div>
      </Tabs>

      <!-- Active Sequencer Controls -->
      <div v-if="activeSequencer" class="p-3 border-b border-white/10">
        <SequencerInstanceControls
          :sequencer-id="activeSequencer.id"
          @delete-sequencer="confirmDeleteSequencer"
          @playback-toggle="handleSequencerInstancePlayback"
        />
      </div>

      <!-- Global Controls -->
      <div class="flex items-center justify-between gap-4 p-3 bg-black/30">
        <!-- Left: Add & Play All -->
        <div class="flex items-center gap-2">
          <button
            @click="addNewSequencer"
            class="px-3 py-1.5 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-400 rounded text-xs font-medium transition-all duration-200 flex items-center gap-1"
          >
            <Plus :size="12" />
            <span>Add</span>
          </button>

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
import { Plus, CircleStop, Play, ChevronDown } from "lucide-vue-next";
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

const addNewSequencer = () => {
  const newSeq = multiSequencerStore.createSequencer();
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
  if (totalBeats.value === 0) return;

  try {
    // Initialize transport if needed
    if (!multiTransport) {
      multiTransport = new MultiSequencerTransport();
    }

    // Start all sequencers
    await multiSequencerStore.startAllSequencers();

    // Start transport with all playing sequencers
    await multiTransport.startAll(
      multiSequencerStore.playingSequencers,
      tempo.value,
      steps.value
    );
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
