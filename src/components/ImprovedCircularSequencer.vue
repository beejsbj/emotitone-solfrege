<template>
  <div
    class="bg-white/10 backdrop-blur-sm rounded-sm border border-white/20 grid grid-cols-1 gap-4 relative p-4"
  >
    <!-- Header with controls -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-white">Improved Circular Sequencer</h2>
      <div class="flex gap-2">
        <button
          @click="togglePlayback"
          :class="[
            'px-4 py-2 rounded-sm font-bold transition-all duration-200',
            config.isPlaying
              ? 'bg-red-500/80 hover:bg-red-500 text-white'
              : 'bg-green-500/80 hover:bg-green-500 text-white',
          ]"
        >
          {{ config.isPlaying ? "Stop" : "Play" }}
        </button>
        <button
          @click="clearSequencer"
          class="px-4 py-2 bg-gray-500/80 hover:bg-gray-500 text-white rounded-sm font-bold transition-all duration-200"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Controls Grid -->
    <div class="grid grid-cols-2 gap-4 mb-4">
      <!-- Tempo Control -->
      <Knob
        :value="config.tempo"
        :min="60"
        :max="180"
        :step="10"
        param-name="Tempo"
        :format-value="formatTempo"
        :is-disabled="config.isPlaying"
        @update:value="updateTempo"
      />

      <!-- Octave Control -->
      <Knob
        :value="config.baseOctave"
        :min="3"
        :max="5"
        :step="1"
        param-name="Octave"
        :format-value="formatOctave"
        :is-disabled="config.isPlaying"
        @update:value="updateOctave"
      />
    </div>

    <!-- Circular Sequencer -->
    <div class="flex justify-center mb-4">
      <div 
        class="circular-sequencer-container"
        :class="{ disabled: config.isPlaying }"
      >
        <svg
          ref="svgRef"
          width="400"
          height="400"
          viewBox="0 0 400 400"
          class="sequencer-svg"
          preserveAspectRatio="xMidYMid meet"
        >
          <!-- Background tracks -->
          <g v-for="track in tracks" :key="track.id">
            <circle
              :cx="centerX"
              :cy="centerY"
              :r="track.radius"
              class="track-circle"
              :class="{
                active: track.isActive,
                hovered: track.isHovered
              }"
              :stroke="track.color"
              @mouseenter="handleTrackHover(track.id, true)"
              @mouseleave="handleTrackHover(track.id, false)"
              @click="handleTrackClick($event, track)"
            />
            
            <!-- Step markers for each track -->
            <g v-for="step in config.steps" :key="`${track.id}-step-${step}`">
              <line
                :x1="getStepPosition(track.radius, step - 1).x"
                :y1="getStepPosition(track.radius, step - 1).y"
                :x2="getStepPosition(track.radius + 8, step - 1).x"
                :y2="getStepPosition(track.radius + 8, step - 1).y"
                stroke="rgba(255,255,255,0.2)"
                stroke-width="1"
                class="step-marker"
              />
            </g>
          </g>

          <!-- Current step indicator -->
          <g v-if="config.isPlaying">
            <line
              v-for="track in tracks"
              :key="`current-${track.id}`"
              :x1="getStepPosition(track.radius - 10, config.currentStep).x"
              :y1="getStepPosition(track.radius - 10, config.currentStep).y"
              :x2="getStepPosition(track.radius + 10, config.currentStep).x"
              :y2="getStepPosition(track.radius + 10, config.currentStep).y"
              stroke="white"
              stroke-width="3"
              opacity="0.8"
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
                hovered: indicator.isHovered
              }"
              :fill="getIndicatorColor(indicator)"
              :stroke="getIndicatorColor(indicator)"
              @mousedown="handleIndicatorStart($event, indicator)"
              @touchstart="handleIndicatorStart($event, indicator)"
              @mouseenter="handleIndicatorHover(indicator.id, true)"
              @mouseleave="handleIndicatorHover(indicator.id, false)"
              @dblclick="removeIndicator(indicator.id)"
            />
            
            <!-- Drag handle -->
            <circle
              :cx="getIndicatorEndPosition(indicator).x"
              :cy="getIndicatorEndPosition(indicator).y"
              r="6"
              class="drag-handle"
              :class="{
                active: indicator.isDragging,
                visible: indicator.isSelected || indicator.isHovered
              }"
              fill="white"
              stroke="black"
              stroke-width="2"
              @mousedown="handleDragHandleStart($event, indicator)"
              @touchstart="handleDragHandleStart($event, indicator)"
            />
          </g>

          <!-- Solfege labels -->
          <text
            v-for="(track, index) in tracks"
            :key="`label-${track.id}`"
            :x="centerX + track.radius + 15"
            :y="centerY + 5"
            fill="white"
            font-size="12"
            text-anchor="middle"
            class="solfege-label"
          >
            {{ track.solfegeName }}
          </text>
        </svg>
      </div>
    </div>

    <!-- Instructions -->
    <div class="text-center text-white/80 text-sm">
      <p class="mb-1">
        Click tracks to create beats • Drag indicators to move • Drag handle to resize • Double-click to delete
      </p>
      <p class="text-xs opacity-60">
        {{ config.steps }} steps • Outer = {{ tracks[0]?.solfegeName }}, Inner = {{ tracks[6]?.solfegeName }}
      </p>
    </div>

    <!-- Pattern and Melody Management -->
    <div class="grid grid-cols-2 gap-4 mt-4">
      <!-- Pattern Loading -->
      <div class="bg-white/5 rounded-sm p-3 border border-white/10">
        <h3 class="text-white font-bold mb-2">Load Pattern</h3>
        <select
          v-model="selectedPatternName"
          @change="loadSelectedPattern"
          class="w-full bg-gray-800 text-white border border-white/20 rounded-sm p-2 text-sm"
        >
          <option value="">Select a pattern...</option>
          <option
            v-for="pattern in patterns"
            :key="pattern.name"
            :value="pattern.name"
          >
            {{ pattern.name }}
          </option>
        </select>
      </div>

      <!-- Melody Management -->
      <div class="bg-white/5 rounded-sm p-3 border border-white/10">
        <h3 class="text-white font-bold mb-2">Save/Load Melody</h3>
        <div class="grid gap-2">
          <input
            v-model="newMelodyName"
            placeholder="Melody name..."
            class="w-full bg-gray-800 text-white border border-white/20 rounded-sm p-2 text-sm"
          />
          <div class="flex gap-1">
            <button
              @click="saveCurrentMelody"
              :disabled="!newMelodyName || indicators.length === 0"
              class="flex-1 px-2 py-1 bg-blue-500/80 hover:bg-blue-500 disabled:bg-gray-500/50 text-white rounded-sm text-xs font-bold transition-all duration-200"
            >
              Save
            </button>
            <select
              v-model="selectedMelodyId"
              @change="loadSelectedMelody"
              class="flex-1 bg-gray-800 text-white border border-white/20 rounded-sm p-1 text-xs"
            >
              <option value="">Load...</option>
              <option
                v-for="melody in savedMelodies"
                :key="melody.id"
                :value="melody.id"
              >
                {{ melody.name }}
              </option>
            </select>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import type { SequencerBeat, MelodicPattern } from "@/types/music";
