<template>
  <div class="unified-visual-effects">
    <canvas
      ref="canvasRef"
      :width="canvasWidth"
      :height="canvasHeight"
      class="unified-canvas"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { useMusicStore } from "@/stores/music";
import { useUnifiedCanvas } from "@/composables/canvas/useUnifiedCanvas";
import type { SolfegeData } from "@/types/music";

const musicStore = useMusicStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Use the unified canvas system
const {
  canvasWidth,
  canvasHeight,
  initializeCanvas,
  handleResize,
  handleNotePlayed,
  handleNoteReleased,
  startAnimation,
  stopAnimation,
  cleanup,
} = useUnifiedCanvas(canvasRef);

// Handle note played event
function onNotePlayed(event: CustomEvent) {
  const note: SolfegeData = event.detail.note;
  const frequency: number = event.detail.frequency;
  handleNotePlayed(note, frequency);
}

// Handle note released event
function onNoteReleased(event: CustomEvent) {
  const noteName: string = event.detail.note;
  if (noteName) {
    handleNoteReleased(noteName);
  }
}

// Watch for mode changes (handled automatically by the unified system)
watch(
  () => musicStore.currentMode,
  () => {
    // Mode changes will be reflected in the next animation frame
  }
);

onMounted(() => {
  console.log("🚀 Mounting UnifiedVisualEffects...");

  // Initialize the unified canvas system
  initializeCanvas();

  // Start the animation loop
  console.log("▶️ Starting animation...");
  startAnimation();

  // Handle window resize
  window.addEventListener("resize", handleResize);

  // Listen for note events
  window.addEventListener("note-played", onNotePlayed as EventListener);
  window.addEventListener("note-released", onNoteReleased as EventListener);

  console.log("✅ UnifiedVisualEffects mounted and ready");
});

onUnmounted(() => {
  // Stop animation and cleanup
  stopAnimation();
  cleanup();

  // Remove event listeners
  window.removeEventListener("resize", handleResize);
  window.removeEventListener("note-played", onNotePlayed as EventListener);
  window.removeEventListener("note-released", onNoteReleased as EventListener);
});
</script>

<style scoped>
.unified-visual-effects {
  position: fixed;
  inset: 0;
  z-index: 0;
  overflow: hidden;
  pointer-events: none;
}

.unified-canvas {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
}
</style>
