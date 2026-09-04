<template>
  <div :class="classes" :aria-label="ariaLabel" role="img">
    <span
      v-for="cell in cellCount"
      :key="cell"
      :class="cellClasses(cell - 1)"
      :style="cellStyle(cell - 1)"
    ></span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type BeatIndicatorSize = "sm" | "md" | "lg";

const props = withDefaults(
  defineProps<{
    beats?: number;
    size?: BeatIndicatorSize;
    loopDuration?: string;
    downbeat?: boolean;
    static?: boolean;
    ariaLabel?: string;
  }>(),
  {
    beats: 4,
    size: "md",
    loopDuration: "2s",
    downbeat: true,
    static: false,
    ariaLabel: "Beat indicator",
  },
);

const cellCount = computed(() => Math.max(1, Math.floor(props.beats)));

const classes = computed(() => [
  "beat-indicator",
  `beat-indicator--${props.size}`,
  {
    "beat-indicator--even": !props.downbeat,
    "beat-indicator--static": props.static,
  },
]);

const cellClasses = (index: number) => [
  "beat-indicator__cell",
  {
    "beat-indicator__cell--downbeat": props.downbeat && index === 0,
  },
];

const cellStyle = (index: number) => ({
  "--beat-indicator-rate": props.loopDuration,
  "--beat-indicator-delay": `calc(${props.loopDuration} * ${index} / ${cellCount.value})`,
});
</script>

<style scoped>
.beat-indicator {
  display: inline-flex;
  align-items: center;
  gap: var(--beat-indicator-gap, 8px);
}

.beat-indicator__cell {
  width: var(--beat-indicator-cell, 18px);
  height: var(--beat-indicator-cell, 18px);
  border: 1px solid var(--hairline);
  background: transparent;
  animation: beat-cell var(--beat-indicator-rate) steps(1) infinite;
  animation-delay: var(--beat-indicator-delay);
}

.beat-indicator__cell--downbeat {
  animation-name: beat-down;
}

.beat-indicator--even .beat-indicator__cell--downbeat {
  animation-name: beat-cell;
}

.beat-indicator--static .beat-indicator__cell {
  animation: none;
}

.beat-indicator--static .beat-indicator__cell--downbeat {
  background: var(--brass);
  border-color: var(--brass);
}

.beat-indicator--sm {
  --beat-indicator-cell: 12px;
  --beat-indicator-gap: 6px;
}

.beat-indicator--lg {
  --beat-indicator-cell: 28px;
  --beat-indicator-gap: 12px;
}

@media (prefers-reduced-motion: reduce) {
  .beat-indicator__cell {
    animation: none !important;
  }

  .beat-indicator__cell--downbeat {
    background: var(--brass);
    border-color: var(--brass);
  }
}
</style>
