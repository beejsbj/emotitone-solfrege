<template>
  <div
    ref="railEl"
    class="chip-tabs"
    :class="classes"
    role="tablist"
    :aria-label="ariaLabel"
  >
    <span class="chip-tabs__streak" aria-hidden="true" />
    <span
      class="chip-tabs__chip"
      :class="{ 'chip-tabs__chip--smearing': smearing, brass: tone === 'brass' }"
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
      role="tab"
      :aria-selected="tab.value === activeValue"
      @click="selectTab(tab)"
    >
      {{ tab.label }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from "vue";

export interface ChipTabItem {
  label: string;
  value: string;
  disabled?: boolean;
}

export type ChipTabsGeometry = "tab" | "offcut" | "tile" | "sharp" | "pill" | "rip";
export type ChipTabsDensity = "comfortable" | "compact";
export type ChipTabsTone = "ivory" | "brass";

const props = withDefaults(
  defineProps<{
    tabs: ChipTabItem[];
    modelValue?: string;
    defaultValue?: string;
    geometry?: ChipTabsGeometry;
    density?: ChipTabsDensity;
    tone?: ChipTabsTone;
    ariaLabel?: string;
  }>(),
  {
    modelValue: undefined,
    defaultValue: undefined,
    geometry: "tab",
    density: "comfortable",
    tone: "ivory",
    ariaLabel: "Chip tabs",
  },
);

const emit = defineEmits<{
  "update:modelValue": [value: string];
}>();

const railEl = ref<HTMLElement | null>(null);
const internalValue = ref(props.defaultValue ?? props.tabs.find((tab) => !tab.disabled)?.value ?? "");
const chipLeft = ref(0);
const chipWidth = ref(0);
const smearing = ref(false);
let smearTimer: number | undefined;

const activeValue = computed({
  get: () => props.modelValue ?? internalValue.value,
  set: (value: string) => {
    if (props.modelValue === undefined) {
      internalValue.value = value;
    }
    emit("update:modelValue", value);
  },
});

const classes = computed(() => [
  `chip-tabs--geometry-${props.geometry}`,
  `chip-tabs--density-${props.density}`,
  `chip-tabs--tone-${props.tone}`,
]);

const chipStyle = computed(() => ({
  left: `${chipLeft.value}px`,
  width: `${chipWidth.value}px`,
}));

const measureChip = () => {
  const rail = railEl.value;
  if (!rail) return;

  const activeButton = rail.querySelector<HTMLElement>(
    `.chip-tabs__button[aria-selected="true"]:not(:disabled)`,
  );
  const fallbackButton = rail.querySelector<HTMLElement>(".chip-tabs__button:not(:disabled)");
  const target = activeButton ?? fallbackButton;
  if (!target) return;

  const railRect = rail.getBoundingClientRect();
  const buttonRect = target.getBoundingClientRect();
  chipLeft.value = buttonRect.left - railRect.left;
  chipWidth.value = buttonRect.width;
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
};

watch(
  () => [activeValue.value, props.tabs, props.density, props.geometry],
  () => nextTick(measureChip),
  { deep: true },
);

onMounted(() => {
  nextTick(measureChip);
  window.addEventListener("resize", measureChip);
});

onBeforeUnmount(() => {
  window.clearTimeout(smearTimer);
  window.removeEventListener("resize", measureChip);
});
</script>

<style scoped>
.chip-tabs {
  position: relative;
  display: inline-flex;
  width: 100%;
  border: 1px solid var(--ink-5);
  background: var(--ink-2);
  padding: 6px;
  isolation: isolate;
}

.chip-tabs--density-compact {
  padding: 4px;
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

.chip-tabs--geometry-pill .chip-tabs__chip {
  clip-path: none;
  border-radius: 999px;
  box-shadow: none;
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
  flex: 1;
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
</style>
