<template>
  <div v-show="visualsEnabled" class="unified-visual-effects">
    <canvas
      ref="canvasRef"
      class="unified-canvas"
      aria-hidden="true"
    />

    <p class="sr-only" aria-live="polite" aria-atomic="true">
      {{ harmonicAccessibleText }}
    </p>

    <FeelingLine
      :event-target="noteEventTarget"
      :usable-height="usableRect.height"
      :reduced-motion="reducedMotion"
      :la-based-minor="musicStore.laBasedMinor"
      :hold-time="visualConfigStore.effectiveConfig.blobs.analysisHoldTime"
      :fallback-key="musicStore.currentKey as ChromaticNote"
      :fallback-mode="musicStore.currentMode"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch } from "vue";
import { storeToRefs } from "pinia";
import { useMusicStore } from "@/stores/music";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { useUnifiedCanvas } from "@/composables/canvas/useUnifiedCanvas";
import { useStageHostLayout } from "@/composables/useStageHostLayout";
import FeelingLine from "@/components/uniques/FeelingLine.vue";
import type {
  ActiveNote,
  ChromaticNote,
  MusicalMode,
  SolfegeData,
} from "@/types/music";
import type { StageAudioFeatures } from "@/services/stageAudio";

const props = defineProps<{
  /** Caller-owned analysis source; omission selects the production audio bus. */
  audioFeatures?: StageAudioFeatures;
  /** Authoritative controlled note view; omission selects the production registries. */
  activeNotes?: readonly ActiveNote[];
  /** Note lifecycle target; omission preserves production window events. */
  eventTarget?: EventTarget;
}>();

const musicStore = useMusicStore();
const visualConfigStore = useVisualConfigStore();
const canvasRef = ref<HTMLCanvasElement | null>(null);
const { usableRect, reducedMotion } = useStageHostLayout(canvasRef);

// Read through a ref: destructuring a setup-store ref copies its value once
// and freezes it, so the Visuals switch would stop reaching this component.
const { visualsEnabled } = storeToRefs(visualConfigStore);

// Use the unified canvas system
const {
  harmonicAccessibleText,
  noteEventTarget,
  initializeCanvas,
  handleResize,
  handleNotePlayed,
  handleNoteReleased,
  startAnimation,
  stopAnimation,
  isAnimating,
  cleanup,
} = useUnifiedCanvas(canvasRef, {
  usableRect,
  reducedMotion,
  audioFeatures: props.audioFeatures,
  getActiveNotes: props.activeNotes === undefined
    ? undefined
    : () => props.activeNotes ?? [],
  eventTarget: props.eventTarget,
});

// Handle note played event - enhanced for polyphonic support
function onNotePlayed(event: CustomEvent) {
  const note: SolfegeData = event.detail.note;
  const frequency: number = event.detail.frequency;
  const noteId: string | undefined = event.detail.noteId;
  const octave: number | undefined = event.detail.octave;
  const noteName: string | undefined = event.detail.noteName;
  const mode: MusicalMode | undefined = event.detail.mode;
  const key: ChromaticNote | undefined = event.detail.key;
  const pitchClassIndex: number | undefined = event.detail.pitchClassIndex;
  const durationMs: number | undefined = event.detail.durationMs;

  handleNotePlayed(
    note,
    frequency,
    noteId,
    octave,
    noteName,
    mode,
    key,
    pitchClassIndex,
    durationMs,
  );
}

// Handle note released event - enhanced for polyphonic support
function onNoteReleased(event: CustomEvent) {
  const blobKey: string = event.detail.note ?? event.detail.noteName;
  const noteName: string = event.detail.noteName ?? blobKey;
  const noteId: string | undefined = event.detail.noteId;

  if (blobKey) {
    handleNoteReleased(blobKey, noteId, noteName);
  }
}

// Self-contained Visuals gate: the layer is hidden (not unmounted, so the canvas
// context stays valid) and its loop stops while the switch is off. The host may
// also unmount this component (MainApp does), which cleans up the same way.
watch(visualsEnabled, (enabled) => {
  if (enabled) startAnimation();
  else stopAnimation();
});

onMounted(() => {
  // Initialize the unified canvas system
  initializeCanvas();

  // Start the animation loop only if visuals are enabled
  if (visualsEnabled.value) {
    startAnimation();
  }

  // Handle window resize
  window.addEventListener("resize", handleResize);

  // Listen for note events
  noteEventTarget.addEventListener("note-played", onNotePlayed as EventListener);
  noteEventTarget.addEventListener("note-released", onNoteReleased as EventListener);
});

onUnmounted(() => {
  // Stop animation and cleanup
  stopAnimation();
  cleanup();

  // Remove event listeners
  window.removeEventListener("resize", handleResize);
  noteEventTarget.removeEventListener("note-played", onNotePlayed as EventListener);
  noteEventTarget.removeEventListener("note-released", onNoteReleased as EventListener);
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
  z-index: 1;
}
</style>
