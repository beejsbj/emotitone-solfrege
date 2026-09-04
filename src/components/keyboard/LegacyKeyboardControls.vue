<template>
  <div class="legacy-keyboard-controls">
    <div class="legacy-keyboard-controls__scroll" aria-label="Keyboard settings">
      <div class="legacy-keyboard-controls__row">
        <div class="legacy-keyboard-controls__item">
          <Knob
            :model-value="musicStore.currentKey"
            type="options"
            :options="CHROMATIC_NOTES"
            label="Key"
            @update:modelValue="(value) => musicStore.setKey(String(value))"
          />
        </div>

        <div class="legacy-keyboard-controls__item">
          <Knob
            :model-value="musicStore.currentMode"
            type="options"
            :options="MODE_OPTIONS"
            label="Mode"
            @update:modelValue="(value) => musicStore.setMode(value as any)"
          />
        </div>

        <div class="legacy-keyboard-controls__item">
          <Knob
            :model-value="visualConfigStore.config.codeStrip.bpm"
            type="range"
            label="BPM"
            :min="40"
            :max="220"
            :step="1"
            @update:modelValue="
              (value) => visualConfigStore.updateConfig('codeStrip', { bpm: Number(value) })
            "
          />
        </div>

        <div class="legacy-keyboard-controls__item">
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

        <div class="legacy-keyboard-controls__item">
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

        <div class="legacy-keyboard-controls__item">
          <Knob
            :model-value="store.drawer.isOpen"
            type="boolean"
            label="Drawer"
            @update:modelValue="
              (isOpen) => (isOpen ? store.openDrawer() : store.closeDrawer())
            "
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { CHROMATIC_NOTES, MODE_OPTIONS } from "@/data/musicData";
import Knob from "@/components/primatives/Knob/index.vue";

const store = useKeyboardDrawerStore();
const visualConfigStore = useVisualConfigStore();
const musicStore = useMusicStore();
</script>

<style scoped>
.legacy-keyboard-controls {
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

.legacy-keyboard-controls__scroll {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  overscroll-behavior-x: contain;
  -webkit-overflow-scrolling: touch;
  touch-action: pan-x pinch-zoom;
}

.legacy-keyboard-controls__scroll::-webkit-scrollbar {
  display: none;
}

.legacy-keyboard-controls__row {
  display: flex;
  align-items: center;
  gap: 0.42rem;
  min-height: 3rem;
  min-width: max-content;
  width: max-content;
  padding: 0 0.2rem;
}

.legacy-keyboard-controls__item {
  flex: 0 0 auto;
  min-width: 0;
  width: 4.7rem;
  max-width: 4.7rem;
}

.legacy-keyboard-controls__row:deep(.knob-wrapper) {
  touch-action: none;
}

@media (max-width: 480px) {
  .legacy-keyboard-controls {
    padding: 0.3rem 0.22rem 0.35rem;
  }

  .legacy-keyboard-controls__row {
    gap: 0.26rem;
    min-height: 2.5rem;
    padding: 0 0.14rem;
  }

  .legacy-keyboard-controls__item {
    width: 4rem;
    max-width: 4rem;
  }
}
</style>
