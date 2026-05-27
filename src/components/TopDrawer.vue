<script setup lang="ts">
import { computed, ref } from "vue";
import DrawerShell from "./primatives/DrawerShell.vue";

interface Props {
  anchor?: "top-left" | "top-right";
  offsetTop?: string;
  offsetSide?: string;
  frameHeight?: string;
  designedHeightRatio?: number;
  appShift?: string;
  handleLabel?: string;
  ariaLabel?: string;
  maxWidth?: string;
  bodyPadding?: string;
}

const props = withDefaults(defineProps<Props>(), {
  anchor: "top-right",
  offsetTop: "1rem",
  offsetSide: "1rem",
  frameHeight: "100vh",
  designedHeightRatio: 0.56,
  appShift: "16px",
  handleLabel: "ESC",
  ariaLabel: "toggle top drawer",
  maxWidth: "min(56rem, calc(100vw - 1.5rem))",
  bodyPadding: "12px",
});

const showPanel = ref(false);
const triggerRef = ref<HTMLElement | null>(null);

const togglePanel = () => {
  showPanel.value = !showPanel.value;
};

const openPanel = () => {
  showPanel.value = true;
};

const closePanel = () => {
  showPanel.value = false;
};

const frameStyle = computed(() => ({
  paddingTop: props.offsetTop,
  paddingLeft: props.offsetSide,
  paddingRight: props.offsetSide,
  "--top-drawer-max-width": props.maxWidth,
  "--top-drawer-body-padding": props.bodyPadding,
}));

const shellClass = computed(() => (
  props.anchor === "top-left"
    ? "top-drawer__shell--left"
    : "top-drawer__shell--right"
));

defineExpose({
  showPanel,
  closePanel,
  openPanel,
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
        :open="openPanel"
        :close="closePanel"
        :is-open="showPanel"
      />
    </div>

    <Teleport to="body">
      <Transition name="top-drawer-slide">
        <div
          v-if="showPanel"
          class="top-drawer__panel-frame"
          :style="frameStyle"
        >
          <DrawerShell
            v-model="showPanel"
            class="top-drawer__shell"
            :class="shellClass"
            :frame-height="frameHeight"
            :designed-height-ratio="designedHeightRatio"
            :app-shift="appShift"
            :handle-label="handleLabel"
            :aria-label="ariaLabel"
            :close-on-scrim="true"
          >
            <div
              data-testid="top-drawer-panel"
              class="top-drawer__panel"
            >
              <slot
                name="panel"
                :toggle="togglePanel"
                :open="openPanel"
                :close="closePanel"
                :is-open="showPanel"
                :anchor="anchor"
              />
            </div>
          </DrawerShell>
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

.top-drawer__panel-frame {
  position: fixed;
  inset: 0;
  z-index: 9999;
  display: flex;
  align-items: flex-start;
  pointer-events: none;
}

.top-drawer__shell {
  width: 100%;
  max-width: var(--top-drawer-max-width);
  pointer-events: auto;
}

.top-drawer__shell--left {
  margin-right: auto;
}

.top-drawer__shell--right {
  margin-left: auto;
}

.top-drawer__panel {
  min-width: 0;
}

.top-drawer__shell :deep(.drawer-shell__body) {
  padding: var(--top-drawer-body-padding);
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
