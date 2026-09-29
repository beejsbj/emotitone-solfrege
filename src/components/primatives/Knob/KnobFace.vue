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

    <!-- Analog Ring: the LED collar. Fifteen hand-cut chads around the 270°
         sweep light like LEDs; the light chases chad to chad as value moves. -->
    <svg
      v-if="visual === 'ring'"
      class="knob-face__collar"
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect
        v-for="chad in collarChads"
        :key="chad.index"
        class="knob-face__chad"
        :class="{ 'knob-face__chad--lit': chad.lit }"
        :x="chad.x - COLLAR_CHAD_SIZE / 2"
        :y="chad.y - COLLAR_CHAD_SIZE / 2"
        :width="COLLAR_CHAD_SIZE"
        :height="COLLAR_CHAD_SIZE"
        rx="0.6"
        :transform="`rotate(${chad.tilt} ${chad.x} ${chad.y})`"
        :style="{ transitionDelay: chad.delay }"
      />
    </svg>

    <svg
      v-else
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

const COLLAR_CHADS = 15;
const COLLAR_START_DEGREES = -135;
const COLLAR_SWEEP_DEGREES = 270;
const COLLAR_RADIUS = 44;
const COLLAR_CHAD_SIZE = 6.4;
const COLLAR_CHASE_STEP_MS = 14;

function isCollarChadLit(index: number): boolean {
  switch (props.role) {
    case "range":
      return index < Math.round(Math.max(0, Math.min(1, props.value)) * COLLAR_CHADS);
    case "boolean":
    case "button":
      return props.isActive;
    case "options": {
      const count = props.totalSegments;
      if (count <= 0 || props.activeSegment < 0) return false;
      if (count > COLLAR_CHADS) {
        return index === Math.floor((props.activeSegment * COLLAR_CHADS) / count);
      }
      return Math.floor((index * count) / COLLAR_CHADS) === props.activeSegment;
    }
    default:
      return false;
  }
}

const collarChads = computed(() =>
  Array.from({ length: COLLAR_CHADS }, (_, index) => {
    const angle =
      COLLAR_START_DEGREES + (index * COLLAR_SWEEP_DEGREES) / (COLLAR_CHADS - 1);
    const radians = ((angle - 90) * Math.PI) / 180;
    const x = 50 + Math.cos(radians) * COLLAR_RADIUS;
    const y = 50 + Math.sin(radians) * COLLAR_RADIUS;

    return {
      index,
      x: Number(x.toFixed(2)),
      y: Number(y.toFixed(2)),
      // A small fixed per-chad tilt so the collar reads as hand-cut paper.
      tilt: angle + ((index * 37) % 11) - 5,
      lit: isCollarChadLit(index),
      delay: `${index * COLLAR_CHASE_STEP_MS}ms`,
    };
  }),
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
    () => [valueArc.value, valueRef.value] as const,
    ([newArc, element], previous) => {
      if (!element) return;
      const previousArc = previous?.[0];
      const isNewMeter = element !== previous?.[1];

      const hasOppositeSegment =
        props.role === "options" && oppositeValueRef.value;

      if (props.role === "button" && props.isActive) {
        gsap.set(element, {
          drawSVG: `${newArc.start}% ${newArc.end}%`,
        });
        gsap.to(element, {
          rotation: 360,
          transformOrigin: "50% 50%",
          duration: BUTTON_ROTATION_DURATION,
          ease: "none",
          repeat: -1,
        });
      } else {
        if (props.role === "button") {
          gsap.killTweensOf(element);
          gsap.set(element, { rotation: 0 });
        }

        if (props.role === "options") {
          gsap.set(element, {
            drawSVG: `${newArc.start}% ${newArc.end}%`,
          });
          if (hasOppositeSegment) {
            gsap.set(oppositeValueRef.value, {
              drawSVG: `${newArc.oppositeStart}% ${newArc.oppositeEnd}%`,
            });
          }
        } else if (previousArc === undefined || isNewMeter) {
          gsap.set(element, {
            drawSVG: `${newArc.start}% ${newArc.end}%`,
          });
        } else {
          gsap.to(element, {
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
    () => [props.activeSegment, valueRef.value] as const,
    ([newSegment, element]) => {
      if (!element || props.role !== "options" || !props.totalSegments) {
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
        ? [element, oppositeValueRef.value]
        : element;

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
  inset: 16%;
  z-index: -1;
  border: clamp(1px, 1.5cqi, 2px) solid
    color-mix(in srgb, currentColor 24%, #080808);
  border-radius: 50%;
  background: var(--instrument-control-dark-well);
  box-shadow: var(--instrument-control-dark-well-shadow);
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

.knob-face__collar {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.knob-face__chad {
  fill: var(--ink-5);
  transition:
    fill var(--dur-tap) var(--ease-stab),
    filter var(--dur-tap) var(--ease-stab);
}

/* Lengths inside the collar are viewBox units, so the glow scales with the face. */
.knob-face__chad--lit {
  fill: currentColor;
  filter: drop-shadow(0 0 2.5px color-mix(in srgb, currentColor 60%, transparent));
}

.knob-face--brass .knob-face__chad--lit {
  filter: drop-shadow(0 0 3px color-mix(in srgb, currentColor 75%, transparent));
}

.knob-face--brass .knob-face__value {
  filter:
    drop-shadow(0 -1.25cqi 0 var(--brass-hi))
    drop-shadow(0 1.25cqi 0 var(--brass-lo))
    drop-shadow(0 0 10cqi color-mix(in srgb, var(--brass) 78%, transparent));
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
  .knob-face__value,
  .knob-face__chad {
    transition: none;
  }
}

@media (forced-colors: active) {
  .knob-face__chad { fill: GrayText; }
  .knob-face__chad--lit { fill: CanvasText; filter: none; }
}

</style>
