<script setup lang="ts">
import type { CircularTrack } from "@/composables/sequencer/useCircularSequencer";

interface Props {
  centerX: number;
  centerY: number;
  tracks: CircularTrack[];
  styles: any;
  steps: number;
  getGridMarkerEnd: (angle: number) => { x: number; y: number };
  getStepPosition: (radius: number, step: number) => { x: number; y: number };
  trackSpacing: number;
  compact?: boolean;
}

const props = defineProps<Props>();
</script>

<template>
  <!-- Quarter and sixteenth markers (hidden in compact mode) -->
  <g v-if="!compact" class="grid-markers">
    <line
      v-for="i in styles.grid.sixteenthSteps"
      :key="`sixteenth-${i}`"
      :x1="centerX"
      :y1="centerY"
      :x2="getGridMarkerEnd(i * 22.5).x"
      :y2="getGridMarkerEnd(i * 22.5).y"
      class="sixteenth-marker"
      :stroke="
        i % 4 === 0
          ? styles.grid.stroke.replace('0.5)', `${styles.grid.quarterOpacity})`)
          : styles.grid.stroke.replace(
              '0.5)',
              `${styles.grid.sixteenthOpacity})`
            )
      "
      :stroke-width="
        i % 4 === 0
          ? styles.grid.quarterStrokeWidth
          : styles.grid.sixteenthStrokeWidth
      "
      :stroke-dasharray="styles.grid.dashArray"
    />
  </g>

  <!-- Step markers for each track -->
  <g v-if="!compact" v-for="track in tracks" :key="`markers-${track.id}`">
    <g v-for="step in steps" :key="`${track.id}-step-${step}`">
      <line
        :x1="
          getStepPosition(
            track.radius - trackSpacing * styles.track.stepMarkerWidthRatio,
            step - 1
          ).x
        "
        :y1="
          getStepPosition(
            track.radius - trackSpacing * styles.track.stepMarkerWidthRatio,
            step - 1
          ).y
        "
        :x2="
          getStepPosition(
            track.radius + trackSpacing * styles.track.stepMarkerWidthRatio,
            step - 1
          ).x
        "
        :y2="
          getStepPosition(
            track.radius + trackSpacing * styles.track.stepMarkerWidthRatio,
            step - 1
          ).y
        "
        :stroke="styles.stepMarkers.stroke"
        :stroke-width="styles.stepMarkers.strokeWidth"
        :opacity="
          track.isHovered
            ? styles.stepMarkers.hoveredOpacity
            : styles.stepMarkers.baseOpacity
        "
        :style="{
          transition: styles.transitions.stepMarker,
          pointerEvents: 'none',
        }"
      />
    </g>
  </g>
</template>
