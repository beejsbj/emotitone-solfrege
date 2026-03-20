<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

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
const triggerRef = ref<HTMLElement | null>(null);
const panelRef = ref<HTMLElement | null>(null);

const togglePanel = () => {
  showPanel.value = !showPanel.value;
};

const closePanel = () => {
  showPanel.value = false;
};

const panelFrameClass = computed(() => {
  if (!props.floating) {
    return "floating-dropdown__panel-frame--inline";
  }

  return "floating-dropdown__panel-frame--floating";
});

const triggerClass = computed(() => {
  if (!props.floating) {
    return "floating-dropdown__trigger--inline";
  }

  return props.position === "top-left"
    ? "floating-dropdown__trigger--left"
    : "floating-dropdown__trigger--right";
});

const handlePointerDown = (event: MouseEvent) => {
  if (!showPanel.value) return;

  const target = event.target as Node;
  const clickedTrigger = triggerRef.value && triggerRef.value.contains(target);
  const clickedPanel = panelRef.value && panelRef.value.contains(target);

  if (!clickedTrigger && !clickedPanel) {
    closePanel();
  }
};

const handleKeydown = (event: KeyboardEvent) => {
  if (event.key === "Escape") {
    closePanel();
  }
};

onMounted(() => {
  document.addEventListener("mousedown", handlePointerDown);
  document.addEventListener("keydown", handleKeydown);
});

onUnmounted(() => {
  document.removeEventListener("mousedown", handlePointerDown);
  document.removeEventListener("keydown", handleKeydown);
});

defineExpose({
  showPanel,
  closePanel,
  togglePanel,
});
</script>

<template>
  <div class="floating-dropdown">
    <div
      v-if="!showPanel || !floating"
      ref="triggerRef"
      data-testid="floating-dropdown-trigger"
      class="floating-dropdown__trigger"
      :class="triggerClass"
    >
      <slot
        name="trigger"
        :toggle="togglePanel"
        :open="togglePanel"
        :close="closePanel"
        :is-open="showPanel"
      />
    </div>

    <Teleport v-if="floating" to="body">
      <Transition name="floating-dropdown-fade">
        <div
          v-if="showPanel"
          ref="panelRef"
          data-testid="floating-dropdown-panel"
          class="floating-dropdown__panel-frame"
          :class="panelFrameClass"
          :style="{
            width: maxWidth,
            maxWidth: maxWidth,
            maxHeight: maxHeight,
            height: 'auto',
          }"
        >
          <div class="floating-dropdown__panel">
            <slot
              name="panel"
              :close="closePanel"
              :toggle="togglePanel"
              :open="togglePanel"
              :is-open="showPanel"
              :position="position"
            />
          </div>
        </div>
      </Transition>
    </Teleport>

    <Transition v-else name="floating-dropdown-fade">
      <div
        v-if="showPanel"
        ref="panelRef"
        data-testid="floating-dropdown-panel"
        class="floating-dropdown__panel-frame floating-dropdown__panel-frame--inline"
        :style="{
          width: maxWidth,
          maxWidth: maxWidth,
          maxHeight: maxHeight,
          height: 'auto',
        }"
      >
        <div class="floating-dropdown__panel">
          <slot
            name="panel"
            :close="closePanel"
            :toggle="togglePanel"
            :open="togglePanel"
            :is-open="showPanel"
            :position="position"
          />
        </div>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.floating-dropdown {
  position: relative;
  display: inline-block;
}

.floating-dropdown__trigger {
  z-index: 9999;
}

.floating-dropdown__trigger--left {
  position: fixed;
  top: 1rem;
  left: 1rem;
}

.floating-dropdown__trigger--right {
  position: fixed;
  top: 1rem;
  right: 1rem;
}

.floating-dropdown__trigger--inline {
  position: relative;
}

.floating-dropdown__panel-frame {
  z-index: 9999;
}

.floating-dropdown__panel-frame--floating {
  z-index: 9999;
  position: fixed;
  inset: 0;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding:
    max(env(safe-area-inset-top), 0px) 0.75rem 0.75rem;
  pointer-events: none;
}

.floating-dropdown__panel-frame--inline {
  position: absolute;
  top: calc(100% + 0.25rem);
  left: 0;
  z-index: 1000;
}

.floating-dropdown__panel {
  pointer-events: auto;
}

.floating-dropdown-fade-enter-active,
.floating-dropdown-fade-leave-active {
  transition:
    transform 0.18s ease,
    opacity 0.18s ease;
}

.floating-dropdown-fade-enter-from,
.floating-dropdown-fade-leave-to {
  transform: translateY(-10px);
  opacity: 0;
}

.floating-dropdown-fade-enter-to,
.floating-dropdown-fade-leave-from {
  transform: translateY(0);
  opacity: 1;
}
</style>
