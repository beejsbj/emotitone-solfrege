<template>
  <svg
    ref="rootRef"
    class="loop-dial"
    :class="{ 'loop-dial--live': live }"
    viewBox="0 0 34 34"
    role="img"
    :aria-label="ariaLabel"
    focusable="false"
    data-loop-dial-state="still"
  >
    <circle class="loop-dial__well" cx="17" cy="17" r="17" aria-hidden="true" />
    <g ref="discRef" class="loop-dial__disc" aria-hidden="true">
      <path
        v-for="(arc, segmentIndex) in arcs"
        :key="segmentIndex"
        class="loop-dial__arc"
        :d="arc.path"
        :style="{ stroke: arc.color }"
      />
    </g>
    <g ref="handRef" class="loop-dial__hand" aria-hidden="true">
      <line class="loop-dial__masthead" x1="17" y1="0.5" x2="17" y2="11" />
    </g>
  </svg>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from "vue";
import { useUIBeat, type UIBeatSnapshot } from "@/composables/useUIBeat";

export interface LoopDialSegment {
  color: string;
  durationMs: number;
  /** Chromatic pitch height, normalized between the loop's lowest and highest pitch. */
  height: number;
  /**
   * Phrase-relative onset. When every segment has one and `lengthMs` is set,
   * notes sit at their true place in the loop and rests read as gaps;
   * otherwise segments are laid end to end.
   */
  startMs?: number;
}

/*
 * A phrase is one loop, read like a clock. Notes sit at their place in the
 * loop, clockwise from twelve, and pitch reads outward, preserving the
 * melody's contour in Music Color. While the phrase sounds, the masthead
 * sweeps clockwise like a clock hand and crosses each note as it plays. Only
 * a live dial sweeps, and only while UIBeat presents an authoritative bar
 * position; otherwise the masthead rests at twelve, the loop's start.
 */
const MINIMUM_VISIBLE_DURATION = 50;
const ARC_GAP = .012;

const props = withDefaults(defineProps<{
  segments: LoopDialSegment[];
  /** Whole loop in ms, including rests and authored trailing silence. */
  lengthMs?: number;
  /** One bar in ms at the phrase's own tempo; with `lengthMs`, gives the loop in bars. */
  barMs?: number;
  /** This phrase is the one the transport plays, so the masthead follows playback. */
  live?: boolean;
  /** PROTOTYPE: what turns while live. "disc" turns the notes under a fixed hand. */
  spin?: "hand" | "disc";
  ariaLabel?: string;
}>(), {
  spin: "hand",
  lengthMs: undefined,
  barMs: undefined,
  live: false,
  ariaLabel: "Pattern note timeline",
});

function arcPath(radius: number, from: number, to: number) {
  // Clockwise from twelve, the way the masthead sweeps.
  const point = (turn: number) => {
    const angle = turn * Math.PI * 2 - Math.PI / 2;
    return `${(17 + radius * Math.cos(angle)).toFixed(2)} ${(17 + radius * Math.sin(angle)).toFixed(2)}`;
  };
  // A loop-long event needs two halves: SVG cannot draw a circle with coincident endpoints.
  if (to - from >= 1) {
    return `M ${point(from)} A ${radius} ${radius} 0 0 1 ${point(from + .5)} A ${radius} ${radius} 0 0 1 ${point(to)}`;
  }
  return `M ${point(from)} A ${radius} ${radius} 0 ${to - from > .5 ? 1 : 0} 1 ${point(to)}`;
}

const timed = computed(() => Boolean(
  props.lengthMs && props.lengthMs > 0
  && props.segments.length
  && props.segments.every((segment) => Number.isFinite(segment.startMs)),
));

