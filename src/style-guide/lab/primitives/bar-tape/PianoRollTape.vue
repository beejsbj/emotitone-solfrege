<script setup lang="ts">
import { computed } from "vue";
import type { LabBarTapeSegment } from "@/types/primitivesLab";

/*
 * Direction A · Piano Roll. The tape grows from 1px to a 6px band and each
 * note becomes a 2px dash placed at its pitch height, so the strip draws the
 * melody's contour as well as its rhythm and colour — a player-piano roll at
 * thumbnail scale.
 */
const MINIMUM_VISIBLE_DURATION = 50;
const props = withDefaults(defineProps<{ segments: LabBarTapeSegment[]; ariaLabel?: string }>(), {
  ariaLabel: "Pattern note timeline",
});

const range = computed(() => {
  const heights = props.segments.map((segment) => segment.height);
  const low = Math.min(...heights);
  const high = Math.max(...heights);
  return { low, span: Math.max(1, high - low) };
});

const style = (segment: LabBarTapeSegment) => ({
  backgroundColor: segment.color,
  flexGrow: Math.max(segment.durationMs, MINIMUM_VISIBLE_DURATION),
  "--rise": (segment.height - range.value.low) / range.value.span,
});
</script>

<template>
  <div class="roll" :aria-label="ariaLabel">
    <span v-for="(segment, index) in segments" :key="index" class="roll__slot" aria-hidden="true">
      <span class="roll__note" :style="style(segment)" />
    </span>
  </div>
</template>

<style scoped>
.roll {
  display: flex;
  gap: 1px;
  height: 6px;
  overflow: hidden;
  background: var(--ink);
}

.roll__slot { display: contents; }

.roll__note {
  display: block;
  flex-basis: 0;
  flex-shrink: 1;
  min-width: 2px;
  height: 2px;
  align-self: flex-end;
  translate: 0 calc(var(--rise) * -4px);
}
</style>
