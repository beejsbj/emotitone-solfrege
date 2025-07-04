<script setup lang="ts">
import { computed } from "vue";
import type { CircularIndicator } from "@/composables/sequencer/useCircularSequencer";

interface Props {
  indicators: CircularIndicator[];
  styles: any;
  selectedIndicatorId?: string;
  createIndicatorPath: (indicator: CircularIndicator) => string;
  getIndicatorColor: (indicator: CircularIndicator) => string;
  onIndicatorStart?: (
    e: MouseEvent | TouchEvent,
    indicator: CircularIndicator
  ) => void;
  onIndicatorHover?: (indicatorId: string, isHovered: boolean) => void;
}

const props = defineProps<Props>();

const handleIndicatorStart = (
  e: MouseEvent | TouchEvent,
  indicator: CircularIndicator
) => {
  props.onIndicatorStart?.(e, indicator);
};

const handleIndicatorHover = (indicatorId: string, isHovered: boolean) => {
  props.onIndicatorHover?.(indicatorId, isHovered);
};

// Enhance indicators with current selection state
const enhancedIndicators = computed(() => {
  return props.indicators.map((indicator) => ({
    ...indicator,
    isSelected: props.selectedIndicatorId === indicator.id,
  }));
});
</script>

<template>
  <!-- Indicators (sequencer beats) -->
  <g v-for="indicator in enhancedIndicators" :key="indicator.id">
    <!-- Main indicator path -->
    <path
      :d="createIndicatorPath(indicator)"
      :fill="getIndicatorColor(indicator)"
      :stroke="
        indicator.isSelected || indicator.isDragging
          ? indicator.isDragging
            ? styles.indicators.draggingStroke
            : styles.indicators.selectedStroke
          : getIndicatorColor(indicator)
      "
      :stroke-width="
        indicator.isDragging
          ? styles.indicators.draggingStrokeWidth
          : indicator.isSelected
          ? styles.indicators.selectedStrokeWidth
          : indicator.isHovered
          ? styles.indicators.hoveredStrokeWidth
          : styles.indicators.baseStrokeWidth
      "
      :stroke-opacity="
        indicator.isDragging
          ? styles.indicators.draggingStrokeOpacity
          : indicator.isSelected
          ? styles.indicators.selectedStrokeOpacity
          : 1
      "
      :opacity="
        indicator.isDragging
          ? styles.indicators.draggingOpacity
          : indicator.isSelected
          ? styles.indicators.selectedOpacity
          : indicator.isHovered
          ? styles.indicators.hoveredOpacity
          : styles.indicators.baseOpacity
      "
      :class="{
        'indicator-vibrating': indicator.isDragging,
      }"
      :style="{
        transition: indicator.isDragging ? 'none' : styles.transitions.default,
        cursor: 'pointer',
        transformOrigin: 'center',
        filter: `saturate(${styles.indicators.saturation})`,
      }"
      @mousedown="handleIndicatorStart($event, indicator)"
      @touchstart="handleIndicatorStart($event, indicator)"
      @mouseenter="handleIndicatorHover(indicator.id, true)"
      @mouseleave="handleIndicatorHover(indicator.id, false)"
    />
  </g>
</template>

<style scoped>
@keyframes vibrate {
  0%,
  100% {
    transform: translateX(0);
  }
  25% {
    transform: translateX(-0.5px);
  }
  75% {
    transform: translateX(0.5px);
  }
}

.indicator-vibrating {
  animation: vibrate 0.1s infinite;
}
</style>
