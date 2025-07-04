<template>
  <KnobCircles
    type="options"
    :total-segments="normalizedOptions.length"
    :active-segment="currentIndex"
    :color="activeStrokeColor"
  />

  <!-- Value text -->
  <span
    class="text-[8px] absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none"
    :style="{ color: activeStrokeColor }"
  >
    {{ displayValue }}
  </span>
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
</script>
