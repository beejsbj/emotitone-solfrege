<template>
  <div
    class="fixed inset-0 transition-all duration-1000 ease-out"
    :style="{ background: dynamicBackground }"
  ></div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useMusicStore } from "@/stores/music";

const musicStore = useMusicStore();

// Computed dynamic background based on current note
const dynamicBackground = computed(() => {
  if (!musicStore.currentNote) {
    return "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)";
  }

  // Get the current solfege data for the playing note
  const currentSolfege = musicStore.getSolfegeByName(musicStore.currentNote);
  if (currentSolfege) {
    return currentSolfege.colorGradient;
  }

  return "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)";
});
</script>
