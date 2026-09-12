<template>
  <div
    ref="rootRef"
    :class="classes"
    :aria-label="ariaLabel"
    data-ui-beat-state="idle"
    role="img"
  >
    <span
      v-for="beat in beatCount"
      :key="beat"
      class="beat-indicator__beat"
      :class="{ 'beat-indicator__beat--downbeat': downbeat && beat === 1 }"
      :data-mark="markForBeat(beat - 1)"
    >
      <Mark
        :name="markForBeat(beat - 1)"
        :tone="downbeat && beat === 1 ? 'brass' : 'ivory'"
        size="100%"
      />
    </span>
  </div>
</template>

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

export type BeatIndicatorSize = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    beats?: number;
    marks?: MarkName[];
    size?: BeatIndicatorSize;
    downbeat?: boolean;
    static?: boolean;
    enabled?: boolean;
    ariaLabel?: string;
  }>(),
  {
    beats: 4,
    marks: () => ["square"],
    size: "md",
    downbeat: true,
    static: false,
    enabled: true,
    ariaLabel: "Beat indicator",
  },
);

const beatCount = computed(() => Math.max(1, Math.floor(props.beats)));
const usableMarks = computed<MarkName[]>(() => props.marks.length ? props.marks : ["square"]);
const rootRef = ref<HTMLElement | null>(null);
const { clock, presentationEnabled } = useUIBeat();
const consumerEnabled = () => props.enabled && presentationEnabled();
let beatElements: HTMLElement[] = [];
let unsubscribe: (() => void) | undefined;

const classes = computed(() => [
  "beat-indicator",
  `beat-indicator--${props.size}`,
  { "beat-indicator--static": props.static },
]);

const markForBeat = (index: number) => usableMarks.value[index % usableMarks.value.length];

function applyRestState() {
  if (rootRef.value) rootRef.value.dataset.uiBeatState = "idle";
  beatElements.forEach((element, index) => {
    const holdsDownbeat = props.downbeat && index === 0;
    element.style.opacity = holdsDownbeat ? "1" : "0.18";
    element.style.transform = holdsDownbeat
      ? "scale(1)"
      : "scale(0.78)";
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
      element.style.opacity = "0.14";
      element.style.transform = "scale(0.78)";
      return;
    }

    const isDownbeat = props.downbeat && index === 0;
    const peakScale = isDownbeat ? 1.52 : 1.42;
    const scale = 0.78 + (peakScale - 0.78) * swell;
    element.style.opacity = (0.22 + swell * 0.78).toFixed(3);
    element.style.transform = `scale(${scale.toFixed(3)})`;
  });
}

function collectBeatElements() {
  beatElements = rootRef.value
    ? Array.from(rootRef.value.querySelectorAll<HTMLElement>(".beat-indicator__beat"))
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

<style scoped>
.beat-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--beat-indicator-gap, 8px);
}

.beat-indicator__beat {
  display: block;
  width: var(--beat-indicator-size, 18px);
  height: var(--beat-indicator-size, 18px);
  opacity: 0.18;
  transform-origin: 50% 60%;
  will-change: transform, opacity;
}

.beat-indicator__beat--downbeat {
  filter: drop-shadow(0 0 7px rgba(224, 169, 58, 0.35));
}

.beat-indicator:not([data-ui-beat-state="running"]) .beat-indicator__beat {
  transition:
    transform var(--dur-ui) var(--ease-brush),
    opacity var(--dur-ui) var(--ease-brush);
}

.beat-indicator--sm {
  --beat-indicator-size: 12px;
  --beat-indicator-gap: 6px;
}

.beat-indicator--lg {
  --beat-indicator-size: 28px;
  --beat-indicator-gap: 12px;
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
</style>
