<template>
  <div class="p-8 space-y-8">
    <h2 class="text-2xl font-bold text-white mb-6">Unified Knob System Demo</h2>

    <!-- Core Knob Types -->
    <div class="grid grid-cols-2 md:grid-cols-4 gap-8">
      <!-- Range Knob -->
      <div class="text-center">
        <h3 class="text-lg font-semibold text-white mb-4">Range Knob</h3>
        <Knob
          v-model="rangeValue"
          type="range"
          label="Volume"
          :min="0"
          :max="100"
          :step="1"
          theme-color="hsla(43, 96%, 56%, 1)"
          :format-value="(v) => `${v}%`"
        />
        <p class="text-sm text-gray-400 mt-2">Value: {{ rangeValue }}</p>
      </div>

      <!-- Boolean Knob -->
      <div class="text-center">
        <h3 class="text-lg font-semibold text-white mb-4">Boolean Knob</h3>
        <Knob
          v-model="booleanValue"
          type="boolean"
          label="Enable"
          theme-color="hsla(0, 84%, 60%, 1)"
        />
        <p class="text-sm text-gray-400 mt-2">Value: {{ booleanValue }}</p>
      </div>

      <!-- Options Knob (String Array) -->
      <div class="text-center">
        <h3 class="text-lg font-semibold text-white mb-4">Options Knob</h3>
        <Knob
          v-model="optionsValue"
          type="options"
          label="Scale"
          :options="['Major', 'Minor', 'Dorian', 'Mixolydian']"
          theme-color="hsla(271, 91%, 65%, 1)"
        />
        <p class="text-sm text-gray-400 mt-2">Value: {{ optionsValue }}</p>
      </div>

      <!-- Options Knob (Object Array with Colors) -->
      <div class="text-center">
        <h3 class="text-lg font-semibold text-white mb-4">Colored Options</h3>
        <Knob
          v-model="coloredOptionsValue"
          type="options"
          label="Mood"
          :options="coloredOptions"
        />
        <p class="text-sm text-gray-400 mt-2">
          Value: {{ coloredOptionsValue }}
        </p>
      </div>
    </div>

    <!-- Auto-Detection Examples -->
    <div class="grid grid-cols-1 md:grid-cols-3 gap-8 mt-12">
      <div class="text-center">
        <h3 class="text-lg font-semibold text-white mb-4">Auto-Detect Range</h3>
        <Knob
          v-model="fineValue"
          label="Detune"
          :min="-50"
          :max="50"
          :step="0.1"
          theme-color="hsla(188, 95%, 43%, 1)"
          :format-value="(v) => `${v.toFixed(1)}¢`"
        />
        <p class="text-sm text-gray-400 mt-2">
          Value: {{ fineValue }} (auto-detected as range)
        </p>
      </div>

      <div class="text-center">
        <h3 class="text-lg font-semibold text-white mb-4">
          Auto-Detect Boolean
        </h3>
        <Knob
          v-model="autoDetectBoolean"
          label="Toggle"
          :min="0"
          :max="1"
          :step="1"
          theme-color="hsla(328, 85%, 70%, 1)"
        />
        <p class="text-sm text-gray-400 mt-2">
          Value: {{ autoDetectBoolean }} (auto-detected as boolean)
        </p>
      </div>

      <div class="text-center">
        <h3 class="text-lg font-semibold text-white mb-4">
          Auto-Detect Options
        </h3>
        <Knob
          v-model="autoDetectOptions"
          label="Mode"
          :options="['Rock', 'Jazz', 'Classical']"
          theme-color="hsla(21, 90%, 48%, 1)"
        />
        <p class="text-sm text-gray-400 mt-2">
          Value: {{ autoDetectOptions }} (auto-detected as options)
        </p>
      </div>
    </div>

    <!-- Specialized Knobs -->
    <div class="mt-16">
      <h2 class="text-2xl font-bold text-white mb-6">Specialized Knobs</h2>

      <div class="grid grid-cols-2 gap-8">
        <!-- Button Knobs -->
        <div class="space-y-8">
          <h3 class="text-lg font-semibold text-white text-center">
            Button Knobs
          </h3>
          <p class="text-sm text-gray-400 text-center">
            Interactive buttons with custom text, loading states, and semantic
            colors
          </p>

          <div class="grid grid-cols-3 gap-4">
            <!-- Play Button -->
            <div class="text-center">
              <ButtonKnob
                v-model="playButtonState"
                param-name="Play"
                button-text="PLAY"
                active-text="STOP"
                :ready-color="'hsla(120, 70%, 50%, 1)'"
                :active-color="'hsla(0, 84%, 60%, 1)'"
                :is-loading="playLoading"
              />
              <div class="mt-2 space-y-1">
                <button
                  @click="togglePlay"
                  class="px-3 py-1 bg-gray-700 text-white rounded text-xs"
                >
                  Toggle Play
                </button>
                <button
                  @click="simulateLoading"
                  class="px-3 py-1 bg-gray-700 text-white rounded text-xs"
                >
                  Simulate Load
                </button>
              </div>
            </div>

            <!-- Mute Button -->
            <div class="text-center">
              <ButtonKnob
                v-model="muteButtonState"
                param-name="Mute"
                button-text="MUTE"
                active-text="MUTED"
                :ready-color="'hsla(200, 70%, 50%, 1)'"
                :active-color="'hsla(0, 84%, 60%, 1)'"
              />
              <button
                @click="toggleMuteButton"
                class="mt-2 px-3 py-1 bg-gray-700 text-white rounded text-xs"
              >
                Toggle Mute
              </button>
            </div>

            <!-- Record Button -->
            <div class="text-center">
              <ButtonKnob
                v-model="recordButtonState"
                param-name="Record"
                button-text="REC"
                active-text="REC"
                :ready-color="'hsla(0, 0%, 50%, 1)'"
                :active-color="'hsla(0, 84%, 60%, 1)'"
              />
              <button
                @click="toggleRecord"
                class="mt-2 px-3 py-1 bg-gray-700 text-white rounded text-xs"
              >
                Toggle Record
              </button>
            </div>
          </div>
        </div>

        <!-- Display Knobs -->
        <div class="space-y-8">
          <h3 class="text-lg font-semibold text-white text-center">
            Display Knobs
          </h3>
          <p class="text-sm text-gray-400 text-center">
            Read-only displays with progress arcs and live updates
          </p>

          <div class="grid grid-cols-3 gap-4">
            <!-- BPM Display -->
            <div class="text-center">
              <RangeKnob
                :model-value="75"
                :min="0"
                :max="100"
                mode="display"
                label="Progress"
                theme-color="hsla(200, 100%, 60%, 1)"
              />
              <button
                @click="changeBPM"
                class="mt-2 px-3 py-1 bg-gray-700 text-white rounded text-xs"
              >
                Random BPM
              </button>
            </div>

            <!-- CPU Usage -->
            <div class="text-center">
              <RangeKnob
                :model-value="42"
                :min="0"
                :max="100"
                mode="display"
                :format-value="(v) => `${v}%`"
                label="CPU"
                theme-color="hsla(120, 70%, 50%, 1)"
              />
              <button
                @click="simulateCPU"
                class="mt-2 px-3 py-1 bg-gray-700 text-white rounded text-xs"
              >
                CPU Spike
              </button>
            </div>

            <!-- Voice Count -->
            <div class="text-center">
              <RangeKnob
                :model-value="128"
                :min="0"
                :max="255"
                mode="display"
                :format-value="(v) => `0x${v.toString(16).toUpperCase()}`"
                label="Hex"
                theme-color="hsla(300, 80%, 60%, 1)"
              />
              <button
                @click="changeVoices"
                class="mt-2 px-3 py-1 bg-gray-700 text-white rounded text-xs"
              >
                Random Voices
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { Knob, ButtonKnob, RangeKnob } from "@/components/knobs";
import type { KnobOption } from "@/types/knob";

