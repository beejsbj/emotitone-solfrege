<template>
  <div>
    <KnobCircles
      type="range"
      :value="showProgress ? normalizedValue : 0"
      :color="themeColor"
    />

    <!-- Labels -->

    <span
      class="text-sm font-medium absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
    >
      {{ displayValue }}
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import KnobCircles from "./KnobCircles.vue";
import type { RangeKnobProps } from "@/types/knob";

const props = withDefaults(defineProps<RangeKnobProps>(), {
  min: 0,
  max: 100,
  step: 1,
  isDisabled: false,
  mode: "interactive",
  showProgress: true,
  themeColor: "hsla(158, 100%, 53%, 1)",
  formatValue: (value: number) => value.toString(),
  label: "",
});

// Computed properties
const isDisplayMode = computed(() => props.mode === "display");
const displayValue = computed(() => props.formatValue(props.modelValue));

// Normalized value for KnobCircles (0-1)
const normalizedValue = computed(
  () => (props.modelValue - props.min) / (props.max - props.min)
);

const labelText = computed(() => props.label || props.paramName);
</script>
