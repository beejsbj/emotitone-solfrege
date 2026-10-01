<script setup lang="ts">
import { computed, getCurrentInstance, ref } from "vue";
import { spanBounds, type RoundedSquare } from "./collarGeometry";
import { useBeatFace } from "./useBeatFace";

/**
 * Direction B · Lip Counter. Guide-only overlay mounted inside the real
 * Button's `.paper-button__face`, drawn on the exact centreline of the Lit
 * Keycap's lip (inset -4px, 2px thick, corner 24% + 2px). While the transport
 * runs, the skin hides the real lip and this counter takes its place: the
 * lip's arc across the bottom corners, split into one segment per beat and
 * read left to right like the strip beside it. Because it lives inside the
 * face, it rides the key's own UIBeat scale; it adds no kick of its own.
 * Adoption would need Button to accept a lip segment count and active index.
 */
const props = withDefaults(defineProps<{ beats: number; keySize: number; still?: boolean }>(), { still: false });

const root = ref<SVGSVGElement | null>(null);
const { state, active, swell } = useBeatFace(root, { still: () => props.still });
const maskId = `beatlab-lip-brass-${getCurrentInstance()!.uid}`;

const STROKE = 2;
const DIM_OPACITY = 0.22;

const geometry = computed(() => {
  const key = props.keySize;
  const half = key / 2 + 3;
  const radius = 0.24 * (key + 8) + 2 - STROKE / 2;
  const shape: RoundedSquare = { half, radius };
  const corner = (Math.PI * radius) / 2;
  const length = corner * 2 + 2 * (half - radius);
  const f = (value: number) => Number(value.toFixed(3));
  const path = [
    `M ${f(-half)} ${f(half - radius)}`,
    `A ${f(radius)} ${f(radius)} 0 0 0 ${f(-half + radius)} ${f(half)}`,
    `H ${f(half - radius)}`,
    `A ${f(radius)} ${f(radius)} 0 0 0 ${f(half)} ${f(half - radius)}`,
  ].join(" ");
  const count = Math.max(1, Math.floor(props.beats));
  const span = length / count;
  const gap = count === 1 ? 0 : Math.max(1.5, length * 0.035);
  const sweep = span - gap;
  // The lip's left end, as a clockwise distance round the whole outline.
  const leftEnd = (half - radius) + corner * 3 + 4 * (half - radius);
  const segments = Array.from({ length: count }, (_, index) => ({
    index,
    dasharray: `${sweep} ${length}`,
    dashoffset: -(index * span + gap / 2),
  }));
  const extent = Math.ceil(half + 6);
  return {
    path,
    extent,
    segments,
    brass: spanBounds(shape, leftEnd - gap / 2 - sweep, leftEnd - gap / 2, STROKE / 2 + 0.5),
  };
});

const beatWidth = (index: number) =>
  state.value === "running" && active.value === index ? STROKE + 0.6 * swell.value : STROKE;

const beatStyle = (index: number) => {
  const lit = state.value === "running" && active.value === index;
  return {
    opacity: index === 0 || lit ? 1 : DIM_OPACITY,
    strokeWidth: `${beatWidth(index).toFixed(2)}px`,
  };
};
</script>

<template>
  <svg
    ref="root"
    class="beatlab-lip"
    :class="`beatlab-lip--${state}`"
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
          :stroke-width="beatWidth(0)"
          :stroke-dasharray="geometry.segments[0].dasharray"
          :stroke-dashoffset="geometry.segments[0].dashoffset"
        />
      </mask>
    </defs>
    <g
      v-for="segment in geometry.segments"
      :key="segment.index"
      class="beatlab-lip__beat"
      :class="{ 'beatlab-lip__beat--downbeat': segment.index === 0 }"
      :style="beatStyle(segment.index)"
    >
      <path
        class="beatlab-lip__stroke"
        :d="geometry.path"
        :stroke-dasharray="segment.dasharray"
        :stroke-dashoffset="segment.dashoffset"
      />
      <foreignObject v-if="segment.index === 0" class="beatlab-lip__metal" v-bind="geometry.brass" :mask="`url(#${maskId})`">
        <div xmlns="http://www.w3.org/1999/xhtml" class="beatlab-lip__brass brass" />
      </foreignObject>
    </g>
  </svg>
</template>

<style scoped>
.beatlab-lip {
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  translate: -50% -50%;
  overflow: visible;
  pointer-events: none;
  transition: opacity var(--dur-ui) var(--ease-brush);
}

.beatlab-lip--hidden { opacity: 0; }

.beatlab-lip__beat {
  fill: none;
  color: var(--button-light, var(--ivory));
  stroke: currentColor;
  stroke-linecap: butt;
  filter: drop-shadow(0 0 3px color-mix(in srgb, currentColor 55%, transparent));
}

.beatlab-lip__stroke { stroke-width: inherit; }

.beatlab-lip__beat--downbeat {
  color: var(--brass);
  filter:
    drop-shadow(0 -0.5px 0 var(--brass-hi))
    drop-shadow(0 0 4px color-mix(in srgb, var(--brass) 78%, transparent));
}

.beatlab-lip__beat--downbeat .beatlab-lip__stroke { visibility: hidden; }

.beatlab-lip__brass {
  width: 100%;
  height: 100%;
  box-shadow: none;
}

.beatlab-lip:not(.beatlab-lip--running) .beatlab-lip__brass::after { animation: none; }

@media (prefers-reduced-motion: reduce) {
  .beatlab-lip { transition: none; }
  .beatlab-lip__brass::after { animation: none; }
}

@media (forced-colors: active) {
  .beatlab-lip__beat { color: CanvasText; filter: none; }
  .beatlab-lip__beat--downbeat { color: Highlight; }
  .beatlab-lip__beat--downbeat .beatlab-lip__stroke { visibility: visible; }
  .beatlab-lip__metal { display: none; }
}
</style>
