<script setup lang="ts">
import { computed } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { useSequencerControls } from "@/composables/sequencer/useSequencerControls";
import InstrumentSelector from "@/components/InstrumentSelector.vue";
import SequencerHeader from "@/components/sequencer/controls/SequencerHeader.vue";
import SequencerPlayback from "@/components/sequencer/controls/SequencerPlayback.vue";
import SequencerProperties from "@/components/sequencer/controls/SequencerProperties.vue";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

interface Props {
  sequencerId?: string; // Made optional so it can access active sequencer internally
}

const props = defineProps<Props>();

// Stores
const sequencerStore = useSequencerStore();

// Get the sequencer ID to use for operations
const sequencerId = computed(
  () => props.sequencerId || sequencerStore.config.activeSequencerId || ""
);

// Use the composable for shared logic
const { sequencer, themeColors, dynamicStyles } = useSequencerControls(
  sequencerId.value
);

// Computed
const instrument = computed(() => sequencer.value?.instrument || "synth");

// Methods
const selectInstrument = (instrumentId: string) => {
  if (!sequencerId.value) return;
  sequencerStore.updateSequencer(sequencerId.value, {
    instrument: instrumentId,
  });
  triggerUIHaptic();
};
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-md p-3 bg-black/80 border shadow-lg backdrop-blur-sm transition-opacity duration-300"
    :class="[
      sequencer ? 'opacity-100' : 'opacity-0 pointer-events-none',
      themeColors ? '' : 'border-white/10',
    ]"
    :style="
      themeColors
        ? {
            ...dynamicStyles,
            borderColor: themeColors.primary
              .replace('1)', '0.3)')
              .replace('hsla(', 'hsla('),
            boxShadow: `0 0 20px ${themeColors.primary
              .replace('1)', '0.1)')
              .replace('hsla(', 'hsla(')}`,
          }
        : dynamicStyles
    "
  >
    <!-- Header: Icon, Name, Beat Count, Quick Actions -->
    <SequencerHeader :sequencer-id="sequencerId" :theme-colors="themeColors" />

    <!-- Instrument Selector -->
    <div class="w-full">
      <InstrumentSelector
        :current-instrument="instrument"
        :on-select-instrument="selectInstrument"
        :compact="true"
      />
    </div>

    <!-- Control Sections -->
    <div class="flex gap-3">
      <!-- Playback Controls -->
      <SequencerPlayback
        :sequencer-id="sequencerId"
        :theme-colors="themeColors"
      />

      <!-- Audio Controls -->
      <SequencerProperties
        :sequencer-id="sequencerId"
        :theme-colors="themeColors"
      />
    </div>
  </div>
</template>

<style scoped>
/* Minimal custom styles - most styling now handled by Tailwind classes */
</style>
