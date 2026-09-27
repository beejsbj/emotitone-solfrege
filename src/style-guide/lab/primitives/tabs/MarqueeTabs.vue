<script setup lang="ts">
import { computed, ref } from "vue";
import type { TabsSelectionSource } from "@/components/primatives/Tabs.vue";
import type { LabTabsProps } from "@/types/primitivesLab";
import { useLabTabs } from "./useLabTabs";

/*
 * Direction C · Marquee. A club marquee lit by a synth: every destination has
 * a row of bulbs under its name, and only the chosen one is switched on. On
 * change the bulbs light one after another in the direction you moved, like
 * a chase sequence. The label itself glows; the others sit unlit.
 */
const props = withDefaults(defineProps<LabTabsProps>(), {
  tone: "ivory",
  density: "comfortable",
  layout: "equal",
  ariaLabel: "Tabs",
});
const emit = defineEmits<{ "update:modelValue": [value: string, source: TabsSelectionSource] }>();
const root = ref<HTMLElement | null>(null);
const { onKeydown, onClick, label } = useLabTabs(props, emit, root);

const BULBS = 7;
const activeIndex = computed(() => props.tabs.findIndex((tab) => tab.value === props.modelValue));
const direction = ref<1 | -1>(1);

const handleClick: typeof onClick = (tab, event) => {
  const next = props.tabs.indexOf(tab);
  direction.value = next >= activeIndex.value ? 1 : -1;
  onClick(tab, event);
};

const handleKeydown = (event: KeyboardEvent) => {
  const before = activeIndex.value;
  onKeydown(event);
  queueMicrotask(() => { direction.value = activeIndex.value >= before ? 1 : -1; });
};

const bulbDelay = (bulb: number) => `${(direction.value === 1 ? bulb : BULBS - 1 - bulb) * 34}ms`;
</script>

<template>
  <div
    ref="root"
    class="marquee"
    :class="[`marquee--${density}`, `marquee--${layout}`]"
    role="tablist"
    :aria-label="ariaLabel"
    @keydown="handleKeydown"
  >
    <button
      v-for="tab in tabs"
      :key="tab.value"
      type="button"
      role="tab"
      class="marquee__cell"
      :class="{ 'marquee__cell--lit': tab.value === modelValue, 'marquee__cell--brass': (tab.tone ?? tone) === 'brass' }"
      :data-tab-value="tab.value"
      :aria-selected="tab.value === modelValue"
      :tabindex="tab.value === modelValue ? 0 : -1"
      :disabled="tab.disabled"
      @click="handleClick(tab, $event)"
    >
      <span class="marquee__label">
        <component :is="tab.icon" v-if="tab.icon" class="marquee__icon" />
        {{ label(tab) }}
      </span>
      <span class="marquee__bulbs" aria-hidden="true">
        <span v-for="bulb in BULBS" :key="bulb" class="marquee__bulb" :style="{ transitionDelay: bulbDelay(bulb - 1) }" />
      </span>
    </button>
  </div>
</template>

<style scoped>
.marquee {
  display: flex;
  width: 100%;
  padding: 4px;
  background: var(--ink-2);
}

.marquee--scroll { overflow-x: auto; scrollbar-width: none; overscroll-behavior-inline: contain; }

.marquee__cell {
  --light: var(--ivory);
  --glow: rgb(244 239 230 / 55%);
  display: grid;
  flex: 1 1 0;
  justify-items: center;
  gap: 7px;
  min-width: 0;
  min-height: 44px;
  padding: 10px 12px 8px;
  border: 0;
  background: transparent;
  color: var(--ivory-4);
  cursor: pointer;
}

.marquee--scroll .marquee__cell { flex: 0 0 auto; }
.marquee__cell--brass { --light: var(--brass-hi); --glow: rgb(224 169 58 / 70%); }
.marquee__cell--brass:not(.marquee__cell--lit) { color: color-mix(in srgb, var(--brass) 55%, var(--ink)); }

.marquee__label {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font: 700 13px/1 var(--font-display);
  letter-spacing: .14em;
  text-transform: uppercase;
  white-space: nowrap;
  transition: color var(--dur-ui) var(--ease-brush), text-shadow var(--dur-ui) var(--ease-brush);
}

.marquee__icon { width: 12px; height: 12px; flex: none; }

.marquee__bulbs { display: flex; gap: 4px; }

.marquee__bulb {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--ink-5);
  transition: background-color var(--dur-tap) var(--ease-stab), box-shadow var(--dur-tap) var(--ease-stab);
}

.marquee__cell:not(:disabled):not(.marquee__cell--lit):hover { color: var(--ivory-3); }

.marquee__cell--lit { color: var(--light); }
.marquee__cell--lit .marquee__label { text-shadow: 0 0 10px var(--glow); }
.marquee__cell--lit .marquee__bulb { background: var(--light); box-shadow: 0 0 5px var(--glow); }

.marquee__cell:focus-visible { outline: 2px solid var(--ivory); outline-offset: -2px; }
.marquee__cell:disabled { cursor: not-allowed; opacity: .38; }

.marquee--compact .marquee__cell { min-height: 34px; padding: 7px 9px 6px; gap: 5px; }
.marquee--compact .marquee__label { font-size: 10px; }
.marquee--compact .marquee__bulb { width: 3px; height: 3px; }

@media (prefers-reduced-motion: reduce) {
  .marquee__label,
  .marquee__bulb { transition: none !important; }
}

@media (forced-colors: active) {
  .marquee__cell { color: ButtonText; }
  .marquee__cell--lit { background: Highlight; color: HighlightText; }
  .marquee__bulb { background: CanvasText; }
}
</style>
