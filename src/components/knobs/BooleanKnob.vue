<template>
  <KnobCircles
    type="boolean"
    :is-active="modelValue"
    :color="activeStrokeColor"
  />

  <!-- Animated ball -->
  <div
    ref="ballRef"
    class="w-5 h-5 rounded-full absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
    :style="{
      backgroundColor: activeStrokeColor,
    }"
  />

  <!-- Icon component -->
  <component
    v-if="displayValue && typeof displayValue !== 'string'"
    :is="displayValue"
    class="w-4 h-4 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none"
    :style="{ color: props.modelValue ? 'black' : activeStrokeColor }"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import KnobCircles from "./KnobCircles.vue";
import type { BooleanKnobProps } from "@/types/knob";
import useGSAP from "@/composables/useGSAP";

interface Props extends BooleanKnobProps {
  modelValue: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  isDisabled: false,
  themeColor: "hsla(158, 100%, 53%, 1)",
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
      : "hsla(0, 84%, 60%, 1)" // Red color when OFF
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
