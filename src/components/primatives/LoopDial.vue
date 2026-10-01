<template>
  <svg
    class="loop-dial"
    viewBox="0 0 34 34"
    role="img"
    :aria-label="ariaLabel"
    focusable="false"
  >
    <circle class="loop-dial__well" cx="17" cy="17" r="17" aria-hidden="true" />
    <path
      v-for="(arc, segmentIndex) in arcs"
      :key="segmentIndex"
      class="loop-dial__arc"
      :d="arc.path"
      :style="{ stroke: arc.color }"
      aria-hidden="true"
    />
    <line
      class="loop-dial__start"
      x1="17" y1="0.5" x2="17" y2="4.5"
      aria-hidden="true"
    />
  </svg>
</template>

<script setup lang="ts">
import { computed } from "vue";

export interface LoopDialSegment {
  color: string;
  durationMs: number;
  /** Chromatic pitch height, normalized between the loop's lowest and highest pitch. */
  height: number;
}

/* A phrase is one clockwise loop from twelve. Duration reads around the Ink
   well; pitch reads outward, preserving the melody's contour in Music Color. */
const MINIMUM_VISIBLE_DURATION = 50;
const ARC_GAP = .012;

const props = withDefaults(defineProps<{
  segments: LoopDialSegment[];
  ariaLabel?: string;
}>(), {
  ariaLabel: "Pattern note timeline",
});

function arcPath(radius: number, from: number, to: number) {
  const point = (turn: number) => {
    const angle = turn * Math.PI * 2 - Math.PI / 2;
    return `${(17 + radius * Math.cos(angle)).toFixed(2)} ${(17 + radius * Math.sin(angle)).toFixed(2)}`;
  };
  // A lone event needs two halves: SVG cannot draw a circle with coincident endpoints.
  if (to - from >= 1) {
    return `M ${point(from)} A ${radius} ${radius} 0 0 1 ${point(from + .5)} A ${radius} ${radius} 0 0 1 ${point(to)}`;
  }
  return `M ${point(from)} A ${radius} ${radius} 0 ${to - from > .5 ? 1 : 0} 1 ${point(to)}`;
}

const arcs = computed(() => {
  const heights = props.segments.map((segment) => segment.height)
    .filter((height) => Number.isFinite(height));
  const low = heights.length ? Math.min(...heights) : 0;
  const pitchSpan = heights.length ? Math.max(...heights) - low : 0;
  const weights = props.segments.map((segment) => Math.max(
    Number.isFinite(segment.durationMs) ? segment.durationMs : 0,
    MINIMUM_VISIBLE_DURATION,
  ));
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  let turn = 0;

  return props.segments.map((segment, index) => {
    const span = weights[index] / total;
    // Keep a short event visible even when the usual gap would consume its arc.
    const gap = props.segments.length > 1 ? Math.min(ARC_GAP, span / 2) : 0;
    const rise = pitchSpan > 0 && Number.isFinite(segment.height)
      ? (segment.height - low) / pitchSpan : 0;
    const path = arcPath(7 + rise * 7.5, turn + gap / 2, turn + span - gap / 2);
    turn += span;
    return { path, color: segment.color };
  });
});
</script>

<style scoped>
.loop-dial {
  width: 34px;
  height: 34px;
  flex: none;
  pointer-events: none;
}

.loop-dial__well {
  fill: var(--ink);
}

.loop-dial__arc {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: butt;
}

.loop-dial__start {
  stroke: var(--ivory-3);
  stroke-width: 1.5;
  stroke-linecap: butt;
}

@media (forced-colors: active) {
  .loop-dial {
    forced-color-adjust: none;
  }

  .loop-dial__well {
    fill: Canvas;
  }

  .loop-dial__arc,
  .loop-dial__start {
    stroke: CanvasText !important;
  }
}
</style>
