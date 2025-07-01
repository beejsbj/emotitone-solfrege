<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";

interface Props {
  position?: "top-left" | "top-right";
  maxWidth?: string;
  maxHeight?: string;
  floating?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  position: "top-right",
  maxWidth: "320px",
  maxHeight: "80vh",
  floating: true,
});

const showPanel = ref(false);
const dropdownRef = ref<HTMLElement | null>(null);

const togglePanel = () => {
  showPanel.value = !showPanel.value;
};

const closePanel = () => {
  showPanel.value = false;
};

// Click outside detection
const handleClickOutside = (event: MouseEvent) => {
  if (dropdownRef.value && !dropdownRef.value.contains(event.target as Node)) {
    closePanel();
  }
};

onMounted(() => {
  document.addEventListener("mousedown", handleClickOutside);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handleClickOutside);
});

// Expose methods to parent components
defineExpose({
  closePanel,
  togglePanel,
  showPanel,
});
</script>

<template>
  <div ref="dropdownRef" class="floating-dropdown">
    <!-- Panel -->

    <Teleport to="body">
      <div
        v-if="showPanel"
        class="dropdown-panel w-full max-w-[90%]"
        :class="[
          'dropdown-panel',
          floating ? `position-${position}` : 'fixed top-[20px] left-[20px]',
          { 'mx-auto': floating },
        ]"
        :style="{
          maxHeight: maxHeight,
          height: 'auto',
        }"
      >
        <slot
          name="panel"
          :close="closePanel"
          :toggle="togglePanel"
          :position="position"
        />
      </div>
    </Teleport>

    <!-- Toggle Button -->
    <div
      v-if="!showPanel"
      :class="[
        'dropdown-toggle',
        floating ? `position-${position}` : 'position-inline',
      ]"
    >
      <slot name="trigger" :open="togglePanel" :toggle="togglePanel" />
    </div>
  </div>
</template>

<style scoped>
.floating-dropdown {
  position: relative;
}

/* Floating styles (fixed positioning) */
.dropdown-panel {
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid #333;
  border-radius: 8px;
  color: white;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  backdrop-filter: blur(10px);
  z-index: 9999;
}

/* Fixed positioning styles for floating mode */
.dropdown-panel.position-top-left {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 9999;
}

.dropdown-panel.position-top-right {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
}

/* Inline positioning styles for non-floating mode */
.dropdown-panel.position-inline {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  margin-top: 4px;
}

.dropdown-toggle.position-top-left {
  position: fixed;
  top: 20px;
  left: 20px;
  z-index: 9999;
}

.dropdown-toggle.position-top-right {
  position: fixed;
  top: 20px;
  right: 20px;
  z-index: 9999;
}

/* Inline toggle positioning for non-floating mode */
.dropdown-toggle.position-inline {
  position: relative;
}
</style>
