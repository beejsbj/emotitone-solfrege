<template>
  <main class="stage-page">
    <StageSpecimenCanvas
      ref="stageCanvas"
      :signal="signal"
      :relationship="relationship"
      :stage-enabled="stageEnabled"
    />

    <header class="stage-page__header">
      <p class="stage-page__eyebrow">Stage · real isolated specimen</p>
      <h1>One body.<br /> One orbit.</h1>
      <p>
        The production Stage source, driven through ephemeral configuration, a silent synthetic
        waveform, and controlled envelope values. Hilbert owns raw waveform form; exact pitch selects Strings; Blobs support
        the usable centre; Ambient breathes below them.
      </p>
    </header>

    <section class="stage-page__controls" aria-label="Stage specimen controls">
      <fieldset>
        <legend>Signal</legend>
        <button
          v-for="option in signalOptions"
          :key="option.value"
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
          type="button"
          :aria-pressed="relationship === option"
          @click="relationship = option"
        >
          {{ capitalize(option) }}
        </button>
      </fieldset>

      <button
        class="stage-page__master"
        type="button"
        :aria-pressed="stageEnabled"
        @click="stageEnabled = !stageEnabled"
      >
        Stage {{ stageEnabled ? "on" : "off" }}
      </button>
    </section>

    <aside class="stage-page__reading" aria-label="Specimen reading">
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
          <button type="button" @click="toggleBoundary">
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
import type { StageSpecimenSignal } from "./stage/stageSpecimenAudio";

const signal = ref<StageSpecimenSignal>("phrase");
const relationship = ref<"off" | "merge" | "web">("web");
const stageEnabled = ref(true);
const boundaryReveal = ref(0);
const boundaryMoving = ref(false);
const stageCanvas = ref<InstanceType<typeof StageSpecimenCanvas> | null>(null);
let boundaryTimer = 0;

const signalOptions = [
  { label: "C major phrase", value: "phrase" },
  { label: "Borrowed C♯", value: "borrowed" },
  { label: "Silence", value: "silence" },
] as const;
const relationshipOptions = ["off", "merge", "web"] as const;

const activeReading = computed(() => {
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

function selectSignal(nextSignal: StageSpecimenSignal) {
  void stageCanvas.value?.wakeAudio();
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

onBeforeUnmount(() => window.clearTimeout(boundaryTimer));
</script>

<style scoped>
.stage-page {
  min-height: 100vh;
  overflow: hidden;
  background: var(--ink);
  color: var(--ivory);
}

.stage-page__header,
.stage-page__controls,
.stage-page__reading {
  position: relative;
  z-index: 2;
}

.stage-page__header {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(260px, 38rem);
  gap: var(--s-4) var(--s-8);
  align-items: end;
  width: min(100% - 40px, 1120px);
  margin-inline: auto;
  padding-top: clamp(24px, 6vh, 64px);
  pointer-events: none;
}

.stage-page__eyebrow {
  grid-column: 1 / -1;
  margin: 0;
  color: var(--brass);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.stage-page h1 {
  margin: 0;
  font: var(--t-display-xl);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.stage-page__header > p:last-child {
  margin: 0;
  color: var(--ivory-2);
  font: var(--t-body-mono);
  line-height: 1.55;
}

.stage-page__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  align-items: end;
  width: min(100% - 40px, 1120px);
  margin: clamp(18px, 4vh, 38px) auto 0;
}

.stage-page fieldset {
  display: flex;
  gap: 2px;
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.stage-page legend {
  width: 100%;
  margin-bottom: 5px;
  color: var(--ivory-3);
  font: var(--t-label);
  letter-spacing: .12em;
  text-transform: uppercase;
}

.stage-page button {
  min-height: 36px;
  border: 1px solid var(--ink-5);
  padding: 8px 12px;
  background: color-mix(in srgb, var(--ink-2) 92%, transparent);
  color: var(--ivory-2);
  font: var(--t-label);
  cursor: pointer;
}

.stage-page button[aria-pressed="true"],
.stage-page button:hover {
  border-color: var(--brass);
  background: var(--ivory);
  color: var(--ink);
}

.stage-page__reading {
  display: grid;
  gap: 4px;
  width: min(100% - 40px, 1120px);
  margin: clamp(18px, 4vh, 40px) auto 0;
  pointer-events: none;
}

.stage-page__reading strong {
  color: var(--ivory);
  font: var(--t-body-mono);
}

.stage-page__reading span {
  max-width: 68ch;
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
}

.stage-page__boundary-host {
  position: fixed;
  inset: auto 0 0;
  z-index: 3;
  height: 112px;
}

.stage-page__boundary {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  padding: 16px 20px;
  background: var(--ink-2);
  border-top: 1px solid var(--ink-5);
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
  border-left: 4px solid var(--brass);
  transition: transform 220ms var(--ease-brush);
}

.stage-page__boundary-part span,
.stage-page__boundary-part small,
.stage-page__boundary p {
  font-family: var(--font-mono);
}

.stage-page__boundary-part span {
  color: var(--ivory);
  font-size: 11px;
  font-weight: 700;
  text-transform: uppercase;
}

.stage-page__boundary-part small {
  color: var(--ivory-3);
}

.stage-page__boundary-part button {
  min-height: 30px;
  padding-block: 5px;
}

.stage-page__boundary > p {
  margin: 48px 0 0;
  color: var(--ivory-3);
  font-size: 10px;
}

@media (max-width: 640px) {
  .stage-page__header {
    display: block;
    width: calc(100% - 24px);
    padding-top: 18px;
  }

  .stage-page__eyebrow { margin-bottom: 8px; }
  .stage-page h1 { font: var(--t-display-m); }
  .stage-page h1 br { display: none; }
  .stage-page__header > p:last-child { display: none; }
  .stage-page__controls { width: calc(100% - 24px); margin-top: 14px; gap: 8px; }
  .stage-page fieldset { width: 100%; }
  .stage-page fieldset button { flex: 1; padding-inline: 6px; }
  .stage-page__master { width: 100%; }
  .stage-page__reading { width: calc(100% - 24px); margin-top: 14px; }
  .stage-page__boundary { padding-inline: 12px; }
  .stage-page__boundary-part { grid-template-columns: minmax(0, 1fr) auto; padding-inline: 8px; }
  .stage-page__boundary-part small { display: none; }
}

@media (prefers-reduced-motion: reduce) {
  .stage-page__boundary-part { transition: none; }
}
</style>
