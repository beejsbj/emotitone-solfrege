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
    ref="ballRef"
    class="knob-boolean__ball"
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
import { computed, ref, watch } from "vue";
import KnobFace from "./KnobFace.vue";
import type { BooleanKnobProps } from "./types";
import useGSAP from "@/composables/useGSAP";

interface Props extends BooleanKnobProps {
  modelValue: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isDisabled: false,
  themeColor: "hsla(0, 0%, 82%, 1)",
  visual: "arc",
  tone: "ivory",
});

const ballRef = ref<HTMLElement | null>(null);

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

// GSAP animation for the ball
useGSAP(({ gsap }) => {
  watch(
    () => props.modelValue,
    (isActive) => {
      if (!ballRef.value) return;

      gsap.to(ballRef.value, {
        scale: isActive ? 1.2 : 0.2,
        duration: 0.6,
        ease: "elastic.out(1, 0.3)",
      });
    },
    { immediate: true }
  );
});
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
}

.knob-boolean__icon {
  inline-size: 25cqi;
  block-size: 25cqi;
}
</style>