import * as Tone from "tone";
import Knob from "./Knob.vue";

// Interfaces for the new system
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

// SVG dimensions
const centerX = 200;
const centerY = 200;
const outerRadius = 180;
const innerRadius = 40;
const trackSpacing = (outerRadius - innerRadius) / 7;

// Refs
const svgRef = ref<SVGElement | null>(null);
const selectedPatternName = ref("");
const selectedMelodyId = ref("");
const newMelodyName = ref("");

// Interaction state (following knob pattern)
const isDragging = ref(false);
const isDraggingHandle = ref(false);
const selectedIndicator = ref<CircularIndicator | null>(null);
const dragStart = ref({
  angle: 0,
  startAngle: 0,
  endAngle: 0,
  time: 0,
  moved: false,
});

// Transport reference
let sequenceRef: Tone.Sequence | null = null;

// Computed properties
const config = computed(() => musicStore.sequencerConfig);
const solfegeData = computed(() => musicStore.solfegeData);
const patterns = computed(() => musicStore.getMelodicPatterns());
const savedMelodies = computed(() => musicStore.savedMelodies);

// Angle step size (like knob steps)
const angleSteps = computed(() => 360 / config.value.steps);

// Create tracks from solfege data
const tracks = ref<CircularTrack[]>([]);

// Initialize tracks
const initializeTracks = () => {
  tracks.value = solfegeData.value.slice(0, 7).map((solfege, index) => ({
    id: `track-${index}`,
    radius: outerRadius - index * trackSpacing,
    solfegeName: solfege.name,
    solfegeIndex: index,
    color: getPrimaryColor(solfege.name),
    isActive: false,
    isHovered: false,
  }));
};

