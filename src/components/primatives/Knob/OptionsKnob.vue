<template>
  <KnobFace
    role="options"
    :total-segments="normalizedOptions.length"
    :active-segment="currentIndex"
    :color="activeStrokeColor"
    :visual="visual"
    :tone="tone"
  />

  <!-- Value text -->
  <span
    class="knob-options__value"
    :style="{ color: activeStrokeColor }"
  >
    {{ displayValue }}
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";
import KnobFace from "./KnobFace.vue";
import type { OptionsKnobProps, KnobOption } from "./types";

const props = withDefaults(defineProps<OptionsKnobProps>(), {
  isDisabled: false,
  themeColor: "hsla(0, 0%, 82%, 1)",
  visual: "arc",
  tone: "ivory",
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

<style scoped>
.knob-options__value {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  max-inline-size: 58cqi;
  overflow: hidden;
  font-size: clamp(0.625rem, 26cqi, 1.125rem);
  font-weight: 700;
  line-height: 1;
  text-align: center;
  text-overflow: ellipsis;
  white-space: nowrap;
  pointer-events: none;
  transform: translate(-50%, -50%);
}
</style>
