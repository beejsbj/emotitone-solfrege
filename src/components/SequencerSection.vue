<script setup lang="ts">
import { computed } from "vue";
import { useMultiSequencerStore } from "@/stores/multiSequencer";
import CircularSequencer from "./CircularSequencer.vue";

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
    <!-- Circular Sequencer for Active Track -->
    <div class="flex justify-center">
      <div class="w-full max-w-md">
        <CircularSequencer
          v-if="activeSequencerId"
          :sequencer-id="activeSequencerId"
          :key="activeSequencerId"
        />
        <div v-else class="text-center text-white/60 py-12">
          <p class="text-lg mb-2">No sequencer selected</p>
          <p class="text-sm">Add a sequencer to get started</p>
        </div>
      </div>
    </div>
  </div>
</template>
