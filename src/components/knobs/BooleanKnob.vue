<template>
  <div
    class="relative select-none"
    :class="{ 'cursor-not-allowed opacity-50': isDisabled }"
  >
    <div class="inline-block">
      <div class="w-12 h-12 mx-auto">
        <KnobCircles
          type="boolean"
          :is-active="modelValue"
          :color="activeStrokeColor"
        />
      </div>
    </div>

    <!-- Value text in the centre -->
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <span class="text-[10px] font-bold text-white">{{ displayValue }}</span>
    </div>

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
