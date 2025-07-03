<template>
  <div>
    <KnobCircles
      type="boolean"
      :is-active="modelValue"
      :color="activeStrokeColor"
    />

    <!-- Value text in the centre -->
    <span
      class="text-[10px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
    >
      {{ displayValue }}
    </span>

    <!-- Label -->
    <div class="text-gray-300 text-xs mt-1 text-center select-none">
      {{ labelText }}
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import KnobCircles from "./KnobCircles.vue";
import type { BooleanKnobProps } from "@/types/knob";

const props = withDefaults(defineProps<BooleanKnobProps>(), {
  isDisabled: false,
  themeColor: "hsla(158, 100%, 53%, 1)",
});

// Display value text
const displayValue = computed(() => (props.modelValue ? "ON" : "OFF"));

// Stroke color when active
const activeStrokeColor = computed(() =>
  props.isDisabled ? "hsla(0,0%,27%,1)" : props.themeColor
);

const labelText = computed(() => props.label || props.paramName);
</script>
