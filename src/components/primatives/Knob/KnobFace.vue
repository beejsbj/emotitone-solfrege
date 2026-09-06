<template>
  <div
    class="knob-face"
    :class="[
      `knob-face--${visual}`,
      `knob-face--${role}`,
      `knob-face--${tone}`,
      {
        'knob-face--display': isDisplay,
        'knob-face--active': isActive,
      },
    ]"
    :style="{ '--knob-color': color }"
    aria-hidden="true"
  >
    <span v-if="visual === 'ring'" class="knob-face__dome" />

    <svg
      class="knob-face__meter"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      <circle
        ref="backgroundRef"
        class="knob-face__track"
        :cx="circleCenter"
        :cy="circleCenter"
        :r="circleRadius"
        fill="none"
        stroke="currentColor"
        :stroke-width="backgroundStrokeWidth"
      />

      <circle
        ref="valueRef"
        class="knob-face__value"
        :cx="circleCenter"
        :cy="circleCenter"
        :r="circleRadius"
        fill="none"
        stroke="currentColor"
        :stroke-width="strokeWidth"
      />

      <circle
        v-if="role === 'options'"
        ref="oppositeValueRef"
        class="knob-face__value knob-face__value--opposite"
        :cx="circleCenter"
        :cy="circleCenter"
        :r="circleRadius"
        fill="none"
        stroke="currentColor"
        :stroke-width="strokeWidth"
      />
    </svg>

    <div class="knob-face__center">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import useGSAP from "@/composables/useGSAP";

export type KnobVisual = "ring" | "arc";
export type KnobRole = "range" | "boolean" | "options" | "button";
export type KnobTone = "brass" | "ivory";

const PARTIAL_ARC_START = -37.5;
const PARTIAL_ARC_END = 37.5;
const FULL_CIRCLE_START = 0;
const FULL_CIRCLE_END = 100;
const BUTTON_SEGMENT_START = -50;
const BUTTON_SEGMENT_SIZE = 25;
const OPTIONS_SEGMENT_START = -50;
const DISPLAY_MODE_OFFSET_X = -70;
const BUTTON_ROTATION_DURATION = 2;
const VALUE_ANIMATION_DURATION = 0.3;

const props = withDefaults(
  defineProps<{
    visual?: KnobVisual;
    role: KnobRole;
    tone?: KnobTone;
    color: string;
    backgroundOpacity?: number;
    strokeWidth?: number;
    backgroundStrokeWidth?: number;
    isDisplay?: boolean;
    value?: number;
    isActive?: boolean;
    totalSegments?: number;
    activeSegment?: number;
  }>(),
  {
    visual: "arc",
    tone: "ivory",
    backgroundOpacity: 0.4,
    strokeWidth: 8,
    backgroundStrokeWidth: 2,
    isDisplay: false,
    value: 0,
    isActive: false,
    totalSegments: 0,
    activeSegment: 0,
  },
);

const backgroundRef = ref<SVGCircleElement | null>(null);
const valueRef = ref<SVGCircleElement | null>(null);
const oppositeValueRef = ref<SVGCircleElement | null>(null);

const circleRadius = computed(() => 50 - props.strokeWidth);
const circleCenter = 50;

const backgroundArc = computed(() => {
  if (props.role === "range") {
    return { start: PARTIAL_ARC_START, end: PARTIAL_ARC_END };
  }

  return { start: FULL_CIRCLE_START, end: FULL_CIRCLE_END };
});

const valueArc = computed(() => {
  const { start, end } = backgroundArc.value;

  switch (props.role) {
    case "button":
      return props.isActive
        ? {
            start: BUTTON_SEGMENT_START,
            end: BUTTON_SEGMENT_START + BUTTON_SEGMENT_SIZE,
          }
        : { start: BUTTON_SEGMENT_START, end: BUTTON_SEGMENT_START };

    case "options": {
      if (props.totalSegments <= 0) return { start: 0, end: 0 };

      const segmentLength =
        FULL_CIRCLE_END / (props.totalSegments <= 2 ? 3 : props.totalSegments);
      return {
        start: OPTIONS_SEGMENT_START - segmentLength / 2,
        end: OPTIONS_SEGMENT_START + segmentLength / 2,
        oppositeStart: OPTIONS_SEGMENT_START + 50 - segmentLength / 2,
        oppositeEnd: OPTIONS_SEGMENT_START + 50 + segmentLength / 2,
      };
    }

    case "boolean":
      return props.isActive ? { start, end } : { start, end: start };

    case "range":
    default: {
      const normalizedValue = Math.max(0, Math.min(1, props.value));
      return { start, end: start + normalizedValue * (end - start) };
    }
  }
});

const previousSegment = ref(0);
const cumulativeRotation = ref(0);

