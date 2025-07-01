<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useMusicStore } from "@/stores/music";
import { useSequencerStore } from "@/stores/sequencer";
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
const sequencerStore = useSequencerStore();
const { getPrimaryColor } = useColorSystem();

// Styling Configuration Object - Easy tweaking zone ✨
// Change these values to customize the visual appearance
const styles = ref({
  // Core SVG dimensions and layout
  dimensions: {
    centerX: 200, // X center point of the circular sequencer
    centerY: 200, // Y center point of the circular sequencer
    outerRadius: 190, // Outer boundary - controls overall sequencer size
    innerRadius: 20, // Inner boundary - creates the "donut hole" (smaller = more compact)
    viewBox: "0 0 400 400", // SVG coordinate system (keep proportional to center values)
  },

  // Track ring configuration
  track: {
    spacing: 0, // Auto-calculated: space between each solfege ring
    indicatorWidthRatio: 0.35, // Beat indicator thickness (0.1 = thin, 0.5 = thick)
    stepMarkerWidthRatio: 0.3, // Step grid line length (0.1 = short, 0.5 = long)
    currentStepWidthRatio: 0.4, // Playhead indicator length (how far it extends)
    labelOffset: 0.6, // Distance of solfege labels from track (0.5 = close, 1.0 = far)
    labelOffsetPixels: -15, // Fine-tune label positioning (negative = move left)
  },

  // Time grid (quarter/sixteenth note markers radiating from center)
  grid: {
    sixteenthSteps: 16, // Number of subdivision lines (16 = sixteenth notes)
    quarterOpacity: 0.8, // Visibility of main beat lines (0.0 = invisible, 1.0 = solid)
    sixteenthOpacity: 0.3, // Visibility of subdivision lines (lower = more subtle)
    quarterStrokeWidth: 0.8, // Thickness of main beat lines
    sixteenthStrokeWidth: 0.5, // Thickness of subdivision lines
    dashArray: "2 4", // Dash pattern for grid lines (dash length, gap length)
    markerExtension: 5, // How far grid lines extend beyond outermost track (pixels)
  },

  // Step position markers (tiny lines on each track showing beat positions)
  stepMarkers: {
    stroke: "rgba(255,255,255,0.1)", // Color of step markers (very subtle white)
    strokeWidth: 0.5, // Thickness of step markers (keep thin)
    baseOpacity: 0.1, // Default visibility (barely visible until hover)
    hoveredOpacity: 0.2, // Visibility when track is hovered (slightly more visible)
  },

  // Track ring appearance states
  trackCircles: {
    baseOpacity: 0.3, // Default track visibility (subtle background presence)
    hoveredOpacity: 0.4, // Track visibility on mouse hover (more prominent)
    activeOpacity: 0.5, // Track visibility when active/selected (most prominent)
    baseStrokeWidthRatio: 0.8, // Default track thickness (relative to available space)
    hoveredStrokeWidthRatio: 0.9, // Track thickness on hover (slightly thicker)
    activeStrokeWidthRatio: 1.0, // Track thickness when active (thickest)
    saturation: 0.4, // Track color intensity (0.0 = grayscale, 1.0 = full color)
  },

  // Beat indicator appearance states (the actual sequencer beats)
  indicators: {
    baseOpacity: 1, // Default beat visibility (prominent but not overwhelming)
    hoveredOpacity: 1, // Beat visibility on hover (fully opaque)
    selectedOpacity: 1, // Beat visibility when selected (fully opaque)
    draggingOpacity: 1, // Beat visibility while dragging (fully opaque)
    baseStrokeWidth: 2, // Default beat outline thickness
    hoveredStrokeWidth: 1, // Beat outline thickness on hover (thinner for subtle feedback)
    selectedStrokeWidth: 2, // Beat outline thickness when selected
    draggingStrokeWidth: 3, // Beat outline thickness while dragging (thicker for emphasis)
    selectedStroke: "white", // Outline color when beat is selected
    selectedStrokeOpacity: 0.8, // Opacity of selection outline
    draggingStroke: "white", // Outline color while dragging
    draggingStrokeOpacity: 0.9, // Opacity of drag outline
    saturation: 1, // Beat color intensity (0.0 = grayscale, 1.0 = full color)
  },

  // Playhead (current step) indicator - shows where playback is
  currentStep: {
    stroke: "white", // Color of the playhead line
    strokeWidth: 2, // Thickness of playhead line
    opacity: 0.9, // Visibility of playhead (slightly transparent for subtlety)
  },

  // Solfege note labels (Do, Re, Mi, Fa, Sol, La, Ti text)
  labels: {
    fill: "white", // Text color
    baseFontSize: 11, // Default font size
    minFontSize: 8, // Minimum font size (prevents text getting too small)
    maxFontSize: 11, // Maximum font size (prevents text getting too large)
    fontSizeRatio: 0.6, // Auto-sizing based on track spacing (0.5 = smaller, 0.8 = larger)
    fontWeight: 600, // Text weight (400 = normal, 700 = bold)
    opacity: 0.8, // Text transparency
    textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)", // Drop shadow for readability
    fontFamily: "system-ui, -apple-system, sans-serif", // Font family
  },

  // Touch/mouse interaction behavior settings
  interaction: {
    doubleTapThreshold: 300, // Max time between taps for double-tap delete (milliseconds)
    movementThreshold: 10, // Min pixel movement to register as drag (prevents accidental moves)
    horizontalSensitivity: 0.8, // How responsive horizontal dragging is (higher = more sensitive)
    durationSensitivity: 0.02, // How responsive vertical duration dragging is (higher = more sensitive)
  },

  // Animation and transition settings for smooth interactions
  transitions: {
    default: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)", // Smooth easing for most animations
    opacity: "opacity 0.3s ease", // Fade in/out timing
    stepMarker: "opacity 0.2s ease", // Step marker visibility changes
  },

  // Overall container styling
  container: {
    background: "rgba(31, 41, 55, 0.5)", // Semi-transparent dark background
    borderRadius: "50%", // Circular shape
    border: "1px solid rgba(255, 255, 255, 0.2)", // Subtle white border
    disabledOpacity: 0.4, // Opacity when sequencer is disabled
  },
});

