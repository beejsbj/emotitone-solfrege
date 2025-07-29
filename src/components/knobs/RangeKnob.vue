<template>
  <KnobCircles
    type="range"
    :value="showProgress ? normalizedValue : 0"
    :color="themeColor"
    :range-mode="mode"
    :is-display="isDisplay"
  />

  <!-- Value Display -->
  <div :style="{ color: themeColor }">
    <span
      class="text-sm font-medium leading-tight absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none flex flex-col items-center pb-1"
    >
      {{ numericPart }}
    </span>
    <span
      v-if="unitPart"
      class="text-xs opacity-70 leading-none absolute bottom-1 left-1/2 -translate-x-1/2 text-center pointer-events-none flex flex-col items-center"
    >
      {{ unitPart }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import KnobCircles from "./KnobCircles.vue";
import type { RangeKnobProps } from "@/types/knob";

interface Props extends RangeKnobProps {
  modelValue: number;
  mode?: "interactive" | "display";
}

const props = withDefaults(defineProps<Props>(), {
  min: 0,
  max: 100,
  step: 1,
  isDisabled: false,
  mode: "interactive",
  showProgress: true,
  themeColor: "hsla(158, 100%, 53%, 1)",
  formatValue: (value: number) => value.toString(),
});

const displayValue = computed(() => props.formatValue(props.modelValue));

// Extract numeric and unit parts from formatted value
const numericPart = computed(() => {
  const formatted = String(displayValue.value);
  // Match complete decimal numbers (including optional decimal part)
  const match = formatted.match(/^([+-]?(?:\d+\.?\d*|\.\d+))/);
  if (match) {
    const num = parseFloat(match[1]);
    // For decimal numbers, show up to 2 decimal places if needed
    return num % 1 === 0 ? num.toFixed(0) : num.toFixed(2);
  }
  return formatted;
});

const unitPart = computed(() => {
  const formatted = String(displayValue.value);
  // Match only actual units (letters, common symbols like %, px, ms, etc.) after a complete number
  // This excludes decimal points and ensures we only capture real units
  const match = formatted.match(/^[+-]?(?:\d+\.?\d*|\.\d+)([A-Za-z%°]+.*)$/);
  return match ? match[1].trim() : "";
});

// Normalized value for KnobCircles (0-1)
const normalizedValue = computed(
  () => (props.modelValue - props.min) / (props.max - props.min)
);
</script>
