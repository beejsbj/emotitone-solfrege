<script setup lang="ts">
import {
  computed,
  getCurrentInstance,
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
 * Echoes Knob's Digital Arc meter: butt-ended segments over a hairline
 * full-circle track, in a 100-unit viewBox that fills the padded root so the
 * ring scales with whatever control it wraps. Segment 1 is centred at twelve
 * o'clock and the bar reads clockwise.
 */
const brassMaskId = `beat-brass-${getCurrentInstance()!.uid}`;
const STROKE = 8;
const TRACK_STROKE = 2;
const RADIUS = 50 - STROKE / 2;
const MAX_GAP_DEGREES = 12;
const DIM_OPACITY = 0.2;
const PEAK_SCALE = 1.12;
const DOWNBEAT_PEAK_SCALE = 1.18;

type Presentation = "hidden" | "rest" | "running";

const beatCount = computed(() => Math.max(1, Math.floor(props.beats)));
const rootRef = ref<HTMLElement | null>(null);
const ringVisible = ref(props.static);
const { clock, presentationEnabled } = useUIBeat();
const consumerEnabled = () => props.enabled && presentationEnabled();
let beatElements: SVGElement[] = [];
let presentation: Presentation | null = null;
let unsubscribe: (() => void) | undefined;

const classes = computed(() => [
  "beat-indicator",
  { "beat-indicator--static": props.static },
]);

const point = (degrees: number) => {
  const radians = (degrees * Math.PI) / 180;
  return `${(50 + RADIUS * Math.cos(radians)).toFixed(3)} ${(50 + RADIUS * Math.sin(radians)).toFixed(3)}`;
};

const segments = computed(() => {
  const count = beatCount.value;
  if (count === 1) {
    return [
      `M ${point(-90)} A ${RADIUS} ${RADIUS} 0 1 1 ${point(90)} A ${RADIUS} ${RADIUS} 0 1 1 ${point(-90)}`,
    ];
  }

  const span = 360 / count;
  const sweep = span - Math.min(MAX_GAP_DEGREES, span * 0.25);
  return Array.from({ length: count }, (_, index) => {
    const middle = -90 + index * span;
    const start = middle - sweep / 2;
    const end = middle + sweep / 2;
    return `M ${point(start)} A ${RADIUS} ${RADIUS} 0 ${sweep > 180 ? 1 : 0} 1 ${point(end)}`;
  });
});

// Fit the material to the arc, so its full highlight crosses the metal rather
// than being spread over the empty centre of the ring.
const brassBounds = computed(() => {
  if (beatCount.value === 1) return { x: 0, y: 0, width: 100, height: 100 };
  const span = 360 / beatCount.value;
  const halfSweep = (span - Math.min(MAX_GAP_DEGREES, span * 0.25)) * Math.PI / 360;
  const halfWidth = RADIUS * Math.sin(halfSweep) + STROKE / 2;
  return { x: 50 - halfWidth, y: 0, width: halfWidth * 2,
    height: RADIUS * (1 - Math.cos(halfSweep)) + STROKE };
});

const isDownbeat = (index: number) => props.downbeat && index === 0;

function setPresentation(next: Presentation) {
  presentation = next;
  ringVisible.value = next !== "hidden";
  if (!rootRef.value) return;
  rootRef.value.dataset.uiBeatState = next === "running" ? "running" : "idle";
  rootRef.value.dataset.beatTransport = next === "hidden" ? "idle" : "active";
}

function applyStill(next: Exclude<Presentation, "running">) {
  if (presentation === next) return;
  setPresentation(next);
  beatElements.forEach((element, index) => {
    element.style.opacity = isDownbeat(index) ? "1" : String(DIM_OPACITY);
    element.style.transform = "scale(1)";
  });
}

function applyFrame(snapshot: UIBeatSnapshot) {
  // Static specimens hold a still bar; otherwise the ring only exists while
  // the transport is active, and only moves while UIBeat presents.
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

  beatElements.forEach((element, index) => {
    if (index !== activeIndex) {
      element.style.opacity = isDownbeat(index) ? "1" : String(DIM_OPACITY);
      element.style.transform = "scale(1)";
      return;
    }

    // The lit segment kicks outward from the ring's centre, away from the
    // wrapped control, on the shared UIBeat contour; its material stays fully opaque.
    const peakScale = isDownbeat(index) ? DOWNBEAT_PEAK_SCALE : PEAK_SCALE;
    const scale = 1 + (peakScale - 1) * swell;
    element.style.opacity = "1";
    element.style.transform = `scale(${scale.toFixed(3)})`;
  });
}

function collectBeatElements() {
  beatElements = rootRef.value
    ? Array.from(rootRef.value.querySelectorAll<SVGElement>(".beat-indicator__beat"))
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
  // decide whether the ring is shown, just without beat motion.
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
      class="beat-indicator__ring"
      viewBox="0 0 100 100"
      role="img"
      :aria-label="ariaLabel"
      :aria-hidden="!ringVisible"
    >
      <defs>
        <mask :id="brassMaskId" maskUnits="userSpaceOnUse" x="0" y="0" width="100" height="100">
          <path :d="segments[0]" fill="none" stroke="white" :stroke-width="STROKE" />
        </mask>
      </defs>
      <circle
        class="beat-indicator__track"
        cx="50"
        cy="50"
        :r="RADIUS"
        :stroke-width="TRACK_STROKE"
      />
      <g
        v-for="(d, index) in segments"
        :key="index"
        class="beat-indicator__beat"
        :class="{ 'beat-indicator__beat--downbeat': isDownbeat(index) }"
        :data-beat="index + 1"
      >
        <path class="beat-indicator__stroke" :d="d" :stroke-width="STROKE" />
        <foreignObject
          v-if="isDownbeat(index)"
          class="beat-indicator__metal"
          v-bind="brassBounds"
          :mask="`url(#${brassMaskId})`"
        >
          <div xmlns="http://www.w3.org/1999/xhtml" class="beat-indicator__brass brass" />
        </foreignObject>
      </g>
    </svg>
    <div class="beat-indicator__content">
      <slot />
    </div>
  </div>
</template>

<style scoped>
.beat-indicator {
  /* Air between the wrapped control's edge and the ring. Consumers read it
     to overhang an inset without growing their layout. */
  --beat-indicator-gap: 6px;

  position: relative;
  display: inline-grid;
  place-items: center;
  box-sizing: border-box;
  padding: var(--beat-indicator-gap);
}

.beat-indicator__ring {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
  pointer-events: none;
  transition: opacity var(--dur-ui) var(--ease-brush);
}

.beat-indicator[data-beat-transport="idle"] .beat-indicator__ring {
  opacity: 0;
}

.beat-indicator__content {
  position: relative;
  display: grid;
  place-items: center;
  min-inline-size: var(--beat-indicator-hole, 32px);
  min-block-size: var(--beat-indicator-hole, 32px);
}

.beat-indicator__track,
.beat-indicator__beat {
  fill: none;
  color: var(--ivory);
  stroke: currentColor;
  stroke-linecap: butt;
}

.beat-indicator__track {
  opacity: 0.4;
}

.beat-indicator__beat {
  opacity: 0.2;
  transform-box: view-box;
  transform-origin: 50% 50%;
  filter: drop-shadow(0 0 3px color-mix(in srgb, currentColor 55%, transparent));
  will-change: transform, opacity;
}

.beat-indicator__brass {
  width: 100%;
  height: 100%;
  box-shadow: none;
}

.beat-indicator__beat--downbeat .beat-indicator__stroke {
  visibility: hidden;
}

.beat-indicator__beat--downbeat {
  color: var(--brass);
  filter:
    drop-shadow(0 -0.6px 0 var(--brass-hi))
    drop-shadow(0 0.6px 0 var(--brass-lo))
    drop-shadow(0 0 5px color-mix(in srgb, var(--brass) 78%, transparent));
}

.beat-indicator:not([data-ui-beat-state="running"]) .beat-indicator__beat {
  transition:
    transform var(--dur-ui) var(--ease-brush);
}

.beat-indicator:not([data-ui-beat-state="running"]) .beat-indicator__brass::after {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .beat-indicator__brass::after { animation: none !important; }
  .beat-indicator__ring,
  .beat-indicator__beat {
    transition: none !important;
  }

  .beat-indicator__beat {
    opacity: 0.2 !important;
    transform: none !important;
  }

  .beat-indicator__beat--downbeat {
    opacity: 1 !important;
    transform: none !important;
  }
}

@media (forced-colors: active) {
  .beat-indicator__track,
  .beat-indicator__beat {
    color: CanvasText;
    stroke: currentColor !important;
    filter: none;
  }

  .beat-indicator__beat--downbeat { color: Highlight; }
  .beat-indicator__beat--downbeat .beat-indicator__stroke { visibility: visible; }
  .beat-indicator__metal { display: none; }
}
</style>
