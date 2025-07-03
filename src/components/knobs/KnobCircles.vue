<script setup lang="ts">
import { computed, watch, ref } from "vue";
import useGSAP from "@/composables/useGSAP";

interface Props {
  // Explicit type - no more guessing!
  type: "range" | "boolean" | "options";

  // Universal props
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

// Using a 100x100 viewBox for easy percentage calculations
const circlePath = `M 50 ${props.strokeWidth}
                    A ${50 - props.strokeWidth} ${
  50 - props.strokeWidth
} 0 1 1 50 ${100 - props.strokeWidth}
                    A ${50 - props.strokeWidth} ${
  50 - props.strokeWidth
} 0 1 1 50 ${props.strokeWidth}`;

// Calculate draw value based on explicit type
const drawValue = computed(() => {
  switch (props.type) {
    case "options":
      // Clock-like: each segment is a portion of the circle
      if (!props.totalSegments || props.totalSegments === 0) return 0;
      const segment = props.activeSegment ?? 0;
      return (segment + 1) / props.totalSegments;

    case "boolean":
      return props.isActive ? 1 : 0;

    case "range":
    default:
      return Math.max(0, Math.min(1, props.value ?? 0));
  }
});

// GSAP animations - watch the computed draw value
useGSAP(({ gsap }) => {
  // Watch for draw value changes
  watch(
    drawValue,
    (newValue) => {
      if (!valueRef.value) return;

      const percentage = newValue * 100;
      gsap.to(valueRef.value, {
        drawSVG: `0% ${percentage}%`,
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
    class="w-full h-full transform -rotate-90"
    viewBox="0 0 100 100"
    preserveAspectRatio="xMidYMid meet"
  >
    <!-- Background Circle -->
    <path
      ref="backgroundRef"
      :d="circlePath"
      fill="none"
      :stroke="color"
      :stroke-width="backgroundStrokeWidth"
      stroke-linecap="round"
    />

    <!-- Value Circle -->
    <path
      ref="valueRef"
      :d="circlePath"
      fill="none"
      :stroke="color"
      :stroke-width="strokeWidth"
      stroke-linecap="round"
    />
  </svg>
</template>