// Watch for solfege data changes
watch(solfegeData, initializeTracks, { immediate: true });

// Convert sequencer beats to indicators
const indicators = computed((): CircularIndicator[] => {
  return musicStore.sequencerBeats.map(beat => ({
    id: beat.id,
    trackId: `track-${beat.ring}`,
    startAngle: (beat.step / config.value.steps) * 360,
    endAngle: ((beat.step + beat.duration) / config.value.steps) * 360,
    isDragging: false,
    isSelected: selectedIndicator.value?.id === beat.id,
    isHovered: false,
    solfegeName: beat.solfegeName,
    solfegeIndex: beat.solfegeIndex,
    octave: beat.octave,
  }));
});

// Format functions for knobs
const formatTempo = (value: number) => `${value}`;
const formatOctave = (value: number) => `${value}`;

// Helper functions (following knob patterns)
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

const getAngleFromEvent = (e: MouseEvent | TouchEvent): number => {
  if (!svgRef.value) return 0;
  
  const rect = svgRef.value.getBoundingClientRect();
  const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
  const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
  
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
    endAngle: snappedEnd
  };
};

const getStepPosition = (radius: number, step: number) => {
  const angle = (step / config.value.steps) * 360;
  return polarToCartesian(centerX, centerY, radius, angle);
};

const createIndicatorPath = (indicator: CircularIndicator): string => {
  const track = tracks.value.find(t => t.id === indicator.trackId);
  if (!track) return '';
  
  const innerR = track.radius - 12;
  const outerR = track.radius + 12;
  
  const innerStart = polarToCartesian(centerX, centerY, innerR, indicator.startAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerR, indicator.endAngle);
  const outerStart = polarToCartesian(centerX, centerY, outerR, indicator.startAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerR, indicator.endAngle);
  
  const largeArcFlag = indicator.endAngle - indicator.startAngle <= 180 ? "0" : "1";
  
  return `
    M ${innerStart.x} ${innerStart.y}
    L ${outerStart.x} ${outerStart.y}
    A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}
    L ${innerEnd.x} ${innerEnd.y}
    A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}
    Z
  `;
};

const getIndicatorEndPosition = (indicator: CircularIndicator) => {
  const track = tracks.value.find(t => t.id === indicator.trackId);
  if (!track) return { x: 0, y: 0 };
  
  return polarToCartesian(centerX, centerY, track.radius, indicator.endAngle);
};

const getIndicatorColor = (indicator: CircularIndicator): string => {
  const track = tracks.value.find(t => t.id === indicator.trackId);
  return track?.color || '#ffffff';
};

// Event handlers (following knob pattern)
const handleTrackHover = (trackId: string, isHovered: boolean) => {
  const track = tracks.value.find(t => t.id === trackId);
  if (track) {
    track.isHovered = isHovered;
  }
};

const handleIndicatorHover = (indicatorId: string, isHovered: boolean) => {
  const indicator = indicators.value.find(i => i.id === indicatorId);
  if (indicator) {
    indicator.isHovered = isHovered;
  }
};

const handleTrackClick = (e: MouseEvent, track: CircularTrack) => {
  if (config.value.isPlaying || isDragging.value) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const angle = getAngleFromEvent(e);
  const snappedAngle = snapToStep(angle);
  const step = Math.floor((snappedAngle / 360) * config.value.steps);
  
  // Check if there's already an indicator at this position
  const existingIndicator = indicators.value.find(indicator => 
    indicator.trackId === track.id && 
    Math.abs(indicator.startAngle - snappedAngle) < angleSteps.value / 2
  );
  
  if (existingIndicator) {
    selectedIndicator.value = existingIndicator;
    return;
  }
  
  // Create new beat
  const newBeat: SequencerBeat = {
    id: `beat-${Date.now()}-${Math.random()}`,
    ring: track.solfegeIndex,
    step,
    duration: 1,
    solfegeName: track.solfegeName,
    solfegeIndex: track.solfegeIndex,
    octave: config.value.baseOctave,
  };
  
  musicStore.addSequencerBeat(newBeat);
  triggerUIHaptic();
};

