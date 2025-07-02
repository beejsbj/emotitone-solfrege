import { ref, computed, watch } from "vue";
import { useColorSystem } from "@/composables/useColorSystem";
import { useMusicStore } from "@/stores/music";
import { useSequencerStore } from "@/stores/sequencer";
import type { SequencerInstance } from "@/types/music";

// Interfaces for the visual system
export interface CircularTrack {
  id: string;
  radius: number;
  solfegeName: string;
  solfegeIndex: number;
  color: string;
  isActive: boolean;
  isHovered: boolean;
}

export interface CircularIndicator {
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

/**
 * Circular sequencer configuration and utilities
 */
export function useCircularSequencer(
  sequencerId?: string,
  compact = false,
  expanded = false
) {
  const musicStore = useMusicStore();
  const sequencerStore = useSequencerStore();
  const { getPrimaryColor } = useColorSystem();

  // Styling Configuration - centralized for easy tweaking
  const styles = computed(() => ({
    // Core SVG dimensions and layout
    dimensions: {
      centerX: compact ? 40 : 200,
      centerY: compact ? 40 : 200,
      outerRadius: compact ? 35 : 190,
      innerRadius: compact ? 3 : 20,
      viewBox: compact ? "0 0 80 80" : "0 0 400 400",
    },

    // Track ring configuration
    track: {
      spacing: 0, // Auto-calculated
      indicatorWidthRatio: 0.35,
      stepMarkerWidthRatio: 0.3,
      currentStepWidthRatio: 0.4,
      labelOffset: 0.6,
      labelOffsetPixels: -15,
    },

    // Time grid
    grid: {
      sixteenthSteps: 16,
      quarterOpacity: 0.8,
      sixteenthOpacity: 0.3,
      quarterStrokeWidth: 0.8,
      sixteenthStrokeWidth: 0.5,
      dashArray: "2 4",
      markerExtension: 5,
    },

    // Step markers
    stepMarkers: {
      stroke: "rgba(255,255,255,0.1)",
      strokeWidth: 0.5,
      baseOpacity: 0.1,
      hoveredOpacity: 0.2,
    },

    // Track circles
    trackCircles: {
      baseOpacity: 0.3,
      hoveredOpacity: 0.4,
      activeOpacity: 0.5,
      baseStrokeWidthRatio: 0.8,
      hoveredStrokeWidthRatio: 0.9,
      activeStrokeWidthRatio: 1.0,
      saturation: 0.4,
    },

    // Beat indicators
    indicators: {
      baseOpacity: 1,
      hoveredOpacity: 1,
      selectedOpacity: 1,
      draggingOpacity: 1,
      baseStrokeWidth: 2,
      hoveredStrokeWidth: 1,
      selectedStrokeWidth: 2,
      draggingStrokeWidth: 3,
      selectedStroke: "white",
      selectedStrokeOpacity: 0.8,
      draggingStroke: "white",
      draggingStrokeOpacity: 0.9,
      saturation: 1,
    },

    // Playhead
    currentStep: {
      stroke: "white",
      strokeWidth: 2,
      opacity: 0.9,
    },

    // Labels
    labels: {
      fill: "white",
      baseFontSize: 11,
      minFontSize: 8,
      maxFontSize: 11,
      fontSizeRatio: 0.6,
      fontWeight: 600,
      opacity: 0.8,
      textShadow: "0 1px 2px rgba(0, 0, 0, 0.5)",
      fontFamily: "system-ui, -apple-system, sans-serif",
    },

    // Transitions
    transitions: {
      default: "all 0.2s cubic-bezier(0.4, 0, 0.2, 1)",
      opacity: "opacity 0.3s ease",
      stepMarker: "opacity 0.2s ease",
    },

    // Container
    container: {
      background: "rgba(31, 41, 55, 0.5)",
      borderRadius: "50%",
      border: "1px solid rgba(255, 255, 255, 0.2)",
      disabledOpacity: 0.4,
    },
  }));

  // Calculate derived values
  const trackSpacing = computed(
    () =>
      (styles.value.dimensions.outerRadius -
        styles.value.dimensions.innerRadius) /
      7
  );

  const centerX = computed(() => styles.value.dimensions.centerX);
  const centerY = computed(() => styles.value.dimensions.centerY);
  const outerRadius = computed(() => styles.value.dimensions.outerRadius);
  const innerRadius = computed(() => styles.value.dimensions.innerRadius);

  // Get the current sequencer instance
  const currentSequencer = computed((): SequencerInstance | null => {
    if (expanded) {
      return sequencerStore.activeSequencer;
    } else if (sequencerId) {
      return (
        sequencerStore.sequencers.find((s) => s.id === sequencerId) || null
      );
    }
    return null;
  });

  // Computed properties from store
  const config = computed(() => sequencerStore.config);
  const solfegeData = computed(() => musicStore.solfegeData);
  const isPlaying = computed(() => currentSequencer.value?.isPlaying || false);
  const currentStep = computed(() => currentSequencer.value?.currentStep || 0);
  const steps = computed(() => config.value.steps);
  const beats = computed(() => currentSequencer.value?.beats || []);

  // Angle calculations
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
    if (!currentSequencer.value) return [];

    return currentSequencer.value.beats.map((beat) => ({
      id: beat.id,
      trackId: `track-${beat.ring}`,
      startAngle: (beat.step / steps.value) * 360,
      endAngle: ((beat.step + beat.duration) / steps.value) * 360,
      isDragging: false,
      isSelected: false,
      isHovered: false,
      solfegeName: beat.solfegeName,
      solfegeIndex: beat.solfegeIndex,
      octave: beat.octave,
    }));
  });

  // Mathematical helper functions
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

  const getGridMarkerEnd = (angle: number) => {
    return polarToCartesian(
      centerX.value,
      centerY.value,
      outerRadius.value + styles.value.grid.markerExtension,
      angle
    );
  };

  const getAngleFromEvent = (
    e: MouseEvent | TouchEvent,
    svgElement: SVGElement
  ): number => {
    const rect = svgElement.getBoundingClientRect();
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

    // Indicators should fit within track boundaries
    const trackHalfWidth =
      trackSpacing.value * styles.value.track.indicatorWidthRatio;
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

  // Track state management
  const handleTrackHover = (trackId: string, isHovered: boolean) => {
    const track = tracks.value.find((t) => t.id === trackId);
    if (track) {
      track.isHovered = isHovered;
    }
  };

  // Double-click tracking for adding beats
  const lastTrackClickTime = ref<{ [key: string]: number }>({});
  const doubleClickThreshold = 300; // Same as double-tap threshold

  const handleTrackDoubleClick = (
    e: MouseEvent,
    track: CircularTrack,
    svgElement: SVGElement,
    onBeatAdd: (beat: any) => void
  ) => {
    // Double-click detection
    const now = Date.now();
    const lastClickTime = lastTrackClickTime.value[track.id] || 0;
    const timeSinceLastClick = now - lastClickTime;

    lastTrackClickTime.value[track.id] = now;

    // Only proceed if it's a double-click (within threshold and not the first click)
    if (timeSinceLastClick > doubleClickThreshold || lastClickTime === 0) {
      return false; // Single click or first click - do nothing
    }

    const angle = getAngleFromEvent(e, svgElement);
    const snappedAngle = snapToStep(angle);
    const step = Math.floor((snappedAngle / 360) * steps.value);

    // Check if there's already an indicator at this position
    const existingIndicator = indicators.value.find(
      (indicator) =>
        indicator.trackId === track.id &&
        Math.abs(indicator.startAngle - snappedAngle) < angleSteps.value / 2
    );

    if (existingIndicator) {
      return false; // Already has indicator
    }

    // Create new beat data
    const newBeat = {
      id: `beat-${Date.now()}-${Math.random()}`,
      ring: parseInt(track.id.split("-")[1]),
      step,
      duration: 1,
      solfegeName: track.solfegeName,
      solfegeIndex: track.solfegeIndex,
      octave: currentSequencer.value?.octave || 4,
    };

    onBeatAdd(newBeat);
    return true; // Beat was added
  };

  return {
    // State
    styles,
    tracks,
    indicators,
    currentSequencer,

    // Computed values
    trackSpacing,
    centerX,
    centerY,
    outerRadius,
    innerRadius,
    config,
    solfegeData,
    isPlaying,
    currentStep,
    steps,
    beats,
    angleSteps,

    // Mathematical functions
    polarToCartesian,
    getGridMarkerEnd,
    getAngleFromEvent,
    snapToStep,
    constrainAngles,
    getStepPosition,
    createIndicatorPath,
    getIndicatorColor,

    // State management
    handleTrackHover,
    initializeTracks,
    handleTrackDoubleClick,
    lastTrackClickTime,
    doubleClickThreshold,
  };
}
