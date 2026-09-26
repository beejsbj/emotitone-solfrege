<template>
  <main class="stage-page focused-page guide-paper--cobalt" :class="{ 'stage-page--focused': focused }">
    <StageSpecimenCanvas
      ref="stageCanvas"
      :signal="effectiveSignal"
      :relationship="relationship"
      :stage-enabled="stageEnabled"
      :show-labels="showLabels"
    />

    <button class="stage-page__focus focused-chip" type="button" :aria-pressed="focused" @click="focused = !focused">
      {{ focused ? "Show controls" : "Focus Stage" }}
    </button>

    <div class="stage-page__header">
      <FocusedPoster layer="compositions" unit-id="stage" kicker="Stage · real isolated specimen" title="Stage" compact>
        <p class="stage-page__motto">One body. One orbit.</p>
        <p>
          The production Stage source, driven through ephemeral configuration, a silent synthetic
          waveform, and controlled envelope values. Hilbert owns raw waveform form; exact pitch
          selects Strings; Blobs support the usable centre; Ambient breathes below them.
        </p>
      </FocusedPoster>
    </div>

    <section class="stage-page__controls focused-sheet" aria-label="Stage specimen controls">
      <button
        class="stage-page__start focused-chip"
        type="button"
        :disabled="audioState === 'starting' || audioState === 'started'"
        @click="startSignal"
      >
        {{ startLabel }}
      </button>

      <fieldset>
        <legend>Signal</legend>
        <button
          v-for="option in signalOptions"
          :key="option.value"
          class="focused-chip"
          type="button"
          :aria-pressed="signal === option.value"
          @click="selectSignal(option.value)"
        >
          {{ option.label }}
        </button>
      </fieldset>

      <fieldset>
        <legend>Connections</legend>
        <button
          v-for="option in relationshipOptions"
          :key="option"
          class="focused-chip"
          type="button"
          :aria-pressed="relationship === option"
          @click="relationship = option"
        >
          {{ capitalize(option) }}
        </button>
      </fieldset>

      <button class="focused-chip" type="button" :aria-pressed="showLabels" @click="showLabels = !showLabels">
        Labels {{ showLabels ? "on" : "off" }}
      </button>
      <button
        class="stage-page__master focused-chip"
        type="button"
        :aria-pressed="stageEnabled"
        @click="stageEnabled = !stageEnabled"
      >
        Stage {{ stageEnabled ? "on" : "off" }}
      </button>
    </section>

    <aside class="stage-page__reading" aria-label="Specimen reading" aria-live="polite">
      <strong>{{ activeReading.title }}</strong>
      <span>{{ activeReading.copy }}</span>
    </aside>

    <div class="stage-page__boundary-host" data-stage-occlusion-host>
      <section
        class="stage-page__boundary"
        data-stage-occluder
        :data-stage-occlusion-active="boundaryMoving ? 'true' : undefined"
        aria-label="Host occlusion boundary fixture"
      >
        <div
          class="stage-page__boundary-part"
          data-stage-occlusion-part
          :style="{ transform: `translateY(-${boundaryReveal}px)` }"
        >
          <span>Boundary fixture</span>
          <small>generic painted-part geometry</small>
          <button class="focused-chip" type="button" @click="toggleBoundary">
            {{ boundaryReveal ? "Collapse" : "Reveal" }}
          </button>
        </div>
        <p>Stage ends at this painted edge. The production PatternReel is verified separately.</p>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from "vue";
import StageSpecimenCanvas from "./stage/StageSpecimenCanvas.vue";
import FocusedPoster from "./focused/FocusedPoster.vue";
import "./focused/focused-page.css";
import type { StageSpecimenSignal } from "./stage/stageSpecimenAudio";
import type { HarmonicGeometryMode } from "@/types/visual";

const signal = ref<StageSpecimenSignal>("phrase");
const audioState = ref<"waiting" | "starting" | "started" | "failed">("waiting");
const relationship = ref<HarmonicGeometryMode>("web");
const stageEnabled = ref(true);
const showLabels = ref(true);
const focused = ref(false);
const boundaryReveal = ref(0);
const boundaryMoving = ref(false);
const stageCanvas = ref<InstanceType<typeof StageSpecimenCanvas> | null>(null);
let boundaryTimer = 0;
let isUnmounting = false;

const signalOptions = [
  { label: "C major phrase", value: "phrase" },
  { label: "Borrowed C♯", value: "borrowed" },
  { label: "Silence", value: "silence" },
] as const;
const relationshipOptions = ["merge", "web"] as const;
const effectiveSignal = computed<StageSpecimenSignal>(() => (
  audioState.value === "started" ? signal.value : "silence"
));
const startLabel = computed(() => {
  if (audioState.value === "starting") return "Starting synthetic signal…";
  if (audioState.value === "started") return "Synthetic signal ready";
  if (audioState.value === "failed") return "Try synthetic signal again";
  return "Start synthetic signal";
});

const activeReading = computed(() => {
  if (audioState.value === "waiting") {
    return {
      title: "Signal waiting",
      copy: "Start the silent synthetic source to drive Hilbert and apply the selected controlled notes.",
    };
  }
  if (audioState.value === "starting") {
    return {
      title: "Starting signal",
      copy: "The browser is starting the silent synthetic source.",
    };
  }
  if (audioState.value === "failed") {
    return {
      title: "Signal unavailable",
      copy: "The browser did not start the silent synthetic source. Try again to activate the specimen.",
    };
  }
  if (signal.value === "silence") {
    return {
      title: "Ambient idle breath",
      copy: "No notes or signal. Recurring motion belongs only to the low autonomous breath.",
    };
  }
  if (signal.value === "borrowed") {
    return {
      title: "Exact pitch: C♯4",
      copy: "The borrowed pitch keeps Blob, Hilbert, and Music Color identity without exciting a C-major String.",
    };
  }
  return {
    title: "C4 · E4 · G4",
    copy: "One shared synthetic envelope drives the selected exact-pitch Strings and Ambient response.",
  };
});

