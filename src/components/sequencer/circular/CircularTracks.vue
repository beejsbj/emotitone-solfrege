<script setup lang="ts">
import type { CircularTrack } from "@/composables/sequencer/useCircularSequencer";

interface Props {
  centerX: number;
  centerY: number;
  tracks: CircularTrack[];
  styles: any;
  compact?: boolean;
  onTrackHover?: (trackId: string, isHovered: boolean) => void;
  onTrackClick?: (e: MouseEvent, track: CircularTrack) => void;
}

const props = defineProps<Props>();

const handleTrackHover = (trackId: string, isHovered: boolean) => {
  props.onTrackHover?.(trackId, isHovered);
};

const handleTrackClick = (e: MouseEvent, track: CircularTrack) => {
  props.onTrackClick?.(e, track);
};
</script>

<template>
  <!-- Background tracks (hidden in compact mode) -->
  <g v-if="!compact" v-for="track in tracks" :key="`track-${track.id}`">
    <circle
      :cx="centerX"
      :cy="centerY"
      :r="track.radius"
      fill="none"
      :stroke="track.color"
      :stroke-width="
        track.isActive
          ? `calc(var(--track-width) * ${styles.trackCircles.activeStrokeWidthRatio})`
          : track.isHovered
          ? `calc(var(--track-width) * ${styles.trackCircles.hoveredStrokeWidthRatio})`
          : `calc(var(--track-width) * ${styles.trackCircles.baseStrokeWidthRatio})`
      "
      :opacity="
        track.isActive
          ? styles.trackCircles.activeOpacity
          : track.isHovered
          ? styles.trackCircles.hoveredOpacity
          : styles.trackCircles.baseOpacity
      "
      :style="{
        transition: styles.transitions.default,
        cursor: 'pointer',
        filter: `saturate(${styles.trackCircles.saturation})`,
      }"
      @mouseenter="handleTrackHover(track.id, true)"
      @mouseleave="handleTrackHover(track.id, false)"
      @click="handleTrackClick($event, track)"
    />
  </g>
</template>
