<template>
  <div class="bar-tape" :aria-label="ariaLabel">
    <span
      v-for="(segment, segmentIndex) in segments"
      :key="segmentIndex"
      class="bar-tape__segment"
      :style="segmentStyle(segment)"
      aria-hidden="true"
    ></span>
  </div>
</template>

<script setup lang="ts">
import { computed, type CSSProperties } from "vue";

export interface BarTapeSegment {
  color: string;
  durationMs: number;
  /**
   * Chromatic pitch height (octave × 12 + pitch class). Only the ordering and
   * spacing matter: heights are normalized between the tape's lowest and
   * highest pitch.
   */
  height: number;
}

/*
 * Piano Roll: a 6px Ink band where each note is a 2px dash placed at its pitch
 * height, so the tape draws the melody's contour as well as its rhythm and
 * Music Color.
 */
const MINIMUM_VISIBLE_DURATION = 50;

const props = withDefaults(
  defineProps<{
    segments: BarTapeSegment[];
    ariaLabel?: string;
  }>(),
  {
    ariaLabel: "Pattern note timeline",
  },
);

const pitchRange = computed(() => {
  const heights = props.segments
    .map((segment) => segment.height)
    .filter((height) => Number.isFinite(height));
  if (heights.length === 0) return { low: 0, span: 0 };
  const low = Math.min(...heights);
  return { low, span: Math.max(...heights) - low };
});

/** 0 = lowest pitch in the tape, 1 = highest; a single-pitch tape is a flat line on the floor. */
function rise(height: number) {
  const { low, span } = pitchRange.value;
  if (span <= 0 || !Number.isFinite(height)) return 0;
  return (height - low) / span;
}

const segmentStyle = (segment: BarTapeSegment): CSSProperties => ({
  backgroundColor: segment.color,
  flexGrow: Math.max(segment.durationMs, MINIMUM_VISIBLE_DURATION),
  "--bar-tape-rise": rise(segment.height),
} as CSSProperties);
</script>

<style scoped>
.bar-tape {
  display: flex;
  height: 6px;
  align-items: flex-end;
  gap: 1px;
  overflow: hidden;
  background: var(--ink);
}

.bar-tape__segment {
  display: block;
  min-width: 2px;
  height: 2px;
  flex-basis: 0;
  flex-shrink: 1;
  transform: translateY(calc(var(--bar-tape-rise, 0) * -4px));
}

@media (forced-colors: active) {
  .bar-tape {
    background: Canvas;
  }

  .bar-tape__segment {
    forced-color-adjust: none;
    background-color: CanvasText !important;
  }
}
</style>