const handleIndicatorStart = (e: MouseEvent | TouchEvent, indicator: CircularIndicator) => {
  if (config.value.isPlaying) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  isDragging.value = true;
  selectedIndicator.value = indicator;
  
  const angle = getAngleFromEvent(e);
  dragStart.value = {
    angle,
    startAngle: indicator.startAngle,
    endAngle: indicator.endAngle,
    time: Date.now(),
    moved: false,
  };
  
  // Add global event listeners (same pattern as knob)
  if ('touches' in e) {
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  } else {
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
  }
  
  triggerUIHaptic();
};

const handleDragHandleStart = (e: MouseEvent | TouchEvent, indicator: CircularIndicator) => {
  if (config.value.isPlaying) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  isDragging.value = true;
  isDraggingHandle.value = true;
  selectedIndicator.value = indicator;
  
  const angle = getAngleFromEvent(e);
  dragStart.value = {
    angle,
    startAngle: indicator.startAngle,
    endAngle: indicator.endAngle,
    time: Date.now(),
    moved: false,
  };
  
  // Add global event listeners
  if ('touches' in e) {
    document.addEventListener('touchmove', handleMove, { passive: false });
    document.addEventListener('touchend', handleEnd);
  } else {
    document.addEventListener('mousemove', handleMove);
    document.addEventListener('mouseup', handleEnd);
  }
  
  triggerUIHaptic();
};

const handleMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !selectedIndicator.value) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  const currentAngle = getAngleFromEvent(e);
  const angleDiff = currentAngle - dragStart.value.angle;
  
  // Mark as moved (same pattern as knob)
  if (Math.abs(angleDiff) > 5) {
    dragStart.value.moved = true;
  }
  
  if (isDraggingHandle.value) {
    // Resize duration
    const newEndAngle = dragStart.value.endAngle + angleDiff;
    const constrained = constrainAngles(dragStart.value.startAngle, newEndAngle);
    
    const newDuration = Math.round((constrained.endAngle - constrained.startAngle) / angleSteps.value);
    
    musicStore.updateSequencerBeat(selectedIndicator.value.id, { duration: newDuration });
  } else {
    // Move entire indicator
    const newStartAngle = dragStart.value.startAngle + angleDiff;
    const duration = (dragStart.value.endAngle - dragStart.value.startAngle) / angleSteps.value;
    const constrained = constrainAngles(newStartAngle, newStartAngle + duration * angleSteps.value);
    
    const newStep = Math.round(constrained.startAngle / angleSteps.value);
    
    musicStore.updateSequencerBeat(selectedIndicator.value.id, { step: newStep });
  }
  
  triggerUIHaptic();
};

const handleEnd = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value) return;
  
  e.preventDefault();
  e.stopPropagation();
  
  // Handle tap for selection on touch devices (same pattern as knob)
  if ('touches' in e || 'changedTouches' in e) {
    const touchDuration = Date.now() - dragStart.value.time;
    if (touchDuration < 200 && !dragStart.value.moved) {
      // Short tap without movement - just select
    }
  }
  
  isDragging.value = false;
  isDraggingHandle.value = false;
  
  // Remove global event listeners (same pattern as knob)
  if ('touches' in e) {
    document.removeEventListener('touchmove', handleMove);
    document.removeEventListener('touchend', handleEnd);
  } else {
    document.removeEventListener('mousemove', handleMove);
    document.removeEventListener('mouseup', handleEnd);
  }
};

// Control functions
const updateTempo = (newTempo: number) => {
  musicStore.updateSequencerConfig({ tempo: newTempo });
};

const updateOctave = (newOctave: number) => {
  musicStore.updateSequencerConfig({ baseOctave: newOctave });
};

const clearSequencer = () => {
  if (config.value.isPlaying) {
    stopPlayback();
  }
  musicStore.clearSequencerBeats();
  selectedIndicator.value = null;
};

const removeIndicator = (indicatorId: string) => {
  musicStore.removeSequencerBeat(indicatorId);
  if (selectedIndicator.value?.id === indicatorId) {
    selectedIndicator.value = null;
  }
  triggerUIHaptic();
};

// Pattern and melody functions
const loadSelectedPattern = () => {
  if (!selectedPatternName.value) return;
  const pattern = patterns.value.find(p => p.name === selectedPatternName.value);
  if (pattern) {
    musicStore.loadPatternToSequencer(pattern);
  }
};

