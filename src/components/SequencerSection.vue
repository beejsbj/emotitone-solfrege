<script setup lang="ts">
import { computed } from "vue";
import { useMultiSequencerStore } from "@/stores/multiSequencer";
import SequencerGrid from "./SequencerGrid.vue";

// Store
const multiSequencerStore = useMultiSequencerStore();

// Computed
const activeSequencer = computed(() => multiSequencerStore.activeSequencer);
const activeSequencerId = computed(
  () => multiSequencerStore.config.activeSequencerId
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