// Core knob demo values
const rangeValue = ref(75);
const booleanValue = ref(false);
const optionsValue = ref("Major");
const coloredOptionsValue = ref("happy");
const fineValue = ref(0);
const autoDetectBoolean = ref(0);
const autoDetectOptions = ref("Rock");

// Specialized knob demo values
const playButtonState = ref(false);
const muteButtonState = ref(false);
const recordButtonState = ref(false);
const playLoading = ref(false);
const currentBPM = ref(120);
const cpuUsage = ref(25);
const voiceCount = ref(8);

// Animation intervals
let bpmInterval: number | null = null;
let cpuInterval: number | null = null;
let voiceInterval: number | null = null;

// Methods for specialized knobs
const togglePlay = () => {
  if (playLoading.value) return; // Don't toggle while loading

  if (!playButtonState.value) {
    // Starting playback - show loading
    playLoading.value = true;
    setTimeout(() => {
      playButtonState.value = true;
      playLoading.value = false;
    }, 2000); // 2 second loading simulation
  } else {
    // Stopping playback - immediate
    playButtonState.value = false;
  }
};

const toggleMuteButton = () => {
  muteButtonState.value = !muteButtonState.value;
};

const toggleRecord = () => {
  recordButtonState.value = !recordButtonState.value;
};