const saveCurrentMelody = () => {
  if (!newMelodyName.value || indicators.value.length === 0) return;
  
  musicStore.saveMelody(
    newMelodyName.value,
    `Improved sequencer melody with ${indicators.value.length} beats`,
    "Custom"
  );
  
  newMelodyName.value = "";
};

const loadSelectedMelody = () => {
  if (!selectedMelodyId.value) return;
  musicStore.loadMelody(selectedMelodyId.value);
};

// Playback functions
const togglePlayback = async () => {
  if (config.value.isPlaying) {
    stopPlayback();
  } else {
    await startPlayback();
  }
};

const startPlayback = async () => {
  if (indicators.value.length === 0) return;
  
  try {
    await Tone.start();
    const transport = Tone.getTransport();
    
    transport.cancel();
    transport.stop();
    transport.position = 0;
    transport.bpm.value = config.value.tempo;
    
    musicStore.updateSequencerConfig({ isPlaying: true, currentStep: 0 });
    
    sequenceRef = new Tone.Sequence(
      (time, step) => {
        musicStore.updateSequencerConfig({ currentStep: step });
        
        // Play beats that start on this step
        musicStore.sequencerBeats.forEach(beat => {
          if (beat.step === step) {
            musicStore.attackNoteWithOctave(beat.solfegeIndex, beat.octave);
          }
        });
      },
      Array.from({ length: config.value.steps }, (_, i) => i),
      "16n"
    );
    
    sequenceRef.start(0);
    transport.start();
  } catch (error) {
    console.error("Error starting playback:", error);
    stopPlayback();
  }
};

const stopPlayback = () => {
  const transport = Tone.getTransport();
  
  if (sequenceRef) {
    sequenceRef.dispose();
    sequenceRef = null;
  }
  
  transport.cancel();
  transport.stop();
  transport.position = 0;
  
  musicStore.releaseAllNotes();
  musicStore.updateSequencerConfig({ isPlaying: false, currentStep: 0 });
};

// Lifecycle
onMounted(() => {
  // Global event listeners are added/removed per interaction in handleStart/handleEnd
});

onUnmounted(() => {
  stopPlayback();
  // Clean up any remaining global listeners
  document.removeEventListener('mousemove', handleMove);
  document.removeEventListener('mouseup', handleEnd);
  document.removeEventListener('touchmove', handleMove);
  document.removeEventListener('touchend', handleEnd);
});
</script>

<style scoped>
.circular-sequencer-container {
  position: relative;
  width: 400px;
  height: 400px;
  max-width: 100%;
  transition: opacity 0.3s ease;
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

/* Track styles (like knob background arcs) */
.track-circle {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  stroke-width: 6;
  fill: none;
  opacity: 0.3;
  cursor: pointer;
}

.track-circle.hovered {
  opacity: 0.6;
  stroke-width: 8;
}

.track-circle.active {
  opacity: 0.8;
  stroke-width: 10;
}

/* Step marker styles */
.step-marker {
  transition: opacity 0.2s ease;
  pointer-events: none;
}

.track-circle.hovered + .step-marker {
  opacity: 0.4;
}

/* Indicator styles (like knob value arcs) */
.indicator-path {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: pointer;
  stroke-width: 3;
  opacity: 0.8;
  transform-origin: center;
}

.indicator-path:hover,
.indicator-path.hovered {
  transform: scale(1.05);
  opacity: 0.9;
  stroke-width: 4;
}

.indicator-path.selected {
  stroke-width: 4;
  opacity: 1;
  filter: drop-shadow(0 0 8px currentColor);
}

.indicator-path.dragging {
  transform: scale(1.1);
  stroke-width: 5;
  opacity: 1;
}

/* Drag handle styles */
.drag-handle {
  transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  cursor: ew-resize;
  opacity: 0;
  transform: scale(0.8);
  transform-origin: center;
}

.drag-handle.visible {
  opacity: 1;
  transform: scale(1);
}

.drag-handle.active {
  opacity: 1;
  transform: scale(1.2);
}

.drag-handle:hover {
  transform: scale(1.1);
}

/* Solfege labels */
.solfege-label {
  font-weight: bold;
  pointer-events: none;
  font-family: monospace;
}

/* Custom select styles */
select {
  background-image: url("data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3e%3cpath stroke='%23ffffff' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3e%3c/svg%3e");
  background-position: right 8px center;
  background-repeat: no-repeat;
  background-size: 16px;
  padding-right: 32px;
}
</style>