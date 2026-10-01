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
 * The crown echoes Knob's Analog Ring LED collar: one hand-cut chad per
 * beat, read left to right above the wrapped control. The collar's tilt and
 * light recipe remain local here; Brass comes from the shared material.
 */
const PEAK_SCALE = 1.12;
const DOWNBEAT_PEAK_SCALE = 1.18;

type Presentation = "hidden" | "rest" | "running";

const beatCount = computed(() => Math.max(1, Math.floor(props.beats)));
const rootRef = ref<HTMLElement | null>(null);
const crownVisible = ref(props.static);
const { clock, presentationEnabled } = useUIBeat();
const consumerEnabled = () => props.enabled && presentationEnabled();
let beatElements: HTMLElement[] = [];
let presentation: Presentation | null = null;
let unsubscribe: (() => void) | undefined;

const classes = computed(() => [
  "beat-indicator",
  { "beat-indicator--static": props.static },
]);

const chads = computed(() => Array.from({ length: beatCount.value }, (_, index) => ({
  index,
  tilt: ((index * 37) % 11) - 5,
})));

const isDownbeat = (index: number) => props.downbeat && index === 0;

function setPresentation(next: Presentation) {
  presentation = next;
  crownVisible.value = next !== "hidden";
  if (!rootRef.value) return;
  rootRef.value.dataset.uiBeatState = next === "running" ? "running" : "idle";
  rootRef.value.dataset.beatTransport = next === "hidden" ? "idle" : "active";
}

function applyStill(next: Exclude<Presentation, "running">) {
  if (presentation === next) return;
  setPresentation(next);
  beatElements.forEach((element, index) => {
    element.classList.toggle("beat-indicator__beat--lit", isDownbeat(index));
    element.style.transform = "scale(1)";
  });
}

function applyFrame(snapshot: UIBeatSnapshot) {
  // Static specimens hold a still bar; otherwise the crown only exists while
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
      element.classList.toggle("beat-indicator__beat--lit", isDownbeat(index));
      element.style.transform = "scale(1)";
      return;
    }

    // The current chad kicks on UIBeat's shared contour. Its small fixed
    // tilt uses individual rotate so the beat scale never straightens it.
    const peakScale = isDownbeat(index) ? DOWNBEAT_PEAK_SCALE : PEAK_SCALE;
    const scale = 1 + (peakScale - 1) * swell;
    element.classList.add("beat-indicator__beat--lit");
    element.style.transform = `scale(${scale.toFixed(3)})`;
  });
}

function collectBeatElements() {
  beatElements = rootRef.value
    ? Array.from(rootRef.value.querySelectorAll<HTMLElement>(".beat-indicator__beat"))
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
  // decide whether the crown is shown, just without beat motion.
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
    <div
      class="beat-indicator__crown"
      role="img"
      :aria-label="ariaLabel"
      :aria-hidden="!crownVisible"
    >
      <span
        v-for="chad in chads"
        :key="chad.index"
        class="beat-indicator__beat"
        :class="{ 'beat-indicator__beat--downbeat brass': isDownbeat(chad.index) }"
        :data-beat="chad.index + 1"
        :style="{ '--beat-tilt': `${chad.tilt}deg` }"
      />
    </div>
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
}

.beat-indicator__crown {
  /* Four 4px chads at an 8px pitch sit above the 32px key, within the
     CodeStrip Bar's block inset. Absolute placement leaves the rail intact. */
  position: absolute;
  inset-block-end: calc(100% + var(--s-2));
  inset-inline: 0;
  display: flex;
  justify-content: center;
  gap: var(--s-2);
  pointer-events: none;
  transition: opacity var(--dur-ui) var(--ease-brush);
}

.beat-indicator[data-beat-transport="idle"] .beat-indicator__crown {
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
  flex: 0 0 var(--s-2);
  inline-size: var(--s-2);
  block-size: var(--s-2);
  border-radius: 0.6px;
  background: var(--ink-5);
  rotate: var(--beat-tilt);
  transition:
    background-color var(--dur-tap) var(--ease-stab),
    box-shadow var(--dur-tap) var(--ease-stab);
  will-change: transform;
}

.beat-indicator__beat--lit {
  background: var(--ivory);
  box-shadow: 0 0 5px color-mix(in srgb, var(--ivory) 60%, transparent);
  transition: none;
}

/* Shared Brass owns the fill and sheen; only the tiny chad's edge and glow
   are fitted locally, without borrowing the Button's lit lip. */
.beat-indicator__beat--downbeat {
  background: var(--brass-fill);
  box-shadow:
    inset 0 0.5px 0 var(--brass-hi),
    inset 0 -0.5px 0 var(--brass-lo),
    0 0 5px color-mix(in srgb, var(--brass) 55%, transparent);
}

.beat-indicator:not([data-ui-beat-state="running"]) .beat-indicator__beat {
  transition: transform var(--dur-ui) var(--ease-brush);
}

.beat-indicator:not([data-ui-beat-state="running"]) .beat-indicator__beat--downbeat::after {
  animation: none;
}

@media (prefers-reduced-motion: reduce) {
  .beat-indicator__beat--downbeat::after { animation: none !important; }
  .beat-indicator__crown,
  .beat-indicator__beat {
    transition: none !important;
  }

  .beat-indicator__beat {
    transform: none !important;
  }
}

@media (forced-colors: active) {
  .beat-indicator__beat {
    forced-color-adjust: none;
    background: GrayText;
    box-shadow: none;
    /* System fills stay in the user's palette throughout a beat handoff. */
    transition: none;
  }

  .beat-indicator__beat--lit { background: CanvasText; }
  .beat-indicator__beat--downbeat { background: Highlight; }
  .beat-indicator__beat--downbeat::after { display: none; }
}
</style>
