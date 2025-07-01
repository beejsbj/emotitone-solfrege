<template>
  <div
    class="bg-white/10 backdrop-blur-sm rounded-sm border border-white/20 grid grid-cols-1 gap-4 relative p-4"
  >
    <!-- Header with controls -->
    <div class="flex justify-between items-center mb-4">
      <h2 class="text-xl font-bold text-white">Circular Sequencer</h2>
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
        @update:value="(newValue: number) => updateTempo(newValue)"
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
        @update:value="(newValue: number) => updateOctave(newValue)"
      />
    </div>

    <!-- Circular Sequencer SVG -->
    <div class="flex justify-center mb-4">
      <div class="relative w-96 h-96 max-w-full flex-shrink-0">
        <svg
          ref="svgRef"
          width="400"
          height="400"
          viewBox="0 0 400 400"
          class="bg-gray-800/50 rounded-full border border-white/20 w-full h-full"
          preserveAspectRatio="xMidYMid meet"
          @mousedown="handlePointerDown"
          @mousemove="handlePointerMove"
          @mouseup="handlePointerUp"
          @touchstart="handlePointerDown"
          @touchmove="handlePointerMove"
          @touchend="handlePointerUp"
          style="touch-action: none; user-select: none"
        >
          <!-- Background rings -->
          <circle
            v-for="i in 7"
            :key="`ring-${i}`"
            :cx="centerX"
            :cy="centerY"
            :r="innerRadius + (i - 1) * ringWidth + ringWidth / 2"
            fill="none"
            :stroke="getRingColor(i - 1)"
            :stroke-width="ringWidth * 0.8"
            opacity="0.3"
          />

          <!-- Step markers -->
          <line
            v-for="i in config.steps"
            :key="`step-${i}`"
            :x1="
              polarToCartesian(
                centerX,
                centerY,
                innerRadius,
                ((i - 1) / config.steps) * 360
              ).x
            "
            :y1="
              polarToCartesian(
                centerX,
                centerY,
                innerRadius,
                ((i - 1) / config.steps) * 360
              ).y
            "
            :x2="
              polarToCartesian(
                centerX,
                centerY,
                outerRadius,
                ((i - 1) / config.steps) * 360
              ).x
            "
            :y2="
              polarToCartesian(
                centerX,
                centerY,
                outerRadius,
                ((i - 1) / config.steps) * 360
              ).y
            "
            stroke="rgba(255,255,255,0.2)"
            stroke-width="1"
          />

          <!-- Current step indicator -->
          <line
            v-if="config.isPlaying"
            :x1="
              polarToCartesian(
                centerX,
                centerY,
                innerRadius,
                (config.currentStep / config.steps) * 360
              ).x
            "
            :y1="
              polarToCartesian(
                centerX,
                centerY,
                innerRadius,
                (config.currentStep / config.steps) * 360
              ).y
            "
            :x2="
              polarToCartesian(
                centerX,
                centerY,
                outerRadius,
                (config.currentStep / config.steps) * 360
              ).x
            "
            :y2="
              polarToCartesian(
                centerX,
                centerY,
                outerRadius,
                (config.currentStep / config.steps) * 360
              ).y
            "
            stroke="white"
            stroke-width="3"
          />

          <!-- Beats -->
          <g v-for="beat in beats" :key="beat.id">
            <!-- Selection outline for selected beat -->
            <path
              v-if="selectedBeatId === beat.id"
              :d="createSegmentPath(beat.ring, beat.step, beat.duration)"
              fill="none"
              stroke="white"
              stroke-width="2"
              opacity="0.8"
            />
            <!-- Main beat segment -->
            <path
              :d="createSegmentPath(beat.ring, beat.step, beat.duration)"
              :fill="getRingColor(beat.ring)"
              :stroke="getRingColor(beat.ring)"
              stroke-width="1"
              opacity="0.8"
              @click="selectBeat(beat.id)"
              @dblclick="removeBeat(beat.id)"
              class="cursor-pointer"
            />
            <!-- Drag handle -->
            <rect
              :x="getHandlePosition(beat.ring, beat.step, beat.duration).x - 3"
              :y="getHandlePosition(beat.ring, beat.step, beat.duration).y - 8"
              width="6"
              height="16"
              :fill="
                isDraggingHandle && selectedBeatId === beat.id ? 'red' : 'black'
              "
              rx="2"
              @mousedown="startDragHandle($event, beat.id)"
              @touchstart="startDragHandle($event, beat.id)"
              class="cursor-ew-resize drag-handle"
              style="pointer-events: all"
            />
          </g>

          <!-- Solfege labels (only 7 notes, no Do') -->
          <text
            v-for="(solfege, i) in solfegeData.slice(0, 7)"
            :key="`label-${i}`"
            :x="centerX + innerRadius + i * ringWidth + ringWidth / 2"
            :y="centerY + 5"
            fill="white"
            font-size="12"
            text-anchor="middle"
            class="pointer-events-none font-bold"
          >
            {{ solfege.name }}
          </text>

          <!-- Debug click indicator -->
          <g v-if="debugClick">
            <circle
              :cx="debugClick.x"
              :cy="debugClick.y"
              r="8"
              fill="none"
              stroke="yellow"
              stroke-width="2"
            />
            <text
              :x="debugClick.x"
              :y="debugClick.y - 12"
              fill="yellow"
              font-size="10"
              text-anchor="middle"
              class="pointer-events-none"
            >
              Ring {{ debugClick.ring }}
            </text>
          </g>
        </svg>
      </div>
    </div>

    <!-- Instructions -->
    <div class="text-center text-white/80 text-sm">
      <p class="mb-1">
        Tap to create beats • Drag black handle to extend • Double-tap to delete
      </p>
      <p class="text-xs opacity-60">
        {{ config.steps }} steps • Outer ring = {{ solfegeData[0]?.name }},
        Inner ring = {{ solfegeData[6]?.name }}
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
              :disabled="!newMelodyName || beats.length === 0"
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
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";
import type { SequencerBeat, MelodicPattern } from "@/types/music";
import { calculateNoteDuration } from "@/utils/duration";
import { SequencerTransport } from "@/utils/sequencer";
import * as Tone from "tone";
import Knob from "./Knob.vue";

// Store and composables
const musicStore = useMusicStore();
const { getPrimaryColor } = useColorSystem();

// SVG dimensions
const centerX = 200;
const centerY = 200;
const outerRadius = 180;
const innerRadius = 40;
const ringWidth = (outerRadius - innerRadius) / 7; // Full space divided by 7 rings only

// Refs
const svgRef = ref<SVGElement | null>(null);
const selectedPatternName = ref("");
const selectedMelodyId = ref("");
const newMelodyName = ref("");

// Interaction state
const isDragging = ref(false);
const dragBeat = ref<SequencerBeat | null>(null);

// Debug state
const debugClick = ref<{ x: number; y: number; ring: number } | null>(null);

// Sequencer transport for Tone.js integration
let sequencerTransport: SequencerTransport | null = null;

// Computed properties
const config = computed(() => musicStore.sequencerConfig);
const beats = computed(() => musicStore.sequencerBeats);
const solfegeData = computed(() => musicStore.solfegeData);
const patterns = computed(() => musicStore.getMelodicPatterns());
const savedMelodies = computed(() => musicStore.savedMelodies);

// Format functions for knobs
const formatTempo = (value: number) => `${value}`;
const formatOctave = (value: number) => `${value}`;

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

const getAngleFromPosition = (x: number, y: number): number => {
  if (!svgRef.value) return 0;
  const rect = svgRef.value.getBoundingClientRect();

  // Convert screen coordinates to SVG coordinates
  const scaleX = 400 / rect.width;
  const scaleY = 400 / rect.height;
  const svgX = (x - rect.left) * scaleX;
  const svgY = (y - rect.top) * scaleY;

  const dx = svgX - centerX;
  const dy = svgY - centerY;
  let angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
  if (angle < 0) angle += 360;
  return angle;
};

const getRingFromRadius = (x: number, y: number): number => {
  if (!svgRef.value) return -1;
  const rect = svgRef.value.getBoundingClientRect();

  // Convert screen coordinates to SVG coordinates
  const scaleX = 400 / rect.width;
  const scaleY = 400 / rect.height;
  const svgX = (x - rect.left) * scaleX;
  const svgY = (y - rect.top) * scaleY;

  const dx = svgX - centerX;
  const dy = svgY - centerY;
  const radius = Math.sqrt(dx * dx + dy * dy);

  // Only 7 rings now (0-6), using full space
  // Add some padding to make ring detection more forgiving
  for (let i = 0; i < 7; i++) {
    const ringInner = innerRadius + i * ringWidth - 2; // Slight padding
    const ringOuter = innerRadius + (i + 1) * ringWidth + 2; // Slight padding
    if (radius >= ringInner && radius <= ringOuter) {
      console.log(
        `Detected ring ${i} at radius ${radius.toFixed(
          1
        )} (range: ${ringInner.toFixed(1)}-${ringOuter.toFixed(1)})`
      );
      return i;
    }
  }
  console.log(`No ring detected at radius ${radius.toFixed(1)}`);
  return -1;
};

const createSegmentPath = (
  ring: number,
  step: number,
  duration: number
): string => {
  const innerR = innerRadius + ring * ringWidth + ringWidth * 0.1;
  const outerR = innerRadius + ring * ringWidth + ringWidth * 0.9;
  const startAngle = (step / config.value.steps) * 360;
  const endAngle = ((step + duration) / config.value.steps) * 360;

  const innerStart = polarToCartesian(centerX, centerY, innerR, startAngle);
  const innerEnd = polarToCartesian(centerX, centerY, innerR, endAngle);
  const outerStart = polarToCartesian(centerX, centerY, outerR, startAngle);
  const outerEnd = polarToCartesian(centerX, centerY, outerR, endAngle);

  const largeArcFlag = endAngle - startAngle <= 180 ? "0" : "1";

  return `
    M ${innerStart.x} ${innerStart.y}
    L ${outerStart.x} ${outerStart.y}
    A ${outerR} ${outerR} 0 ${largeArcFlag} 1 ${outerEnd.x} ${outerEnd.y}
    L ${innerEnd.x} ${innerEnd.y}
    A ${innerR} ${innerR} 0 ${largeArcFlag} 0 ${innerStart.x} ${innerStart.y}
    Z
  `;
};

const getHandlePosition = (ring: number, step: number, duration: number) => {
  const radius = innerRadius + ring * ringWidth + ringWidth / 2;
  const angle = ((step + duration) / config.value.steps) * 360;
  return polarToCartesian(centerX, centerY, radius, angle);
};

const getRingColor = (ring: number): string => {
  const solfege = solfegeData.value[6 - ring]; // Reverse for outer = higher (Do=outer, Ti=inner)
  return solfege ? getPrimaryColor(solfege.name) : "#ffffff";
};

// New interaction state
const selectedBeatId = ref<string | null>(null);
const isDraggingHandle = ref(false);

const selectBeat = (beatId: string) => {
  selectedBeatId.value = beatId;
};

const startDragHandle = (e: MouseEvent | TouchEvent, beatId: string) => {
  e.preventDefault();
  e.stopPropagation();
  selectedBeatId.value = beatId;
  isDraggingHandle.value = true;
  isDragging.value = true; // Also set this to ensure move handler works
  dragBeat.value = beats.value.find((b) => b.id === beatId) || null;
  console.log("Started dragging handle for beat:", beatId);
};

// Event handlers
const handlePointerDown = (e: MouseEvent | TouchEvent) => {
  // Don't handle if this event was from a drag handle
  if ((e.target as HTMLElement).classList.contains("drag-handle")) {
    return;
  }

  e.preventDefault();
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  console.log(`Click at screen coordinates: ${clientX}, ${clientY}`);

  const angle = getAngleFromPosition(clientX, clientY);
  const ring = getRingFromRadius(clientX, clientY);

  // Convert to SVG coordinates for debug visualization
  const rect = svgRef.value!.getBoundingClientRect();
  const scaleX = 400 / rect.width;
  const scaleY = 400 / rect.height;
  const svgX = (clientX - rect.left) * scaleX;
  const svgY = (clientY - rect.top) * scaleY;

  // Show debug indicator
  debugClick.value = { x: svgX, y: svgY, ring };
  setTimeout(() => {
    debugClick.value = null;
  }, 1000);

  console.log(`Angle: ${angle.toFixed(1)}°, Ring: ${ring}`);

  if (ring >= 0 && ring < 7) {
    // Check if clicking on existing beat (but not on drag handle)
    const clickedBeat = beats.value.find((beat) => {
      const beatAngle = (beat.step / config.value.steps) * 360;
      const beatEndAngle =
        ((beat.step + beat.duration) / config.value.steps) * 360;
      return beat.ring === ring && angle >= beatAngle && angle <= beatEndAngle;
    });

    if (clickedBeat) {
      // Just select the beat, don't start dragging
      console.log(`Selected existing beat: ${clickedBeat.solfegeName}`);
      selectBeat(clickedBeat.id);
    } else {
      // Create new beat only in empty space
      const step = Math.floor((angle / 360) * config.value.steps);
      const solfegeIndex = 6 - ring; // Reverse for outer = higher (ring 0 = Do, ring 6 = Ti)
      const solfegeArray = solfegeData.value.slice(0, 7);
      const solfege = solfegeArray[solfegeIndex]; // Only use first 7 notes

      console.log(
        `Creating beat: ring=${ring}, solfegeIndex=${solfegeIndex}, note=${solfege?.name}`
      );

      if (solfege && solfegeIndex >= 0 && solfegeIndex < 7) {
        const newBeat: SequencerBeat = {
          id: `beat-${Date.now()}-${Math.random()}`,
          ring,
          step,
          duration: 1,
          solfegeName: solfege.name,
          solfegeIndex,
          octave: config.value.baseOctave,
        };

        musicStore.addSequencerBeat(newBeat);
        selectBeat(newBeat.id);
        console.log(`Created new beat: ${solfege.name} at ring ${ring}`);
      } else {
        console.log(
          `Failed to create beat - invalid solfege index: ${solfegeIndex}`
        );
      }
    }
  } else {
    console.log(`Click outside valid ring area (ring: ${ring})`);
  }
};

const handlePointerMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !dragBeat.value) return;

  e.preventDefault();
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  const angle = getAngleFromPosition(clientX, clientY);
  const startAngle = (dragBeat.value.step / config.value.steps) * 360;

  // Calculate duration based on angle difference
  let angleDiff = (angle - startAngle + 360) % 360;
  let duration = Math.max(
    1,
    Math.round(angleDiff / (360 / config.value.steps))
  );

  // Ensure duration doesn't exceed available steps
  const maxDuration = config.value.steps - dragBeat.value.step;
  duration = Math.min(duration, maxDuration);

  if (isDraggingHandle.value) {
    console.log("Dragging handle - new duration:", duration);
  }

  musicStore.updateSequencerBeat(dragBeat.value.id, { duration });
};

