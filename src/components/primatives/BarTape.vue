<template>
  <div class="bar-tape" :aria-label="ariaLabel">
    <span
      v-for="(segment, segmentIndex) in segments"
      :key="segmentIndex"
      class="bar-tape__segment"
      :style="segmentStyle(segment)"
      aria-hidden="true"
    ></span>
  </div>
</template>

<script setup lang="ts">
import type { CSSProperties } from "vue";

export interface BarTapeSegment {
  color: string;
  durationMs: number;
}

const MINIMUM_VISIBLE_DURATION = 50;

withDefaults(
  defineProps<{
    segments: BarTapeSegment[];
    ariaLabel?: string;
  }>(),
  {
    ariaLabel: "Pattern note timeline",
  },
);

const segmentStyle = (segment: BarTapeSegment): CSSProperties => ({
  backgroundColor: segment.color,
  flexGrow: Math.max(segment.durationMs, MINIMUM_VISIBLE_DURATION),
});
</script>

<style scoped>
.bar-tape {
  display: flex;
  height: 4px;
  overflow: hidden;
  background: var(--ink);
}

.bar-tape__segment {
  display: block;
  min-width: 2px;
  height: 100%;
  flex-basis: 0;
  flex-shrink: 1;
}
</style>
