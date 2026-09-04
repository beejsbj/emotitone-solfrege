<template>
  <KnobFace
    role="options"
    :total-segments="normalizedOptions.length"
    :active-segment="currentIndex"
    :color="activeStrokeColor"
    :visual="visual"
    :tone="tone"
  />

  <!-- The viewport owns centering/clipping; keyed labels own the rip transition. -->
  <span class="knob-options__viewport">
    <Transition name="knob-rip-mode">
      <span
        :key="String(currentOption?.value ?? modelValue)"
        class="knob-options__value"
        :class="{
          'knob-options__value--long': compactDisplayLength > 7,
          'knob-options__value--multiline': displayValue.includes(' '),
        }"
        :style="{ color: activeStrokeColor }"
      >
        {{ displayValue }}
      </span>
    </Transition>
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
const compactDisplayLength = computed(
  () => displayValue.value.replace(/\s/g, "").length
);

// Stroke color (can adapt if option has color)
const activeStrokeColor = computed(
  () => currentOption.value?.color || props.themeColor
);
</script>

<style scoped>
.knob-options__viewport {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  display: grid;
  place-items: center;
  inline-size: 84cqi;
  min-block-size: 44cqi;
  padding-block: 4cqi;
  box-sizing: border-box;
  overflow: hidden;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.knob-options__value {
  grid-area: 1 / 1;
  max-inline-size: 100%;
  font-size: clamp(0.625rem, 26cqi, 1.125rem);
  font-weight: 700;
  line-height: 1.12;
  text-align: center;
  white-space: nowrap;
}

.knob-options__value--long {
  font-size: clamp(0.5rem, 20cqi, 0.875rem);
}

.knob-options__value--multiline {
  white-space: normal;
}

.knob-rip-mode-enter-active {
  animation: rip-mode-in var(--dur-rip-mode) var(--ease-rip-mode) both;
}

.knob-rip-mode-leave-active {
  animation: rip-mode-out var(--dur-rip-mode) var(--ease-rip-mode) both;
}

@media (prefers-reduced-motion: reduce) {
  .knob-rip-mode-enter-active,
  .knob-rip-mode-leave-active {
    animation: none;
  }
}
</style>
