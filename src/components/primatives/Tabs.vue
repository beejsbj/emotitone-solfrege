<template>
  <div
    ref="scrollEl"
    class="tabs"
    :class="classes"
    role="tablist"
    :aria-label="ariaLabel"
    @pointerdown="handleRailPointerDown"
    @pointermove="handleRailPointerMove"
    @pointerup="handleRailPointerEnd"
    @pointercancel="handleRailPointerCancel"
    @lostpointercapture="handleRailPointerCancel"
    @click.capture="handleRailClickCapture"
  >
    <div ref="trackEl" class="tabs__track">
      <span class="tabs__streak" aria-hidden="true" />
      <span
        class="tabs__chip"
        :class="{ 'tabs__chip--smearing': smearing, brass: resolvedTone === 'brass' }"
        :style="chipStyle"
        aria-hidden="true"
      />
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="tabs__button"
        :class="{ 'tabs__button--active': tab.value === activeValue }"
        :disabled="tab.disabled"
        :data-testid="tab.testId"
        :tabindex="tab.value === activeValue ? 0 : -1"
        role="tab"
        :aria-label="tab.icon ? tab.label : undefined"
        :aria-selected="tab.value === activeValue"
        @click="selectTab(tab, $event)"
      >
        <span v-if="tab.icon" class="tabs__label tabs__label--icon">
          <component :is="tab.icon" class="tabs__icon" />
          <span :class="{ 'tabs__label-text--hidden': tab.value !== activeValue }">
            {{ tab.value === activeValue ? tab.label : tab.shortLabel ?? tab.label }}
          </span>
        </span>
        <span v-else class="tabs__label">
          {{ tab.value === activeValue ? tab.label : tab.shortLabel ?? tab.label }}
        </span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
  type Component,
} from "vue";
import { currentTabsPageEdition } from "./TabsEdition";

export interface TabItem {
  label: string;
  value: string;
  shortLabel?: string;
  icon?: Component;
  disabled?: boolean;
  testId?: string;
}

export type TabsGeometry = "tab" | "offcut" | "tile" | "sharp" | "rip";
export type TabsDensity = "comfortable" | "compact";
export type TabsTone = "ivory" | "brass";
export type TabsLayout = "equal" | "scroll";
export type TabsSelectionSource = "pointer" | "keyboard";

const props = withDefaults(
  defineProps<{
    tabs: TabItem[];
    modelValue?: string;
    defaultValue?: string;
    geometry?: TabsGeometry;
    density?: TabsDensity;
    tone?: TabsTone;
    layout?: TabsLayout;
    ariaLabel?: string;
  }>(),
  {
    modelValue: undefined,
    defaultValue: undefined,
    density: "comfortable",
    layout: "equal",
    ariaLabel: "Tabs",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string, source: TabsSelectionSource];
}>();

const scrollEl = ref<HTMLElement | null>(null);
const trackEl = ref<HTMLElement | null>(null);
const internalValue = ref(props.defaultValue ?? props.tabs.find((tab) => !tab.disabled)?.value ?? "");
const chipLeft = ref(0);
const chipWidth = ref(0);
const smearing = ref(false);
const draggingRail = ref(false);
let smearTimer: number | undefined;
let railClickTimer: number | undefined;
let sizeObserver: ResizeObserver | undefined;
let suppressRailClick = false;

const railGesture = {
  pointerId: null as number | null,
  startX: 0,
  startY: 0,
  startScrollLeft: 0,
  axis: null as "horizontal" | "vertical" | null,
};

const activeValue = computed(() => props.modelValue ?? internalValue.value);

const pageEdition = currentTabsPageEdition();
const hasPinnedEdition = computed(() => props.geometry !== undefined || props.tone !== undefined);
const resolvedGeometry = computed(() =>
  props.geometry ?? (hasPinnedEdition.value ? "tab" : pageEdition.geometry),
);
const resolvedTone = computed(() =>
  props.tone ?? (hasPinnedEdition.value ? "ivory" : pageEdition.tone),
);

const classes = computed(() => [
  `tabs--geometry-${resolvedGeometry.value}`,
  `tabs--density-${props.density}`,
  `tabs--tone-${resolvedTone.value}`,
  `tabs--layout-${props.layout}`,
  { "tabs--dragging": draggingRail.value },
]);

const resetRailGesture = () => {
  railGesture.pointerId = null;
  railGesture.axis = null;
  draggingRail.value = false;
};