const simulateLoading = () => {
  playLoading.value = true;
  setTimeout(() => {
    playLoading.value = false;
  }, 3000);
};

const changeBPM = () => {
  // Stop auto-animation and set a random value
  if (bpmInterval) {
    clearInterval(bpmInterval);
    bpmInterval = null;
  }
  currentBPM.value = Math.floor(Math.random() * 120) + 60; // Random BPM between 60-180

  // Restart auto-animation after a brief pause
  setTimeout(startBPMAnimation, 2000);
};

const simulateCPU = () => {
  // Stop auto-animation and spike the CPU
  if (cpuInterval) {
    clearInterval(cpuInterval);
    cpuInterval = null;
  }
  cpuUsage.value = Math.floor(Math.random() * 40) + 60; // High CPU usage

  // Restart auto-animation after a brief pause
  setTimeout(startCPUAnimation, 2000);
};

const changeVoices = () => {
  // Stop auto-animation and set random voices
  if (voiceInterval) {
    clearInterval(voiceInterval);
    voiceInterval = null;
  }
  voiceCount.value = Math.floor(Math.random() * 32); // Random voice count

  // Restart auto-animation after a brief pause
  setTimeout(startVoiceAnimation, 3000);
};

// Auto-animation functions
const startBPMAnimation = () => {
  if (bpmInterval) clearInterval(bpmInterval);
  bpmInterval = setInterval(() => {
    // Slowly drift BPM up and down
    const change = (Math.random() - 0.5) * 4;
    const newBPM = Math.max(60, Math.min(180, currentBPM.value + change));
    currentBPM.value = Math.round(newBPM);
  }, 800);
};

const startCPUAnimation = () => {
  if (cpuInterval) clearInterval(cpuInterval);
  cpuInterval = setInterval(() => {
    // Simulate CPU spikes and valleys
    const base = 20 + Math.sin(Date.now() / 2000) * 15; // Smooth wave
    const spike = Math.random() < 0.1 ? Math.random() * 30 : 0; // Occasional spikes
    cpuUsage.value = Math.max(0, Math.min(100, Math.round(base + spike)));
  }, 400);
};

const startVoiceAnimation = () => {
  if (voiceInterval) clearInterval(voiceInterval);
  voiceInterval = setInterval(() => {
    // Simulate voice allocation changes
    const change =
      Math.random() < 0.3
        ? (Math.random() < 0.5 ? -1 : 1) * Math.floor(Math.random() * 3)
        : 0;
    voiceCount.value = Math.max(0, Math.min(32, voiceCount.value + change));
  }, 1200);
};

// Start animations on mount
onMounted(() => {
  // Start after a brief delay so user can see initial values
  setTimeout(() => {
    startBPMAnimation();
    startCPUAnimation();
    startVoiceAnimation();
  }, 1500);
});

// Cleanup on unmount
onUnmounted(() => {
  if (bpmInterval) clearInterval(bpmInterval);
  if (cpuInterval) clearInterval(cpuInterval);
  if (voiceInterval) clearInterval(voiceInterval);
});

// Colored options for demo
const coloredOptions: KnobOption[] = [
  { label: "Happy", value: "happy", color: "yellow" },
  { label: "Sad", value: "sad", color: "blue" },
  { label: "Angry", value: "angry", color: "red" },
  { label: "Calm", value: "calm", color: "green" },
  { label: "Excited", value: "excited", color: "orange" },
];
</script>
