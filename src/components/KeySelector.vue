<template>
  <div class="key-selector backdrop-blur-sm rounded-sm">
    <div class="space-y-6">
      <!-- Circle of Fifths -->
      <div class="relative w-80 h-80 mx-auto">
        <!-- Outer circle (Major keys) -->
        <svg class="absolute inset-0 w-full h-full" viewBox="0 0 320 320">
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

          <!-- Major key positions -->
          <g v-for="(key, index) in circleOfFifths" :key="`major-${key}`">
            <circle
              :cx="160 + 120 * Math.cos(((index * 30 - 90) * Math.PI) / 180)"
              :cy="160 + 120 * Math.sin(((index * 30 - 90) * Math.PI) / 180)"
              r="20"
              :fill="
                musicStore.currentKey === key &&
                musicStore.currentMode === 'major'
                  ? 'rgba(251, 191, 36, 0.8)'
                  : 'rgba(255, 255, 255, 0.1)'
              "
              :stroke="
                musicStore.currentKey === key &&
                musicStore.currentMode === 'major'
                  ? 'rgb(251, 191, 36)'
                  : 'rgba(255, 255, 255, 0.3)'
              "
              stroke-width="2"
              class="cursor-pointer transition-all duration-200 hover:fill-yellow-400/50"
              @click="selectKey(key, 'major')"
            />
            <text
              :x="160 + 120 * Math.cos(((index * 30 - 90) * Math.PI) / 180)"
              :y="160 + 120 * Math.sin(((index * 30 - 90) * Math.PI) / 180) + 5"
              text-anchor="middle"
              class="text-sm font-bold fill-white pointer-events-none"
            >
              {{ key }}
            </text>
          </g>

          <!-- Minor key positions (inner circle) -->
          <g v-for="(key, index) in relativeMinors" :key="`minor-${key}`">
            <circle
              :cx="160 + 80 * Math.cos(((index * 30 - 90) * Math.PI) / 180)"
              :cy="160 + 80 * Math.sin(((index * 30 - 90) * Math.PI) / 180)"
              r="16"
              :fill="
                musicStore.currentKey === key &&
                musicStore.currentMode === 'minor'
                  ? 'rgba(168, 85, 247, 0.8)'
                  : 'rgba(255, 255, 255, 0.1)'
              "
              :stroke="
                musicStore.currentKey === key &&
                musicStore.currentMode === 'minor'
                  ? 'rgb(168, 85, 247)'
                  : 'rgba(255, 255, 255, 0.3)'
              "
              stroke-width="2"
              class="cursor-pointer transition-all duration-200 hover:fill-purple-400/50"
              @click="selectKey(key, 'minor')"
            />
            <text
              :x="160 + 80 * Math.cos(((index * 30 - 90) * Math.PI) / 180)"
              :y="160 + 80 * Math.sin(((index * 30 - 90) * Math.PI) / 180) + 4"
              text-anchor="middle"
              class="text-xs font-bold fill-white pointer-events-none"
            >
              {{ key.toLowerCase() }}
            </text>
          </g>

          <!-- Center label -->
          <text
            x="160"
            y="155"
            text-anchor="middle"
            class="text-xs fill-gray-400"
          >
            {{ musicStore.currentKeyDisplay }}
          </text>
        </svg>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useMusicStore } from "@/stores/music";

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

function selectKey(key: string, mode?: "major" | "minor") {
  musicStore.setKey(key);
  if (mode) {
    musicStore.setMode(mode);
  }
}

function selectMode(mode: "major" | "minor") {
  musicStore.setMode(mode);
}
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
</style>
