<template>
  <div
    class="relative select-none"
    :class="{ 'cursor-not-allowed opacity-50': isDisabled }"
  >
    <div class="inline-block">
      <div class="w-12 h-12 mx-auto">
        <KnobCircles
          type="options"
          :total-segments="normalizedOptions.length"
          :active-segment="currentIndex"
          :color="activeStrokeColor"
        />
      </div>
    </div>

    <!-- Value text -->
    <div
      class="absolute inset-0 flex items-center justify-center pointer-events-none"
    >
      <span class="text-[8px] font-bold text-white">{{ displayValue }}</span>
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
import type { OptionsKnobProps, KnobOption } from "@/types/knob";

const props = withDefaults(defineProps<OptionsKnobProps>(), {
  isDisabled: false,
  themeColor: "hsla(158, 100%, 53%, 1)",
});

// Option normalization
const isStringArray = computed(() => typeof props.options[0] === "string");
const normalizedOptions = computed<KnobOption[]>(() => {
  if (isStringArray.value) {
    return (props.options as string[]).map((o) => ({ label: o, value: o }));
  }
  return props.options as KnobOption[];
});

const currentIndex = computed(() =>
  normalizedOptions.value.findIndex((o) => o.value === props.modelValue)
);
const currentOption = computed(
  () =>
    normalizedOptions.value[currentIndex.value] || normalizedOptions.value[0]
);

const displayValue = computed(
  () => currentOption.value?.label || String(props.modelValue)
);

// Stroke color (can adapt if option has color)
const activeStrokeColor = computed(
  () => currentOption.value?.color || props.themeColor
);

const labelText = computed(() => props.label || props.paramName);
</script>
