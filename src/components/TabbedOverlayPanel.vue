<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, provide, ref, type Component } from "vue";
import Tabs, {
  type TabItem,
  type TabsSelectionSource,
} from "@/components/primatives/Tabs.vue";
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
const settlingSwipe = ref(false);
const previewDirection = ref<-1 | 1 | null>(null);
const swipePreviewTop = ref(0);
const settleOrigin = ref("");
const settleTarget = ref("");
const settleDirection = ref<-1 | 1 | null>(null);
const settleCommitsSelection = ref(false);
let swipeOffset = 0;
let suppressSwipeClick = false;
let swipeClickTimer: number | undefined;
let swipeSettleTimer: number | undefined;
const swipeGesture = {
  pointerId: null as number | null,
  originValue: "",
  startX: 0,
  startY: 0,
  currentX: 0,
  axis: null as "horizontal" | "vertical" | null,
};

const resetSwipeGesture = () => {
  swipeGesture.pointerId = null;
  swipeGesture.originValue = "";
  swipeGesture.axis = null;
  swiping.value = false;
  previewDirection.value = null;
  swipePreviewTop.value = 0;
};

const swipeScrollContainer = () =>
  swipeSurface.value?.closest<HTMLElement>(".overlay-panel-shell__body") ?? null;

const applySwipeOffset = (offset: number) => {
  swipeOffset = offset;
  swipeSurface.value?.style.setProperty("--tabbed-overlay-swipe-x", `${offset}px`);
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

  if (settlingSwipe.value) finishSwipeSettle();

  swipeGesture.pointerId = event.pointerId;
  swipeGesture.originValue = activeValue.value;
  swipeGesture.startX = event.clientX;
  swipeGesture.startY = event.clientY;
  swipeGesture.currentX = event.clientX;
  swipeGesture.axis = null;
};

const adjacentTab = (direction: -1 | 1, fromValue = activeValue.value) => {
  const availableTabs = props.tabs.filter((tab) => !tab.disabled);
  const currentIndex = availableTabs.findIndex((tab) => tab.value === fromValue);
  if (currentIndex < 0) return null;
  return availableTabs[currentIndex + direction] ?? null;
};

interface SwipePage {
  value: string;
  position: "previous" | "current" | "next";
}

const swipePages = computed(() => {
  if (settlingSwipe.value && settleDirection.value !== null) {
    const pages: SwipePage[] = [
      { value: settleOrigin.value, position: "current" },
    ];
    if (settleTarget.value) {
      pages.push({
        value: settleTarget.value,
        position: settleDirection.value === 1 ? "next" as const : "previous" as const,
      });
    }
    return pages;
  }

  const direction = swiping.value ? previewDirection.value : null;
  const origin = swipeGesture.originValue || activeValue.value;
  const target = direction === null ? null : adjacentTab(direction, origin);
  return [
    { value: origin, position: "current" as const },
    ...(target ? [{
      value: target.value,
      position: direction === 1 ? "next" as const : "previous" as const,
    }] : []),
  ];
});

const isSwipePageActive = (value: string) => {
  if (settlingSwipe.value && settleCommitsSelection.value) {
    return value === settleTarget.value;
  }
  return value === (swipeGesture.originValue || activeValue.value);
};

const updateSwipeOffset = (deltaX: number) => {
  const width = Math.max(1, swipeSurface.value?.clientWidth ?? 0);
  const direction: -1 | 1 = deltaX < 0 ? 1 : -1;
  const target = adjacentTab(direction, swipeGesture.originValue || activeValue.value);
  const bounded = Math.max(-width, Math.min(width, deltaX));
  previewDirection.value = direction;
  applySwipeOffset(target ? bounded : bounded * 0.18);
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
      swipePreviewTop.value = swipeScrollContainer()?.scrollTop ?? 0;
      try {
        swipeSurface.value.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic and older pointer implementations may not expose capture.
      }
    }
  }

  if (swipeGesture.axis === "horizontal") {
    event.preventDefault();
    updateSwipeOffset(deltaX);
  }
};

