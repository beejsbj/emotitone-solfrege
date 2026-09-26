<script setup lang="ts">
import {
  computed,
  nextTick,
  onBeforeUnmount,
  onMounted,
  ref,
  watch,
} from "vue";
import {
  uiBeatScaleSwell,
  useUIBeat,
  type UIBeatSnapshot,
} from "@/composables/useUIBeat";
import Mark from "@/components/primatives/Mark.vue";
import type { MarkName } from "@/components/primatives/marks";

export type BeatIndicatorVariant = "ring" | "orbit";

const props = withDefaults(
  defineProps<{
    beats?: number;
    variant?: BeatIndicatorVariant;
    marks?: MarkName[];
    downbeat?: boolean;
    static?: boolean;
    enabled?: boolean;
    ariaLabel?: string;
  }>(),
  {
    beats: 4,
    variant: "ring",
    marks: () => ["square"],
    downbeat: true,
    static: false,
    enabled: true,
    ariaLabel: "Beat indicator",
  },
);

/*
 * Ring shards live in a 100-unit viewBox that fills the padded root, so the
 * ring scales with whatever control it wraps. Shard 1 is centred at twelve
 * o'clock and the bar reads clockwise. Each shard is a faceted band whose
 * scissor-cut ends lean clockwise; authored radial nudges keep the edges
 * hand-cut rather than machined.
 */
const OUTER = 48.7;
const INNER = 41;
const MAX_GAP_DEGREES = 16;
const SLANT_DEGREES = 8;
const FACET_DEGREES = 36;
const SHADOW_OFFSET = 4;
const CUT_NUDGES = [0.9, -0.7, 1.3, -0.4, -1.1, 0.6, -0.2, 1.0, -0.9, 0.3];
const ORBIT_TILTS = [2, -3, 1.5, -2.5, 3, -1];

const PEAKS = {
  ring: { beat: 1.12, downbeat: 1.18 },
  orbit: { beat: 1.42, downbeat: 1.52 },
} as const;
const REST_OPACITY = 0.18;
const INACTIVE_OPACITY = 0.14;

type Presentation = "hidden" | "rest" | "running";

const beatCount = computed(() => Math.max(1, Math.floor(props.beats)));
const usableMarks = computed<MarkName[]>(() => props.marks.length ? props.marks : ["square"]);
const rootRef = ref<HTMLElement | null>(null);
const { clock, presentationEnabled } = useUIBeat();
const consumerEnabled = () => props.enabled && presentationEnabled();
let beatElements: Element[] = [];
let presentation: Presentation | null = null;
let unsubscribe: (() => void) | undefined;

const classes = computed(() => [
  "beat-indicator",
  `beat-indicator--${props.variant}`,
  { "beat-indicator--static": props.static },
]);

const nudge = (index: number) => CUT_NUDGES[index % CUT_NUDGES.length];

const point = (radius: number, degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return `${(50 + radius * Math.cos(radians)).toFixed(2)} ${(50 + radius * Math.sin(radians)).toFixed(2)}`;
};

function facetedEdge(radius: number, start: number, sweep: number, seed: number, offset = 0) {
  const facets = Math.max(1, Math.round(sweep / FACET_DEGREES));
  return Array.from({ length: facets + 1 }, (_, step) =>
    point(radius + nudge(seed + step), start + offset + (sweep * step) / facets),
  );
}

const shards = computed(() => {
  const count = beatCount.value;
  if (count === 1) {
    const outer = facetedEdge(OUTER, -90, 360, 0).slice(0, -1);
    const inner = facetedEdge(INNER, -90, 360, 3).slice(0, -1).reverse();
    return [`M ${outer.join(" L ")} Z M ${inner.join(" L ")} Z`];
  }

  const span = 360 / count;
  const sweep = span - Math.min(MAX_GAP_DEGREES, span * 0.3);
  return Array.from({ length: count }, (_, index) => {
    const start = -90 + index * span - sweep / 2 - SLANT_DEGREES / 2;
    const outer = facetedEdge(OUTER, start, sweep, index * 5);
    const inner = facetedEdge(INNER, start, sweep, index * 5 + 3, SLANT_DEGREES).reverse();
    return `M ${[...outer, ...inner].join(" L ")} Z`;
  });
});

