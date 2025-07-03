<script setup lang="ts">
import { computed, watch, ref } from "vue";
import useGSAP from "@/composables/useGSAP";

interface Props {
  type: "range" | "boolean" | "options";
  color: string;
  backgroundOpacity?: number;
  strokeWidth?: number;
  backgroundStrokeWidth?: number;

  // For Range knobs: normalized value 0-1
  value?: number;

  // For Boolean knobs: simple boolean state
  isActive?: boolean;

  // For Options knob: clock-like segments
  totalSegments?: number;
  activeSegment?: number;
}

const props = withDefaults(defineProps<Props>(), {
  backgroundOpacity: 0.2,
  strokeWidth: 6,
  backgroundStrokeWidth: 2,
});

// Refs for SVG elements
const backgroundRef = ref<SVGPathElement | null>(null);
const valueRef = ref<SVGPathElement | null>(null);

// Circle properties for cleaner rotation handling
const circleRadius = computed(() => 50 - props.strokeWidth);
const circleCenter = 50;

// Calculate segment length for options type
const segmentLength = computed(() => {
  if (
    props.type !== "options" ||
    !props.totalSegments ||
    props.totalSegments === 0
  ) {
    return 0;
  }
  return 100 / props.totalSegments;
});

// Calculate start position based on type
const startValue = computed(() => {
  switch (props.type) {
    case "options":
      // Start position moves forward by one segment length each time
      const segment = props.activeSegment ?? 0;
      return -50 + segment * segmentLength.value;

    case "boolean":
    case "range":
    default:
      return -50;
  }
});

// Calculate draw value based on type
const drawValue = computed(() => {
  switch (props.type) {
    case "options":
      // Draw value is always one segment length ahead of start
      // This creates a moving segment that continues clockwise indefinitely
      return startValue.value + segmentLength.value;

    case "boolean":
      return props.isActive ? 75 : -50; // Full circle or no circle

    case "range":
    default:
      const normalizedValue = Math.max(0, Math.min(1, props.value ?? 0));
      return -50 + normalizedValue * 100;
  }
});

// GSAP animations
useGSAP(({ gsap }) => {
  // Watch for draw value changes
  watch(
    [startValue, drawValue],
    ([newStart, newDraw]) => {
      if (!valueRef.value) return;

      gsap.to(valueRef.value, {
        drawSVG: `${newStart}% ${newDraw}%`,
        duration: 0.3,
        ease: "power2.out",
      });
    },
    { immediate: true }
  );

  // Set initial background when element mounts
  watch(
    backgroundRef,
    (element) => {
      if (!element) return;
      gsap.set(element, {
        drawSVG: "100%",
        opacity: props.backgroundOpacity,
      });
    },
    { immediate: true }
  );
});
</script>

<template>
  <svg
    class="w-full h-auto transform -rotate-90 block"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid meet"
  >
    <!-- Background Circle -->
    <circle
      ref="backgroundRef"
      :cx="circleCenter"
      :cy="circleCenter"
      :r="circleRadius"
      fill="none"
      :stroke="color"
      :stroke-width="backgroundStrokeWidth"
      stroke-linecap="round"
    />

    <!-- Value Circle -->
    <circle
      ref="valueRef"
      :cx="circleCenter"
      :cy="circleCenter"
      :r="circleRadius"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
    />
  </svg>
</template>
