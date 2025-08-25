<script setup lang="ts">
import { computed, watch, ref } from "vue";
import useGSAP from "@/composables/useGSAP";

// Constants for easy adjustment
const CONSTANTS = {
  // Arc positions (percentage around circle)
  PARTIAL_ARC_START: -40,
  PARTIAL_ARC_END: 40,
  FULL_CIRCLE_START: 0,
  FULL_CIRCLE_END: 100,

  // Button segment
  BUTTON_SEGMENT_START: -50, // Top position
  BUTTON_SEGMENT_SIZE: 25, // 25% of circle

  // Options segment
  OPTIONS_SEGMENT_START: -50, // Top position

  // Display mode
  DISPLAY_MODE_OFFSET_X: -70,

  // Animation
  BUTTON_ROTATION_DURATION: 2,
  VALUE_ANIMATION_DURATION: 0.3,
};

interface Props {
  type: "range" | "boolean" | "options" | "button";
  color: string;
  backgroundOpacity?: number;
  strokeWidth?: number;
  backgroundStrokeWidth?: number;
  isDisplay?: boolean;

  // For Range knobs: normalized value 0-1
  value?: number;

  // For Boolean knobs: simple boolean state
  isActive?: boolean;

  // For Options knob: clock-like segments
  totalSegments?: number;
  activeSegment?: number;
}

const props = withDefaults(defineProps<Props>(), {
  backgroundOpacity: 0.4,
  strokeWidth: 8,
  backgroundStrokeWidth: 2,
});

// Refs for SVG elements
const backgroundRef = ref<SVGPathElement | null>(null);
const valueRef = ref<SVGPathElement | null>(null);
const oppositeValueRef = ref<SVGPathElement | null>(null);

// Circle properties
const circleRadius = computed(() => 50 - props.strokeWidth);
const circleCenter = 50;

// Background arc configuration
const backgroundArc = computed(() => {
  if (props.type === "options" || props.type === "button") {
    return {
      start: CONSTANTS.FULL_CIRCLE_START,
      end: CONSTANTS.FULL_CIRCLE_END,
    };
  }
  // Range and boolean use partial arc
  return { start: CONSTANTS.PARTIAL_ARC_START, end: CONSTANTS.PARTIAL_ARC_END };
});

// Value arc configuration
const valueArc = computed(() => {
  const { start, end } = backgroundArc.value;

  switch (props.type) {
    case "button":
      return props.isActive
        ? {
            start: CONSTANTS.BUTTON_SEGMENT_START,
            end: CONSTANTS.BUTTON_SEGMENT_START + CONSTANTS.BUTTON_SEGMENT_SIZE,
          }
        : {
            start: CONSTANTS.BUTTON_SEGMENT_START,
            end: CONSTANTS.BUTTON_SEGMENT_START,
          };

    case "options":
      if (!props.totalSegments || props.totalSegments === 0) {
        return { start: 0, end: 0 };
      }
      console.log(props.totalSegments);
      const segmentLength =
        CONSTANTS.FULL_CIRCLE_END /
        (props.totalSegments <= 2 ? 3 : props.totalSegments);
      // Fixed segment at top position - we'll rotate this instead of redrawing
      return {
        start: CONSTANTS.OPTIONS_SEGMENT_START - segmentLength / 2,
        end: CONSTANTS.OPTIONS_SEGMENT_START + segmentLength / 2,
        // Add opposite segment
        oppositeStart: CONSTANTS.OPTIONS_SEGMENT_START + 50 - segmentLength / 2, // 50% = 180 degrees offset
        oppositeEnd: CONSTANTS.OPTIONS_SEGMENT_START + 50 + segmentLength / 2,
      };

    case "boolean":
      return props.isActive
        ? { start, end } // Full arc when active
        : { start, end: start }; // No arc when inactive

    case "range":
    default:
      const normalizedValue = Math.max(0, Math.min(1, props.value ?? 0));
      const arcSpan = end - start;
      const valueEnd = start + normalizedValue * arcSpan;
      return { start, end: valueEnd };
  }
});

