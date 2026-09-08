<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import LoadingScreen from "../components/compositions/LoadingScreen.vue";

const progress = ref(38);
const playing = ref(true);
let timer: ReturnType<typeof setInterval> | undefined;

const phase = computed(() => {
  if (progress.value >= 100) return "Ready to play";
  if (progress.value >= 96) return "Checking MIDI input";
  if (progress.value >= 90) return "Finishing soundcheck";
  if (progress.value >= 64) return "Preparing audio";
  if (progress.value >= 18) return "Loading instrument samples";
  return "Waking the visual stage";
});

const message = computed(() => {
  if (progress.value >= 100) return "Everything is tuned. Your first note is waiting.";
  if (progress.value >= 96) return "Checking browser support; controllers can join anytime.";
  if (progress.value >= 90) return "One last breath before the room becomes yours.";
  if (progress.value >= 64) return "Connecting the sound engine to your instrument.";
  if (progress.value >= 18) return "Gathering piano, strings, brass, and the rest of the room.";
  return "Preparing the canvas where sound becomes shape.";
});

const stages = computed(() => {
  const definitions = [
    { label: "Visual stage", start: 0, end: 18 },
    { label: "Instrument samples", start: 18, end: 64 },
    { label: "Audio system", start: 64, end: 90 },
    { label: "Ready to play", start: 90, end: 96 },
    { label: "MIDI input", start: 96, end: 100, icon: "midi" as const },
  ];

  return definitions.map((stage) => ({
    label: stage.label,
    icon: stage.icon,
    complete: progress.value >= stage.end,
    active: progress.value >= stage.start && progress.value < stage.end,
  }));
});

function tick() {
  if (!playing.value) return;
  if (progress.value >= 100) {
    playing.value = false;
    return;
  }
  progress.value = Math.min(100, progress.value + 1);
  if (progress.value === 100) playing.value = false;
}

function togglePlaying() {
  playing.value = !playing.value;
}

function restart() {
  progress.value = 0;
  playing.value = true;
}

function enterApp() {
  window.location.assign("/");
}

onMounted(() => {
  timer = setInterval(tick, 110);
});

onBeforeUnmount(() => {
  if (timer) clearInterval(timer);
});
</script>

<template>
  <main class="loading-lab">
    <header class="loading-lab__controls">
      <div class="loading-lab__title">
        <strong>B · CHROMATIC BARS</strong>
        <span>Loading screen workbench · Ink</span>
      </div>

      <div class="loading-lab__playback">
        <label>
          <span>PROGRESS {{ progress }}%</span>
          <input
            v-model.number="progress"
            type="range"
            min="0"
            max="100"
            step="1"
            @pointerdown="playing = false"
            @keydown="playing = false"
          >
        </label>
        <button type="button" @click="togglePlaying">{{ playing ? "PAUSE" : "PLAY" }}</button>
        <button type="button" @click="restart">RESTART</button>
      </div>
    </header>

    <section class="loading-lab__preview" aria-label="Chromatic Bars preview">
      <LoadingScreen
        :progress="progress"
        :stages="stages"
        :phase="phase"
        :message="message"
        @start="enterApp"
      />
    </section>
  </main>
</template>

<style scoped>
.loading-lab {
  display: grid;
  width: 100%;
  height: 100dvh;
  min-height: 0;
  overflow: hidden;
  grid-template-rows: auto minmax(0, 1fr);
  background: var(--ink);
}

.loading-lab__controls {
  position: relative;
  z-index: 100;
  display: grid;
  min-height: 66px;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 22px;
  padding: 10px 16px;
  border-bottom: 1px solid var(--ink-5);
  background: var(--ink-2);
  color: var(--ivory);
}

.loading-lab__title {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.loading-lab__title strong {
  font: var(--t-label);
  letter-spacing: .15em;
}

.loading-lab__title span,
.loading-lab__playback label > span {
  color: var(--ivory-3);
  font: var(--t-caption);
  font-size: 9px;
}

.loading-lab button {
  min-height: 42px;
  border: 1px solid var(--ink-5);
  background: var(--ink-3);
  color: var(--ivory-2);
  cursor: pointer;
  font: var(--t-label);
  letter-spacing: .06em;
  padding: 8px 10px;
}

.loading-lab__playback {
  display: flex;
  align-items: center;
  gap: 6px;
}

.loading-lab__playback label {
  display: flex;
  width: 154px;
  flex-direction: column;
  gap: 2px;
}

.loading-lab__playback input { width: 100%; accent-color: var(--mustard); }
.loading-lab__playback button { min-height: 42px; font-size: 9px; }
.loading-lab button:active { transform: scale(.97); }

.loading-lab__preview {
  height: 100%;
  min-height: 0;
  overflow: hidden;
}

.loading-lab__preview > :deep(*) {
  height: 100%;
  min-height: 0;
}

@media (max-width: 680px) {
  .loading-lab__controls {
    position: relative;
    min-height: 0;
    grid-template-columns: 1fr;
    gap: 0;
    padding: 6px 8px;
  }
  .loading-lab__playback { display: none; }
  .loading-lab__preview,
  .loading-lab__preview > :deep(*) { min-height: 0; }
}

@media (prefers-reduced-motion: reduce) {
  .loading-lab button:active { transform: none; }
}
</style>
