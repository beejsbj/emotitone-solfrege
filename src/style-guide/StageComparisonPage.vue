<template>
  <main class="stage-comparison-page">
    <header class="stage-comparison-page__header">
      <p class="stage-comparison-page__eyebrow">Stage · isolated visual comparison</p>
      <h1>One body.<br />One orbit.</h1>
      <p class="stage-comparison-page__intro">
        Hilbert is the primary musical body. Blobs support it around a shared usable centre;
        Ambient carries breath; Strings keep pitch meaning. This fixture changes no production Stage code.
      </p>
    </header>

    <section class="stage-comparison-page__controls" aria-label="Stage comparison controls">
      <fieldset>
        <legend>Signal</legend>
        <button
          v-for="option in signalOptions"
          :key="option.value"
          type="button"
          :aria-pressed="signal === option.value"
          @click="signal = option.value"
        >
          {{ option.label }}
        </button>
      </fieldset>

      <fieldset>
        <legend>Blob relationship</legend>
        <button
          v-for="option in relationshipOptions"
          :key="option"
          type="button"
          :aria-pressed="relationshipMode === option"
          @click="relationshipMode = option"
        >
          {{ capitalize(option) }}
        </button>
      </fieldset>

      <fieldset :disabled="signal !== 'silence'">
        <legend>Silence</legend>
        <button
          v-for="option in silenceOptions"
          :key="option.value"
          type="button"
          :aria-pressed="silenceMotion === option.value"
          @click="silenceMotion = option.value"
        >
          {{ option.label }}
        </button>
      </fieldset>

      <label class="stage-comparison-page__deck-control">
        <span>Deck occlusion</span>
        <input v-model.number="deckHeight" type="range" min="118" max="220" step="1" />
        <output>{{ Math.round(deckHeight) }} px</output>
      </label>
    </section>

    <section class="stage-comparison-page__grid" aria-label="Stage treatments">
      <StageStudyScene
        variant="baseline"
        :energy="energy"
        :phase="phase"
        :deck-height="deckHeight"
        :relationship-mode="relationshipMode"
      />
      <StageStudyScene
        variant="gated"
        :energy="energy"
        :phase="phase"
        :deck-height="deckHeight"
        :relationship-mode="relationshipMode"
      />
      <StageStudyScene
        variant="spectral"
        :energy="energy"
        :phase="phase"
        :deck-height="deckHeight"
        :relationship-mode="relationshipMode"
      />
    </section>

    <section class="stage-comparison-page__questions" aria-labelledby="questions-heading">
      <div>
        <p class="stage-comparison-page__eyebrow">Taste gate</p>
        <h2 id="questions-heading">What needs your eye</h2>
      </div>
      <ol>
        <li><span>Ambient</span><p>In silence, should the Stage become still or retain a very slow autonomous breath?</p></li>
        <li><span>Strings</span><p>Does pitch-gated force stay legible, or does the richer spectral field earn its extra motion?</p></li>
        <li><span>Orbit</span><p>Is the proposed usable-centre composition right when the deck rises?</p></li>
      </ol>
    </section>
  </main>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import StageStudyScene from "./stage/StageStudyScene.vue";

type SignalMode = "phrase" | "pulse" | "silence";
type SilenceMotion = "still" | "idle";
type RelationshipMode = "off" | "merge" | "web";

const signal = ref<SignalMode>("phrase");
const silenceMotion = ref<SilenceMotion>("idle");
const relationshipMode = ref<RelationshipMode>("web");
const deckHeight = ref(168);
const phase = ref(0);
const elapsed = ref(0);
const reducedMotion = ref(false);
let frame = 0;
let startedAt = 0;
let lastPaint = 0;
let motionQuery: MediaQueryList | null = null;

const signalOptions = [
  { label: "Hum phrase", value: "phrase" },
  { label: "Note pulse", value: "pulse" },
  { label: "Silence", value: "silence" },
] as const;
const relationshipOptions = ["off", "merge", "web"] as const;
const silenceOptions = [
  { label: "Still", value: "still" },
  { label: "Idle breath", value: "idle" },
] as const;

const energy = computed(() => {
  if (reducedMotion.value) {
    if (signal.value === "silence") return 0.025;
    return signal.value === "pulse" ? 0.62 : 0.42;
  }
  const time = elapsed.value;
  if (signal.value === "silence") {
    if (silenceMotion.value === "still" || reducedMotion.value) return 0.025;
    return 0.07 + (Math.sin(time * 0.00072) + 1) * 0.035;
  }
  if (signal.value === "pulse") {
    const pulse = Math.max(0, Math.sin(time * 0.0062));
    return 0.08 + pulse ** 5 * 0.88;
  }
  const swell = (Math.sin(time * 0.00145 - 0.8) + 1) / 2;
  const phrase = (Math.sin(time * 0.00048 + 0.5) + 1) / 2;
  return 0.1 + smoothStep(swell) * (0.32 + phrase * 0.5);
});

function tick(now: number) {
  if (!startedAt) startedAt = now;
  if (!lastPaint || now - lastPaint >= 32) {
    lastPaint = now;
    elapsed.value = now - startedAt;
    phase.value = reducedMotion.value ? 0.35 : elapsed.value * 0.001;
  }
  frame = requestAnimationFrame(tick);
}

function handleMotionChange(event: MediaQueryListEvent) {
  reducedMotion.value = event.matches;
}

onMounted(() => {
  motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotion.value = motionQuery.matches;
  motionQuery.addEventListener?.("change", handleMotionChange);
  frame = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  cancelAnimationFrame(frame);
  motionQuery?.removeEventListener?.("change", handleMotionChange);
});