useGSAP(({ gsap }) => {
  watch(
    valueArc,
    (newArc, previousArc) => {
      if (!valueRef.value) return;

      const hasOppositeSegment =
        props.role === "options" && oppositeValueRef.value;

      if (props.role === "button" && props.isActive) {
        gsap.set(valueRef.value, {
          drawSVG: `${newArc.start}% ${newArc.end}%`,
        });
        gsap.to(valueRef.value, {
          rotation: 360,
          transformOrigin: "50% 50%",
          duration: BUTTON_ROTATION_DURATION,
          ease: "none",
          repeat: -1,
        });
      } else {
        if (props.role === "button") {
          gsap.killTweensOf(valueRef.value);
          gsap.set(valueRef.value, { rotation: 0 });
        }

        if (props.role === "options") {
          gsap.set(valueRef.value, {
            drawSVG: `${newArc.start}% ${newArc.end}%`,
          });
          if (hasOppositeSegment) {
            gsap.set(oppositeValueRef.value, {
              drawSVG: `${newArc.oppositeStart}% ${newArc.oppositeEnd}%`,
            });
          }
        } else if (previousArc === undefined) {
          gsap.set(valueRef.value, {
            drawSVG: `${newArc.start}% ${newArc.end}%`,
          });
        } else {
          gsap.to(valueRef.value, {
            drawSVG: `${newArc.start}% ${newArc.end}%`,
            duration: VALUE_ANIMATION_DURATION,
            ease: "power2.out",
          });
        }
      }
    },
    { immediate: true },
  );

  watch(
    () => props.activeSegment,
    (newSegment) => {
      if (!valueRef.value || props.role !== "options" || !props.totalSegments) {
        return;
      }

      const currentSegment = newSegment ?? 0;
      const segmentAngle = 360 / props.totalSegments;

      if (
        previousSegment.value === props.totalSegments - 1 &&
        currentSegment === 0
      ) {
        cumulativeRotation.value += segmentAngle;
      } else if (
        previousSegment.value === 0 &&
        currentSegment === props.totalSegments - 1
      ) {
        cumulativeRotation.value -= segmentAngle;
      } else {
        cumulativeRotation.value +=
          (currentSegment - previousSegment.value) * segmentAngle;
      }

      const elements = oppositeValueRef.value
        ? [valueRef.value, oppositeValueRef.value]
        : valueRef.value;

      gsap.to(elements, {
        rotation: cumulativeRotation.value,
        transformOrigin: "50% 50%",
        duration: VALUE_ANIMATION_DURATION,
        ease: "power2.out",
      });

      previousSegment.value = currentSegment;
    },
    { immediate: true },
  );

  watch(
    [backgroundRef, backgroundArc, () => props.isDisplay],
    ([element, arc, display]) => {
      if (!element) return;

      gsap.set(element, {
        x: display ? DISPLAY_MODE_OFFSET_X : 0,
        opacity: display ? 1 : props.backgroundOpacity,
        strokeWidth: display ? 4 : props.backgroundStrokeWidth,
        drawSVG: display
          ? `${arc.start + 50}% ${arc.end - 50}%`
          : `${arc.start}% ${arc.end}%`,
      });
    },
    { immediate: true },
  );
});
</script>

<style scoped>
.knob-face {
  position: relative;
  display: block;
  inline-size: 100%;
  aspect-ratio: 1;
  color: var(--knob-color);
  isolation: isolate;
}

.knob-face__dome {
  position: absolute;
  inset: 8%;
  z-index: -1;
  border: clamp(1px, 1.5cqi, 2px) solid
    color-mix(in srgb, currentColor 24%, #080808);
  border-radius: 50%;
  background:
    radial-gradient(circle at 42% 34%, rgb(255 255 255 / 10%), transparent 28%),
    radial-gradient(circle at 50% 42%, #252525 0%, #111 61%, #070707 100%);
  box-shadow:
    inset 0 1.5cqi 1.5cqi rgb(255 255 255 / 8%),
    inset 0 -4.5cqi 7.5cqi rgb(0 0 0 / 65%),
    0 3cqi 7.5cqi rgb(0 0 0 / 55%);
}

.knob-face__meter {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
  transform: rotate(-90deg);
}

.knob-face__track,
.knob-face__value {
  transform-origin: 50% 50%;
}

.knob-face--arc .knob-face__track,
.knob-face--arc .knob-face__value {
  stroke-linecap: butt;
}

.knob-face--ring .knob-face__track,
.knob-face--ring .knob-face__value {
  stroke-linecap: round;
}

.knob-face__track {
  opacity: 0.4;
}

.knob-face__value {
  filter: drop-shadow(
    0 0 6cqi color-mix(in srgb, currentColor 55%, transparent)
  );
}

.knob-face--boolean:not(.knob-face--active) .knob-face__value,
.knob-face--button:not(.knob-face--active) .knob-face__value {
  opacity: 0;
}

.knob-face--ring .knob-face__meter {
  padding: 5%;
  box-sizing: border-box;
}

.knob-face--ring .knob-face__value {
  filter:
    drop-shadow(0 1.5cqi 0 rgb(255 255 255 / 14%))
    drop-shadow(0 0 6cqi color-mix(in srgb, currentColor 42%, transparent));
}

.knob-face__center {
  position: absolute;
  inset: 0;
  display: grid;
  place-items: center;
  pointer-events: none;
}

@media (prefers-reduced-motion: reduce) {
  .knob-face__meter,
  .knob-face__value {
    transition: none;
  }
}
</style>
