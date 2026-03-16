<script setup lang="ts">
import { computed, ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { usePatternsStore } from "@/stores/patterns";
import { CHROMATIC_NOTES } from "@/data/musicData";
import { Knob } from "@/components/knobs";
import LiveStrip from "@/components/patterns/LiveStrip.vue";
import { useLiveStrudelMirror } from "@/composables/useLiveStrudelMirror";
import { Play, Square } from "lucide-vue-next";

const musicStore = useMusicStore();
const patternsStore = usePatternsStore();
const { toggle, isPlaying, hasPlayableCode } = useLiveStrudelMirror();

const bodyOpen = ref(true);

const sketchSummary = computed(() => {
  const noteCount = patternsStore.currentSketchNotes.length;
  const meta = patternsStore.currentSketchMeta;
  return `${noteCount} note${noteCount === 1 ? "" : "s"} · ${meta.key} ${meta.mode}`;
});

async function toggleSketchPlayback() {
  if (!hasPlayableCode.value) {
    return;
  }

  await toggle();
}
</script>

<template>
  <div class="live-card" :class="{ 'live-card--playing': isPlaying }">
    <div class="live-card__header">
      <div class="live-card__meta">
        <span class="live-card__summary">{{ sketchSummary }}</span>
      </div>

      <div class="live-card__controls">
        <div class="control-group">
          <Knob
            :model-value="musicStore.currentKey"
            type="options"
            :options="CHROMATIC_NOTES"
            label="Key"
            @update:modelValue="(value) => musicStore.setKey(String(value))"
          />
        </div>

        <div class="control-group">
          <Knob
            :model-value="musicStore.currentMode"
            type="options"
            :options="[
              { label: 'Major', value: 'major', color: 'hsl(0, 40%, 75%)' },
              { label: 'Minor', value: 'minor', color: 'hsl(240, 40%, 75%)' },
            ]"
            label="Mode"
            @update:modelValue="(value) => musicStore.setMode(value as any)"
          />
        </div>

        <div class="control-group">
          <Knob
            type="button"
            button-text="⌫"
            label="Undo"
            @click="patternsStore.removeLastFromCurrentSketch()"
          />
        </div>

        <div class="control-group">
          <Knob
            :model-value="isPlaying"
            type="boolean"
            :is-disabled="!hasPlayableCode"
            :theme-color="'hsla(145, 100%, 50%, 1)'"
            :value-label-true="Square"
            :value-label-false="Play"
            label="Play"
            @update:modelValue="toggleSketchPlayback"
          />
        </div>

        <div class="control-group">
          <Knob
            type="button"
            button-text="⏎"
            label="Send"
            @click="patternsStore.sendCurrentPattern()"
          />
        </div>

        <button
          class="live-card__chevron"
          :class="{ 'live-card__chevron--open': bodyOpen }"
          @click="bodyOpen = !bodyOpen"
          :aria-label="bodyOpen ? 'Collapse strip' : 'Expand strip'"
        >
          ›
        </button>
      </div>
    </div>

    <Transition name="body">
      <div v-if="bodyOpen" class="live-card__body">
        <LiveStrip />
      </div>
    </Transition>
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

.live-card__header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 0.35rem 0.6rem 0.35rem 0.5rem;
  min-height: 3rem;
}

.live-card__meta {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 0 1 10rem;
}

.live-card__summary {
  font-size: 0.62rem;
  color: hsla(0, 0%, 100%, 0.5);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.live-card__controls {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 0;
  flex: 1;
}

.control-group {
  flex: 0 0 auto;
  min-width: 0;
  width: 4.7rem;
  max-width: 4.7rem;
}

.live-card__chevron {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.4rem;
  height: 1.4rem;
  background: none;
  border: none;
  color: hsla(0, 0%, 100%, 0.3);
  font-size: 1.1rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
  transform: rotate(90deg);
  transition: transform 0.2s ease, color 0.15s ease;
  -webkit-tap-highlight-color: transparent;
}

.live-card__chevron--open {
  transform: rotate(-90deg);
}

.live-card__chevron:active {
  color: hsla(0, 0%, 100%, 0.7);
}

.live-card__body {
  border-top: 1px solid hsla(0, 0%, 100%, 0.06);
  overflow: hidden;
}

.body-enter-from,
.body-leave-to {
  opacity: 0;
  max-height: 0;
}

.body-enter-active,
.body-leave-active {
  transition: opacity 0.18s ease, max-height 0.2s ease;
  overflow: hidden;
}

.body-enter-to,
.body-leave-from {
  opacity: 1;
  max-height: 16rem;
}

@media (max-width: 900px) {
  .live-card__header {
    flex-direction: column;
    align-items: stretch;
  }

  .live-card__meta {
    flex: none;
  }

  .live-card__controls {
    justify-content: space-between;
    flex-wrap: wrap;
  }
}

@media (max-width: 480px) {
  .live-card__header {
    padding: 0.3rem 0.4rem;
    gap: 0.35rem;
  }

  .live-card__controls {
    gap: 0.18rem;
  }

  .control-group {
    width: 4rem;
    max-width: 4rem;
  }
}
</style>