const orbitSlots = computed(() => {
  const count = beatCount.value;
  return Array.from({ length: count }, (_, index) => {
    const radians = ((-90 + (index * 360) / count) * Math.PI) / 180;
    return {
      mark: usableMarks.value[index % usableMarks.value.length],
      style: {
        "--beat-orbit-x": Math.cos(radians).toFixed(4),
        "--beat-orbit-y": Math.sin(radians).toFixed(4),
        "--beat-orbit-tilt": `${ORBIT_TILTS[index % ORBIT_TILTS.length]}deg`,
      },
    };
  });
});

const isDownbeat = (index: number) => props.downbeat && index === 0;

function setPresentation(next: Presentation) {
  presentation = next;
  if (!rootRef.value) return;
  rootRef.value.dataset.uiBeatState = next === "running" ? "running" : "idle";
  rootRef.value.dataset.beatTransport = next === "hidden" ? "idle" : "active";
}

function applyStill(next: Exclude<Presentation, "running">) {
  if (presentation === next) return;
  setPresentation(next);
  beatElements.forEach((element, index) => {
    const style = (element as HTMLElement | SVGElement).style;
    style.opacity = isDownbeat(index) ? "1" : String(REST_OPACITY);
    style.transform = "scale(1)";
  });
}

function applyFrame(snapshot: UIBeatSnapshot) {
  // Static specimens hold a still bar; otherwise the indicator only exists
  // while the transport is active, and only moves while UIBeat presents.
  if (props.static) return applyStill("rest");
  if (snapshot.status === "idle") return applyStill("hidden");
  if (
    !consumerEnabled() ||
    !snapshot.presenting ||
    snapshot.beatIndex === null
  ) {
    return applyStill("rest");
  }

  setPresentation("running");
  const activeIndex = snapshot.beatIndex % beatCount.value;
  const swell = uiBeatScaleSwell(snapshot.beatPhase);
  const peaks = PEAKS[props.variant];

  beatElements.forEach((element, index) => {
    const style = (element as HTMLElement | SVGElement).style;
    if (index !== activeIndex) {
      style.opacity = String(INACTIVE_OPACITY);
      style.transform = "scale(1)";
      return;
    }

    // Ring shards kick outward from the ring's centre; orbit Marks swell in
    // place. Both brighten on the shared UIBeat contour.
    const peakScale = isDownbeat(index) ? peaks.downbeat : peaks.beat;
    const scale = 1 + (peakScale - 1) * swell;
    style.opacity = (0.22 + swell * 0.78).toFixed(3);
    style.transform = `scale(${scale.toFixed(3)})`;
  });
}

function collectBeatElements() {
  beatElements = rootRef.value
    ? Array.from(rootRef.value.querySelectorAll(".beat-indicator__beat"))
    : [];
  presentation = null;
  applyFrame(clock.snapshot);
}

function syncSubscription() {
  unsubscribe?.();
  unsubscribe = undefined;
  presentation = null;

  if (props.static || !rootRef.value) {
    applyFrame(clock.snapshot);
    return;
  }

  // Subscribed even while presentation is disabled: arm and stop still
  // decide whether the indicator is shown, just without beat motion.
  unsubscribe = clock.subscribe(applyFrame, rootRef.value);
}

onMounted(() => {
  collectBeatElements();
  syncSubscription();
});

watch([beatCount, () => props.variant], async () => {
  await nextTick();
  collectBeatElements();
});

watch(() => props.static, syncSubscription, { flush: "post" });

watch([consumerEnabled, () => props.downbeat], () => {
  presentation = null;
  applyFrame(clock.snapshot);
}, { flush: "post" });

onBeforeUnmount(() => unsubscribe?.());
</script>

