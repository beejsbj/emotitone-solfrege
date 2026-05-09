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
            :options="MODE_OPTIONS"
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
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/stores/music";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { CHROMATIC_NOTES, MODE_OPTIONS } from "@/data/musicData";
import { Knob } from "@/components/knobs";

const store = useKeyboardDrawerStore();
const visualConfigStore = useVisualConfigStore();
const musicStore = useMusicStore();
</script>

<style scoped>
.keyboard-action-bar {
  width: 100%;
  max-width: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  background:
    linear-gradient(180deg, rgba(9, 8, 5, 0.96), rgba(5, 5, 4, 0.98));
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border: 1px solid rgba(111, 97, 40, 0.38);
  box-shadow:
    inset 0 0 0 1px rgba(255, 255, 255, 0.04),
    0 12px 32px rgba(0, 0, 0, 0.22);
  padding: 0.32rem 0.36rem 0.4rem;
  user-select: none;
  contain: layout style;
  clip-path: polygon(
    0 10px,
    10px 0,
    calc(100% - 10px) 0,
    100% 10px,
    100% 100%,
    0 100%
  );
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
  gap: 0.34rem;
  min-height: 3rem;
  min-width: max-content;
  width: max-content;
  padding: 0 0.12rem;
}

.control-group {
  flex: 0 0 auto;
  min-width: 0;
  width: 4.3rem;
  max-width: 4.3rem;
}

.action-row:deep(.knob-wrapper) {
  touch-action: none;
}

@media (max-width: 480px) {
  .keyboard-action-bar {
    padding: 0.28rem 0.22rem 0.34rem;
  }

  .action-row {
    gap: 0.22rem;
    min-height: 2.5rem;
    padding: 0 0.1rem;
  }

  .control-group {
    width: 3.8rem;
    max-width: 3.8rem;
  }
}
</style>
