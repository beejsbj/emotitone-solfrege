<template>
  <div class="circular-sequencer-container p-1">
    <svg
      ref="svgRef"
      viewBox="0 0 400 400"
      class="sequencer-svg w-full h-auto block"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- Quarter and sixteenth markers -->
      <g class="grid-markers">
        <line
          v-for="i in 16"
          :key="`sixteenth-${i}`"
          :x1="centerX"
          :y1="centerY"
          :x2="getGridMarkerEnd(i * 22.5).x"
          :y2="getGridMarkerEnd(i * 22.5).y"
          class="sixteenth-marker"
          :stroke="
            i % 4 === 0 ? 'rgba(255,255,255,0.8)' : 'rgba(255,255,255,0.3)'
          "
          :stroke-width="i % 4 === 0 ? 0.8 : 0.5"
          stroke-dasharray="2 4"
        />
      </g>

      <!-- Background tracks -->
      <g v-for="track in tracks" :key="track.id">
        <circle
          :cx="centerX"
          :cy="centerY"
          :r="track.radius"
          class="track-circle"
          :class="{
            active: track.isActive,
            hovered: track.isHovered,
          }"
          :stroke="track.color"
          @mouseenter="handleTrackHover(track.id, true)"
          @mouseleave="handleTrackHover(track.id, false)"
          @click="handleTrackClick($event, track)"
        />

        <!-- Step markers for each track -->
        <g v-for="step in steps" :key="`${track.id}-step-${step}`">
          <line
            :x1="getStepPosition(track.radius - trackSpacing * 0.3, step - 1).x"
            :y1="getStepPosition(track.radius - trackSpacing * 0.3, step - 1).y"
            :x2="getStepPosition(track.radius + trackSpacing * 0.3, step - 1).x"
            :y2="getStepPosition(track.radius + trackSpacing * 0.3, step - 1).y"
            stroke="rgba(255,255,255,0.1)"
            stroke-width="0.5"
            class="step-marker"
          />
        </g>
      </g>

      <!-- Current step indicator -->
      <g v-if="isPlaying">
        <line
          v-for="track in tracks"
          :key="`current-${track.id}`"
          :x1="
            getStepPosition(track.radius - trackSpacing * 0.4, currentStep).x
          "
          :y1="
            getStepPosition(track.radius - trackSpacing * 0.4, currentStep).y
          "
          :x2="
            getStepPosition(track.radius + trackSpacing * 0.4, currentStep).x
          "
          :y2="
            getStepPosition(track.radius + trackSpacing * 0.4, currentStep).y
          "
          stroke="white"
          stroke-width="2"
          opacity="0.9"
        />
      </g>

      <!-- Indicators (sequencer beats) -->
      <g v-for="indicator in indicators" :key="indicator.id">
        <!-- Main indicator path -->
        <path
          :d="createIndicatorPath(indicator)"
          class="indicator-path"
          :class="{
            dragging: indicator.isDragging,
            selected: indicator.isSelected,
            hovered: indicator.isHovered,
          }"
          :fill="getIndicatorColor(indicator)"
          :stroke="getIndicatorColor(indicator)"
          @mousedown="handleIndicatorStart($event, indicator)"
          @touchstart="handleIndicatorStart($event, indicator)"
          @mouseenter="handleIndicatorHover(indicator.id, true)"
          @mouseleave="handleIndicatorHover(indicator.id, false)"
        />
      </g>

      <!-- Solfege labels -->
      <text
        v-for="(track, index) in tracks"
        :key="`label-${track.id}`"
        :x="centerX + track.radius + trackSpacing * 0.8 - 16"
        :y="centerY + 4"
        fill="white"
        font-size="11"
        text-anchor="middle"
        class="solfege-label"
        :style="{
          fontSize: `${Math.max(8, Math.min(11, trackSpacing * 0.6))}px`,
        }"
      >
        {{ track.solfegeName }}
      </text>
    </svg>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import type { SequencerBeat } from "@/types/music";

// Interfaces for the visual system
interface CircularTrack {
  id: string;
  radius: number;
  solfegeName: string;
  solfegeIndex: number;
  color: string;
  isActive: boolean;
  isHovered: boolean;
}

interface CircularIndicator {
  id: string;
  trackId: string;
  startAngle: number;
  endAngle: number;
  isDragging: boolean;
  isSelected: boolean;
  isHovered: boolean;
  solfegeName: string;
  solfegeIndex: number;
  octave: number;
}

