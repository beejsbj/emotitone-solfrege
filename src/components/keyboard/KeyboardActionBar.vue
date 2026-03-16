<template>
  <div class="keyboard-action-bar">
    <div class="action-row">
      <!-- Row count controls -->
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

      <!-- Drawer toggle -->
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
  border-bottom-width: 1px;
  border-bottom-style: solid;
  border-bottom-color: rgba(255, 255, 255, 0.1);
  padding-left: 1rem;
  padding-right: 1rem;
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  user-select: none;
  contain: layout style;
  will-change: auto;
}

.action-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
  gap: 0.5rem;
  min-height: 3rem;
}

.control-group {
  flex: 0 0 auto;
  min-width: 0;
  max-width: 5rem;
  width: 5rem;
}

@media (max-width: 480px) {
  .keyboard-action-bar {
    padding-left: 0.5rem;
    padding-right: 0.5rem;
    padding-top: 0.25rem;
    padding-bottom: 0.25rem;
  }

  .action-row {
    gap: 0.25rem;
    min-height: 2.5rem;
  }

  .control-group {
    max-width: 4rem;
    width: 4rem;
  }
}
</style>
