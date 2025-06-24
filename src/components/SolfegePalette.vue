<template>
  <div
    class="bg-white/10 backdrop-blur-sm border relative"
    :style="{ height: `${paletteHeight}px` }"
  >
    <!-- Palette Controls with Flick Handle, Resize Handle, and Last Solfege Toggle -->
    <PaletteControls
      v-model:main-octave="mainOctave"
      v-model:palette-height="paletteHeight"
      v-model:show-last-solfege="showLastSolfege"
    />

    <!-- Solfege Buttons with Dynamic Row Layout -->
    <div
      class="grid gap-[1px] overflow-hidden"
      :class="showLastSolfege ? 'grid-cols-8' : 'grid-cols-7'"
      :style="{ height: `${paletteHeight - 12}px` }"
    >
      <SolfegeButton
        v-for="(solfege, index) in visibleSolfegeData"
        :key="solfege.name"
        :solfege="solfege"
        :solfege-index="index"
        :main-octave="mainOctave"
        :current-mode="musicStore.currentMode"
        :current-scale-note="musicStore.currentScaleNotes[index]"
        :button-height="buttonHeight"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useMusicStore } from "@/stores/music";
import { useKeyboardControls } from "@/composables/useKeyboardControls";
import PaletteControls from "./PaletteControls.vue";
import SolfegeButton from "./SolfegeButton.vue";

const musicStore = useMusicStore();

// Main octave state (default to 4, can range from 2 to 6)
const mainOctave = ref(4);

// Palette height state (default to 12rem = 192px, min 8rem = 128px, max 25rem = 400px for more rows)
const paletteHeight = ref(192);

// Show last solfege note (Ti) toggle state
const showLastSolfege = ref(false);

// Calculate button height based on palette height
const buttonHeight = computed(() => paletteHeight.value - 12); // Subtract palette controls height

// Computed property for visible solfege data based on toggle
const visibleSolfegeData = computed(() => {
  if (showLastSolfege.value) {
    return musicStore.solfegeData; // Show all 8 notes including Ti (Do to La)
  } else {
    return musicStore.solfegeData.slice(0, -1); // Show only first 7 notes (Do to Ti)
  }
});

// Setup keyboard controls
useKeyboardControls(mainOctave);
</script>

<style scoped>
/* Resize handle styles */
.cursor-ns-resize {
  cursor: ns-resize;
}

.cursor-ns-resize:active {
  cursor: ns-resize;
}

/* Smooth transitions for height changes */
.transition-all {
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 150ms;
}
</style>
