<script setup lang="ts">
import { computed } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import SequencerGrid from "./SequencerGrid.vue";

// Store
const sequencerStore = useSequencerStore();

// Computed
const activeSequencer = computed(() => sequencerStore.activeSequencer);
const activeSequencerId = computed(
  () => sequencerStore.config.activeSequencerId
);
</script>

<template>
  <div class="space-y-4">
    <!-- Sequencer Grid - Alternative to single sequencer view -->
    <div class="flex justify-center">
      <div class="w-full max-w-4xl">
        <SequencerGrid />
      </div>
    </div>
  </div>
</template>