<template>
  <div
    ref="rootRef"
    :class="classes"
    data-ui-beat-state="idle"
    data-beat-transport="idle"
  >
    <svg
      v-if="variant === 'ring'"
      class="beat-indicator__ring beat-indicator__layer"
      viewBox="0 0 100 100"
      role="img"
      :aria-label="ariaLabel"
    >
      <g
        v-for="(d, index) in shards"
        :key="index"
        class="beat-indicator__beat"
        :class="{ 'beat-indicator__beat--downbeat': isDownbeat(index) }"
        :data-beat="index + 1"
      >
        <path
          class="beat-indicator__shadow"
          :d="d"
          fill-rule="evenodd"
          :transform="`translate(0 ${SHADOW_OFFSET})`"
        />
        <path class="beat-indicator__shard" :d="d" fill-rule="evenodd" />
      </g>
    </svg>
    <div
      v-else
      class="beat-indicator__orbit beat-indicator__layer"
      role="img"
      :aria-label="ariaLabel"
    >
      <span
        v-for="(slot, index) in orbitSlots"
        :key="index"
        class="beat-indicator__slot"
        :style="slot.style"
      >
        <span
          class="beat-indicator__beat"
          :class="{ 'beat-indicator__beat--downbeat': isDownbeat(index) }"
          :data-beat="index + 1"
          :data-mark="slot.mark"
        >
          <Mark
            :name="slot.mark"
            :tone="isDownbeat(index) ? 'brass' : 'ivory'"
            size="100%"
          />
        </span>
      </span>
    </div>
    <div class="beat-indicator__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.beat-indicator {
  /* Air between the wrapped control's edge and the ring. Consumers read it
     to overhang an inset without growing their layout. */
  --beat-indicator-gap: 7px;
  --beat-indicator-mark: 8px;

  position: relative;
  display: inline-grid;
  place-items: center;
  box-sizing: border-box;
  padding: var(--beat-indicator-gap);
}

.beat-indicator--orbit {
  --beat-indicator-gap: 12px;
}

.beat-indicator__layer {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  transition: opacity var(--dur-ui) var(--ease-brush);
}

.beat-indicator[data-beat-transport="idle"] .beat-indicator__layer {
  opacity: 0;
}

.beat-indicator__content {
  position: relative;
  display: grid;
  place-items: center;
  min-inline-size: var(--beat-indicator-hole, 32px);
  min-block-size: var(--beat-indicator-hole, 32px);
}

.beat-indicator__beat {
  opacity: 0.18;
  will-change: transform, opacity;
}

.beat-indicator__ring .beat-indicator__beat {
  transform-box: view-box;
  transform-origin: 50% 50%;
}

.beat-indicator__shard { fill: var(--ivory); }
.beat-indicator__shadow { fill: var(--ivory-4); }
.beat-indicator__beat--downbeat .beat-indicator__shard { fill: var(--brass); }
.beat-indicator__beat--downbeat .beat-indicator__shadow { fill: var(--brass-lo); }

.beat-indicator__slot {
  position: absolute;
  left: calc(50% + (50% - var(--beat-indicator-mark) / 2) * var(--beat-orbit-x));
  top: calc(50% + (50% - var(--beat-indicator-mark) / 2) * var(--beat-orbit-y));
  width: var(--beat-indicator-mark);
  height: var(--beat-indicator-mark);
  transform: translate(-50%, -50%) rotate(var(--beat-orbit-tilt));
}

.beat-indicator__orbit .beat-indicator__beat {
  display: block;
  width: 100%;
  height: 100%;
  transform-origin: 50% 50%;
  filter: drop-shadow(0 1.5px 0 var(--ivory-4));
}

.beat-indicator__orbit .beat-indicator__beat--downbeat {
  filter: drop-shadow(0 1.5px 0 var(--brass-lo));
}

.beat-indicator:not([data-ui-beat-state="running"]) .beat-indicator__beat {
  transition:
    transform var(--dur-ui) var(--ease-brush),
    opacity var(--dur-ui) var(--ease-brush);
}

@media (prefers-reduced-motion: reduce) {
  .beat-indicator__layer,
  .beat-indicator__beat {
    transition: none !important;
  }

  .beat-indicator__beat {
    opacity: 0.18 !important;
    transform: none !important;
  }

  .beat-indicator__beat--downbeat {
    opacity: 1 !important;
    transform: none !important;
  }
}

@media (forced-colors: active) {
  .beat-indicator__shard { fill: CanvasText; }
  .beat-indicator__shadow { fill: none; }
  .beat-indicator__beat--downbeat .beat-indicator__shard { fill: Highlight; }
  .beat-indicator__orbit .beat-indicator__beat { filter: none; }
}
</style>
