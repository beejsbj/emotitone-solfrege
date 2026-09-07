<template>
  <div
    ref="scrollEl"
    class="chip-tabs"
    :class="classes"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <div ref="trackEl" class="chip-tabs__track">
      <span class="chip-tabs__streak" aria-hidden="true" />
      <span
        class="chip-tabs__chip"
        :class="{ 'chip-tabs__chip--smearing': smearing, brass: resolvedTone === 'brass' }"
        :style="chipStyle"
        aria-hidden="true"
      />
      <button
        v-for="tab in tabs"
        :key="tab.value"
        type="button"
        class="chip-tabs__button"
        :class="{ 'chip-tabs__button--active': tab.value === activeValue }"
        :disabled="tab.disabled"
        :data-testid="tab.testId"
        :tabindex="tab.value === activeValue ? 0 : -1"
        role="tab"
        :aria-label="tab.icon ? tab.label : undefined"
        :aria-selected="tab.value === activeValue"
        @click="selectTab(tab)"
      >
        <span v-if="tab.icon" class="chip-tabs__label chip-tabs__label--icon">
          <component :is="tab.icon" class="chip-tabs__icon" />
          <span :class="{ 'chip-tabs__label-text--hidden': tab.value !== activeValue }">
            {{ tab.value === activeValue ? tab.label : tab.shortLabel ?? tab.label }}
          </span>
        </span>
        <span v-else class="chip-tabs__label">
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
import { currentChipTabsPageEdition } from "./ChipTabsEdition";

export interface ChipTabItem {
  label: string;
  value: string;
  shortLabel?: string;
  icon?: Component;
  disabled?: boolean;
  testId?: string;
}

export type ChipTabsGeometry = "tab" | "offcut" | "tile" | "sharp" | "rip";
export type ChipTabsDensity = "comfortable" | "compact";
export type ChipTabsTone = "ivory" | "brass";
export type ChipTabsLayout = "equal" | "scroll";

const props = withDefaults(
  defineProps<{
    tabs: ChipTabItem[];
    modelValue?: string;
    defaultValue?: string;
    geometry?: ChipTabsGeometry;
    density?: ChipTabsDensity;
    tone?: ChipTabsTone;
    layout?: ChipTabsLayout;
    ariaLabel?: string;
  }>(),
  {
    modelValue: undefined,
    defaultValue: undefined,
    density: "comfortable",
    layout: "equal",
    ariaLabel: "Chip tabs",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const scrollEl = ref<HTMLElement | null>(null);
const trackEl = ref<HTMLElement | null>(null);
const internalValue = ref(props.defaultValue ?? props.tabs.find((tab) => !tab.disabled)?.value ?? "");
const chipLeft = ref(0);
const chipWidth = ref(0);
const smearing = ref(false);
let smearTimer: number | undefined;
let sizeObserver: ResizeObserver | undefined;

const activeValue = computed({
  get: () => props.modelValue ?? internalValue.value,
  set: (value: string) => {
    if (props.modelValue === undefined) {
      internalValue.value = value;
    }
    emit("update:modelValue", value);
  },
});

const pageEdition = currentChipTabsPageEdition();
const hasPinnedEdition = computed(() => props.geometry !== undefined || props.tone !== undefined);
const resolvedGeometry = computed(() =>
  props.geometry ?? (hasPinnedEdition.value ? "tab" : pageEdition.geometry),
);
const resolvedTone = computed(() =>
  props.tone ?? (hasPinnedEdition.value ? "ivory" : pageEdition.tone),
);

const classes = computed(() => [
  `chip-tabs--geometry-${resolvedGeometry.value}`,
  `chip-tabs--density-${props.density}`,
  `chip-tabs--tone-${resolvedTone.value}`,
  `chip-tabs--layout-${props.layout}`,
]);

const chipStyle = computed(() => ({
  left: `${chipLeft.value}px`,
  width: `${chipWidth.value}px`,
}));

const measureChip = () => {
  const track = trackEl.value;
  if (!track) return;

  const activeButton = track.querySelector<HTMLElement>(
    `.chip-tabs__button[aria-selected="true"]:not(:disabled)`,
  );
  const fallbackButton = track.querySelector<HTMLElement>(".chip-tabs__button:not(:disabled)");
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
    `.chip-tabs__button[aria-selected="true"]:not(:disabled)`,
  );
  if (!scroll || !target) return;
  if (typeof scroll.scrollTo !== "function") return;

  const left = target.offsetLeft - Math.max(0, (scroll.clientWidth - target.offsetWidth) / 2);
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  scroll.scrollTo({ left: Math.max(0, left), behavior: reducedMotion ? "auto" : behavior });
};

const triggerSmear = () => {
  smearing.value = true;
  window.clearTimeout(smearTimer);
  smearTimer = window.setTimeout(() => {
    smearing.value = false;
  }, 220);
};

const selectTab = (tab: ChipTabItem) => {
  if (tab.disabled || tab.value === activeValue.value) return;
  activeValue.value = tab.value;
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
  void nextTick(() => {
    measureChip();
    revealActiveTab("auto");
  });
  window.addEventListener("resize", measureChip);
  if (typeof ResizeObserver !== "undefined" && trackEl.value) {
    sizeObserver = new ResizeObserver(measureChip);
    sizeObserver.observe(trackEl.value);
  }
});

