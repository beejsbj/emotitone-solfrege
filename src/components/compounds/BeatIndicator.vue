<template>
  <div :class="classes" :aria-label="ariaLabel" role="img">
    <span
      v-for="beat in beatCount"
      :key="beat"
      class="beat-indicator__beat"
      :class="{ 'beat-indicator__beat--downbeat': downbeat && beat === 1 }"
      :style="beatStyle(beat - 1)"
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
import { computed } from "vue";
import Mark from "@/components/primatives/Mark.vue";
import type { MarkName } from "@/components/primatives/marks";

export type BeatIndicatorSize = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    beats?: number;
    marks?: MarkName[];
    size?: BeatIndicatorSize;
    loopDuration?: string;
    downbeat?: boolean;
    static?: boolean;
    ariaLabel?: string;
  }>(),
  {
    beats: 4,
    marks: () => ["disk"],
    size: "md",
    loopDuration: "2s",
    downbeat: true,
    static: false,
    ariaLabel: "Beat indicator",
  },
);

const beatCount = computed(() => Math.max(1, Math.floor(props.beats)));
const usableMarks = computed<MarkName[]>(() => props.marks.length ? props.marks : ["disk"]);

const classes = computed(() => [
  "beat-indicator",
  `beat-indicator--${props.size}`,
  { "beat-indicator--static": props.static },
]);

const markForBeat = (index: number) => usableMarks.value[index % usableMarks.value.length];
const beatStyle = (index: number) => ({
  "--beat-indicator-rate": props.loopDuration,
  "--beat-indicator-delay": `calc(${props.loopDuration} * ${index} / ${beatCount.value})`,
});
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
  animation: beat-indicator-mark var(--beat-indicator-rate) steps(1) infinite;
  animation-delay: var(--beat-indicator-delay);
}

.beat-indicator__beat--downbeat {
  filter: drop-shadow(0 0 7px rgba(224, 169, 58, 0.35));
}

.beat-indicator--static .beat-indicator__beat {
  animation: none;
}

.beat-indicator--static .beat-indicator__beat--downbeat {
  opacity: 1;
  transform: translateY(-1px) scale(1.05);
}

.beat-indicator--sm {
  --beat-indicator-size: 12px;
  --beat-indicator-gap: 6px;
}

.beat-indicator--lg {
  --beat-indicator-size: 28px;
  --beat-indicator-gap: 12px;
}

@keyframes beat-indicator-mark {
  0%, 10% { opacity: 1; transform: translateY(-2px) scale(1.08) rotate(-2deg); }
  12%, 100% { opacity: 0.18; transform: translateY(0) scale(1) rotate(0); }
}

@media (prefers-reduced-motion: reduce) {
  .beat-indicator__beat {
    animation: none !important;
  }

  .beat-indicator__beat--downbeat {
    opacity: 1;
    transform: none;
  }
}
</style>
