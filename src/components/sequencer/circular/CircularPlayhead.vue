<script setup lang="ts">
import type { CircularTrack } from "@/composables/sequencer/useCircularSequencer";

interface Props {
  centerX: number;
  centerY: number;
  outerRadius: number;
  tracks: CircularTrack[];
  isPlaying: boolean;
  currentStep: number;
  styles: any;
  trackSpacing: number;
  getStepPosition: (radius: number, step: number) => { x: number; y: number };
  compact?: boolean;
}

const props = defineProps<Props>();
</script>

<template>
  <!-- Current step indicator -->
  <g v-if="isPlaying">
    <!-- Full mode: show on all tracks -->
    <line
      v-if="!compact"
      v-for="track in tracks"
      :key="`current-${track.id}`"
      :x1="
        getStepPosition(
          track.radius - trackSpacing * styles.track.currentStepWidthRatio,
          currentStep
        ).x
      "
      :y1="
        getStepPosition(
          track.radius - trackSpacing * styles.track.currentStepWidthRatio,
          currentStep
        ).y
      "
      :x2="
        getStepPosition(
          track.radius + trackSpacing * styles.track.currentStepWidthRatio,
          currentStep
        ).x
      "
      :y2="
        getStepPosition(
          track.radius + trackSpacing * styles.track.currentStepWidthRatio,
          currentStep
        ).y
      "
      :stroke="styles.currentStep.stroke"
      :stroke-width="styles.currentStep.strokeWidth"
      :opacity="styles.currentStep.opacity"
    />

    <!-- Compact mode: show single clock hand from center to edge -->
    <line
      v-if="compact"
      :x1="centerX"
      :y1="centerY"
      :x2="getStepPosition(outerRadius, currentStep).x"
      :y2="getStepPosition(outerRadius, currentStep).y"
      :stroke="styles.currentStep.stroke"
      :stroke-width="2"
      :opacity="0.9"
    />
  </g>
</template>
