<script setup lang="ts">
import type { CircularTrack } from "@/composables/sequencer/useCircularSequencer";

interface Props {
  centerX: number;
  centerY: number;
  tracks: CircularTrack[];
  styles: any;
  trackSpacing: number;
  compact?: boolean;
}

const props = defineProps<Props>();
</script>

<template>
  <!-- Solfege labels (hidden in compact mode) -->
  <text
    v-if="!compact"
    v-for="(track, index) in tracks"
    :key="`label-${track.id}`"
    :x="
      centerX +
      track.radius +
      trackSpacing * styles.track.labelOffset +
      styles.track.labelOffsetPixels
    "
    :y="centerY + 4"
    :fill="styles.labels.fill"
    :font-size="styles.labels.baseFontSize"
    text-anchor="middle"
    :style="{
      fontSize: `${Math.max(
        styles.labels.minFontSize,
        Math.min(
          styles.labels.maxFontSize,
          trackSpacing * styles.labels.fontSizeRatio
        )
      )}px`,
      fontWeight: styles.labels.fontWeight,
      opacity: styles.labels.opacity,
      textShadow: styles.labels.textShadow,
      fontFamily: styles.labels.fontFamily,
      pointerEvents: 'none',
    }"
  >
    {{ track.solfegeName }}
  </text>
</template>
