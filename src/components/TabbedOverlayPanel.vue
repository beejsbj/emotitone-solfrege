<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, type Component } from "vue";
import Tabs, { type TabItem } from "@/components/primatives/Tabs.vue";
import OverlayPanelShell from "./OverlayPanelShell.vue";

export interface TabbedOverlayTab {
  value: string;
  label: string;
  shortLabel: string;
  icon?: Component;
  disabled?: boolean;
}

interface Props {
  embedded?: boolean;
  modelValue: string;
  tabs: TabbedOverlayTab[];
  width?: string;
  height?: string;
  maxHeight?: string;
  bodyClass?: string;
  tabTestIdPrefix?: string;
  tabsAriaLabel?: string;
}

const props = withDefaults(defineProps<Props>(), {
  width: "min(46rem, calc(100vw - 1.5rem))",
  height: "",
  maxHeight: "min(62vh, 36rem)",
  bodyClass: "",
  tabTestIdPrefix: "panel-tab",
  tabsAriaLabel: "Panel sections",
});

const emit = defineEmits<{
  "update:modelValue": [value: string];
  contentHeight: [height: number];
}>();

const activeValue = computed({
  get: () => props.modelValue,
  set: (value: string) => emit("update:modelValue", value),
});

const tabItems = computed<TabItem[]>(() =>
  props.tabs.map((tab) => ({
    value: tab.value,
    label: tab.label,
    shortLabel: tab.shortLabel,
    icon: tab.icon,
    disabled: tab.disabled,
    testId: `${props.tabTestIdPrefix}-${tab.value}`,
  })),
);

const swipeSurface = ref<HTMLElement | null>(null);
const swiping = ref(false);
let suppressSwipeClick = false;
let swipeClickTimer: number | undefined;
const swipeGesture = {
  pointerId: null as number | null,
  startX: 0,
  startY: 0,
  currentX: 0,
  axis: null as "horizontal" | "vertical" | null,
};

const resetSwipeGesture = () => {
  swipeGesture.pointerId = null;
  swipeGesture.axis = null;
  swiping.value = false;
};

const swipeStartedOnIgnoredControl = (target: EventTarget | null) =>
  target instanceof Element && Boolean(target.closest(
    ".knob-wrapper, input, textarea, select, [contenteditable='true'], .action-scroll, [data-tabs-swipe-ignore]",
  ));

const handleSwipePointerDown = (event: PointerEvent) => {
  if (
    event.pointerType === "mouse" ||
    event.isPrimary === false ||
    swipeStartedOnIgnoredControl(event.target)
  ) return;

  swipeGesture.pointerId = event.pointerId;
  swipeGesture.startX = event.clientX;
  swipeGesture.startY = event.clientY;
  swipeGesture.currentX = event.clientX;
  swipeGesture.axis = null;
};

const handleSwipePointerMove = (event: PointerEvent) => {
  if (event.pointerId !== swipeGesture.pointerId || !swipeSurface.value) return;

  const deltaX = event.clientX - swipeGesture.startX;
  const deltaY = event.clientY - swipeGesture.startY;
  swipeGesture.currentX = event.clientX;

  if (swipeGesture.axis === null) {
    if (Math.hypot(deltaX, deltaY) < 12) return;
    swipeGesture.axis = Math.abs(deltaX) > Math.abs(deltaY) * 1.2
      ? "horizontal"
      : "vertical";

    if (swipeGesture.axis === "horizontal") {
      swiping.value = true;
      try {
        swipeSurface.value.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic and older pointer implementations may not expose capture.
      }
    }
  }

  if (swipeGesture.axis === "horizontal") event.preventDefault();
};

const adjacentTab = (direction: -1 | 1) => {
  const availableTabs = props.tabs.filter((tab) => !tab.disabled);
  const currentIndex = availableTabs.findIndex((tab) => tab.value === activeValue.value);
  if (currentIndex < 0) return null;
  return availableTabs[currentIndex + direction] ?? null;
};

const armSwipeClickSuppression = () => {
  suppressSwipeClick = true;
  window.clearTimeout(swipeClickTimer);
  swipeClickTimer = window.setTimeout(() => {
    suppressSwipeClick = false;
  }, 400);
};

const handleSwipePointerEnd = (event: PointerEvent) => {
  if (event.pointerId !== swipeGesture.pointerId) return;

  if (swipeGesture.axis === "horizontal") {
    const distance = swipeGesture.currentX - swipeGesture.startX;
    const threshold = Math.min(80, Math.max(48, (swipeSurface.value?.clientWidth ?? 0) * 0.12));
    if (Math.abs(distance) >= threshold) {
      const target = adjacentTab(distance < 0 ? 1 : -1);
      if (target) activeValue.value = target.value;
    }
    armSwipeClickSuppression();
  }

  resetSwipeGesture();
};

const handleSwipePointerCancel = (event: PointerEvent) => {
  if (event.type === "lostpointercapture" && event.target !== event.currentTarget) return;
  if (event.pointerId === swipeGesture.pointerId) resetSwipeGesture();
};

const handleSwipeClickCapture = (event: MouseEvent) => {
  if (!suppressSwipeClick) return;
  event.preventDefault();
  event.stopPropagation();
  suppressSwipeClick = false;
  window.clearTimeout(swipeClickTimer);
};

onBeforeUnmount(() => window.clearTimeout(swipeClickTimer));

provide("tabs-context", { value: activeValue });
</script>

<template>
  <div class="flex min-w-0 w-full flex-col" :class="{ 'h-full min-h-0': embedded }">
    <OverlayPanelShell
      :embedded="embedded"
      @content-height="emit('contentHeight', $event)"
      :width="width"
      :height="height"
      :max-height="maxHeight"
      :body-class="bodyClass"
    >
      <template v-if="$slots.header" #header>
        <slot name="header" />
      </template>

      <template v-if="$slots.toolbar" #toolbar>
        <slot name="toolbar" />
      </template>

      <div
        ref="swipeSurface"
        data-testid="tabbed-overlay-swipe-surface"
        class="tabbed-overlay-panel__swipe-surface"
        :class="{ 'tabbed-overlay-panel__swipe-surface--swiping': swiping }"
        @pointerdown="handleSwipePointerDown"
        @pointermove="handleSwipePointerMove"
        @pointerup="handleSwipePointerEnd"
        @pointercancel="handleSwipePointerCancel"
        @lostpointercapture="handleSwipePointerCancel"
        @click.capture="handleSwipeClickCapture"
      >
        <slot />
      </div>

      <template v-if="tabs.length > 0" #footer>
        <Tabs
          v-model="activeValue"
          :tabs="tabItems"
          density="compact"
          layout="scroll"
          :aria-label="tabsAriaLabel"
        />
      </template>
    </OverlayPanelShell>
  </div>
</template>

<style scoped>
.tabbed-overlay-panel__swipe-surface {
  min-block-size: 100%;
  touch-action: pan-y;
  overscroll-behavior-inline: contain;
}

.tabbed-overlay-panel__swipe-surface--swiping {
  user-select: none;
}
</style>
