<template>
  <div
    ref="frameEl"
    class="drawer-shell"
    :class="classes"
    :style="frameStyle"
  >
    <div class="drawer-shell__stage" aria-hidden="true">
      <slot name="stage" :is-open="isOpen" />
    </div>

    <button
      v-if="closeOnScrim"
      type="button"
      class="drawer-shell__scrim"
      aria-label="close drawer"
      @click="close"
    />
    <div v-else class="drawer-shell__scrim" aria-hidden="true" />

    <section class="drawer-shell__panel" :style="panelStyle">
      <button
        type="button"
        class="drawer-shell__handle"
        :aria-label="ariaLabel"
        @click="handleClick"
        @pointerdown="handlePointerDown"
        @pointermove="handlePointerMove"
        @pointerup="handlePointerUp"
        @pointercancel="cancelDrag"
      >
        <span class="drawer-shell__tear" aria-hidden="true">
          <svg viewBox="0 0 200 14" preserveAspectRatio="none">
            <path
              d="M0 0 L12 8 L24 2 L38 10 L52 4 L66 11 L80 3 L94 9 L108 2 L122 10 L136 4 L150 9 L164 3 L178 10 L192 5 L200 12 L200 14 L0 14 Z"
              fill="var(--ink-3)"
              stroke-linecap="butt"
            />
          </svg>
        </span>
        <span class="drawer-shell__grip" aria-hidden="true" />
        <span v-if="handleLabel" class="drawer-shell__handle-label">{{ handleLabel }}</span>
        <span class="drawer-shell__grip" aria-hidden="true" />
      </button>

      <div class="drawer-shell__body">
        <slot :is-open="isOpen" />
      </div>
    </section>

    <span
      v-if="showSnapBadge"
      class="drawer-shell__snap-badge"
      :class="{ 'drawer-shell__snap-badge--show': snapBadgeVisible }"
    >
      {{ snapBadge }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";

export type DrawerShellAnchor = "top" | "bottom";

const props = withDefaults(
  defineProps<{
    modelValue?: boolean;
    defaultOpen?: boolean;
    anchor?: DrawerShellAnchor;
    frameHeight?: string;
    designedHeightRatio?: number;
    resizable?: boolean;
    closeOnScrim?: boolean;
    closeOnEscape?: boolean;
    appShift?: string;
    handleLabel?: string;
    ariaLabel?: string;
    showSnapBadge?: boolean;
  }>(),
  {
    modelValue: undefined,
    defaultOpen: false,
    anchor: "top",
    frameHeight: "220px",
    designedHeightRatio: 0.72,
    resizable: false,
    closeOnScrim: true,
    closeOnEscape: true,
    appShift: "16px",
    handleLabel: "",
    ariaLabel: "toggle drawer",
    showSnapBadge: false,
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: boolean];
  snap: [name: "closed" | "designed" | "full"];
}>();

const frameEl = ref<HTMLElement | null>(null);
const internalOpen = ref(props.defaultOpen);
const currentHeightPx = ref<number | null>(null);
const dragging = ref(false);
const startY = ref(0);
const startHeight = ref(0);
const snapBadge = ref("");
const snapBadgeVisible = ref(false);
let snapTimer: number | undefined;

const isOpen = computed({
  get: () => props.modelValue ?? internalOpen.value,
  set: (value: boolean) => {
    if (props.modelValue === undefined) {
      internalOpen.value = value;
    }
    emit("update:modelValue", value);
  },
});

const classes = computed(() => [
  `drawer-shell--anchor-${props.anchor}`,
  {
    "drawer-shell--open": isOpen.value,
    "drawer-shell--dragging": dragging.value,
    "drawer-shell--resizable": props.resizable,
  },
]);

const frameStyle = computed(() => ({
  "--drawer-shell-frame-height": props.frameHeight,
  "--drawer-shell-app-shift": props.appShift,
}));

const panelStyle = computed(() => ({
  "--drawer-shell-panel-height":
    currentHeightPx.value === null
      ? `${props.designedHeightRatio * 100}%`
      : `${currentHeightPx.value}px`,
}));

const frameHeight = () => frameEl.value?.offsetHeight ?? 0;
const designedHeight = () => Math.round(frameHeight() * props.designedHeightRatio);

const snapPoints = () => {
  const height = frameHeight();
  return [0, designedHeight(), height];
};

const snapName = (height: number): "closed" | "designed" | "full" => {
  const fullHeight = frameHeight();
  if (height <= 0) return "closed";
  if (height >= fullHeight - 2) return "full";
  return "designed";
};

const nearestSnap = (height: number) => {
  const points = snapPoints();
  return points.reduce((best, point) => (
    Math.abs(point - height) < Math.abs(best - height) ? point : best
  ), points[0]);
};

const flashSnapBadge = (name: "closed" | "designed" | "full") => {
  if (!props.showSnapBadge) return;
  snapBadge.value = name;
  snapBadgeVisible.value = true;
  window.clearTimeout(snapTimer);
  snapTimer = window.setTimeout(() => {
    snapBadgeVisible.value = false;
  }, 900);
};

const applyHeight = (height: number) => {
  if (height <= 0) {
    currentHeightPx.value = null;
    isOpen.value = false;
    return;
  }

  currentHeightPx.value = height;
  isOpen.value = true;
};

const open = () => {
  currentHeightPx.value = props.resizable ? designedHeight() : null;
  isOpen.value = true;
};

const close = () => {
  currentHeightPx.value = null;
  isOpen.value = false;
  flashSnapBadge("closed");
  emit("snap", "closed");
};

const toggle = () => {
  if (isOpen.value) {
    close();
    return;
  }

  open();
  flashSnapBadge("designed");
  emit("snap", "designed");
};

const handleClick = () => {
  if (props.resizable) return;
  toggle();
};

const handlePointerDown = (event: PointerEvent) => {
  if (!props.resizable) return;
  if (event.button && event.button !== 0) return;

  dragging.value = true;
  startY.value = event.clientY;
  startHeight.value = currentHeightPx.value ?? (isOpen.value ? designedHeight() : 0);
  (event.currentTarget as HTMLElement | null)?.setPointerCapture(event.pointerId);
  event.preventDefault();
};

const handlePointerMove = (event: PointerEvent) => {
  if (!dragging.value || !props.resizable) return;

  const delta = props.anchor === "top"
    ? event.clientY - startY.value
    : startY.value - event.clientY;
  const nextHeight = Math.max(0, Math.min(frameHeight(), startHeight.value + delta));
  applyHeight(nextHeight);
  event.preventDefault();
};

const handlePointerUp = (event: PointerEvent) => {
  if (!dragging.value || !props.resizable) return;
  dragging.value = false;

  const totalDrag = Math.abs(event.clientY - startY.value);
  if (totalDrag < 6) {
    toggle();
    return;
  }

  const currentHeight = currentHeightPx.value ?? 0;
  const snappedHeight = nearestSnap(currentHeight);
  const name = snapName(snappedHeight);
  applyHeight(snappedHeight);
  flashSnapBadge(name);
  emit("snap", name);
};

const cancelDrag = () => {
  dragging.value = false;
};

const handleKeydown = (event: KeyboardEvent) => {
  if (props.closeOnEscape && event.key === "Escape" && isOpen.value) {
    close();
  }
};

watch(
  () => props.modelValue,
  (value) => {
    if (value === false) currentHeightPx.value = null;
    if (value === true && props.resizable && currentHeightPx.value === null) {
      currentHeightPx.value = designedHeight();
    }
  },
);

onMounted(() => {
  document.addEventListener("keydown", handleKeydown);
  if (props.defaultOpen && props.resizable) {
    currentHeightPx.value = designedHeight();
  }
});

onBeforeUnmount(() => {
  document.removeEventListener("keydown", handleKeydown);
  window.clearTimeout(snapTimer);
});

defineExpose({
  close,
  open,
  toggle,
});
</script>

<style scoped>
.drawer-shell {
  position: relative;
  height: var(--drawer-shell-frame-height);
  overflow: hidden;
  background: var(--ink);
  border: 1px solid var(--ink-5);
}

.drawer-shell__stage {
  position: absolute;
  inset: 0;
  transition: transform var(--dur-panel) var(--ease-swing);
}

.drawer-shell--open .drawer-shell__stage {
  transform: translateY(var(--drawer-shell-app-shift));
}

.drawer-shell__scrim {
  position: absolute;
  inset: 0;
  z-index: 2;
  border: 0;
  padding: 0;
  background: var(--scrim);
  cursor: pointer;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--dur-panel) var(--ease-brush);
}