const handleRailPointerDown = (event: PointerEvent) => {
  if (
    props.layout !== "scroll" ||
    event.isPrimary === false ||
    (event.pointerType === "mouse" && event.button !== 0)
  ) return;

  railGesture.pointerId = event.pointerId;
  railGesture.startX = event.clientX;
  railGesture.startY = event.clientY;
  railGesture.startScrollLeft = scrollEl.value?.scrollLeft ?? 0;
  railGesture.axis = null;
};

const handleRailPointerMove = (event: PointerEvent) => {
  if (event.pointerId !== railGesture.pointerId || !scrollEl.value) return;

  const deltaX = event.clientX - railGesture.startX;
  const deltaY = event.clientY - railGesture.startY;

  if (railGesture.axis === null) {
    if (Math.hypot(deltaX, deltaY) < 6) return;
    railGesture.axis = Math.abs(deltaX) > Math.abs(deltaY) * 1.1
      ? "horizontal"
      : "vertical";

    if (railGesture.axis === "horizontal") {
      draggingRail.value = true;
      try {
        scrollEl.value.setPointerCapture?.(event.pointerId);
      } catch {
        // Synthetic and older pointer implementations may not expose capture.
      }
    }
  }

  if (railGesture.axis !== "horizontal") return;
  event.preventDefault();
  scrollEl.value.scrollLeft = railGesture.startScrollLeft - deltaX;
};

const armRailClickSuppression = () => {
  suppressRailClick = true;
  window.clearTimeout(railClickTimer);
  railClickTimer = window.setTimeout(() => {
    suppressRailClick = false;
  }, 400);
};

const handleRailPointerEnd = (event: PointerEvent) => {
  if (event.pointerId !== railGesture.pointerId) return;
  if (railGesture.axis === "horizontal") armRailClickSuppression();
  resetRailGesture();
};

const handleRailPointerCancel = (event: PointerEvent) => {
  if (event.type === "lostpointercapture" && event.target !== event.currentTarget) return;
  if (event.pointerId === railGesture.pointerId) resetRailGesture();
};

const handleRailClickCapture = (event: MouseEvent) => {
  if (!suppressRailClick) return;
  event.preventDefault();
  event.stopPropagation();
  suppressRailClick = false;
  window.clearTimeout(railClickTimer);
};

const chipStyle = computed(() => ({
  left: `${chipLeft.value}px`,
  width: `${chipWidth.value}px`,
}));

const measureChip = () => {
  const track = trackEl.value;
  if (!track) return;

  const activeButton = track.querySelector<HTMLElement>(
    `.tabs__button[aria-selected="true"]:not(:disabled)`,
  );
  const fallbackButton = track.querySelector<HTMLElement>(".tabs__button:not(:disabled)");
  const target = activeButton ?? fallbackButton;
  if (!target) return;

  const trackRect = track.getBoundingClientRect();
  const buttonRect = target.getBoundingClientRect();
  chipLeft.value = buttonRect.left - trackRect.left;
  chipWidth.value = buttonRect.width;
};

const revealActiveTab = (behavior: ScrollBehavior = "smooth") => {
  if (props.layout !== "scroll") return;

  const scroll = scrollEl.value;
  const track = trackEl.value;
  const target = track?.querySelector<HTMLElement>(
    `.tabs__button[aria-selected="true"]:not(:disabled)`,
  );
  if (!scroll || !target) return;
  if (typeof scroll.scrollTo !== "function") return;

  const left = target.offsetLeft - Math.max(0, (scroll.clientWidth - target.offsetWidth) / 2);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scroll.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? "auto" : behavior });
};

const syncTabsToLayout = () => {
  measureChip();
  revealActiveTab("auto");
};

const triggerSmear = () => {
  smearing.value = true;
  window.clearTimeout(smearTimer);
  smearTimer = window.setTimeout(() => {
    smearing.value = false;
  }, 220);
};

const selectTab = (tab: TabItem, event: MouseEvent) => {
  if (tab.disabled || tab.value === activeValue.value) return;
  if (props.modelValue === undefined) internalValue.value = tab.value;
  emit("update:modelValue", tab.value, event.detail === 0 ? "keyboard" : "pointer");
  triggerSmear();
  void nextTick(() => {
    measureChip();
    revealActiveTab();
  });
};

watch(
  () => [activeValue.value, props.tabs, props.density, resolvedGeometry.value, props.layout],
  () => nextTick(() => {
    measureChip();
    revealActiveTab("auto");
  }),
  { deep: true },
);

