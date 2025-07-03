<template>
  <div
    class="key-selector transition-all duration-300 absolute top-0 left-0 w-full bg-black/70 backdrop-blur-sm rounded-sm border border-white/20"
    :class="{
      'transform translate-y-[60%]': isCollapsed,
      'transform translate-y-0': !isCollapsed,
    }"
  >
    <!-- Floating Toggle Button -->
    <button
      @click="toggleCollapsed"
      class="absolute top-2 left-4 transform -translate-y-full px-4 z-10 bg-gradient-to-b from-gray-700/80 to-black p-2 hover:bg-white/40 transition-all duration-200 group rounded-lg flex items-center gap-2"
    >
      Keys
      <ChevronDown
        :size="16"
        class="text-white/80 transition-transform duration-300"
        :class="{ 'rotate-180': isCollapsed }"
      />
    </button>

    <!-- Circle of Fifths -->
    <div class="relative w-80 h-80 mx-auto">
      <!-- Outer circle (Major keys) -->
      <svg
        class="absolute inset-0 w-full h-full cursor-grab select-none"
        :class="{ 'cursor-grabbing': isDragging }"
        viewBox="0 0 320 320"
        @mousedown="startDrag"
        @touchstart="startDrag"
        @mousemove="onDrag"
        @touchmove="onDrag"
        @mouseup="endDrag"
        @touchend="endDrag"
        @mouseleave="endDrag"
      >
        <!-- Background circles -->
        <circle
          cx="160"
          cy="160"
          r="140"
          fill="rgba(255,255,255,0.05)"
          stroke="rgba(255,255,255,0.1)"
          stroke-width="1"
        />
        <circle
          cx="160"
          cy="160"
          r="100"
          fill="rgba(255,255,255,0.03)"
          stroke="rgba(255,255,255,0.1)"
          stroke-width="1"
        />

        <!-- Top indicator -->
        <g>
          <polygon
            points="160,20 150,35 170,35"
            fill="rgba(251, 191, 36, 0.8)"
            stroke="rgb(251, 191, 36)"
            stroke-width="1"
          />
        </g>

        <!-- Major key positions -->
        <g :transform="`rotate(${-rotationAngle} 160 160)`">
          <g v-for="(key, index) in circleOfFifths" :key="`major-${key}`">
            <circle
              :cx="160 + 120 * Math.cos(((index * 30 - 90) * Math.PI) / 180)"
              :cy="160 + 120 * Math.sin(((index * 30 - 90) * Math.PI) / 180)"
              r="20"
              :fill="
                key === selectedKey && musicStore.currentMode === 'major'
                  ? 'rgba(251, 191, 36, 0.8)'
                  : 'rgba(255, 255, 255, 0.1)'
              "
              :stroke="
                key === selectedKey && musicStore.currentMode === 'major'
                  ? 'rgb(251, 191, 36)'
                  : 'rgba(255, 255, 255, 0.3)'
              "
              stroke-width="2"
              class="transition-all duration-200 pointer-events-none"
            />
            <text
              :x="160 + 120 * Math.cos(((index * 30 - 90) * Math.PI) / 180)"
              :y="160 + 120 * Math.sin(((index * 30 - 90) * Math.PI) / 180) + 5"
              text-anchor="middle"
              class="text-sm font-bold fill-white pointer-events-none"
              :transform="`rotate(${rotationAngle} ${
                160 + 120 * Math.cos(((index * 30 - 90) * Math.PI) / 180)
              } ${160 + 120 * Math.sin(((index * 30 - 90) * Math.PI) / 180)})`"
            >
              {{ key }}
            </text>
          </g>
        </g>

        <!-- Minor key positions (inner circle) -->
        <g :transform="`rotate(${-rotationAngle} 160 160)`">
          <g v-for="(key, index) in relativeMinors" :key="`minor-${key}`">
            <circle
              :cx="160 + 80 * Math.cos(((index * 30 - 90) * Math.PI) / 180)"
              :cy="160 + 80 * Math.sin(((index * 30 - 90) * Math.PI) / 180)"
              r="16"
              :fill="
                key === selectedMinorKey && musicStore.currentMode === 'minor'
                  ? 'rgba(168, 85, 247, 0.8)'
                  : 'rgba(255, 255, 255, 0.1)'
              "
              :stroke="
                key === selectedMinorKey && musicStore.currentMode === 'minor'
                  ? 'rgb(168, 85, 247)'
                  : 'rgba(255, 255, 255, 0.3)'
              "
              stroke-width="2"
              class="transition-all duration-200 pointer-events-none"
            />
            <text
              :x="160 + 80 * Math.cos(((index * 30 - 90) * Math.PI) / 180)"
              :y="160 + 80 * Math.sin(((index * 30 - 90) * Math.PI) / 180) + 4"
              text-anchor="middle"
              class="text-xs font-bold fill-white pointer-events-none"
              :transform="`rotate(${rotationAngle} ${
                160 + 80 * Math.cos(((index * 30 - 90) * Math.PI) / 180)
              } ${160 + 80 * Math.sin(((index * 30 - 90) * Math.PI) / 180)})`"
            >
              {{ key.toLowerCase() }}
            </text>
          </g>
        </g>

        <!-- Center key display (moved below mode knob) -->
        <text
          x="160"
          y="195"
          text-anchor="middle"
          class="text-xs fill-gray-400 pointer-events-none"
        >
          {{ musicStore.currentKeyDisplay }}
        </text>
      </svg>

      <!-- Mode selector knob in center -->
      <div
        class="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-10"
      >
        <Knob
          :model-value="musicStore.currentMode"
          type="options"
          :options="[
            { label: 'Major', value: 'major', color: 'yellow' },
            { label: 'Minor', value: 'minor', color: 'purple' },
          ]"
          label="Mode"
          @update:modelValue="musicStore.setMode"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/stores/music";
import { ref, computed, watch, onMounted, nextTick } from "vue";
import { ChevronDown } from "lucide-vue-next";
import { Knob } from "./knobs";

const musicStore = useMusicStore();

// Circle of Fifths order (starting from C at 12 o'clock, going clockwise)
const circleOfFifths = [
  "C",
  "G",
  "D",
  "A",
  "E",
  "B",
  "F#",
  "C#",
  "G#",
  "D#",
  "A#",
  "F",
];

// Relative minor keys (corresponding to the major keys above)
const relativeMinors = [
  "A",
  "E",
  "B",
  "F#",
  "C#",
  "G#",
  "D#",
  "A#",
  "F",
  "C",
  "G",
  "D",
];

// Collapse state
const isCollapsed = ref(true);
const rotationAngle = ref(0);
const isDragging = ref(false);
const lastAngle = ref(0);
const centerX = 160;
const centerY = 160;
const isSnapping = ref(false);

// Calculate which key is currently at the top position
const selectedKey = computed(() => {
  // Normalize rotation angle to 0-360 range
  const normalizedAngle = ((rotationAngle.value % 360) + 360) % 360;
  // Calculate which key index is at the top
  const keyIndex = Math.round(normalizedAngle / 30) % 12;
  return circleOfFifths[keyIndex];
});

const selectedMinorKey = computed(() => {
  // Same calculation for minor keys
  const normalizedAngle = ((rotationAngle.value % 360) + 360) % 360;
  const keyIndex = Math.round(normalizedAngle / 30) % 12;
  return relativeMinors[keyIndex];
});

// Calculate the nearest snap position
const nearestSnapAngle = computed(() => {
  const normalizedAngle = ((rotationAngle.value % 360) + 360) % 360;
  const keyIndex = Math.round(normalizedAngle / 30);
  return keyIndex * 30;
});

// Initialize rotation angle based on current key and mode
function initializeRotation() {
  const currentKey = musicStore.currentKey;
  const currentMode = musicStore.currentMode;

  let keyIndex = 0;
  if (currentMode === "major") {
    keyIndex = circleOfFifths.indexOf(currentKey);
  } else {
    keyIndex = relativeMinors.indexOf(currentKey);
  }

  // If key not found, default to 0 (C major or A minor)
  if (keyIndex === -1) keyIndex = 0;

  rotationAngle.value = keyIndex * 30;
}

// Watch for changes in selected key and update the music store
watch(selectedKey, (newKey) => {
  if (musicStore.currentMode === "major") {
    musicStore.setKey(newKey);
  }
});

watch(selectedMinorKey, (newKey) => {
  if (musicStore.currentMode === "minor") {
    musicStore.setKey(newKey);
  }
});

// Watch for mode changes and update the key accordingly
watch(
  () => musicStore.currentMode,
  (newMode) => {
    if (newMode === "major") {
      musicStore.setKey(selectedKey.value);
    } else {
      musicStore.setKey(selectedMinorKey.value);
    }
  }
);

// Watch for external key changes (from other components) and sync rotation
watch(
  () => musicStore.currentKey,
  (newKey) => {
    if (!isDragging.value && !isSnapping.value) {
      initializeRotation();
    }
  }
);

// Initialize on mount
onMounted(() => {
  nextTick(() => {
    initializeRotation();
  });
});

function getEventPosition(event: MouseEvent | TouchEvent) {
  if (event instanceof TouchEvent) {
    return {
      x: event.touches[0]?.clientX || event.changedTouches[0]?.clientX || 0,
      y: event.touches[0]?.clientY || event.changedTouches[0]?.clientY || 0,
    };
  }
  return { x: event.clientX, y: event.clientY };
}

function calculateAngle(x: number, y: number, rect: DOMRect) {
  const svgX = ((x - rect.left) / rect.width) * 320;
  const svgY = ((y - rect.top) / rect.height) * 320;

  const deltaX = svgX - centerX;
  const deltaY = svgY - centerY;

  return Math.atan2(deltaY, deltaX) * (180 / Math.PI);
}

function snapToNearestKey() {
  if (isSnapping.value) return;

  isSnapping.value = true;
  const targetAngle = nearestSnapAngle.value;
  const currentAngle = rotationAngle.value;

  // Calculate the shortest path to the target angle
  let angleDiff = targetAngle - (currentAngle % 360);
  if (angleDiff > 180) angleDiff -= 360;
  if (angleDiff < -180) angleDiff += 360;

  const finalAngle = currentAngle + angleDiff;

  // Animate to the snap position
  const startAngle = currentAngle;
  const duration = 200; // ms
  const startTime = Date.now();

  function animate() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);

    // Easing function for smooth animation
    const easeOut = 1 - Math.pow(1 - progress, 3);

    rotationAngle.value = startAngle + (finalAngle - startAngle) * easeOut;

    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      isSnapping.value = false;
    }
  }

  requestAnimationFrame(animate);
}

function startDrag(event: MouseEvent | TouchEvent) {
  if (isSnapping.value) return;

  event.preventDefault();
  isDragging.value = true;

  const position = getEventPosition(event);
  const rect = (event.target as SVGElement)
    .closest("svg")
    ?.getBoundingClientRect();

  if (rect) {
    lastAngle.value = calculateAngle(position.x, position.y, rect);
  }
}

function onDrag(event: MouseEvent | TouchEvent) {
  if (!isDragging.value || isSnapping.value) return;

  event.preventDefault();
  const position = getEventPosition(event);
  const rect = (event.target as SVGElement)
    .closest("svg")
    ?.getBoundingClientRect();

  if (rect) {
    const currentAngle = calculateAngle(position.x, position.y, rect);
    let angleDiff = currentAngle - lastAngle.value;

    // Handle angle wrapping
    if (angleDiff > 180) angleDiff -= 360;
    if (angleDiff < -180) angleDiff += 360;

    // Negate the angle difference to fix the inverted rotation direction
    rotationAngle.value -= angleDiff;
    lastAngle.value = currentAngle;
  }
}

function endDrag() {
  if (!isDragging.value) return;

  isDragging.value = false;

  // Snap to the nearest key position
  snapToNearestKey();
}

function selectKey(key: string, mode?: "major" | "minor") {
  musicStore.setKey(key);
  if (mode) {
    musicStore.setMode(mode);
  }
}

function selectMode(mode: "major" | "minor") {
  musicStore.setMode(mode);
}

// Toggle collapse function
const toggleCollapsed = () => {
  isCollapsed.value = !isCollapsed.value;
};
</script>

<style scoped>
.key-button:active {
  transform: scale(0.95);
}

.mode-button:active {
  transform: scale(0.98);
}

.note-display {
  transition: all 0.2s ease;
}

.note-display:hover {
  background-color: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

svg {
  touch-action: none;
}

.scrollbar-hide {
  -ms-overflow-style: none; /* Internet Explorer 10+ */
  scrollbar-width: none; /* Firefox */
}

.scrollbar-hide::-webkit-scrollbar {
  display: none; /* Safari and Chrome */
}
</style>