onBeforeUnmount(() => {
  window.clearTimeout(smearTimer);
  window.removeEventListener("resize", measureChip);
  sizeObserver?.disconnect();
});
</script>

<style scoped>
.chip-tabs {
  position: relative;
  width: 100%;
  border: 1px solid var(--ink-5);
  background: var(--ink-2);
  overflow: hidden;
}

.chip-tabs__track {
  position: relative;
  display: flex;
  width: 100%;
  min-width: 100%;
  box-sizing: border-box;
  padding: 6px;
  isolation: isolate;
}

.chip-tabs--density-compact .chip-tabs__track {
  padding: 4px;
}

.chip-tabs--layout-scroll {
  overflow-x: auto;
  overscroll-behavior-inline: contain;
  scrollbar-width: none;
}

.chip-tabs--layout-scroll::-webkit-scrollbar {
  display: none;
}

.chip-tabs--layout-scroll .chip-tabs__track {
  width: max-content;
}

.chip-tabs__streak {
  position: absolute;
  left: 0;
  right: 0;
  top: 50%;
  z-index: 0;
  height: 60%;
  transform: translateY(-50%);
  background: var(--ink);
}

.chip-tabs__chip {
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

.chip-tabs--density-compact .chip-tabs__chip {
  top: 4px;
  bottom: 4px;
}

.chip-tabs__chip--smearing {
  transform: scaleX(1.08) skewX(-12deg);
}

.chip-tabs--geometry-offcut .chip-tabs__chip {
  clip-path: var(--clip-offcut);
}

.chip-tabs--geometry-tile .chip-tabs__chip {
  clip-path: var(--clip-tile);
}

.chip-tabs--geometry-sharp .chip-tabs__chip {
  clip-path: none;
  border-radius: 0;
}

.chip-tabs--geometry-rip .chip-tabs__chip {
  clip-path: var(--clip-paper-rip);
}

.chip-tabs--tone-brass .chip-tabs__chip {
  background: var(--brass-fill);
  color: var(--brass-edge);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, .55),
    inset 0 -1px 0 rgba(0, 0, 0, .45),
    0 1px 0 rgba(0, 0, 0, .6),
    0 0 0 1px rgba(0, 0, 0, .18),
    var(--shadow-glow-brass);
}

.chip-tabs__button {
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

.chip-tabs--layout-scroll .chip-tabs__button {
  flex: 0 0 auto;
  min-width: 58px;
}

.chip-tabs__label,
.chip-tabs__label--icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.chip-tabs__label--icon {
  gap: 6px;
}

.chip-tabs__icon {
  width: 12px;
  height: 12px;
  flex: none;
}

.chip-tabs__label-text--hidden {
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

.chip-tabs--density-compact .chip-tabs__button {
  font-size: 10px;
  padding: 7px 10px;
}

.chip-tabs__button:disabled {
  cursor: not-allowed;
  opacity: .38;
}

@media (prefers-reduced-motion: reduce) {
  .chip-tabs__chip {
    transition: none;
  }

  .chip-tabs__chip--smearing {
    transform: none;
  }

  .chip-tabs__chip.brass {
    animation: none;
  }
}

@media (forced-colors: active) {
  .chip-tabs {
    border-color: CanvasText;
    background: Canvas;
  }

  .chip-tabs__streak {
    background: CanvasText;
  }

  .chip-tabs__chip,
  .chip-tabs--tone-brass .chip-tabs__chip {
    background: Highlight;
    box-shadow: none;
  }

  .chip-tabs__button {
    color: ButtonText;
    mix-blend-mode: normal;
  }

  .chip-tabs__button--active {
    color: HighlightText;
  }
}
</style>