async function startSignal() {
  if (audioState.value === "starting" || audioState.value === "started") return;
  const canvas = stageCanvas.value;
  if (!canvas) return;
  audioState.value = "starting";
  try {
    await canvas.wakeAudio();
    if (!isUnmounting) audioState.value = "started";
  } catch {
    if (!isUnmounting) audioState.value = "failed";
  }
}

function selectSignal(nextSignal: StageSpecimenSignal) {
  signal.value = nextSignal;
}

function toggleBoundary() {
  window.clearTimeout(boundaryTimer);
  boundaryMoving.value = true;
  boundaryReveal.value = boundaryReveal.value ? 0 : 76;
  boundaryTimer = window.setTimeout(() => {
    boundaryMoving.value = false;
  }, 260);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

onBeforeUnmount(() => {
  isUnmounting = true;
  window.clearTimeout(boundaryTimer);
});
</script>

<style scoped>
.stage-page {
  min-height: 100vh;
  overflow: hidden;
}

/* The live Stage canvas is fixed behind everything; the poster, controls,
   and reading float above it. Focus hides them so Stage fills the view. */
.stage-page__header,
.stage-page__controls,
.stage-page__reading {
  position: relative;
  z-index: 2;
}

.stage-page--focused .stage-page__header,
.stage-page--focused .stage-page__controls,
.stage-page--focused .stage-page__reading {
  visibility: hidden;
}

.stage-page__focus {
  position: fixed;
  top: calc(var(--guide-masthead-height, 56px) + var(--s-4));
  right: var(--s-4);
  z-index: 3;
  background: var(--ivory);
  color: var(--ink);
}

.stage-page__motto {
  margin-bottom: var(--s-6) !important;
  font: 700 clamp(24px, 4vw, 36px)/1.15 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.stage-page__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-6) var(--s-5);
  align-items: end;
  width: min(100% - 32px, 1240px);
  box-sizing: border-box;
  margin: var(--s-8) auto 0;
}

.stage-page fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.stage-page legend {
  width: 100%;
  margin-bottom: var(--s-4);
  padding: 0;
  color: var(--ivory);
  font: 700 18px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.stage-page .stage-page__start {
  background: var(--guide-paper);
  color: var(--guide-paper-ink);
}

.stage-page__reading {
  display: grid;
  gap: var(--s-3);
  width: min(100% - 32px, 1240px);
  margin: var(--s-8) auto 0;
  pointer-events: none;
}

.stage-page__reading strong {
  justify-self: start;
  padding: 6px 12px 4px;
  background: var(--ink);
  color: var(--ivory);
  clip-path: var(--clip-tab);
  font: 700 22px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  transform: rotate(var(--rot-sticker));
}

.stage-page__reading span {
  max-width: 68ch;
  color: var(--ivory-2);
  font: var(--t-body-s-mono);
}

.stage-page__boundary-host {
  position: fixed;
  inset: auto 0 0;
  z-index: 3;
  height: 112px;
}

/* Host occlusion fixture: a filled Ink-2 edge; its sliding part is Ink-3
   paper with a layer-paper tab. Geometry is load-bearing for Stage layout. */
.stage-page__boundary {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: 16px 20px;
  background: var(--ink-2);
}

.stage-page__boundary-part {
  position: absolute;
  inset: 0 0 auto;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  height: 51.2px;
  box-sizing: border-box;
  padding: 0 12px 0 16px;
  background: var(--ink-3);
  transition: transform var(--dur-ui) var(--ease-brush);
}

.stage-page__boundary-part::before {
  content: "";
  position: absolute;
  top: 10px;
  bottom: 10px;
  left: 0;
  width: 6px;
  background: var(--guide-paper);
  clip-path: var(--clip-tab);
}

.stage-page__boundary-part span {
  color: var(--ivory);
  font: 700 18px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.stage-page__boundary-part small {
  color: var(--ivory-3);
  font: var(--t-caption);
}

.stage-page__boundary-part .focused-chip {
  background: var(--ink);
  min-height: 30px;
  padding-block: 5px 3px;
}

.stage-page__boundary > p {
  margin: 44px 0 0;
  color: var(--ivory-3);
  font: var(--t-caption);
}

@media (max-width: 640px) {
  .stage-page__header :deep(.focused-poster__blurb p:last-child) { display: none; }
  .stage-page__controls { width: calc(100% - 24px); gap: var(--s-5); }
  .stage-page__start { width: 100%; }
  .stage-page fieldset { width: 100%; }
  .stage-page fieldset .focused-chip { flex: 1; padding-inline: 6px; }
  .stage-page__master { width: 100%; }
  .stage-page__reading { width: calc(100% - 24px); }
  .stage-page__boundary { padding-inline: 12px; }
  .stage-page__boundary-part { grid-template-columns: minmax(0, 1fr) auto; padding-inline: 12px 8px; }
  .stage-page__boundary-part small { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .stage-page__boundary-part { transition: none; }
}
</style>