const armSwipeClickSuppression = () => {
  suppressSwipeClick = true;
  window.clearTimeout(swipeClickTimer);
  swipeClickTimer = window.setTimeout(() => {
    suppressSwipeClick = false;
  }, 400);
};

const finishSwipeSettle = () => {
  if (!settlingSwipe.value) return;
  window.clearTimeout(swipeSettleTimer);
  if (settleCommitsSelection.value) {
    const scroll = swipeScrollContainer();
    if (scroll) scroll.scrollTop = 0;
  }
  applySwipeOffset(0);
  settlingSwipe.value = false;
  settleCommitsSelection.value = false;
  settleDirection.value = null;
  settleOrigin.value = "";
  settleTarget.value = "";
  resetSwipeGesture();
};

const beginSwipeSettle = (target: TabbedOverlayTab | null, direction: -1 | 1, commit: boolean) => {
  const origin = swipeGesture.originValue || activeValue.value;
  const width = Math.max(1, swipeSurface.value?.clientWidth ?? 0);
  settleOrigin.value = origin;
  settleTarget.value = target?.value ?? "";
  settleDirection.value = direction;
  settleCommitsSelection.value = commit && Boolean(target);
  settlingSwipe.value = true;
  swiping.value = false;

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    if (commit && target) activeValue.value = target.value;
    finishSwipeSettle();
    return;
  }

  if (commit && target) activeValue.value = target.value;
  void nextTick(() => {
    // Resolve the dragged transform with the settling class before changing its
    // destination, so the browser always has two distinct frames to animate.
    void swipeSurface.value?.offsetWidth;
    applySwipeOffset(commit && target ? (direction === 1 ? -width : width) : 0);
    window.clearTimeout(swipeSettleTimer);
    swipeSettleTimer = window.setTimeout(finishSwipeSettle, 320);
  });
};

const handleTabSelection = (value: string, source: TabsSelectionSource) => {
  if (value === activeValue.value) return;
  const availableTabs = props.tabs.filter((tab) => !tab.disabled);
  const originIndex = availableTabs.findIndex((tab) => tab.value === activeValue.value);
  const targetIndex = availableTabs.findIndex((tab) => tab.value === value);
  const target = targetIndex >= 0 ? availableTabs[targetIndex] : null;

  if (!target || source === "keyboard" || originIndex < 0) {
    if (target) activeValue.value = target.value;
    return;
  }

  if (settlingSwipe.value) finishSwipeSettle();
  resetSwipeGesture();
  applySwipeOffset(0);
  swipeGesture.originValue = activeValue.value;
  swipePreviewTop.value = swipeScrollContainer()?.scrollTop ?? 0;
  beginSwipeSettle(target, targetIndex > originIndex ? 1 : -1, true);
};

const handleSwipePointerEnd = (event: PointerEvent) => {
  if (event.pointerId !== swipeGesture.pointerId) return;

  if (swipeGesture.axis === "horizontal") {
    swipeGesture.currentX = event.clientX;
    const distance = swipeGesture.currentX - swipeGesture.startX;
    updateSwipeOffset(distance);
    const threshold = Math.min(80, Math.max(48, (swipeSurface.value?.clientWidth ?? 0) * 0.12));
    const direction: -1 | 1 = distance < 0 ? 1 : -1;
    const target = adjacentTab(direction, swipeGesture.originValue);
    const commit = Math.abs(distance) >= threshold && Boolean(target);
    beginSwipeSettle(target, direction, commit);
    swipeGesture.pointerId = null;
    armSwipeClickSuppression();
    return;
  }

  resetSwipeGesture();
};