const handlePointerUp = () => {
  if (isDraggingHandle.value) {
    console.log("Finished dragging handle");
  }
  isDragging.value = false;
  isDraggingHandle.value = false;
  dragBeat.value = null;
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
};

const removeBeat = (beatId: string) => {
  musicStore.removeSequencerBeat(beatId);
};

// Pattern and melody functions
const loadSelectedPattern = () => {
  if (!selectedPatternName.value) return;
  const pattern = patterns.value.find(
    (p) => p.name === selectedPatternName.value
  );
  if (pattern) {
    musicStore.loadPatternToSequencer(pattern);
  }
};

const saveCurrentMelody = () => {
  if (!newMelodyName.value || beats.value.length === 0) return;

  musicStore.saveMelody(
    newMelodyName.value,
    `Custom melody with ${beats.value.length} beats`,
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
  if (beats.value.length === 0) return;

  try {
    // Initialize sequencer transport if not already done
    if (!sequencerTransport) {
      sequencerTransport = new SequencerTransport();
    }

    // Initialize with Part for optimal scheduling
    sequencerTransport.initWithPart(
      [...beats.value], // Convert readonly array to mutable
      config.value.steps,
      config.value.tempo,
      (solfegeIndex, octave, duration, time) => {
        // Play the note with the calculated duration
        musicStore.playNoteWithDuration(solfegeIndex, octave, duration, time);
      }
    );

    musicStore.updateSequencerConfig({ isPlaying: true, currentStep: 0 });

    // Start playback
    await sequencerTransport.start();
    
    // Set up step tracking (optional for visual feedback)
    // We can use a simple interval for step indication since Tone.Part handles the music
    let stepTracker = 0;
    const stepInterval = setInterval(() => {
      if (sequencerTransport?.isPlaying) {
        musicStore.updateSequencerConfig({ currentStep: stepTracker });
        stepTracker = (stepTracker + 1) % config.value.steps;
      } else {
        clearInterval(stepInterval);
      }
    }, (60 / config.value.tempo / 4) * 1000); // 16th note intervals

  } catch (error) {
    console.error("Error starting playback:", error);
    stopPlayback();
  }
};

const stopPlayback = () => {
  if (sequencerTransport) {
    sequencerTransport.stop();
  }

  musicStore.releaseAllNotes();
  musicStore.updateSequencerConfig({ isPlaying: false, currentStep: 0 });
};

// Lifecycle
onMounted(() => {
  // Add global mouse event listeners for drag operations
  document.addEventListener("mousemove", handlePointerMove);
  document.addEventListener("mouseup", handlePointerUp);
  // Prevent context menu on drag handles
  document.addEventListener("contextmenu", (e) => {
    if ((e.target as HTMLElement).classList.contains("drag-handle")) {
      e.preventDefault();
    }
  });
});

onUnmounted(() => {
  stopPlayback();
  if (sequencerTransport) {
    sequencerTransport.dispose();
    sequencerTransport = null;
  }
  document.removeEventListener("mousemove", handlePointerMove);
  document.removeEventListener("mouseup", handlePointerUp);
});
</script>

<style scoped>
/* Ensure SVG is interactive */
svg {
  cursor: crosshair;
}

svg path {
  cursor: pointer;
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