const arcs = computed(() => {
  const heights = props.segments.map((segment) => segment.height)
    .filter((height) => Number.isFinite(height));
  const low = heights.length ? Math.min(...heights) : 0;
  const pitchSpan = heights.length ? Math.max(...heights) - low : 0;
  const weights = props.segments.map((segment) => Math.max(
    Number.isFinite(segment.durationMs) ? segment.durationMs : 0,
    MINIMUM_VISIBLE_DURATION,
  ));
  const total = timed.value
    ? props.lengthMs!
    : weights.reduce((sum, weight) => sum + weight, 0);
  let cursor = 0;

  return props.segments.map((segment, index) => {
    const start = timed.value ? segment.startMs! / total : cursor;
    const span = Math.min(weights[index] / total, 1 - start);
    cursor = start + span;
    // Keep a short event visible even when the usual gap would consume its arc.
    const gap = props.segments.length > 1 ? Math.min(ARC_GAP, span / 2) : 0;
    const rise = pitchSpan > 0 && Number.isFinite(segment.height)
      ? (segment.height - low) / pitchSpan : 0;
    return {
      path: arcPath(7 + rise * 7.5, start + gap / 2, start + span - gap / 2),
      color: segment.color,
    };
  });
});

/** Loop length in bars, when the dial knows enough to follow playback. */
const loopBars = computed(() => (
  timed.value && props.barMs && props.barMs > 0 ? props.lengthMs! / props.barMs : null
));

const rootRef = ref<SVGSVGElement | null>(null);
const handRef = ref<SVGGElement | null>(null);
const discRef = ref<SVGGElement | null>(null);
const { clock, presentationEnabled } = useUIBeat();
let unsubscribe: (() => void) | undefined;
let sweeping = false;

function rest() {
  if (!sweeping && handRef.value?.style.transform === "" && discRef.value?.style.transform === "") return;
  sweeping = false;
  if (handRef.value) handRef.value.style.transform = "";
  if (discRef.value) discRef.value.style.transform = "";
  rootRef.value?.setAttribute("data-loop-dial-state", "still");
}

function applyFrame(snapshot: UIBeatSnapshot) {
  const bars = loopBars.value;
  if (
    !props.live
    || bars === null
    || !presentationEnabled()
    || !snapshot.presenting
    || snapshot.status !== "running"
    || snapshot.barPosition === null
  ) {
    rest();
    return;
  }

  const phase = ((snapshot.barPosition / bars) % 1 + 1) % 1;
  sweeping = true;
  rootRef.value?.setAttribute("data-loop-dial-state", "sweeping");
  if (props.spin === "disc") {
    if (discRef.value) discRef.value.style.transform = `rotate(${(-phase * 360).toFixed(2)}deg)`;
  } else if (handRef.value) handRef.value.style.transform = `rotate(${(phase * 360).toFixed(2)}deg)`;
}

function syncSubscription() {
  unsubscribe?.();
  unsubscribe = undefined;
  if (!props.live || !rootRef.value) {
    rest();
    return;
  }
  unsubscribe = clock.subscribe(applyFrame, rootRef.value);
}

onMounted(syncSubscription);
watch(() => props.live, syncSubscription, { flush: "post" });
watch(loopBars, () => applyFrame(clock.snapshot), { flush: "post" });
onBeforeUnmount(() => unsubscribe?.());
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

.loop-dial__hand,
.loop-dial__disc {
  transform-box: view-box;
  transform-origin: 50% 50%;
}

.loop-dial__arc {
  fill: none;
  stroke-width: 2.5;
  stroke-linecap: butt;
}

/* The playhead: at rest it marks the loop's start; live, it sweeps as "now". */
.loop-dial__masthead {
  stroke: var(--ivory-3);
  stroke-width: 1.5;
  stroke-linecap: butt;
}

.loop-dial--live .loop-dial__masthead {
  stroke: var(--ivory);
}

@media (prefers-reduced-motion: reduce) {
  .loop-dial__hand,
  .loop-dial__disc {
    transform: none !important;
  }
}

@media (forced-colors: active) {
  .loop-dial {
    forced-color-adjust: none;
  }

  .loop-dial__well {
    fill: Canvas;
  }

  .loop-dial__arc,
  .loop-dial__masthead {
    stroke: CanvasText !important;
  }
}
</style>