// Store and composables
const musicStore = useMusicStore();
const { getPrimaryColor } = useColorSystem();

// SVG dimensions - Mobile-first sizing
const centerX = 200;
const centerY = 200;
const outerRadius = 190;
const innerRadius = 60;
const trackSpacing = (outerRadius - innerRadius) / 7;

// Refs
const svgRef = ref<SVGElement | null>(null);

// Interaction state (mobile-first approach)
const isDragging = ref(false);
const selectedIndicator = ref<CircularIndicator | null>(null);
const dragStart = ref({
  x: 0,
  y: 0,
  startAngle: 0,
  endAngle: 0,
  time: 0,
  moved: false,
});

// Computed properties from store
const config = computed(() => musicStore.sequencerConfig);
const solfegeData = computed(() => musicStore.solfegeData);
const isPlaying = computed(() => config.value.isPlaying);
const currentStep = computed(() => config.value.currentStep);
const steps = computed(() => config.value.steps);

// Angle step size
const angleSteps = computed(() => 360 / steps.value);

// Create tracks from solfege data
const tracks = ref<CircularTrack[]>([]);

// Initialize tracks - Do should be innermost (reversed order)
const initializeTracks = () => {
  tracks.value = solfegeData.value
    .slice(0, 7)
    .reverse()
    .map((solfege, index) => ({
      id: `track-${index}`,
      radius: outerRadius - index * trackSpacing,
      solfegeName: solfege.name,
      solfegeIndex: 6 - index, // Reverse the index mapping
      color: getPrimaryColor(solfege.name),
      isActive: false,
      isHovered: false,
    }));
};

// Watch for solfege data changes
watch(solfegeData, initializeTracks, { immediate: true });

// Convert sequencer beats to indicators
const indicators = computed((): CircularIndicator[] => {
  return musicStore.sequencerBeats.map((beat) => ({
    id: beat.id,
    trackId: `track-${beat.ring}`,
    startAngle: (beat.step / steps.value) * 360,
    endAngle: ((beat.step + beat.duration) / steps.value) * 360,
    isDragging: false,
    isSelected: selectedIndicator.value?.id === beat.id,
    isHovered: false,
    solfegeName: beat.solfegeName,
    solfegeIndex: beat.solfegeIndex,
    octave: beat.octave,
  }));
});

// Helper functions
const polarToCartesian = (
  centerX: number,
  centerY: number,
  radius: number,
  angleInDegrees: number
) => {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: centerX + radius * Math.cos(angleInRadians),
    y: centerY + radius * Math.sin(angleInRadians),
  };
};

// Grid marker helper
const getGridMarkerEnd = (angle: number) => {
  return polarToCartesian(centerX, centerY, outerRadius + 5, angle);
};

const getAngleFromEvent = (e: MouseEvent | TouchEvent): number => {
  if (!svgRef.value) return 0;

  const rect = svgRef.value.getBoundingClientRect();
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  const scaleX = 400 / rect.width;
  const scaleY = 400 / rect.height;
  const svgX = (clientX - rect.left) * scaleX;
  const svgY = (clientY - rect.top) * scaleY;

  const dx = svgX - centerX;
  const dy = svgY - centerY;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;
  return angle;
};

const snapToStep = (angle: number): number => {
  return Math.round(angle / angleSteps.value) * angleSteps.value;
};

const constrainAngles = (startAngle: number, endAngle: number) => {
  const snappedStart = snapToStep(startAngle);
  let snappedEnd = snapToStep(endAngle);

  // Ensure minimum duration
  const minDuration = angleSteps.value;
  const minEnd = snappedStart + minDuration;

  // Ensure we don't go beyond full circle
  const maxEnd = snappedStart + 360;

  snappedEnd = Math.max(minEnd, Math.min(snappedEnd, maxEnd));

  return {
    startAngle: snappedStart,
    endAngle: snappedEnd,
  };
};

const getStepPosition = (radius: number, step: number) => {
  const angle = (step / steps.value) * 360;
  return polarToCartesian(centerX, centerY, radius, angle);
};

