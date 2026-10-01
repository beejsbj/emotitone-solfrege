<script setup lang="ts">
import { computed, getCurrentInstance, ref } from "vue";
import { outlinePath, perimeter, spanBounds, type RoundedSquare } from "./collarGeometry";
import { useBeatFace } from "./useBeatFace";

/**
 * Direction A · Square Collar. Guide-only face mounted inside the real
 * BeatIndicator root in place of its circular ring. The collar is concentric
 * with the Lit Keycap: the key's 24% corner grown outward past its lip and a
 * dark seam. Segments count clockwise from top centre; the downbeat wears the
 * shared `.brass` material through a mask, and the lit segment kicks outward
 * on the UIBeat swell with the production ring's amplitudes.
 */
const props = withDefaults(defineProps<{ beats: number; keySize: number; still?: boolean }>(), { still: false });

const root = ref<SVGSVGElement | null>(null);
const { state, active, swell } = useBeatFace(root, { still: () => props.still });
const maskId = `beatlab-collar-brass-${getCurrentInstance()!.uid}`;

const PEAK_SCALE = 1.12;
const DOWNBEAT_PEAK_SCALE = 1.18;
const DIM_OPACITY = 0.2;

const geometry = computed(() => {
  const key = props.keySize;
  const stroke = Math.max(3, key * 0.09);
  // Key edge → lip (4px) → dark seam → collar.
  const inner = key / 2 + 4 + Math.max(1.5, key * 0.04);
  const shape: RoundedSquare = { half: inner + stroke / 2, radius: key * 0.24 + (inner + stroke / 2 - key / 2) };
  const length = perimeter(shape);
  const count = Math.max(1, Math.floor(props.beats));
  const span = length / count;
  const gap = count === 1 ? 0 : Math.min(length / 30, span * 0.25);
  const sweep = span - gap;
  const extent = Math.ceil(shape.half + stroke * 2);
  const segments = Array.from({ length: count }, (_, index) => {
    const start = index * span - sweep / 2;
    return { index, dasharray: `${sweep} ${length - sweep}`, dashoffset: -start };
  });
  return {
    stroke,
    extent,
    path: outlinePath(shape),
    segments,
    brass: spanBounds(shape, -sweep / 2, sweep / 2, stroke / 2 + 0.5),
  };
});

const beatStyle = (index: number) => {
  const downbeat = index === 0;
  const lit = state.value === "running" && active.value === index;
  const peak = downbeat ? DOWNBEAT_PEAK_SCALE : PEAK_SCALE;
  return {
    opacity: downbeat || lit ? 1 : DIM_OPACITY,
    transform: `scale(${lit ? (1 + (peak - 1) * swell.value).toFixed(3) : 1})`,
  };
};
</script>

<template>
  <svg
    ref="root"
    class="beatlab-collar"
    :class="`beatlab-collar--${state}`"
    :viewBox="`${-geometry.extent} ${-geometry.extent} ${geometry.extent * 2} ${geometry.extent * 2}`"
    :style="{ width: `${geometry.extent * 2}px`, height: `${geometry.extent * 2}px` }"
    aria-hidden="true"
  >
    <defs>
      <mask :id="maskId" maskUnits="userSpaceOnUse" :x="-geometry.extent" :y="-geometry.extent" :width="geometry.extent * 2" :height="geometry.extent * 2">
        <path
          :d="geometry.path"
          fill="none"
          stroke="white"
          :stroke-width="geometry.stroke"
          :stroke-dasharray="geometry.segments[0].dasharray"
          :stroke-dashoffset="geometry.segments[0].dashoffset"
        />
      </mask>
    </defs>
    <path class="beatlab-collar__track" :d="geometry.path" />
    <g
      v-for="segment in geometry.segments"
      :key="segment.index"
      class="beatlab-collar__beat"
      :class="{ 'beatlab-collar__beat--downbeat': segment.index === 0 }"
      :style="beatStyle(segment.index)"
    >
      <path
        class="beatlab-collar__stroke"
        :d="geometry.path"
        :stroke-width="geometry.stroke"
        :stroke-dasharray="segment.dasharray"
        :stroke-dashoffset="segment.dashoffset"
      />
      <foreignObject v-if="segment.index === 0" class="beatlab-collar__metal" v-bind="geometry.brass" :mask="`url(#${maskId})`">
        <div xmlns="http://www.w3.org/1999/xhtml" class="beatlab-collar__brass brass" />
      </foreignObject>
    </g>
  </svg>
</template>

<style scoped>
.beatlab-collar {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  translate: -50% -50%;
  overflow: visible;
  pointer-events: none;
  transition: opacity var(--dur-ui) var(--ease-brush);
}

.beatlab-collar--hidden { opacity: 0; }

.beatlab-collar__track,
.beatlab-collar__beat {
  fill: none;
  color: var(--ivory);
  stroke: currentColor;
  stroke-linecap: butt;
}

.beatlab-collar__track {
  stroke-width: 0.75;
  opacity: 0.4;
}

.beatlab-collar__beat {
  transform-box: view-box;
  transform-origin: 50% 50%;
  filter: drop-shadow(0 0 3px color-mix(in srgb, currentColor 55%, transparent));
  will-change: transform, opacity;
}

.beatlab-collar__beat--downbeat {
  color: var(--brass);
  filter:
    drop-shadow(0 -0.6px 0 var(--brass-hi))
    drop-shadow(0 0.6px 0 var(--brass-lo))
    drop-shadow(0 0 5px color-mix(in srgb, var(--brass) 78%, transparent));
}

.beatlab-collar__beat--downbeat .beatlab-collar__stroke { visibility: hidden; }

.beatlab-collar__brass {
  width: 100%;
  height: 100%;
  box-shadow: none;
}

.beatlab-collar:not(.beatlab-collar--running) .beatlab-collar__brass::after { animation: none; }

@media (prefers-reduced-motion: reduce) {
  .beatlab-collar { transition: none; }
  .beatlab-collar__brass::after { animation: none; }
}

@media (forced-colors: active) {
  .beatlab-collar__track,
  .beatlab-collar__beat { color: CanvasText; filter: none; }
  .beatlab-collar__beat--downbeat { color: Highlight; }
  .beatlab-collar__beat--downbeat .beatlab-collar__stroke { visibility: visible; }
  .beatlab-collar__metal { display: none; }
}
</style>
