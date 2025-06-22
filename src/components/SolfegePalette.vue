<template>
  <div
    class="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20"
  >
    <h2
      class="text-2xl text-white mb-4 text-center"
      :style="{ fontWeight: oscillatingHeaderWeight }"
    >
      Solfege Palette
    </h2>
    <p
      class="text-gray-300 mb-6 text-center"
      :style="{ fontWeight: oscillatingSubheaderWeight }"
    >
      Tap the solfege degrees to hear their emotional character in
      {{ musicStore.currentKeyDisplay }}
    </p>

    <!-- Solfege Buttons -->
    <div class="grid grid-cols-8 gap-4">
      <button
        v-for="(solfege, index) in musicStore.solfegeData"
        :key="solfege.name"
        class="btn-solfege bg-white/20 hover:bg-white/30 text-white font-semibold py-4 px-6 rounded-xl transition-all duration-150 backdrop-blur-sm border border-white/30 min-h-[4rem] select-none active:scale-95"
        @mousedown="(e) => attackNote(index, e)"
        @mouseup="(e) => releaseNote(e)"
        @mouseleave="(e) => releaseNote(e)"
        @touchstart.prevent="(e) => attackNote(index, e)"
        @touchend.prevent="(e) => releaseNote(e)"
        @contextmenu.prevent
        @dragstart.prevent
        :style="{
          background:
            musicStore.currentNote === solfege.name
              ? solfege.colorGradient
              : undefined,
          transform:
            musicStore.currentNote === solfege.name ? 'scale(0.98)' : undefined,
          boxShadow:
            musicStore.currentNote === solfege.name
              ? '0 8px 25px rgba(255, 255, 255, 0.25)'
              : undefined,
        }"
      >
        <div
          class="text-lg"
          :style="{ fontWeight: oscillatingButtonWeights[index] }"
        >
          {{ solfege.name }}
        </div>
        <div
          class="text-xs opacity-75"
          :style="{ fontWeight: oscillatingNoteWeights[index] }"
        >
          {{ musicStore.currentScaleNotes[index] }}
        </div>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";

const musicStore = useMusicStore();

// Oscillating font weights for headers
const oscillatingHeaderWeight = ref(600);
const oscillatingSubheaderWeight = ref(400);

// Oscillating font weights for buttons (array for each button)
const oscillatingButtonWeights = ref(Array(8).fill(600));
const oscillatingNoteWeights = ref(Array(8).fill(400));

let animationId: number | null = null;

const startFontWeightOscillation = () => {
  if (!musicStore.currentNote) return;

  // Find the solfege index to get frequency
  const currentSolfegeIndex = musicStore.solfegeData.findIndex(
    (s) => s.name === musicStore.currentNote
  );
  if (currentSolfegeIndex === -1) return;

  // Get frequency for the current note
  const frequency = musicStore.getNoteFrequency(currentSolfegeIndex, 4);

  // Base font weights mapped to frequency
  const minFreq = 200;
  const maxFreq = 600;
  const minWeight = 400;
  const maxWeight = 700;

  const clampedFreq = Math.max(minFreq, Math.min(maxFreq, frequency));
  const normalizedFreq = (clampedFreq - minFreq) / (maxFreq - minFreq);
  const baseFontWeight = Math.round(
    minWeight + normalizedFreq * (maxWeight - minWeight)
  );

  // Oscillation parameters
  const headerAmplitude = 80; // Smaller amplitude for headers
  const buttonAmplitude = 120; // Larger amplitude for active button
  const visualFrequency = frequency / 100; // Scale down for visual oscillation

  let startTime = 0;

  const animate = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const elapsed = (timestamp - startTime) / 1000;

    // Create oscillating font weights using sine waves
    const oscillation = Math.sin(elapsed * visualFrequency * 2 * Math.PI);

    // Headers oscillate subtly
    oscillatingHeaderWeight.value = Math.max(
      200,
      Math.min(800, baseFontWeight + oscillation * headerAmplitude)
    );
    oscillatingSubheaderWeight.value = Math.max(
      200,
      Math.min(800, baseFontWeight - 100 + oscillation * headerAmplitude * 0.7)
    );

    // Only the active button oscillates
    for (let i = 0; i < oscillatingButtonWeights.value.length; i++) {
      if (i === currentSolfegeIndex) {
        oscillatingButtonWeights.value[i] = Math.max(
          200,
          Math.min(800, baseFontWeight + oscillation * buttonAmplitude)
        );
        oscillatingNoteWeights.value[i] = Math.max(
          200,
          Math.min(
            800,
            baseFontWeight - 150 + oscillation * buttonAmplitude * 0.6
          )
        );
      } else {
        oscillatingButtonWeights.value[i] = 600; // Default weight for inactive buttons
        oscillatingNoteWeights.value[i] = 400;
      }
    }

    if (musicStore.currentNote) {
      animationId = requestAnimationFrame(animate);
    }
  };

  animationId = requestAnimationFrame(animate);
};

const stopFontWeightOscillation = () => {
  if (animationId) {
    cancelAnimationFrame(animationId);
    animationId = null;
  }
  // Return to default weights
  oscillatingHeaderWeight.value = 600;
  oscillatingSubheaderWeight.value = 400;
  oscillatingButtonWeights.value = Array(8).fill(600);
  oscillatingNoteWeights.value = Array(8).fill(400);
};

// Watch for note changes
watch(
  () => musicStore.currentNote,
  (newNote) => {
    if (newNote) {
      startFontWeightOscillation();
    } else {
      stopFontWeightOscillation();
    }
  }
);

// Cleanup on unmount
onUnmounted(() => {
  stopFontWeightOscillation();
});

// Function for attacking notes (hold to sustain)
const attackNote = (solfegeIndex: number, event?: Event) => {
  // Prevent context menu and other unwanted behaviors
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  musicStore.attackNote(solfegeIndex);
};

// Function for releasing notes
const releaseNote = (event?: Event) => {
  // Prevent unwanted behaviors
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  musicStore.releaseNote();
};
</script>

<style scoped>
/* Component-specific styles */
.btn-solfege {
  user-select: none;
  -webkit-user-select: none;
  -webkit-touch-callout: none;
  -webkit-tap-highlight-color: transparent;
  -webkit-user-drag: none;
  -khtml-user-drag: none;
  -moz-user-drag: none;
  -o-user-drag: none;
  touch-action: manipulation;
}

.btn-solfege:active {
  transform: scale(0.95);
}

.btn-solfege:hover {
  box-shadow: 0 8px 25px rgba(255, 255, 255, 0.15);
}

/* Prevent text selection and context menus on mobile */
.btn-solfege * {
  pointer-events: none;
}
</style>