const createIndicatorPath = (indicator: CircularIndicator): string => {
  const track = tracks.value.find((t) => t.id === indicator.trackId);
  if (!track) return "";

  // Indicators should fit within track boundaries, not exceed them
  const trackHalfWidth = trackSpacing * 0.4; // Use 80% of track width for clean spacing
  const innerR = track.radius - trackHalfWidth;
  const outerR = track.radius + trackHalfWidth;

  const innerStart = polarToCartesian(
    centerX,
    centerY,
    innerR,
    indicator.startAngle
  );
  const innerEnd = polarToCartesian(
    centerX,
    centerY,
    innerR,
    indicator.endAngle
  );
  const outerStart = polarToCartesian(
    centerX,
    centerY,
    outerR,
    indicator.startAngle
  );
  const outerEnd = polarToCartesian(
    centerX,
    centerY,
    outerR,
    indicator.endAngle
  );

  const largeArcFlag =
    indicator.endAngle - indicator.startAngle <= 180 ? "0" : "1";

  return `
    M ${innerStart.x} ${innerStart.y}
    L ${outerStart.x} ${outerStart.y}
    A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}
    L ${innerEnd.x} ${innerEnd.y}
    A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}
    Z
  `;
};

const getIndicatorColor = (indicator: CircularIndicator): string => {
  const track = tracks.value.find((t) => t.id === indicator.trackId);
  return track?.color || "#ffffff";
};

// Event handlers
const handleTrackHover = (trackId: string, isHovered: boolean) => {
  const track = tracks.value.find((t) => t.id === trackId);
  if (track) {
    track.isHovered = isHovered;
  }
};

const handleIndicatorHover = (indicatorId: string, isHovered: boolean) => {
  const indicator = indicators.value.find((i) => i.id === indicatorId);
  if (indicator) {
    indicator.isHovered = isHovered;
  }
};

const handleTrackClick = (e: MouseEvent, track: CircularTrack) => {
  if (isPlaying.value || isDragging.value) return;

  e.preventDefault();
  e.stopPropagation();

  const angle = getAngleFromEvent(e);
  const snappedAngle = snapToStep(angle);
  const step = Math.floor((snappedAngle / 360) * steps.value);

  // Check if there's already an indicator at this position
  const existingIndicator = indicators.value.find(
    (indicator) =>
      indicator.trackId === track.id &&
      Math.abs(indicator.startAngle - snappedAngle) < angleSteps.value / 2
  );

  if (existingIndicator) {
    selectedIndicator.value = existingIndicator;
    return;
  }

  // Create new beat - use the track's index directly (already correctly mapped)
  const newBeat: SequencerBeat = {
    id: `beat-${Date.now()}-${Math.random()}`,
    ring: parseInt(track.id.split("-")[1]), // Extract track index from ID
    step,
    duration: 1,
    solfegeName: track.solfegeName,
    solfegeIndex: track.solfegeIndex,
    octave: config.value.baseOctave,
  };

  musicStore.addSequencerBeat(newBeat);
  triggerUIHaptic();
};

const handleIndicatorStart = (
  e: MouseEvent | TouchEvent,
  indicator: CircularIndicator
) => {
  if (isPlaying.value) return;

  e.preventDefault();
  e.stopPropagation();

  // Select indicator immediately
  selectedIndicator.value = indicator;

  // Check for double tap to delete
  const now = Date.now();
  if (lastTapTime.value && now - lastTapTime.value < 300) {
    removeIndicator(indicator.id);
    return;
  }
  lastTapTime.value = now;

  isDragging.value = true;

  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  dragStart.value = {
    x: clientX,
    y: clientY,
    startAngle: indicator.startAngle,
    endAngle: indicator.endAngle,
    time: now,
    moved: false,
  };

  // Add global event listeners
  if ("touches" in e) {
    document.addEventListener("touchmove", handleMove, { passive: false });
    document.addEventListener("touchend", handleEnd);
  } else {
    document.addEventListener("mousemove", handleMove);
    document.addEventListener("mouseup", handleEnd);
  }

  triggerUIHaptic();
};

// Add double tap detection
const lastTapTime = ref<number>(0);

const handleMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !selectedIndicator.value) return;

  e.preventDefault();
  e.stopPropagation();

  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  const deltaX = clientX - dragStart.value.x;
  const deltaY = clientY - dragStart.value.y;

  // Mark as moved if significant movement
  if (Math.abs(deltaX) > 10 || Math.abs(deltaY) > 10) {
    dragStart.value.moved = true;
  }

  // Horizontal movement = position along track
  // Vertical movement = duration change

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal movement - move along track
    const sensitivity = 0.8; // More responsive for mobile
    const angleChange = deltaX * sensitivity;
    const newStartAngle = dragStart.value.startAngle + angleChange;
    const duration =
      (dragStart.value.endAngle - dragStart.value.startAngle) /
      angleSteps.value;
    const constrained = constrainAngles(
      newStartAngle,
      newStartAngle + duration * angleSteps.value
    );

    const newStep = Math.round(constrained.startAngle / angleSteps.value);
    musicStore.updateSequencerBeat(selectedIndicator.value.id, {
      step: newStep,
    });
  } else {
    // Vertical movement - change duration
    const sensitivity = 0.02; // More responsive for mobile duration control
    const durationChange = -deltaY * sensitivity; // Negative because up = longer
    const currentDuration =
      (dragStart.value.endAngle - dragStart.value.startAngle) /
      angleSteps.value;
    const newDuration = Math.max(
      1,
      Math.round(currentDuration + durationChange)
    );

    musicStore.updateSequencerBeat(selectedIndicator.value.id, {
      duration: newDuration,
    });
  }

  triggerUIHaptic();
};

const handleEnd = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return;

  e.preventDefault();
  e.stopPropagation();

  isDragging.value = false;

  // Remove global event listeners
  if ("touches" in e) {
    document.removeEventListener("touchmove", handleMove);
    document.removeEventListener("touchend", handleEnd);
  } else {
    document.removeEventListener("mousemove", handleMove);
    document.removeEventListener("mouseup", handleEnd);
  }
};

const removeIndicator = (indicatorId: string) => {
  musicStore.removeSequencerBeat(indicatorId);
  if (selectedIndicator.value?.id === indicatorId) {
    selectedIndicator.value = null;
  }
  triggerUIHaptic();
};

// Lifecycle
onMounted(() => {
  // Global event listeners are added/removed per interaction in handleStart/handleEnd
});

onUnmounted(() => {
  // Clean up any remaining global listeners
  document.removeEventListener("mousemove", handleMove);
  document.removeEventListener("mouseup", handleEnd);
  document.removeEventListener("touchmove", handleMove);
  document.removeEventListener("touchend", handleEnd);
});
</script>

<style scoped>
.circular-sequencer-container {
  position: relative;
  /* Mobile-first: use viewport width but maintain square aspect ratio */

  transition: opacity 0.3s ease;
  /* Dynamic track width based on available space */
  --track-width: calc((min(90vw, 90vh, 400px) - 120px) / 7 * 0.8);
}

.circular-sequencer-container.disabled {
  opacity: 0.4;
  pointer-events: none;
}

.sequencer-svg {
  width: 100%;
  height: 100%;
  background: rgba(31, 41, 55, 0.5);
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: crosshair;
  touch-action: none;
  user-select: none;
}

/* Track styles - Dynamic width based on track spacing */
.track-circle {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  stroke-width: calc(var(--track-width) * 0.8);
  fill: none;
  opacity: 0.3;
  cursor: pointer;
}

.track-circle.hovered {
  opacity: 0.6;
  stroke-width: calc(var(--track-width) * 0.9);
}

.track-circle.active {
  opacity: 0.8;
  stroke-width: var(--track-width);
}

/* Step marker styles - Very subtle grid */
.step-marker {
  transition: opacity 0.2s ease;
  pointer-events: none;
  opacity: 0.1;
}

.track-circle.hovered ~ .step-marker {
  opacity: 0.2;
}

/* Indicator styles - Clean design without glow effects */
.indicator-path {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  stroke-width: 2;
  opacity: 0.9;
  transform-origin: center;
}

.indicator-path:hover,
.indicator-path.hovered {
  opacity: 1;
  stroke-width: 3;
}

.indicator-path.selected {
  stroke-width: 3;
  opacity: 1;
  stroke: white;
  stroke-opacity: 0.8;
}

.indicator-path.dragging {
  stroke-width: 4;
  opacity: 1;
  stroke: white;
  stroke-opacity: 0.9;
}

/* Solfege labels - Clean and readable */
.solfege-label {
  font-weight: 600;
  pointer-events: none;
  font-family: system-ui, -apple-system, sans-serif;
  opacity: 0.8;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
}
</style>
