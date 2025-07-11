<template>
  <div v-if="visualsEnabled" class="unified-visual-effects">
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
import { useVisualConfigStore } from "@/stores/visualConfig";
import { useUnifiedCanvas } from "@/composables/canvas/useUnifiedCanvas";
import type { SolfegeData } from "@/types/music";

const musicStore = useMusicStore();
const visualConfigStore = useVisualConfigStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);

// Get visualsEnabled from store
const { visualsEnabled } = visualConfigStore;

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
  isAnimating,
  cleanup,
} = useUnifiedCanvas(canvasRef);

// Handle note played event - enhanced for polyphonic support
function onNotePlayed(event: CustomEvent) {
  const note: SolfegeData = event.detail.note;
  const frequency: number = event.detail.frequency;
  const noteId: string | undefined = event.detail.noteId;
  const octave: number | undefined = event.detail.octave;
  const noteName: string | undefined = event.detail.noteName;

  handleNotePlayed(note, frequency, noteId, octave, noteName);
}

// Handle note released event - enhanced for polyphonic support
function onNoteReleased(event: CustomEvent) {
  const noteName: string = event.detail.note;
  const noteId: string | undefined = event.detail.noteId;

  if (noteName) {
    handleNoteReleased(noteName, noteId);
  }
}

// Note: Mode changes and visual enable/disable are handled automatically by component lifecycle

onMounted(() => {
  console.log("🚀 Mounting UnifiedVisualEffects...");

  // Initialize the unified canvas system
  initializeCanvas();

  // Start the animation loop only if visuals are enabled
  if (visualsEnabled) {
    console.log("▶️ Starting animation...");
    startAnimation();
  }

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
