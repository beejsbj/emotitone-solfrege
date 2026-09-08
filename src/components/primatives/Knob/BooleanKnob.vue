<template>
  <KnobFace
    role="boolean"
    :is-active="modelValue"
    :color="activeStrokeColor"
    :visual="visual"
    :tone="tone"
  />

  <!-- Animated ball -->
  <div
    class="knob-boolean__ball"
    :class="{
      brass: tone === 'brass' && modelValue,
      'knob-boolean__ball--active': modelValue,
    }"
    :style="{
      backgroundColor: activeStrokeColor,
      color: activeStrokeColor,
    }"
  />

  <!-- Icon component -->
  <component
    v-if="displayValue && typeof displayValue !== 'string'"
    :is="displayValue"
    class="knob-boolean__icon"
    :style="{ color: props.modelValue ? 'black' : activeStrokeColor }"
  />
</template>

<script setup lang="ts">
import { computed } from "vue";
import KnobFace from "./KnobFace.vue";
import type { BooleanKnobProps } from "./types";

interface Props extends BooleanKnobProps {
  modelValue: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isDisabled: false,
  themeColor: "hsla(0, 0%, 82%, 1)",
  visual: "arc",
  tone: "ivory",
});

// Display value (icon component)
const displayValue = computed(() => {
  if (props.modelValue) {
    return props.valueLabelTrue;
  } else {
    return props.valueLabelFalse;
  }
});

// Stroke color when active
const activeStrokeColor = computed(
  () =>
    props.isDisabled
      ? "hsla(0,0%,27%,1)"
      : props.modelValue
      ? props.themeColor
      : "hsla(0, 0%, 38%, 1)"
);

</script>

<style scoped>
.knob-boolean__ball,
.knob-boolean__icon {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  pointer-events: none;
  transform: translate(-50%, -50%);
}

.knob-boolean__ball {
  inline-size: 38cqi;
  aspect-ratio: 1;
  border-radius: 50%;
  box-shadow: 0 0 9cqi color-mix(in srgb, currentColor 45%, transparent);
  transform: translate(-50%, -50%) scale(.2);
  transition: transform var(--dur-bounce) var(--ease-bounce);
}

.knob-boolean__ball--active {
  transform: translate(-50%, -50%) scale(1.2);
}

.knob-boolean__ball.brass {
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 55%),
    inset 0 -1px 0 rgb(0 0 0 / 45%),
    var(--shadow-glow-brass);
}

.knob-boolean__icon {
  inline-size: 25cqi;
  block-size: 25cqi;
}

@media (prefers-reduced-motion: reduce) {
  .knob-boolean__ball { transition: none; }
  .knob-boolean__ball.brass::after { animation: none; }
}

@media (forced-colors: active) {
  .knob-boolean__ball.brass {
    background: CanvasText;
    box-shadow: none;
    color: CanvasText;
  }

  .knob-boolean__ball.brass::after { display: none; }
}
</style>