// Track previous segment for continuous rotation
const previousSegment = ref(0);
const cumulativeRotation = ref(0);

// GSAP animations
useGSAP(({ gsap }) => {
  // Animate value arc changes
  watch(
    valueArc,
    (newArc) => {
      if (!valueRef.value) return;

      // Handle the opposite value ref separately for options type
      const hasOppositeSegment =
        props.type === "options" && oppositeValueRef.value;

      // Special handling for button type infinite rotation
      if (props.type === "button" && props.isActive) {
        gsap.set(valueRef.value, {
          drawSVG: `${newArc.start}% ${newArc.end}%`,
        });

        gsap.to(valueRef.value, {
          rotation: 360,
          transformOrigin: "50% 50%",
          duration: CONSTANTS.BUTTON_ROTATION_DURATION,
          ease: "none",
          repeat: -1,
        });
      } else {
        // Kill any existing rotation for button type
        if (props.type === "button") {
          gsap.killTweensOf(valueRef.value);
          gsap.set(valueRef.value, { rotation: 0 });
        }

        // For options type, don't animate the drawSVG - just set it once
        if (props.type === "options") {
          gsap.set(valueRef.value, {
            drawSVG: `${newArc.start}% ${newArc.end}%`,
          });
          if (hasOppositeSegment) {
            gsap.set(oppositeValueRef.value, {
              drawSVG: `${newArc.oppositeStart}% ${newArc.oppositeEnd}%`,
            });
          }
        } else {
          // For non-options types, animate normally
          gsap.to(valueRef.value, {
            drawSVG: `${newArc.start}% ${newArc.end}%`,
            duration: CONSTANTS.VALUE_ANIMATION_DURATION,
            ease: "power2.out",
          });
        }
      }
    },
    { immediate: true }
  );

  // Animate options rotation with continuous clockwise movement
  watch(
    () => props.activeSegment,
    (newSegment) => {
      if (!valueRef.value || props.type !== "options" || !props.totalSegments)
        return;

      const hasOppositeSegment = oppositeValueRef.value;
      const currentSegment = newSegment ?? 0;
      const segmentAngle = 360 / props.totalSegments;

      // Check if we've wrapped around (went from last to first)
      if (
        previousSegment.value === props.totalSegments - 1 &&
        currentSegment === 0
      ) {
        // Continue forward instead of jumping back
        cumulativeRotation.value += segmentAngle;
      } else if (
        previousSegment.value === 0 &&
        currentSegment === props.totalSegments - 1
      ) {
        // Going backwards (from first to last) - subtract full rotation
        cumulativeRotation.value -= segmentAngle;
      } else {
        // Normal movement - calculate difference
        const segmentDiff = currentSegment - previousSegment.value;
        cumulativeRotation.value += segmentDiff * segmentAngle;
      }

      // Rotate segments
      const elements = hasOppositeSegment
        ? [valueRef.value, oppositeValueRef.value]
        : valueRef.value;

      gsap.to(elements, {
        rotation: cumulativeRotation.value,
        transformOrigin: "50% 50%",
        duration: CONSTANTS.VALUE_ANIMATION_DURATION,
        ease: "power2.out",
      });

      previousSegment.value = currentSegment;
    },
    { immediate: true }
  );

  // Set background arc when element mounts
  watch(
    backgroundRef,
    (element) => {
      if (!element) return;

      const { start, end } = backgroundArc.value;
      gsap.set(element, {
        drawSVG: `${start}% ${end}%`,
        opacity: props.backgroundOpacity,
      });

      // Apply offset for display mode
      if (props.isDisplay) {
        gsap.set(element, {
          x: CONSTANTS.DISPLAY_MODE_OFFSET_X,
          opacity: 1,
          strokeWidth: 4,
          drawSVG: `${start + 50}% ${end - 50}%`,
        });
      }
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

    <!-- Opposite Value Circle (for options type) -->
    <circle
      v-if="type === 'options'"
      ref="oppositeValueRef"
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
