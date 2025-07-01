<template>
  <div class="circular-sequencer">
    <!-- Player Component (Sticky) -->
    <SequencerPlayer
      :is-playing="config.isPlaying"
      :tempo="config.tempo"
      :octave="config.baseOctave"
      @toggle-playback="togglePlayback"
      @clear-sequencer="clearSequencer"
      @update-tempo="updateTempo"
      @update-octave="updateOctave"
    />

    <!-- Main Content Container -->
    <div class="sequencer-content">
      <!-- Circular Sequencer SVG - Full Viewport Width -->
      <div class="sequencer-circle-container">
        <svg
          ref="svgRef"
          viewBox="0 0 400 400"
          class="sequencer-svg bg-gray-800/50 border border-white/20"
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

      <!-- Instructions -->
      <div class="text-center text-white/80 text-sm py-4">
        <p class="mb-1">
          Tap to create beats • Drag black handle to extend • Double-tap to delete
        </p>
        <p class="text-xs opacity-60">
          {{ config.steps }} steps • Outer ring = {{ solfegeData[0]?.name }},
          Inner ring = {{ solfegeData[6]?.name }}
        </p>
      </div>

      <!-- Pattern & Melody Library Component (Sticky) -->
      <div class="library-container">
        <PatternMelodyLibrary
          :patterns="patterns"
          :saved-melodies="savedMelodies"
          :has-beats="beats.length > 0"
          @load-pattern="loadPattern"
          @load-melody="loadMelody"
          @save-melody="saveCurrentMelody"
          @delete-melody="deleteMelody"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useMusicStore } from "@/stores/music";
import { useColorSystem } from "@/composables/useColorSystem";
import type { SequencerBeat, MelodicPattern, SavedMelody } from "@/types/music";
import { calculateNoteDuration } from "@/utils/duration";
import { SequencerTransport } from "@/utils/sequencer";
import * as Tone from "tone";
import SequencerPlayer from "./SequencerPlayer.vue";
import PatternMelodyLibrary from "./PatternMelodyLibrary.vue";

// Store and composables
const musicStore = useMusicStore();
const { getPrimaryColor } = useColorSystem();

// SVG dimensions
const centerX = 200;
const centerY = 200;
const outerRadius = 180;
const innerRadius = 40;
const ringWidth = (outerRadius - innerRadius) / 7;

// Refs
const svgRef = ref<SVGElement | null>(null);

// Interaction state
const isDragging = ref(false);
const dragBeat = ref<SequencerBeat | null>(null);
const selectedBeatId = ref<string | null>(null);
const isDraggingHandle = ref(false);

// Debug state
const debugClick = ref<{ x: number; y: number; ring: number } | null>(null);

// Sequencer transport for Tone.js integration
let sequencerTransport: SequencerTransport | null = null;

// Computed properties
const config = computed(() => musicStore.sequencerConfig);
const beats = computed(() => [...musicStore.sequencerBeats]);
const solfegeData = computed(() => [...musicStore.solfegeData]);
const patterns = computed(() => [...musicStore.getMelodicPatterns()]);
const savedMelodies = computed(() => [...musicStore.savedMelodies]);

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

  const scaleX = 400 / rect.width;
  const scaleY = 400 / rect.height;
  const svgX = (x - rect.left) * scaleX;
  const svgY = (y - rect.top) * scaleY;

  const dx = svgX - centerX;
  const dy = svgY - centerY;
  const radius = Math.sqrt(dx * dx + dy * dy);

  for (let i = 0; i < 7; i++) {
    const ringInner = innerRadius + i * ringWidth - 2;
    const ringOuter = innerRadius + (i + 1) * ringWidth + 2;
    if (radius >= ringInner && radius <= ringOuter) {
      return i;
    }
  }
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
  const solfege = solfegeData.value[6 - ring];
  return solfege ? getPrimaryColor(solfege.name) : "#ffffff";
};

const selectBeat = (beatId: string) => {
  selectedBeatId.value = beatId;
};

const startDragHandle = (e: MouseEvent | TouchEvent, beatId: string) => {
  e.preventDefault();
  e.stopPropagation();
  selectedBeatId.value = beatId;
  isDraggingHandle.value = true;
  isDragging.value = true;
  dragBeat.value = beats.value.find((b) => b.id === beatId) || null;
};

