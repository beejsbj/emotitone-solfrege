<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from "vue";

interface Props {
  anchor?: "top-left" | "top-right";
  offsetTop?: string;
  offsetSide?: string;
}

const props = withDefaults(defineProps<Props>(), {
  anchor: "top-right",
  offsetTop: "1rem",
  offsetSide: "1rem",
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

const panelStyle = computed(() => ({
  top: props.offsetTop,
  [props.anchor === "top-left" ? "left" : "right"]: props.offsetSide,
}));

const handlePointerDown = (event: MouseEvent) => {
  if (!showPanel.value) return;

  const target = event.target as Node;
  const clickedTrigger =
    triggerRef.value && triggerRef.value.contains(target);
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
  <div class="top-drawer">
    <div
      v-if="!showPanel"
      ref="triggerRef"
      data-testid="top-drawer-trigger"
      class="top-drawer__trigger"
      :class="anchor === 'top-left' ? 'top-drawer__trigger--left' : 'top-drawer__trigger--right'"
    >
      <slot
        name="trigger"
        :toggle="togglePanel"
        :open="togglePanel"
        :close="closePanel"
        :is-open="showPanel"
      />
    </div>

    <Teleport to="body">
      <Transition name="top-drawer-slide">
        <div
          v-if="showPanel"
          ref="panelRef"
          data-testid="top-drawer-panel"
          class="top-drawer__panel"
          :style="panelStyle"
        >
          <slot
            name="panel"
            :toggle="togglePanel"
            :open="togglePanel"
            :close="closePanel"
            :is-open="showPanel"
            :anchor="anchor"
          />
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.top-drawer {
  position: relative;
}

.top-drawer__trigger {
  position: fixed;
  z-index: 9999;
}

.top-drawer__trigger--left {
  top: 1rem;
  left: 1rem;
}

.top-drawer__trigger--right {
  top: 1rem;
  right: 1rem;
}

.top-drawer__panel {
  position: fixed;
  z-index: 9999;
}

.top-drawer-slide-enter-active,
.top-drawer-slide-leave-active {
  transition:
    transform 0.22s ease,
    opacity 0.22s ease;
}

.top-drawer-slide-enter-from,
.top-drawer-slide-leave-to {
  transform: translateY(-18px);
  opacity: 0;
}

.top-drawer-slide-enter-to,
.top-drawer-slide-leave-from {
  transform: translateY(0);
  opacity: 1;
}
</style>
