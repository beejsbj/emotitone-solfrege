<script setup lang="ts">
import LiveStrip from "@/components/patterns/LiveStrip.vue";
import { useLiveStrudelMirror } from "@/composables/useLiveStrudelMirror";
import { usePatternsStore } from "@/stores/patterns";
import { IconButton } from "@/components/ui";
import { Delete, Play, Square } from "lucide-vue-next";

const patternsStore = usePatternsStore();
const { isPlaying, hasPlayableCode, toggle } = useLiveStrudelMirror();

async function togglePlayback() {
  if (!hasPlayableCode.value) {
    return;
  }

  await toggle();
}
</script>

<template>
  <div class="live-card" :class="{ 'live-card--playing': isPlaying }">
    <div class="live-card__controls">
      <IconButton
        data-testid="live-card-play"
        size="xs"
        :tone="isPlaying ? 'red' : 'green'"
        :active="isPlaying"
        :disabled="!hasPlayableCode"
        :title="isPlaying ? 'Stop playback' : 'Play sketch'"
        :aria-label="isPlaying ? 'Stop playback' : 'Play sketch'"
        @click="togglePlayback"
      >
        <Square v-if="isPlaying" :size="13" />
        <Play v-else :size="13" />
      </IconButton>
    </div>

    <div class="live-card__body">
      <LiveStrip />
    </div>

    <div class="live-card__controls">
      <IconButton
        data-testid="live-card-delete"
        size="xs"
        tone="red"
        :disabled="patternsStore.currentSketchNotes.length === 0"
        :title="
          patternsStore.currentSketchNotes.length
            ? 'Delete last note from sketch'
            : 'Nothing to delete'
        "
        :aria-label="
          patternsStore.currentSketchNotes.length
            ? 'Delete last note from sketch'
            : 'Nothing to delete'
        "
        @click="patternsStore.removeLastFromCurrentSketch()"
      >
        <Delete :size="13" />
      </IconButton>
    </div>
  </div>
</template>

<style scoped>
.live-card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: stretch;
  gap: 0.4rem;
  background:
    linear-gradient(180deg, rgba(9, 8, 5, 0.97), rgba(4, 4, 4, 0.98));
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border: 1px solid rgba(111, 97, 40, 0.34);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 16px 36px rgba(0, 0, 0, 0.22);
  user-select: none;
  contain: layout style;
  transition: border-color 0.3s ease, box-shadow 0.3s ease;
  overflow: hidden;
  min-width: 0;
  padding: 0.28rem 0.36rem;
  clip-path: polygon(
    0 10px,
    10px 0,
    calc(100% - 10px) 0,
    100% 10px,
    100% 100%,
    0 100%
  );
}

.live-card--playing {
  border-color: hsla(145, 100%, 50%, 0.26);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.05),
    0 0 20px hsla(145, 100%, 40%, 0.1);
}

.live-card__controls {
  display: flex;
  align-items: center;
  justify-content: center;
}

.live-card__body {
  min-width: 0;
  overflow: hidden;
}

@media (max-width: 480px) {
  .live-card {
    gap: 0.32rem;
    padding: 0.22rem 0.22rem 0.24rem;
  }

  .live-card__body {
    min-width: 0;
  }
}
</style>
