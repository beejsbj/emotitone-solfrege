<template>
  <header class="p-4 text-center">
    <h1
      class="text-4xl md:text-6xl text-white mb-2 tracking-wide"
      :style="{ fontWeight: oscillatingTitleWeight }"
    >
      Emotitone
    </h1>
    <p
      class="text-lg md:text-xl text-gray-300"
      :style="{ fontWeight: oscillatingSubtitleWeight }"
    >
      Feel the Music Theory
    </p>
  </header>
</template>

<script setup lang="ts">
import { ref, watch, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";

const musicStore = useMusicStore();

// Oscillating font weights
const oscillatingTitleWeight = ref(600);
const oscillatingSubtitleWeight = ref(300);

let animationId: number | null = null;

const startFontWeightOscillation = () => {
  if (!musicStore.currentNote) return;

  // Find the solfege index to get frequency
  const solfegeIndex = musicStore.solfegeData.findIndex(
    (s) => s.name === musicStore.currentNote
  );
  if (solfegeIndex === -1) return;

  // Get frequency for the current note
  const frequency = musicStore.getNoteFrequency(solfegeIndex, 4);

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
  const oscillationAmplitude = 100; // Smaller amplitude for header
  const visualFrequency = frequency / 120; // Slower oscillation for header

  let startTime = 0;

  const animate = (timestamp: number) => {
    if (!startTime) startTime = timestamp;
    const elapsed = (timestamp - startTime) / 1000;

    // Create oscillating font weights using sine waves
    const oscillation =
      Math.sin(elapsed * visualFrequency * 2 * Math.PI) * oscillationAmplitude;

    oscillatingTitleWeight.value = Math.max(
      200,
      Math.min(800, baseFontWeight + oscillation)
    );
    oscillatingSubtitleWeight.value = Math.max(
      200,
      Math.min(800, baseFontWeight - 200 + oscillation * 0.6)
    );

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
  oscillatingTitleWeight.value = 600;
  oscillatingSubtitleWeight.value = 300;
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
</script>
