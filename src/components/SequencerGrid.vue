<script setup lang="ts">
import { ref, computed } from "vue";
import { useMultiSequencerStore } from "@/stores/multiSequencer";
import { AVAILABLE_INSTRUMENTS } from "@/data/instruments";
import CircularSequencer from "./CircularSequencer.vue";
import SequencerInstanceControls from "./SequencerInstanceControls.vue";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

// Store
const multiSequencerStore = useMultiSequencerStore();

// Local state
const expandedSequencerId = ref<string | null>(null);

// Computed
const sequencers = computed(() => multiSequencerStore.sequencers);

// Methods
const expandSequencer = (sequencerId: string) => {
  expandedSequencerId.value = sequencerId;
  multiSequencerStore.setActiveSequencer(sequencerId);
  triggerUIHaptic();
};

const collapseSequencer = () => {
  expandedSequencerId.value = null;
  triggerUIHaptic();
};

const getSequencerDisplayName = (sequencer: any) => {
  const instrumentConfig = AVAILABLE_INSTRUMENTS[sequencer.instrument];
  const autoDisplayName = instrumentConfig
    ? `${instrumentConfig.displayName} ${sequencer.octave}`
    : `Unknown ${sequencer.octave}`;
  return sequencer.name || autoDisplayName;
};

const getSequencerIcon = (sequencer: any) => {
  const instrumentConfig = AVAILABLE_INSTRUMENTS[sequencer.instrument];
  return instrumentConfig?.icon || "🎵";
};

const getThemeColor = (paletteId?: string) => {
  const colorMap: Record<string, string> = {
    neon: "hsla(158, 100%, 53%, 1)",
    sunset: "hsla(21, 90%, 48%, 1)",
    ocean: "hsla(217, 91%, 60%, 1)",
    purple: "hsla(271, 91%, 65%, 1)",
    pink: "hsla(328, 85%, 70%, 1)",
    gold: "hsla(43, 96%, 56%, 1)",
  };
  return paletteId ? colorMap[paletteId] : null;
};

// Handle sequencer instance events
const handleSequencerInstancePlayback = (
  sequencerId: string,
  shouldPlay: boolean
) => {
  // This will be handled by the parent component
  // For now, just emit the event up
  console.log("Sequencer playback toggle:", sequencerId, shouldPlay);
};

const handleDeleteSequencer = (sequencerId: string) => {
  multiSequencerStore.deleteSequencer(sequencerId);
  if (expandedSequencerId.value === sequencerId) {
    expandedSequencerId.value = null;
  }
  triggerUIHaptic();
};
</script>

<template>
  <div class="space-y-4">
    <!-- Expanded View -->
    <div
      v-if="expandedSequencerId"
      class="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      @click.self="collapseSequencer"
    >
      <div
        class="bg-gray-900/95 border border-white/20 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
        @click.stop
      >
        <!-- Header -->
        <div
          class="flex items-center justify-between p-4 border-b border-white/10"
        >
          <h3 class="text-white font-medium">
            {{
              getSequencerDisplayName(
                sequencers.find((s) => s.id === expandedSequencerId)
              )
            }}
          </h3>
          <button
            @click="collapseSequencer"
            class="p-2 hover:bg-white/10 rounded transition-colors text-white/60 hover:text-white"
          >
            ✕
          </button>
        </div>

        <!-- Expanded Sequencer Content -->
        <div class="p-6 space-y-6">
          <!-- Full Circular Sequencer -->
          <div class="flex justify-center">
            <div class="w-full max-w-md">
              <CircularSequencer
                :sequencer-id="expandedSequencerId"
                :key="expandedSequencerId"
              />
            </div>
          </div>

          <!-- Instance Controls -->
          <SequencerInstanceControls
            :sequencer-id="expandedSequencerId"
            @delete-sequencer="handleDeleteSequencer"
            @playback-toggle="handleSequencerInstancePlayback"
          />
        </div>
      </div>
    </div>

    <!-- Grid View -->
    <div v-if="!expandedSequencerId" class="space-y-4">
      <div class="text-center text-white/80 py-2">
        <h2 class="text-lg font-medium">Sequencers</h2>
        <p class="text-sm text-white/60">
          Tap to expand • {{ sequencers.length }} tracks
        </p>
      </div>

      <!-- Empty State -->
      <div
        v-if="sequencers.length === 0"
        class="text-center text-white/60 py-12"
      >
        <p class="text-lg mb-2">No sequencers yet</p>
        <p class="text-sm">Add a sequencer to get started</p>
      </div>

      <!-- Sequencer Grid -->
      <div
        v-else
        class="grid gap-4"
        :class="{
          'grid-cols-2': sequencers.length <= 4,
          'grid-cols-3': sequencers.length > 4 && sequencers.length <= 9,
          'grid-cols-4': sequencers.length > 9,
        }"
      >
        <div
          v-for="sequencer in sequencers"
          :key="sequencer.id"
          @click="expandSequencer(sequencer.id)"
          class="relative group cursor-pointer transition-all duration-300 hover:scale-105"
        >
          <!-- Sequencer Card -->
          <div
            class="bg-gray-900/80 border rounded-lg p-3 backdrop-blur-sm transition-all duration-300 hover:bg-gray-800/80"
            :class="sequencer.color ? '' : 'border-white/10'"
            :style="
              sequencer.color
                ? {
                    borderColor: getThemeColor(sequencer.color)?.replace(
                      '1)',
                      '0.3)'
                    ),
                    boxShadow: `0 0 20px ${getThemeColor(
                      sequencer.color
                    )?.replace('1)', '0.1)')}`,
                  }
                : {}
            "
          >
            <!-- Header -->
            <div class="flex items-center justify-between mb-2">
              <div class="flex items-center gap-2 min-w-0 flex-1">
                <span class="text-sm">{{ getSequencerIcon(sequencer) }}</span>
                <span class="text-xs font-medium text-white truncate">
                  {{ getSequencerDisplayName(sequencer) }}
                </span>
              </div>
              <div class="flex items-center gap-1 text-xs">
                <span
                  class="px-1.5 py-0.5 rounded-sm font-medium"
                  :class="
                    sequencer.color
                      ? 'bg-white/20'
                      : 'bg-blue-500/20 text-blue-400'
                  "
                  :style="
                    sequencer.color && getThemeColor(sequencer.color)
                      ? { color: getThemeColor(sequencer.color)! }
                      : {}
                  "
                >
                  {{ sequencer.beats.length }}
                </span>
              </div>
            </div>

            <!-- Compact Circular Sequencer -->
            <div class="flex justify-center">
              <div class="w-20 h-20">
                <CircularSequencer
                  :sequencer-id="sequencer.id"
                  :compact="true"
                  :key="`compact-${sequencer.id}`"
                  @expand="expandSequencer(sequencer.id)"
                />
              </div>
            </div>

            <!-- Status Indicator -->
            <div class="flex items-center justify-center mt-2">
              <div
                class="w-2 h-2 rounded-full transition-colors"
                :class="{
                  'bg-green-400': sequencer.isPlaying && !sequencer.isMuted,
                  'bg-red-400': sequencer.isMuted,
                  'bg-gray-500': !sequencer.isPlaying && !sequencer.isMuted,
                }"
              />
            </div>
          </div>

          <!-- Hover Overlay -->
          <div
            class="absolute inset-0 bg-white/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions for grid items */
.grid > div {
  transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