.drawer-shell--open .drawer-shell__scrim {
  opacity: 1;
  pointer-events: auto;
}

.drawer-shell__panel {
  position: absolute;
  left: 0;
  right: 0;
  z-index: 3;
  display: flex;
  height: var(--drawer-shell-panel-height);
  flex-direction: column;
  background: var(--ink-3);
  transition: transform var(--dur-panel) var(--ease-swing);
}

.drawer-shell--anchor-top .drawer-shell__panel {
  top: 0;
  transform: translateY(-100%);
}

.drawer-shell--anchor-bottom .drawer-shell__panel {
  bottom: 0;
  transform: translateY(100%);
}

.drawer-shell--open .drawer-shell__panel {
  transform: translateY(0);
}

.drawer-shell--dragging .drawer-shell__panel {
  transition: none;
}

.drawer-shell__body {
  flex: 1;
  overflow: auto;
  padding: 20px 22px 16px;
}

.drawer-shell__handle {
  position: relative;
  display: flex;
  width: 100%;
  height: 28px;
  flex-shrink: 0;
  align-items: center;
  justify-content: center;
  gap: 12px;
  border: 0;
  background: transparent;
  cursor: pointer;
  padding: 0;
  user-select: none;
}

.drawer-shell--resizable .drawer-shell__handle {
  cursor: ns-resize;
}

