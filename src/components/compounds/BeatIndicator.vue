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

const props = withDefaults(
  defineProps<{
    beats?: number;
    downbeat?: boolean;
    static?: boolean;
    enabled?: boolean;
    ariaLabel?: string;
  }>(),
  {
    beats: 4,
    downbeat: true,
    static: false,
    enabled: true,
    ariaLabel: "Beat indicator",
  },
);

/*
 * Ring geometry lives in a 100-unit viewBox that fills the padded root, so
 * the ring scales with whatever control it wraps. Segment 1 is centred at
 * twelve o'clock and the bar reads clockwise.
 */
const CENTER = 50;
const STROKE = 4.5;
const RADIUS = CENTER - STROKE / 2;
const MAX_GAP_DEGREES = 14;
const REST_OPACITY = 0.18;
const INACTIVE_OPACITY = 0.14;
const PEAK_SCALE = 1.12;
const DOWNBEAT_PEAK_SCALE = 1.18;

const beatCount = computed(() => Math.max(1, Math.floor(props.beats)));
const rootRef = ref<HTMLElement | null>(null);
const { clock, presentationEnabled } = useUIBeat();
const consumerEnabled = () => props.enabled && presentationEnabled();
let beatElements: SVGElement[] = [];
let unsubscribe: (() => void) | undefined;

const classes = computed(() => [
  "beat-indicator",
  { "beat-indicator--static": props.static },
]);

const point = (degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return `${(CENTER + RADIUS * Math.cos(radians)).toFixed(3)} ${(CENTER + RADIUS * Math.sin(radians)).toFixed(3)}`;
};

const segments = computed(() => {
  const count = beatCount.value;
  if (count === 1) {
    return [
      `M ${point(-90)} A ${RADIUS} ${RADIUS} 0 1 1 ${point(90)} A ${RADIUS} ${RADIUS} 0 1 1 ${point(-90)}`,
    ];
  }

  const span = 360 / count;
  const sweep = span - Math.min(MAX_GAP_DEGREES, span * 0.3);
  return Array.from({ length: count }, (_, index) => {
    const middle = -90 + index * span;
    const start = middle - sweep / 2;
    const end = middle + sweep / 2;
    return `M ${point(start)} A ${RADIUS} ${RADIUS} 0 ${sweep > 180 ? 1 : 0} 1 ${point(end)}`;
  });
});

function applyRestState() {
  if (rootRef.value) rootRef.value.dataset.uiBeatState = "idle";
  beatElements.forEach((element, index) => {
    const holdsDownbeat = props.downbeat && index === 0;
    element.style.opacity = holdsDownbeat ? "1" : String(REST_OPACITY);
    element.style.transform = "scale(1)";
  });
}

function applyFrame(snapshot: UIBeatSnapshot) {
  if (
    !consumerEnabled() ||
    props.static ||
    !snapshot.presenting ||
    snapshot.beatIndex === null
  ) {
    applyRestState();
    return;
  }

  if (rootRef.value) rootRef.value.dataset.uiBeatState = "running";
  const activeIndex = snapshot.beatIndex % beatCount.value;
  const swell = uiBeatScaleSwell(snapshot.beatPhase);

  beatElements.forEach((element, index) => {
    if (index !== activeIndex) {
      element.style.opacity = String(INACTIVE_OPACITY);
      element.style.transform = "scale(1)";
      return;
    }

    // The active arc kicks outward from the ring's centre, away from the
    // wrapped control, and brightens on the shared UIBeat contour.
    const isDownbeat = props.downbeat && index === 0;
    const peakScale = isDownbeat ? DOWNBEAT_PEAK_SCALE : PEAK_SCALE;
    const scale = 1 + (peakScale - 1) * swell;
    element.style.opacity = (0.22 + swell * 0.78).toFixed(3);
    element.style.transform = `scale(${scale.toFixed(3)})`;
  });
}

function collectBeatElements() {
  beatElements = rootRef.value
    ? Array.from(rootRef.value.querySelectorAll<SVGElement>(".beat-indicator__beat"))
    : [];
  applyFrame(clock.snapshot);
}

function syncSubscription() {
  unsubscribe?.();
  unsubscribe = undefined;

  if (!consumerEnabled() || props.static || !rootRef.value) {
    applyRestState();
    return;
  }

  unsubscribe = clock.subscribe(applyFrame, rootRef.value);
}

onMounted(() => {
  collectBeatElements();
  syncSubscription();
});

watch(beatCount, async () => {
  await nextTick();
  collectBeatElements();
});

watch(
  [consumerEnabled, () => props.static],
  syncSubscription,
  { flush: "post" },
);

watch(() => props.downbeat, () => applyFrame(clock.snapshot));

onBeforeUnmount(() => unsubscribe?.());
</script>

<template>
  <div
    ref="rootRef"
    :class="classes"
    data-ui-beat-state="idle"
  >
    <svg
      class="beat-indicator__ring"
      viewBox="0 0 100 100"
      role="img"
      :aria-label="ariaLabel"
    >
      <path
        v-for="(d, index) in segments"
        :key="index"
        class="beat-indicator__beat"
        :class="{ 'beat-indicator__beat--downbeat': downbeat && index === 0 }"
        :d="d"
        :stroke-width="STROKE"
        :data-beat="index + 1"
      />
    </svg>
    <div class="beat-indicator__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.beat-indicator {
  position: relative;
  display: inline-grid;
  place-items: center;
  box-sizing: border-box;
  /* Air between the wrapped control's edge and the ring's inner edge. */
  padding: var(--beat-indicator-gap, 6px);
}

.beat-indicator__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
}

.beat-indicator__content {
  position: relative;
  display: grid;
  place-items: center;
  min-inline-size: var(--beat-indicator-hole, 32px);
  min-block-size: var(--beat-indicator-hole, 32px);
}

.beat-indicator__beat {
  fill: none;
  stroke: var(--ivory);
  stroke-linecap: butt;
  opacity: 0.18;
  transform-box: view-box;
  transform-origin: 50% 50%;
  will-change: transform, opacity;
}

.beat-indicator__beat--downbeat {
  stroke: var(--brass);
  filter: drop-shadow(0 0 3px rgba(224, 169, 58, 0.45));
}

.beat-indicator:not([data-ui-beat-state="running"]) .beat-indicator__beat {
  transition:
    transform var(--dur-ui) var(--ease-brush),
    opacity var(--dur-ui) var(--ease-brush);
}

@media (prefers-reduced-motion: reduce) {
  .beat-indicator__beat {
    opacity: 0.18 !important;
    transform: none !important;
    transition: none !important;
  }

  .beat-indicator__beat--downbeat {
    opacity: 1 !important;
    transform: none !important;
  }
}

@media (forced-colors: active) {
  .beat-indicator__beat { stroke: CanvasText; }

  .beat-indicator__beat--downbeat {
    stroke: Highlight;
    filter: none;
  }
}
</style>
