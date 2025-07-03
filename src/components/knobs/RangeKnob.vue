<template>
  <div
    class="relative select-none"
    :class="{ 'cursor-not-allowed opacity-50': isDisabled || isDisplayMode }"
  >
    <div class="inline-block" :class="{ 'pointer-events-none': isDisplayMode }">
      <div class="w-12 h-12">
        <KnobCircles
          type="range"
          :value="showProgress ? normalizedValue : 0"
          :color="themeColor"
        />
      </div>
    </div>

    <!-- Labels -->
    <div
      class="absolute inset-0 flex items-center justify-center text-center pointer-events-none"
    >
      <div class="flex flex-col">
        <span class="text-xs opacity-50">{{ labelText }}</span>
        <span class="text-sm font-medium">
          {{ displayValue }}
        </span>
      </div>
    </div>
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