const handleSwipePointerCancel = (event: PointerEvent) => {
  if (event.type === "lostpointercapture" && event.target !== event.currentTarget) return;
  if (event.pointerId !== swipeGesture.pointerId) return;
  if (swipeGesture.axis === "horizontal") {
    const direction: -1 | 1 = swipeOffset < 0 ? 1 : -1;
    beginSwipeSettle(
      adjacentTab(direction, swipeGesture.originValue),
      direction,
      false,
    );
    swipeGesture.pointerId = null;
    armSwipeClickSuppression();
    return;
  }
  resetSwipeGesture();
};

const handleSwipeTransitionEnd = (event: TransitionEvent) => {
  if (
    settlingSwipe.value &&
    event.propertyName === "transform" &&
    event.target instanceof Element &&
    event.target.classList.contains("tabbed-overlay-panel__page")
  ) finishSwipeSettle();
};

const handleSwipeClickCapture = (event: MouseEvent) => {
  if (!suppressSwipeClick) return;
  event.preventDefault();
  event.stopPropagation();
  suppressSwipeClick = false;
  window.clearTimeout(swipeClickTimer);
};

onBeforeUnmount(() => {
  window.clearTimeout(swipeClickTimer);
  window.clearTimeout(swipeSettleTimer);
});

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
        :class="{
          'tabbed-overlay-panel__swipe-surface--swiping': swiping,
          'tabbed-overlay-panel__swipe-surface--settling': settlingSwipe,
        }"
        @pointerdown="handleSwipePointerDown"
        @pointermove="handleSwipePointerMove"
        @pointerup="handleSwipePointerEnd"
        @pointercancel="handleSwipePointerCancel"
        @lostpointercapture="handleSwipePointerCancel"
        @click.capture="handleSwipeClickCapture"
        @transitionend="handleSwipeTransitionEnd"
      >
        <div
          v-for="page in swipePages"
          :key="page.value"
          class="tabbed-overlay-panel__page"
          :class="`tabbed-overlay-panel__page--${page.position}`"
          :style="page.position === 'previous' || page.position === 'next'
            ? { insetBlockStart: `${swipePreviewTop}px` }
            : undefined"
          :aria-hidden="!isSwipePageActive(page.value)"
          :inert="!isSwipePageActive(page.value)"
        >
          <slot :active-value="page.value" />
        </div>
      </div>

      <template v-if="tabs.length > 0" #footer>
        <Tabs
          :model-value="activeValue"
          :tabs="tabItems"
          density="compact"
          layout="scroll"
          :aria-label="tabsAriaLabel"
          @update:model-value="handleTabSelection"
        />
      </template>
    </OverlayPanelShell>
  </div>
</template>

<style scoped>
.tabbed-overlay-panel__swipe-surface {
  position: relative;
  min-block-size: 100%;
  overflow: clip;
  touch-action: pan-y;
  overscroll-behavior-inline: contain;
}

.tabbed-overlay-panel__page {
  position: relative;
  min-inline-size: 0;
  transform: translate3d(var(--tabbed-overlay-swipe-x, 0), 0, 0);
}

.tabbed-overlay-panel__page--previous,
.tabbed-overlay-panel__page--next {
  position: absolute;
  inset-block-start: 0;
  inline-size: 100%;
}

.tabbed-overlay-panel__page--previous {
  transform: translate3d(calc(-100% + var(--tabbed-overlay-swipe-x, 0px)), 0, 0);
}

.tabbed-overlay-panel__page--next {
  transform: translate3d(calc(100% + var(--tabbed-overlay-swipe-x, 0px)), 0, 0);
}

.tabbed-overlay-panel__swipe-surface--swiping {
  user-select: none;
}

.tabbed-overlay-panel__swipe-surface--swiping .tabbed-overlay-panel__page {
  transition: none;
  will-change: transform;
}

.tabbed-overlay-panel__swipe-surface--settling .tabbed-overlay-panel__page {
  transition: transform var(--dur-ui) var(--ease-brush);
  will-change: transform;
}

@media (prefers-reduced-motion: reduce) {
  .tabbed-overlay-panel__page {
    transition: none;
  }
}
</style>