// Event handlers
const handlePointerDown = (e: MouseEvent | TouchEvent) => {
  if ((e.target as HTMLElement).classList.contains("drag-handle")) {
    return;
  }

  e.preventDefault();
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  const angle = getAngleFromPosition(clientX, clientY);
  const ring = getRingFromRadius(clientX, clientY);

  const rect = svgRef.value!.getBoundingClientRect();
  const scaleX = 400 / rect.width;
  const scaleY = 400 / rect.height;
  const svgX = (clientX - rect.left) * scaleX;
  const svgY = (clientY - rect.top) * scaleY;

  debugClick.value = { x: svgX, y: svgY, ring };
  setTimeout(() => {
    debugClick.value = null;
  }, 1000);

  if (ring >= 0 && ring < 7) {
    const clickedBeat = beats.value.find((beat) => {
      const beatAngle = (beat.step / config.value.steps) * 360;
      const beatEndAngle =
        ((beat.step + beat.duration) / config.value.steps) * 360;
      return beat.ring === ring && angle >= beatAngle && angle <= beatEndAngle;
    });

    if (clickedBeat) {
      selectBeat(clickedBeat.id);
    } else {
      const step = Math.floor((angle / 360) * config.value.steps);
      const solfegeIndex = 6 - ring;
      const solfegeArray = solfegeData.value.slice(0, 7);
      const solfege = solfegeArray[solfegeIndex];

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
        selectedBeatId.value = newBeat.id;
      }
    }
  }
};

const handlePointerMove = (e: MouseEvent | TouchEvent) => {
  if (!isDragging.value || !dragBeat.value) return;

  e.preventDefault();
  const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
  const clientY = "touches" in e ? e.touches[0].clientY : e.clientY;

  const angle = getAngleFromPosition(clientX, clientY);
  const startAngle = (dragBeat.value.step / config.value.steps) * 360;

  let angleDiff = (angle - startAngle + 360) % 360;
  let duration = Math.max(
    1,
    Math.round(angleDiff / (360 / config.value.steps))
  );

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
const loadPattern = (pattern: MelodicPattern) => {
  musicStore.loadPatternToSequencer(pattern);
};

const loadMelody = (melody: SavedMelody) => {
  musicStore.loadMelody(melody.id);
};

const saveCurrentMelody = (melodyName: string) => {
  if (!melodyName || beats.value.length === 0) return;
  
  musicStore.saveMelody(
    melodyName,
    `Custom melody with ${beats.value.length} beats`,
    "Custom"
  );
};

const deleteMelody = (melodyId: string) => {
  musicStore.deleteMelody(melodyId);
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
    if (!sequencerTransport) {
      sequencerTransport = new SequencerTransport();
    }

    sequencerTransport.initWithImprovedPart(
      [...beats.value],
      config.value.steps,
      config.value.tempo,
      (beat, time) => {
        const noteDuration = calculateNoteDuration(
          beat.duration,
          config.value.steps,
          config.value.tempo
        );

        musicStore.playNoteWithDuration(
          beat.solfegeIndex,
          beat.octave,
          noteDuration.toneNotation,
          time
        );
      },
      (step, time) => {
        musicStore.updateSequencerConfig({ currentStep: step });
      }
    );

    musicStore.updateSequencerConfig({ isPlaying: true, currentStep: 0 });

    await sequencerTransport.start();

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
  document.addEventListener("mousemove", handlePointerMove);
  document.addEventListener("mouseup", handlePointerUp);
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
.circular-sequencer {
  min-height: 100vh;
  background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
}

.sequencer-content {
  display: flex;
  flex-direction: column;
  min-height: calc(100vh - 80px); /* Account for player height */
}

.sequencer-circle-container {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 2rem;
  min-height: 60vh;
}

.sequencer-svg {
  width: 100%;
  height: 100%;
  max-width: min(80vw, 80vh);
  max-height: min(80vw, 80vh);
  border-radius: 50%;
  cursor: crosshair;
  transition: all 0.3s ease;
}

.sequencer-svg:hover {
  transform: scale(1.02);
  border-color: rgba(255, 255, 255, 0.4);
}

.library-container {
  position: sticky;
  bottom: 0;
  z-index: 30;
  background: rgba(30, 41, 59, 0.95);
  backdrop-filter: blur(12px);
  border-top: 1px solid rgba(255, 255, 255, 0.2);
  padding: 1rem;
}

/* SVG interaction styles */
svg path {
  cursor: pointer;
  transition: opacity 0.2s ease;
}

svg path:hover {
  opacity: 1 !important;
}

.drag-handle {
  transition: fill 0.2s ease;
}

.drag-handle:hover {
  fill: #ef4444 !important;
}

/* Responsive design */
@media (max-width: 768px) {
  .sequencer-circle-container {
    padding: 1rem;
    min-height: 50vh;
  }
  
  .sequencer-svg {
    max-width: 90vw;
    max-height: 90vw;
  }
  
  .library-container {
    padding: 0.75rem;
  }
}

/* Smooth animations */
@media (prefers-reduced-motion: no-preference) {
  .sequencer-svg {
    animation: subtle-rotate 60s linear infinite;
  }
}

@keyframes subtle-rotate {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(1deg);
  }
}
</style>
