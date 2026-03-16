<template>
  <div class="keyboard-action-bar">
    <div class="action-row">
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
    </div>
  </div>
</template>

<script setup lang="ts">
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { Knob } from "@/components/knobs";

const store = useKeyboardDrawerStore();
</script>

<style scoped>
.keyboard-action-bar {
  background-color: rgba(0, 0, 0, 0.8);
  -webkit-backdrop-filter: blur(16px);
  backdrop-filter: blur(16px);
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
  padding: 0.45rem 1rem 0.5rem;
  user-select: none;
  contain: layout style;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.65rem;
  min-height: 3rem;
}

.control-group {
  flex: 0 0 auto;
  min-width: 0;
  width: 5rem;
  max-width: 5rem;
}

@media (max-width: 480px) {
  .keyboard-action-bar {
    padding: 0.3rem 0.5rem 0.35rem;
  }

  .action-row {
    gap: 0.3rem;
    min-height: 2.5rem;
  }

  .control-group {
    width: 4rem;
    max-width: 4rem;
  }
}
</style>