// Calculate derived values
const trackSpacing = computed(
  () =>
    (styles.value.dimensions.outerRadius -
      styles.value.dimensions.innerRadius) /
    7
);

// Update track spacing in styles for CSS variables
watch(
  trackSpacing,
  (newSpacing) => {
    styles.value.track.spacing = newSpacing;
  },
  { immediate: true }
);

// SVG dimensions - Mobile-first sizing
const centerX = computed(() => styles.value.dimensions.centerX);
const centerY = computed(() => styles.value.dimensions.centerY);
const outerRadius = computed(() => styles.value.dimensions.outerRadius);
const innerRadius = computed(() => styles.value.dimensions.innerRadius);

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
const config = computed(() => sequencerStore.config);
const solfegeData = computed(() => musicStore.solfegeData);
const isPlaying = computed(() => sequencerStore.isPlaying);
const currentStep = computed(() => sequencerStore.currentStep);
const steps = computed(() => sequencerStore.steps);

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
      radius: outerRadius.value - index * trackSpacing.value,
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
  return sequencerStore.beats.map((beat) => ({
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
  return polarToCartesian(
    centerX.value,
    centerY.value,
    outerRadius.value + styles.value.grid.markerExtension,
    angle
  );
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

  const dx = svgX - centerX.value;
  const dy = svgY - centerY.value;
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
  return polarToCartesian(centerX.value, centerY.value, radius, angle);
};

const createIndicatorPath = (indicator: CircularIndicator): string => {
  const track = tracks.value.find((t) => t.id === indicator.trackId);
  if (!track) return "";

  // Indicators should fit within track boundaries, not exceed them
  const trackHalfWidth =
    trackSpacing.value * styles.value.track.indicatorWidthRatio; // Use 80% of track width for clean spacing
  const innerR = track.radius - trackHalfWidth;
  const outerR = track.radius + trackHalfWidth;

  const innerStart = polarToCartesian(
    centerX.value,
    centerY.value,
    innerR,
    indicator.startAngle
  );
  const innerEnd = polarToCartesian(
    centerX.value,
    centerY.value,
    innerR,
    indicator.endAngle
  );
  const outerStart = polarToCartesian(
    centerX.value,
    centerY.value,
    outerR,
    indicator.startAngle
  );
  const outerEnd = polarToCartesian(
    centerX.value,
    centerY.value,
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
  if (isDragging.value) return;

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

  sequencerStore.addBeat(newBeat);
  triggerUIHaptic();
};

const handleIndicatorStart = (
  e: MouseEvent | TouchEvent,
  indicator: CircularIndicator
) => {
  e.preventDefault();
  e.stopPropagation();

  // Select indicator immediately
  selectedIndicator.value = indicator;

  // Check for double tap to delete
  const now = Date.now();
  if (
    lastTapTime.value &&
    now - lastTapTime.value < styles.value.interaction.doubleTapThreshold
  ) {
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
  if (
    Math.abs(deltaX) > styles.value.interaction.movementThreshold ||
    Math.abs(deltaY) > styles.value.interaction.movementThreshold
  ) {
    dragStart.value.moved = true;
  }

  // Horizontal movement = position along track
  // Vertical movement = duration change

  if (Math.abs(deltaX) > Math.abs(deltaY)) {
    // Horizontal movement - move along track
    const sensitivity = styles.value.interaction.horizontalSensitivity;
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
    sequencerStore.updateBeat(selectedIndicator.value.id, {
      step: newStep,
    });
  } else {
    // Vertical movement - change duration
    const sensitivity = styles.value.interaction.durationSensitivity;
    const durationChange = -deltaY * sensitivity; // Negative because up = longer
    const currentDuration =
      (dragStart.value.endAngle - dragStart.value.startAngle) /
      angleSteps.value;
    const newDuration = Math.max(
      1,
      Math.round(currentDuration + durationChange)
    );

    sequencerStore.updateBeat(selectedIndicator.value.id, {
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
  sequencerStore.removeBeat(indicatorId);
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

<template>
  <div
    class="relative p-1 transition-opacity duration-300"
    :style="{
      '--track-width': `calc((min(90vw, 90vh, 400px) - 120px) / 7 * ${styles.trackCircles.baseStrokeWidthRatio})`,
    }"
  >
    <svg
      ref="svgRef"
      :viewBox="styles.dimensions.viewBox"
      class="w-full h-auto block rounded-full border cursor-crosshair touch-none select-none"
      :style="{
        background: styles.container.background,
        borderColor: 'rgba(255, 255, 255, 0.2)',
      }"
      preserveAspectRatio="xMidYMid meet"
    >
      <!-- Quarter and sixteenth markers -->
      <g class="grid-markers">
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
              ? `rgba(255,255,255,${styles.grid.quarterOpacity})`
              : `rgba(255,255,255,${styles.grid.sixteenthOpacity})`
          "
          :stroke-width="
            i % 4 === 0
              ? styles.grid.quarterStrokeWidth
              : styles.grid.sixteenthStrokeWidth
          "
          :stroke-dasharray="styles.grid.dashArray"
        />
      </g>

      <!-- Background tracks -->
      <g v-for="track in tracks" :key="track.id">
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

        <!-- Step markers for each track -->
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

      <!-- Current step indicator -->
      <g v-if="isPlaying">
        <line
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
      </g>

      <!-- Indicators (sequencer beats) -->
      <g v-for="indicator in indicators" :key="indicator.id">
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
          :style="{
            transition: styles.transitions.default,
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

      <!-- Solfege labels -->
      <text
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
    </svg>
  </div>
</template>

<!-- No scoped styles needed - using Tailwind utilities and inline styles -->
