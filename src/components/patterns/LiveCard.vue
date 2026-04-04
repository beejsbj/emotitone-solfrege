<script setup lang="ts">
import { computed } from "vue";
import LiveStrip from "@/components/patterns/LiveStrip.vue";
import { useLiveStrudelMirror } from "@/composables/useLiveStrudelMirror";
import { usePatternsStore } from "@/stores/patterns";
import { Play, Square } from "lucide-vue-next";

const patternsStore = usePatternsStore();
const { toggle, isPlaying, hasPlayableCode } = useLiveStrudelMirror();

const playbackLabel = computed(() => (isPlaying.value ? "Stop" : "Play"));

async function togglePlayback() {
  if (!hasPlayableCode.value) {
    return;
  }

  await toggle();
}
</script>

<template>
  <div class="live-card" :class="{ 'live-card--playing': isPlaying }">
    <div class="live-card__actions" role="toolbar" aria-label="Sketch actions">
      <button
        type="button"
        class="live-card__action live-card__action--play"
        data-testid="live-strip-action-play"
        :aria-pressed="isPlaying"
        :disabled="!hasPlayableCode"
        @click="togglePlayback"
      >
        <component :is="isPlaying ? Square : Play" class="live-card__action-icon" />
        <span class="live-card__action-label">{{ playbackLabel }}</span>
      </button>

      <button
        type="button"
        class="live-card__action"
        data-testid="live-strip-action-backspace"
        @click="patternsStore.removeLastFromCurrentSketch()"
      >
        <span class="live-card__action-icon" aria-hidden="true">⌫</span>
        <span class="live-card__action-label">Backspace</span>
      </button>
    </div>

    <div class="live-card__body">
      <LiveStrip />
    </div>
  </div>
</template>

<style scoped>
.live-card {
  background-color: hsla(0, 0%, 0%, 0.85);
  backdrop-filter: blur(16px);
  -webkit-backdrop-filter: blur(16px);
  border-bottom: 1px solid hsla(0, 0%, 100%, 0.1);
  user-select: none;
  contain: layout style;
  transition: border-bottom-color 0.3s ease, box-shadow 0.3s ease;
  overflow-x: hidden;
  min-width: 0;
}

.live-card--playing {
  border-bottom-color: hsla(145, 100%, 50%, 0.25);
  box-shadow: 0 0 16px hsla(145, 100%, 40%, 0.08);
}

.live-card__actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.35rem;
  padding: 0.26rem 0.25rem 0;
}

.live-card__action {
  display: inline-flex;
  align-items: center;
  gap: 0.32rem;
  min-height: 1.55rem;
  padding: 0 0.62rem;
  border: 1px solid hsla(0, 0%, 100%, 0.08);
  border-radius: 999px;
  background: hsla(0, 0%, 100%, 0.045);
  color: hsla(0, 0%, 100%, 0.78);
  font-family: "SF Mono", "Fira Code", monospace;
  font-size: 0.58rem;
  font-weight: 700;
  letter-spacing: 0.05em;
  cursor: pointer;
  transition:
    background 0.15s ease,
    border-color 0.15s ease,
    color 0.15s ease,
    transform 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.live-card__action:hover:not(:disabled),
.live-card__action:focus-visible {
  background: hsla(0, 0%, 100%, 0.08);
  border-color: hsla(0, 0%, 100%, 0.14);
  color: hsla(0, 0%, 100%, 0.94);
}

.live-card__action:active:not(:disabled) {
  transform: translateY(1px);
}

.live-card__action:disabled {
  opacity: 0.42;
  cursor: not-allowed;
}

.live-card__action--play[aria-pressed="true"] {
  border-color: hsla(145, 100%, 50%, 0.32);
  background: hsla(145, 100%, 40%, 0.12);
  color: hsla(145, 100%, 82%, 1);
}

.live-card__action-icon {
  width: 0.76rem;
  height: 0.76rem;
  flex: 0 0 auto;
}

.live-card__action-label {
  white-space: nowrap;
}

.live-card__body {
  padding: 0.16rem 0.25rem 0.24rem;
  overflow: hidden;
}

@media (max-width: 480px) {
  .live-card__actions {
    gap: 0.28rem;
    padding: 0.22rem 0.18rem 0;
  }

  .live-card__action {
    min-height: 1.42rem;
    padding: 0 0.52rem;
    font-size: 0.54rem;
  }

  .live-card__body {
    padding: 0.16rem 0.18rem 0.2rem;
  }
}
</style>
