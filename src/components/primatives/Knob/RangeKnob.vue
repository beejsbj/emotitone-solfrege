<template>
  <KnobFace
    role="range"
    :value="showProgress ? normalizedValue : 0"
    :color="themeColor"
    :visual="visual"
    :tone="tone"
    :range-mode="mode"
    :is-display="isDisplay"
  />

  <!-- Value Display -->
  <div class="knob-range-value" :style="{ color: themeColor }">
    <span
      class="knob-range-value__number"
    >
      {{ numericPart }}
    </span>
    <span
      v-if="unitPart"
      class="knob-range-value__unit"
    >
      {{ unitPart }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import KnobFace from "./KnobFace.vue";
import type { RangeKnobProps } from "./types";

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
  themeColor: "hsla(0, 0%, 82%, 1)",
  visual: "arc",
  tone: "ivory",
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

<style scoped>
.knob-range-value__number,
.knob-range-value__unit {
  position: absolute;
  inset-inline-start: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  line-height: 1;
  text-align: center;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.knob-range-value__number {
  inset-block-start: 50%;
  padding-block-end: 5cqi;
  font-size: clamp(0.75rem, 28cqi, 1.25rem);
  font-weight: 700;
}

.knob-range-value__unit {
  inset-block-start: 78%;
  font-size: clamp(0.5rem, 14cqi, 0.6875rem);
  opacity: 0.7;
}
</style>
