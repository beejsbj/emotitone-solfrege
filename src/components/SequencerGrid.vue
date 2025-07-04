<script setup lang="ts">
import { onUnmounted } from "vue";
import CircularSequencer from "./CircularSequencer.vue";
import SequencerInstanceControls from "./SequencerInstanceControls.vue";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

// Composables
import { useSequencerGrid } from "@/composables/sequencer/useSequencerGrid";
import { useSequencerTransport } from "@/composables/sequencer/useSequencerTransport";

// Components
import SequencerGridItem from "./sequencer/grid/SequencerGridItem.vue";
import SequencerGridEmpty from "./sequencer/grid/SequencerGridEmpty.vue";
import SequencerGridOverlays from "./sequencer/grid/SequencerGridOverlays.vue";

// Grid management
const {
  sequencers,
  activeSequencer,
  gridSlots,
  canAddSequencer,
  getThemeColor,
  getSequencerIcon,
  getSlotKey,
  isActiveSlot,
  addNewSequencer,
} = useSequencerGrid();

// Transport and interaction
const {
  handleSequencerPressStart,
  handleSequencerPressEnd,
  isPressedState,
  cleanup,
} = useSequencerTransport();

// Event handlers
const handleAddSequencer = () => {
  const added = addNewSequencer();
  if (added) {
    triggerUIHaptic();
  }
};

// Lifecycle
onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div class="flex flex-col h-full space-y-4">
    <!-- Expanded Sequencer View -->
    <div
      class="transition-opacity duration-300"
      :class="activeSequencer ? 'opacity-100' : 'opacity-0 pointer-events-none'"
    >
      <!-- Full Circular Sequencer -->
      <div class="flex justify-center">
        <div class="w-full max-w-sm">
          <CircularSequencer
            :expanded="true"
            :sequencer-id="activeSequencer?.id"
          />
        </div>
      </div>

      <!-- Instance Controls -->
      <SequencerInstanceControls />
    </div>

    <!-- Sequencer Grid -->
    <div class="flex-1 space-y-3">
      <!-- Fixed 16-Slot Grid (4x4) -->
      <div class="grid grid-cols-4 gap-1 px-1">
        <div
          v-for="slot in gridSlots"
          :key="getSlotKey(slot)"
          class="relative group cursor-pointer transition-all duration-200 hover:scale-105"
        >
          <!-- Sequencer Card -->
          <SequencerGridItem
            v-if="slot.type === 'sequencer'"
            :sequencer="slot.sequencer"
            :isActive="isActiveSlot(slot)"
            :isPressed="isPressedState(slot.sequencer.id)"
            :getThemeColor="getThemeColor"
            :getSequencerIcon="getSequencerIcon"
            :onPressStart="handleSequencerPressStart"
            :onPressEnd="handleSequencerPressEnd"
          />

          <!-- Empty Slot Card -->
          <SequencerGridEmpty
            v-else
            :canAdd="canAddSequencer"
            :onAdd="handleAddSequencer"
          />

          <!-- Overlays -->
          <SequencerGridOverlays
            v-if="slot.type === 'sequencer'"
            :sequencer="slot.sequencer"
            :isActive="isActiveSlot(slot)"
            :isPressed="isPressedState(slot.sequencer.id)"
            :getThemeColor="getThemeColor"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* Smooth transitions for grid items */
.grid > div {
  transition: transform 0.15s cubic-bezier(0.4, 0, 0.2, 1);
}
</style>
