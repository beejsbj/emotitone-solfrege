<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { useSequencerStore } from "@/stores/sequencer";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import { useSequencerInteraction } from "@/composables/sequencer/useSequencerInteraction";
import { useCircularSequencer } from "@/composables/sequencer/useCircularSequencer";
import type { SequencerBeat } from "@/types/music";

// Components
import CircularGrid from "./sequencer/circular/CircularGrid.vue";
import CircularTracks from "./sequencer/circular/CircularTracks.vue";
import CircularIndicators from "./sequencer/circular/CircularIndicators.vue";
import CircularPlayhead from "./sequencer/circular/CircularPlayhead.vue";
import CircularLabels from "./sequencer/circular/CircularLabels.vue";

// Props
interface Props {
  sequencerId?: string;
  compact?: boolean;
  expanded?: boolean;
}

const props = defineProps<Props>();
const { compact, expanded } = props;

// Store
const sequencerStore = useSequencerStore();

// Composables
const {
  styles,
  tracks,
  indicators,
  currentSequencer,
  trackSpacing,
  centerX,
  centerY,
  outerRadius,
  innerRadius,
  isPlaying,
  currentStep,
  steps,
  angleSteps,
  getGridMarkerEnd,
  getAngleFromEvent,
  snapToStep,
  constrainAngles,
  getStepPosition,
  createIndicatorPath,
  getIndicatorColor,
  handleTrackHover,
  handleTrackDoubleClick,
} = useCircularSequencer(props.sequencerId, compact, expanded);

const {
  isDragging,
  selectedIndicator,
  startDrag,
  handleMove,
  handleEnd,
  cleanup,
} = useSequencerInteraction();

// Refs
const svgRef = ref<SVGElement | null>(null);

// Track last drag values for snap detection
const lastDragValues = ref<{
  step?: number;
  duration?: number;
}>({});

// Event handlers
const handleTrackClick = (e: MouseEvent, track: any) => {
  if (isDragging.value || !props.sequencerId || compact) return;

  e.preventDefault();
  e.stopPropagation();

  if (!svgRef.value) return;

  // Use composable's double-click logic
  const beatAdded = handleTrackDoubleClick(
    e,
    track,
    svgRef.value,
    (newBeat) => {
      sequencerStore.addBeatToSequencer(props.sequencerId!, newBeat);
      triggerUIHaptic();
    }
  );
};

const handleIndicatorStart = (e: MouseEvent | TouchEvent, indicator: any) => {
  if (compact) return; // Disable interaction in compact mode

  // Reset drag tracking values for fresh haptic feedback
  lastDragValues.value = {};

  // Start drag with custom move handler
  startDrag(e, indicator, removeIndicator);

  // Set up custom move handling for circular sequencer
  if ("touches" in e) {
    document.addEventListener("touchmove", handleCustomMove, {
      passive: false,
    });
  } else {
    document.addEventListener("mousemove", handleCustomMove);
  }
};

const removeIndicator = (indicatorId: string) => {
  if (!props.sequencerId) return;

  sequencerStore.removeBeatFromSequencer(props.sequencerId, indicatorId);
  triggerUIHaptic();
};

const handleIndicatorHover = (indicatorId: string, isHovered: boolean) => {
  // Update indicator hover state if needed
  // This could be enhanced with visual feedback
};

