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
import { useUIBeatClock, type UIBeatSnapshot } from "@/composables/useUIBeat";
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
    marks: () => ["disk"],
    size: "md",
    downbeat: true,
    static: false,
    enabled: true,
    ariaLabel: "Beat indicator",
  },
);

const beatCount = computed(() => Math.max(1, Math.floor(props.beats)));
const usableMarks = computed<MarkName[]>(() => props.marks.length ? props.marks : ["disk"]);
const rootRef = ref<HTMLElement | null>(null);
const clock = useUIBeatClock();
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
      ? "translateY(-1px) scale(1.05)"
      : "translateY(0) scale(1) rotate(0deg)";
  });
}

function applyFrame(snapshot: UIBeatSnapshot) {
  if (
    !props.enabled ||
    props.static ||
    !snapshot.presenting ||
    snapshot.beatIndex === null
  ) {
    applyRestState();
    return;
  }

  if (rootRef.value) rootRef.value.dataset.uiBeatState = "running";
  const activeIndex = snapshot.beatIndex % beatCount.value;
  const attack = Math.max(0, 1 - snapshot.beatPhase / 0.34);
  const envelope = attack * attack;

  beatElements.forEach((element, index) => {
    if (index !== activeIndex) {
      element.style.opacity = "0.16";
      element.style.transform = "translateY(0) scale(1) rotate(0deg)";
      return;
    }

    const direction = index % 2 === 0 ? -1 : 1;
    element.style.opacity = String(0.34 + envelope * 0.66);
    element.style.transform = [
      `translateY(${-2.2 * envelope}px)`,
      `scale(${1 + 0.12 * envelope})`,
      `rotate(${direction * 1.8 * envelope}deg)`,
    ].join(" ");
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

  if (!props.enabled || props.static || !rootRef.value) {
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
  [() => props.enabled, () => props.static],
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
    opacity: 1;
    transform: none;
  }
}
</style>
