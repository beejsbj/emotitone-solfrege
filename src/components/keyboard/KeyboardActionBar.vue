<template>
  <div class="keyboard-action-bar">
    <div class="action-scroll" aria-label="Keyboard controls">
      <div class="action-row">
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
            :model-value="visualConfigStore.config.liveStrip.bpm"
            type="range"
            label="BPM"
            :min="40"
            :max="220"
            :step="1"
            @update:modelValue="
              (value) =>
                visualConfigStore.updateConfig('liveStrip', { bpm: Number(value) })
            "
          />
        </div>

        <div class="control-group">
          <Knob
            :model-value="store.keyboardConfig.mainOctave"
            type="range"
            label="Octave"
            :min="1"
            :max="8"
            :step="1"
            @update:modelValue="(value) => store.setMainOctave(Number(value))"
          />
        </div>

        <div class="control-group">
          <Knob
            :model-value="store.keyboardConfig.rowCount"
            type="range"
            label="Rows"
            :min="1"
            :max="8"
            :step="2"
            @update:modelValue="(value) => store.setRowCount(Number(value))"
          />
        </div>

        <div class="control-group">
          <Knob
            :model-value="store.drawer.isOpen"
            type="boolean"
            label="Drawer"
            @update:modelValue="
              (isOpen) => (isOpen ? store.openDrawer() : store.closeDrawer())
            "
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
            :model-value="!isPlaying"
            type="boolean"
            :is-disabled="!hasPlayableCode"
            :theme-color="'hsla(145, 100%, 50%, 1)'"
            :value-label-true="Play"
            :value-label-false="Square"
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { usePatternsStore } from "@/stores/patterns";
import { useLiveStrudelMirror } from "@/composables/useLiveStrudelMirror";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { CHROMATIC_NOTES } from "@/data/musicData";
import { Knob } from "@/components/knobs";
import { Play, Square } from "lucide-vue-next";

const store = useKeyboardDrawerStore();
const visualConfigStore = useVisualConfigStore();
const musicStore = useMusicStore();
const patternsStore = usePatternsStore();
const { toggle, isPlaying, hasPlayableCode } = useLiveStrudelMirror();

async function toggleSketchPlayback() {
  if (!hasPlayableCode.value) {
    return;
  }

  await toggle();
}
</script>

<style scoped>
.keyboard-action-bar {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  background-color: rgba(0, 0, 0, 0.8);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.34rem 0.4rem 0.42rem;
  user-select: none;
  contain: layout style;
}

.action-scroll {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  -ms-overflow-style: none;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pinch-zoom;
}

.action-scroll::-webkit-scrollbar {
  display: none;
}

.action-row {
  display: flex;
  align-items: center;
  gap: 0.42rem;
  min-height: 3rem;
  min-width: max-content;
  width: max-content;
  padding: 0 0.2rem;
}

.control-group {
  flex: 0 0 auto;
  min-width: 0;
  width: 4.7rem;
  max-width: 4.7rem;
}

.action-row:deep(.knob-wrapper) {
  touch-action: none;
}

@media (max-width: 480px) {
  .keyboard-action-bar {
    padding: 0.3rem 0.22rem 0.35rem;
  }

  .action-row {
    gap: 0.26rem;
    min-height: 2.5rem;
    padding: 0 0.14rem;
  }

  .control-group {
    width: 4rem;
    max-width: 4rem;
  }
}
</style>
