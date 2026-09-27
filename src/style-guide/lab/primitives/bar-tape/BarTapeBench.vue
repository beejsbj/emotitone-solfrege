<script setup lang="ts">
import type { Component } from "vue";
import { useMusicColor } from "@/composables/useMusicColor";
import { defaultPatterns } from "@/data/patterns";
import type { Pattern } from "@/types/patterns";
import type { LabBarTapeSegment } from "@/types/primitivesLab";
import LabCell from "../LabCell.vue";

/** Real built-in patterns, at true scale on a PatternStrip-sized row and under a loupe. */
defineProps<{ component: Component }>();

const { getStaticPrimaryColorByScaleIndex } = useMusicColor();
const patterns = defaultPatterns.slice(0, 3);
const timeline = (pattern: Pattern): LabBarTapeSegment[] => pattern.notes.map((note) => ({
  color: getStaticPrimaryColorByScaleIndex(note.scaleIndex, pattern.mode, pattern.key, note.octave),
  durationMs: note.duration,
  height: note.octave * 7 + Math.max(0, note.scaleIndex),
}));
const timelines = patterns.map(timeline);
</script>

<template>
  <div class="plab-bench plab-bench--stack">
    <LabCell caption="True scale · across the top edge of a 51.2px PatternStrip row" wide>
      <span v-for="(segments, index) in timelines" :key="index" class="plab-strip" :style="{ '--spine': segments[0]?.color }">
        <span class="plab-strip__tape"><component :is="component" :segments="segments" /></span>
        <span class="plab-strip__title">{{ patterns[index].name }}</span>
      </span>
    </LabCell>
    <LabCell caption="Loupe · the same tape stretched 6× in height" wide>
      <span class="plab-loupe"><component :is="component" :segments="timelines[1]" /></span>
    </LabCell>
  </div>
</template>

<style scoped>
.plab-bench--stack :deep(.plab-cell__stage) { display: grid; gap: var(--s-4); justify-content: stretch; }

.plab-strip {
  position: relative;
  display: flex;
  align-items: center;
  height: 51.2px;
  padding-inline: 14px;
  background: var(--ink-3);
  box-shadow: inset 4px 0 0 var(--spine);
}

.plab-strip__tape { position: absolute; inset: 0 0 auto; }

.plab-strip__title {
  color: var(--ivory);
  font: 700 15px/1 var(--font-display);
  letter-spacing: .06em;
  text-transform: uppercase;
}

.plab-loupe {
  display: block;
  margin-bottom: 36px;
  transform: scaleY(6);
  transform-origin: top;
}
</style>