// Custom move handler for circular sequencer specifics
const handleCustomMove = (e: MouseEvent | TouchEvent) => {
  const moveData = handleMove(e);
  if (!moveData || !selectedIndicator.value || !props.sequencerId) return;

  const { deltaX, deltaY, moved, horizontalSensitivity, durationSensitivity } =
    moveData;

  if (!moved) return;

  // Horizontal movement = position along track
  // Vertical movement = duration change
  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal movement - move along track
    const angleChange = deltaX * horizontalSensitivity;
    const newStartAngle =
      (selectedIndicator.value as any).startAngle + angleChange;
    const duration =
      ((selectedIndicator.value as any).endAngle -
        (selectedIndicator.value as any).startAngle) /
      angleSteps.value;
    const constrained = constrainAngles(
      newStartAngle,
      newStartAngle + duration * angleSteps.value
    );

    const newStep = Math.round(constrained.startAngle / angleSteps.value);

    // Check if step actually changed (snapped to new position)
    if (lastDragValues.value.step !== newStep) {
      lastDragValues.value.step = newStep;
      triggerUIHaptic(); // Haptic feedback on snap
    }

    sequencerStore.updateBeatInSequencer(
      props.sequencerId,
      selectedIndicator.value.id,
      { step: newStep }
    );
  } else {
    // Vertical movement - change duration
    const durationChange = -deltaY * durationSensitivity; // Negative because up = longer
    const currentDuration =
      ((selectedIndicator.value as any).endAngle -
        (selectedIndicator.value as any).startAngle) /
      angleSteps.value;
    const newDuration = Math.max(
      1,
      Math.round(currentDuration + durationChange)
    );

    // Check if duration actually changed (snapped to new value)
    if (lastDragValues.value.duration !== newDuration) {
      lastDragValues.value.duration = newDuration;
      triggerUIHaptic(); // Haptic feedback on snap
    }

    sequencerStore.updateBeatInSequencer(
      props.sequencerId,
      selectedIndicator.value.id,
      { duration: newDuration }
    );
  }
};

const handleContainerClick = () => {
  if (compact) {
    sequencerStore.setActiveSequencer(props.sequencerId || "");
    triggerUIHaptic();
  }
};

// Custom interaction logic for circular sequencer specifics

// Lifecycle
onMounted(() => {
  // Global event listeners are managed by useSequencerInteraction
});

onUnmounted(() => {
  cleanup();
});
</script>

<template>
  <div
    class="relative transition-opacity duration-300"
    :class="compact ? 'p-0' : 'p-1'"
    :style="{
      '--track-width': `calc((min(90vw, 90vh, 400px) - 120px) / 7 * ${styles.trackCircles.baseStrokeWidthRatio})`,
    }"
  >
    <svg
      ref="svgRef"
      :viewBox="styles.dimensions.viewBox"
      class="w-full h-auto block rounded-full border touch-none select-none"
      :class="compact ? 'cursor-pointer' : 'cursor-crosshair'"
      :style="{
        background: compact
          ? 'rgba(31, 41, 55, 0.8)'
          : styles.container.background,
        borderColor: compact
          ? 'rgba(255, 255, 255, 0.1)'
          : 'rgba(255, 255, 255, 0.2)',
      }"
      preserveAspectRatio="xMidYMid meet"
      @click="handleContainerClick"
    >
      <!-- Grid and step markers -->
      <CircularGrid
        :centerX="centerX"
        :centerY="centerY"
        :tracks="tracks"
        :styles="styles"
        :steps="steps"
        :getGridMarkerEnd="getGridMarkerEnd"
        :getStepPosition="getStepPosition"
        :trackSpacing="trackSpacing"
        :compact="compact"
      />

      <!-- Background track circles -->
      <CircularTracks
        :centerX="centerX"
        :centerY="centerY"
        :tracks="tracks"
        :styles="styles"
        :compact="compact"
        :onTrackHover="handleTrackHover"
        :onTrackClick="handleTrackClick"
      />

      <!-- Current step playhead -->
      <CircularPlayhead
        :centerX="centerX"
        :centerY="centerY"
        :outerRadius="outerRadius"
        :tracks="tracks"
        :isPlaying="isPlaying"
        :currentStep="currentStep"
        :styles="styles"
        :trackSpacing="trackSpacing"
        :getStepPosition="getStepPosition"
        :compact="compact"
      />

      <!-- Beat indicators -->
      <CircularIndicators
        :indicators="indicators"
        :styles="styles"
        :selectedIndicatorId="selectedIndicator?.id"
        :createIndicatorPath="createIndicatorPath"
        :getIndicatorColor="getIndicatorColor"
        :onIndicatorStart="handleIndicatorStart"
        :onIndicatorHover="handleIndicatorHover"
      />

      <!-- Solfege labels -->
      <CircularLabels
        :centerX="centerX"
        :centerY="centerY"
        :tracks="tracks"
        :styles="styles"
        :trackSpacing="trackSpacing"
        :compact="compact"
      />
    </svg>
  </div>
</template>

<!-- No scoped styles needed - using Tailwind utilities and inline styles -->