function smoothStep(value: number) {
  return value * value * (3 - 2 * value);
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
</script>

<style scoped>
.stage-comparison-page {
  box-sizing: border-box;
  width: 100%;
  max-width: 100vw;
  min-height: 100vh;
  overflow-x: hidden;
  padding: clamp(18px, 4vw, 52px);
  background:
    linear-gradient(color-mix(in srgb, var(--ink) 90%, transparent), var(--ink)),
    repeating-linear-gradient(90deg, transparent 0 47px, color-mix(in srgb, var(--ivory) 3%, transparent) 48px);
  color: var(--ivory);
}

.stage-comparison-page__header,
.stage-comparison-page__controls,
.stage-comparison-page__grid,
.stage-comparison-page__questions {
  box-sizing: border-box;
  width: min(1360px, 100%);
  max-width: 100%;
  min-width: 0;
  margin-inline: auto;
}

.stage-comparison-page__header {
  display: grid;
  grid-template-columns: minmax(0, 1.4fr) minmax(260px, 0.6fr);
  align-items: end;
  gap: var(--s-7);
  margin-bottom: var(--s-8);
}

.stage-comparison-page__eyebrow {
  grid-column: 1 / -1;
  margin: 0 0 var(--s-3);
  color: var(--brass);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.stage-comparison-page h1 {
  min-width: 0;
  margin: 0;
  font: var(--t-display-xl);
  letter-spacing: var(--tracking-display);
  line-height: 0.88;
  text-transform: uppercase;
}

.stage-comparison-page__intro {
  max-width: 48ch;
  margin: 0;
  color: var(--ivory-2);
  font: var(--t-body-m-mono);
  overflow-wrap: anywhere;
}

.stage-comparison-page__controls {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  gap: var(--s-4) var(--s-6);
  padding: var(--s-4);
  background: color-mix(in srgb, var(--ink-3) 88%, transparent);
  overflow: hidden;
}

.stage-comparison-page fieldset {
  display: grid;
  grid-auto-columns: minmax(0, 1fr);
  grid-auto-flow: column;
  gap: 2px;
  min-width: 0;
  min-inline-size: 0;
  box-sizing: border-box;
  margin: 0;
  padding: 0;
  border: 0;
}

.stage-comparison-page legend,
.stage-comparison-page__deck-control > span {
  width: 100%;
  margin-bottom: var(--s-2);
  color: var(--ivory-3);
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.stage-comparison-page button {
  min-width: 0;
  min-height: 34px;
  padding: var(--s-2) var(--s-3);
  border: 0;
  background: var(--ink-4);
  color: var(--ivory-2);
  font: var(--t-body-s-mono);
  cursor: pointer;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.stage-comparison-page button[aria-pressed="true"] {
  background: var(--ivory);
  color: var(--ink);
}

.stage-comparison-page fieldset:disabled {
  opacity: 0.36;
}

.stage-comparison-page__deck-control {
  display: grid;
  grid-template-columns: minmax(120px, 1fr) auto;
  align-items: center;
  gap: var(--s-2) var(--s-3);
  min-width: min(100%, 230px);
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
}

.stage-comparison-page__deck-control > span {
  grid-column: 1 / -1;
}

.stage-comparison-page__deck-control input {
  width: 100%;
  min-width: 0;
  accent-color: var(--brass);
}

.stage-comparison-page__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1px;
  margin-top: 1px;
  background: color-mix(in srgb, var(--ivory) 13%, transparent);
}

.stage-comparison-page__questions {
  display: grid;
  grid-template-columns: minmax(220px, 0.7fr) minmax(0, 1.3fr);
  gap: var(--s-8);
  padding-block: clamp(44px, 7vw, 88px);
}

.stage-comparison-page__questions h2 {
  margin: 0;
  font: var(--t-display-m);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.stage-comparison-page__questions ol {
  display: grid;
  gap: var(--s-5);
  margin: 0;
  padding: 0;
  color: var(--ivory-2);
  font: var(--t-body-m-mono);
  list-style: none;
  counter-reset: taste;
}

.stage-comparison-page__questions li {
  display: grid;
  grid-template-columns: 82px 1fr;
  gap: var(--s-4);
  counter-increment: taste;
}

.stage-comparison-page__questions li::before {
  content: "0" counter(taste);
  grid-row: 1;
  color: var(--ivory-4);
}

.stage-comparison-page__questions li span {
  grid-column: 1;
  color: var(--ivory);
  text-transform: uppercase;
}

.stage-comparison-page__questions li p {
  grid-column: 2;
  margin: 0;
}

@media (max-width: 900px) {
  .stage-comparison-page__header,
  .stage-comparison-page__questions {
    grid-template-columns: minmax(0, 1fr);
    gap: var(--s-5);
  }

  .stage-comparison-page__grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .stage-comparison-page__header {
    align-items: start;
  }
}

@media (max-width: 560px) {
  .stage-comparison-page {
    padding-inline: var(--s-4);
  }

  .stage-comparison-page h1 {
    max-width: 100%;
    font-size: clamp(40px, 14vw, 60px);
    line-height: 0.92;
    overflow-wrap: anywhere;
  }

  .stage-comparison-page__controls,
  .stage-comparison-page fieldset {
    width: 100%;
  }

  .stage-comparison-page button {
    padding-inline: var(--s-2);
    font-size: 11px;
  }

  .stage-comparison-page__questions li {
    grid-template-columns: 56px 1fr;
  }
}

@media (prefers-reduced-motion: reduce) {
  .stage-comparison-page button {
    transition: none;
  }
}
</style>
