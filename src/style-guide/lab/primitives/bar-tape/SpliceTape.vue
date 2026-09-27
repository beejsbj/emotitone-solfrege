<script setup lang="ts">
import type { LabBarTapeSegment } from "@/types/primitivesLab";

/*
 * Direction B · Splice. Reel-to-reel tape spliced by hand: a 3px band where
 * every note is its own piece of coloured tape, cut on the diagonal and butted
 * against the next with a hairline of Ink. Rhythm reads as the cuts.
 */
const MINIMUM_VISIBLE_DURATION = 50;
withDefaults(defineProps<{ segments: LabBarTapeSegment[]; ariaLabel?: string }>(), {
  ariaLabel: "Pattern note timeline",
});
</script>

<template>
  <div class="splice" :aria-label="ariaLabel">
    <span
      v-for="(segment, index) in segments"
      :key="index"
      class="splice__piece"
      :style="{ backgroundColor: segment.color, flexGrow: Math.max(segment.durationMs, MINIMUM_VISIBLE_DURATION) }"
      aria-hidden="true"
    />
  </div>
</template>

<style scoped>
.splice {
  display: flex;
  height: 3px;
  overflow: hidden;
  background: var(--ink);
}

.splice__piece {
  display: block;
  flex-basis: 0;
  flex-shrink: 1;
  min-width: 3px;
  height: 100%;
  margin-inline-end: -2px;
  /* Diagonal splice: 3px of slope across the 3px band, 1px Ink seam. */
  clip-path: polygon(3px 0, 100% 0, calc(100% - 3px) 100%, 0 100%);
  padding-inline-end: 1px;
  background-clip: content-box;
}

.splice__piece:first-child { clip-path: polygon(0 0, 100% 0, calc(100% - 3px) 100%, 0 100%); }
.splice__piece:last-child { margin-inline-end: 0; clip-path: polygon(3px 0, 100% 0, 100% 100%, 0 100%); }
</style>
