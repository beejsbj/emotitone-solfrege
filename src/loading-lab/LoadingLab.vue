<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import AstraLoadingVariant from "./AstraLoadingVariant.vue";
import ColorPressLoadingVariant from "./ColorPressLoadingVariant.vue";
import FirstNoteLoadingVariant from "./FirstNoteLoadingVariant.vue";

type VariantId = "a" | "b" | "c";

const variants = [
  { id: "a" as const, name: "First Note", author: "Codex", component: FirstNoteLoadingVariant },
  { id: "b" as const, name: "Color Press", author: "Codex", component: ColorPressLoadingVariant },
  { id: "c" as const, name: "Soundcheck", author: "Astra", component: AstraLoadingVariant },
];

const selected = ref<VariantId>("a");
const progress = ref(38);
const playing = ref(true);
let timer: ReturnType<typeof setInterval> | undefined;
let readyTicks = 0;

const currentVariant = computed(() => (
  variants.find((variant) => variant.id === selected.value) ?? variants[0]
));

const phase = computed(() => {
  if (progress.value >= 100) return "Ready to play";
  if (progress.value >= 76) return "Listening for controllers";
  if (progress.value >= 26) return "Loading instrument samples";
  return "Waking the visual stage";
});

const message = computed(() => {
  if (progress.value >= 100) return "Everything is tuned. Your first note is waiting.";
  if (progress.value >= 76) return "Touch and QWERTY are ready; MIDI can join at any time.";
  if (progress.value >= 26) return "Gathering piano, strings, brass, and the rest of the room.";
  return "Preparing the canvas where sound becomes shape.";
});

function tick() {
  if (!playing.value) return;
  if (progress.value >= 100) {
    readyTicks += 1;
    if (readyTicks >= 10) {
      progress.value = 0;
      readyTicks = 0;
    }
    return;
  }
  progress.value += 1;
}

function togglePlaying() {
  playing.value = !playing.value;
}

function restart() {
  progress.value = 0;
  readyTicks = 0;
  playing.value = true;
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
        <strong>LOADING SCREEN LAB</strong>
        <span>Temporary definition workbench</span>
      </div>

      <nav class="loading-lab__variants" aria-label="Loading screen variants">
        <button
          v-for="variant in variants"
          :key="variant.id"
          type="button"
          :class="{ 'is-active': selected === variant.id }"
          @click="selected = variant.id"
        >
          <span>{{ variant.id.toUpperCase() }}</span>
          {{ variant.name }}
          <small>{{ variant.author }}</small>
        </button>
      </nav>

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

    <section class="loading-lab__preview" :aria-label="`${currentVariant.name} preview`">
      <component
        :is="currentVariant.component"
        :progress="progress"
        :phase="phase"
        :message="message"
      />
    </section>
  </main>
</template>

<style scoped>
.loading-lab {
  min-height: 100vh;
  background: var(--ink);
}

.loading-lab__controls {
  position: relative;
  z-index: 100;
  display: grid;
  min-height: 66px;
  grid-template-columns: auto minmax(0, 1fr) auto;
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

.loading-lab__variants {
  display: flex;
  min-width: 0;
  justify-content: center;
  gap: 6px;
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

.loading-lab__variants button {
  display: inline-grid;
  grid-template-columns: auto auto;
  column-gap: 7px;
  align-items: baseline;
}

.loading-lab__variants button > span { color: var(--mustard); }
.loading-lab__variants button small {
  grid-column: 2;
  color: var(--ivory-3);
  font: var(--t-caption);
  font-size: 8px;
}

.loading-lab__variants button.is-active {
  border-color: var(--ivory);
  background: var(--ivory);
  color: var(--ink);
}

.loading-lab__variants button.is-active small { color: var(--ink-5); }

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
  min-height: calc(100vh - 66px);
}

.loading-lab__preview > :deep(*) {
  min-height: calc(100vh - 66px);
}

@media (max-width: 920px) {
  .loading-lab__controls {
    grid-template-columns: 1fr auto;
  }
  .loading-lab__title { display: none; }
  .loading-lab__variants { justify-content: flex-start; overflow-x: auto; }
}

@media (max-width: 680px) {
  .loading-lab__controls {
    position: relative;
    grid-template-columns: 1fr;
    gap: 8px;
  }
  .loading-lab__variants button { flex: 0 0 auto; }
  .loading-lab__playback { justify-content: space-between; }
  .loading-lab__playback label { flex: 1; }
  .loading-lab__preview,
  .loading-lab__preview > :deep(*) { min-height: 620px; }
}

@media (prefers-reduced-motion: reduce) {
  .loading-lab button:active { transform: none; }
}
</style>