.drawer-shell--anchor-bottom .drawer-shell__handle {
  order: -1;
}

.drawer-shell__tear {
  position: absolute;
  right: 0;
  left: 0;
  height: 14px;
  overflow: hidden;
  pointer-events: none;
}

.drawer-shell--anchor-top .drawer-shell__tear {
  top: -10px;
}

.drawer-shell--anchor-bottom .drawer-shell__tear {
  bottom: -10px;
  transform: scaleY(-1);
}

.drawer-shell__tear svg {
  display: block;
  width: 100%;
  height: 100%;
}

.drawer-shell__grip {
  width: 36px;
  height: 3px;
  background: var(--ivory-4);
}

.drawer-shell__handle-label {
  color: var(--ivory-3);
  font: var(--t-label);
  font-size: 10px;
  letter-spacing: .22em;
  text-transform: uppercase;
}

.drawer-shell__snap-badge {
  position: absolute;
  right: 8px;
  bottom: 6px;
  z-index: 20;
  color: var(--ivory-4);
  font-family: var(--font-mono);
  font-size: 7px;
  letter-spacing: 0.14em;
  opacity: 0;
  pointer-events: none;
  text-transform: uppercase;
  transition: opacity 180ms var(--ease-brush);
}

.drawer-shell__snap-badge--show {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .drawer-shell__stage,
  .drawer-shell__scrim,
  .drawer-shell__panel {
    transition: opacity 120ms linear !important;
    transform: none !important;
  }

  .drawer-shell:not(.drawer-shell--open) .drawer-shell__panel {
    opacity: 0;
  }

  .drawer-shell--open .drawer-shell__panel {
    opacity: 1;
  }
}
</style>