onMounted(() => {
  void nextTick(syncTabsToLayout);
  window.addEventListener("resize", syncTabsToLayout);
  if (typeof ResizeObserver !== "undefined" && scrollEl.value && trackEl.value) {
    sizeObserver = new ResizeObserver(syncTabsToLayout);
    sizeObserver.observe(scrollEl.value);
    sizeObserver.observe(trackEl.value);
  }
});

onBeforeUnmount(() => {
  window.clearTimeout(smearTimer);
  window.clearTimeout(railClickTimer);
  window.removeEventListener("resize", syncTabsToLayout);
  sizeObserver?.disconnect();
});
</script>

<style scoped>
.tabs {
  position: relative;
  width: 100%;
  border: 1px solid rgb(244 239 230 / 18%);
  background: var(--ink);
  overflow: hidden;
}

.tabs__track {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 100%;
  box-sizing: border-box;
  padding: 6px;
  isolation: isolate;
}

.tabs--density-compact .tabs__track {
  padding: 4px;
}

.tabs--layout-scroll {
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
  touch-action: pan-y;
  cursor: grab;
  user-select: none;
}

.tabs--dragging { cursor: grabbing; }

.tabs--layout-scroll::-webkit-scrollbar {
  display: none;
}

.tabs--layout-scroll .tabs__track {
  width: max-content;
}

.tabs__streak {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  z-index: 0;
  height: 60%;
  transform: translateY(-50%);
  background: var(--ink);
}

.tabs__chip {
  position: absolute;
  top: 6px;
  bottom: 6px;
  z-index: 1;
  background: var(--ivory);
  box-shadow: 3px 3px 0 var(--ink);
  clip-path: var(--clip-tab);
  transition:
    left var(--dur-ui) var(--ease-swing),
    width var(--dur-ui) var(--ease-swing),
    transform var(--dur-ui) var(--ease-swing);
}

.tabs--density-compact .tabs__chip {
  top: 4px;
  bottom: 4px;
}

.tabs__chip--smearing {
  transform: scaleX(1.08) skewX(-12deg);
}

.tabs--geometry-offcut .tabs__chip {
  clip-path: var(--clip-offcut);
}

.tabs--geometry-tile .tabs__chip {
  clip-path: var(--clip-tile);
}

.tabs--geometry-sharp .tabs__chip {
  clip-path: none;
  border-radius: 0;
}

.tabs--geometry-rip .tabs__chip {
  clip-path: var(--clip-paper-rip);
}

.tabs--tone-brass .tabs__chip {
  background: var(--brass-fill);
  color: var(--brass-edge);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .55),
    inset 0 -1px 0 rgba(0, 0, 0, .45),
    0 1px 0 rgba(0, 0, 0, .6),
    0 0 0 1px rgba(0, 0, 0, .18),
    var(--shadow-glow-brass);
}

.tabs__button {
  position: relative;
  z-index: 2;
  flex: 1 1 0;
  min-width: 0;
  border: 0;
  background: transparent;
  color: var(--ivory);
  cursor: pointer;
  font: 700 13px/1 var(--font-display);
  letter-spacing: .14em;
  mix-blend-mode: difference;
  padding: 10px 14px;
  text-transform: uppercase;
  white-space: nowrap;
}

.tabs--layout-scroll .tabs__button {
  flex: 0 0 auto;
  min-width: 58px;
}

.tabs__label,
.tabs__label--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.tabs__label--icon {
  gap: 6px;
}

.tabs__icon {
  width: 12px;
  height: 12px;
  flex: none;
}

.tabs__label-text--hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.tabs--density-compact .tabs__button {
  font-size: 10px;
  padding: 7px 10px;
}

.tabs__button:disabled {
  cursor: not-allowed;
  opacity: .38;
}

@media (prefers-reduced-motion: reduce) {
  .tabs__chip {
    transition: none;
  }

  .tabs__chip--smearing {
    transform: none;
  }

  .tabs__chip.brass {
    animation: none;
  }
}

@media (forced-colors: active) {
  .tabs {
    border-color: CanvasText;
    background: Canvas;
  }

  .tabs__streak {
    background: CanvasText;
  }

  .tabs__chip,
  .tabs--tone-brass .tabs__chip {
    background: Highlight;
    box-shadow: none;
  }

  .tabs__button {
    color: ButtonText;
    mix-blend-mode: normal;
  }

  .tabs__button--active {
    color: HighlightText;
  }
}
</style>
