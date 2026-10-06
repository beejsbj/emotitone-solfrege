<template>
  <main class="looper-page focused-page guide-paper--cobalt" :class="{ 'looper-page--focused': focused }">
    <LooperSpecimenCanvas
      :source="source"
      :strength="knobs.looperStrength"
      :definition="knobs.looperDefinition"
      :spread="knobs.looperSpread"
      :solo="solo"
    />

    <button class="looper-page__focus guide-chip" type="button" :aria-pressed="focused" @click="focused = !focused">
      {{ focused ? "Show controls" : "Focus Stage" }}
    </button>

    <div class="looper-page__header">
      <FocusedPoster layer="compositions" unit-id="stage-looper" kicker="Stage part · real isolated specimen" title="Looper" compact>
        <p class="looper-page__motto">The loop's clock, as light.</p>
        <p>
          The production Stage with a scripted three-member loop at 96 bpm. Each note is an arc
          whose head travels as it sounds; its Music Color throws outward only. Haze at low
          Definition, comets curving along their orbits at high.
        </p>
      </FocusedPoster>
    </div>

    <section class="looper-page__controls focused-sheet" aria-label="Looper specimen controls">
      <div class="looper-page__knobs">
        <Knob
          v-for="control in looperGroup.controls"
          :key="control.id"
          :data-testid="`looper-knob-${control.id}`"
          :model-value="knobs[control.id as LooperKnob]"
          :type="control.type"
          :min="control.min"
          :max="control.max"
          :step="control.step"
          :label="control.label"
          :format-value="control.format"
          :is-disabled="control.id !== 'looperStrength' && knobs.looperStrength <= 0"
          @update:modelValue="knobs[control.id as LooperKnob] = Number($event)"
        />
      </div>

      <fieldset>
        <legend>Loop</legend>
        <button class="guide-chip" type="button" :aria-pressed="demo.running" @click="demo.running = !demo.running">
          {{ demo.running ? "Running" : "Stopped" }}
        </button>
        <button class="guide-chip" type="button" :aria-pressed="demo.tuneMuted" @click="demo.tuneMuted = !demo.tuneMuted">
          Tune {{ demo.tuneMuted ? "muted" : "audible" }}
        </button>
        <button class="guide-chip" type="button" :aria-pressed="demo.liveTake" @click="demo.liveTake = !demo.liveTake">
          Live take {{ demo.liveTake ? "on" : "off" }}
        </button>
      </fieldset>

      <fieldset>
        <legend>Strip</legend>
        <button class="guide-chip" type="button" :aria-pressed="solo" @click="solo = !solo">
          {{ solo ? "Looper solo" : "With the Stage" }}
        </button>
        <button class="guide-chip" type="button" @click="resetKnobs">Accepted look</button>
      </fieldset>
    </section>

    <aside class="looper-page__reading" aria-label="Specimen reading" aria-live="polite">
      <strong>{{ reading.title }}</strong>
      <span>{{ reading.copy }}</span>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from "vue";
import Knob from "@/components/primatives/Knob/index.vue";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { stageControlGroup } from "@/services/stageAppearance";
import FocusedPoster from "./focused/FocusedPoster.vue";
import LooperSpecimenCanvas from "./stage/LooperSpecimenCanvas.vue";
import { createLooperDemoSource, type LooperDemoControls } from "./stage/looperDemoSource";
import "./focused/focused-page.css";

type LooperKnob = "looperStrength" | "looperDefinition" | "looperSpread";

const looperGroup = stageControlGroup("Looper");
const accepted = DEFAULT_CONFIG.looper;
const knobs = reactive<Record<LooperKnob, number>>({
  looperStrength: accepted.strength,
  looperDefinition: accepted.definition,
  looperSpread: accepted.spread,
});
const demo = reactive<LooperDemoControls>({ running: true, tuneMuted: false, liveTake: false });
const solo = ref(true);
const focused = ref(false);
const source = createLooperDemoSource(() => demo);

function resetKnobs() {
  knobs.looperStrength = accepted.strength;
  knobs.looperDefinition = accepted.definition;
  knobs.looperSpread = accepted.spread;
}

const reading = computed(() => {
  if (!demo.running) {
    return { title: "Stopped", copy: "The light fades out; nothing on the Stage remembers the loop." };
  }
  if (knobs.looperStrength <= 0) {
    return { title: "Off", copy: "Strength 0 turns the Looper off; Definition and Spread keep their values." };
  }
  if (demo.liveTake) {
    return {
      title: "Live take",
      copy: "Held notes draw themselves on the outermost orbit as they grow; released ones wait there faintly until they join.",
    };
  }
  if (demo.tuneMuted) {
    return { title: "Tune muted", copy: "A silent member stays as faint, unresponsive light; its neighbours' light still crosses it." };
  }
  if (knobs.looperDefinition < 0.2) {
    return { title: "Haze", copy: "The arcs dissolve; light billows outward and round as one field. No rays, no bodies." };
  }
  if (knobs.looperDefinition > 0.7) {
    return { title: "Comets", copy: "Heads and arcs resolve and curve along their orbits over a thinner wash." };
  }
  return {
    title: "Bass · tune · arpeggio",
    copy: "2, 4 and 1 bars on one grid; the 4-bar tune sets the turn and the arpeggio tiles four times around it.",
  };
});
</script>

<style scoped>
.looper-page {
  min-height: 100vh;
  overflow: hidden;
}

/* The live Stage canvas is fixed behind everything; the poster, controls,
   and reading float above it. Focus hides them so the Looper fills the view. */
.looper-page__header,
.looper-page__controls,
.looper-page__reading {
  position: relative;
  z-index: 2;
}

.looper-page--focused .looper-page__header,
.looper-page--focused .looper-page__controls,
.looper-page--focused .looper-page__reading {
  visibility: hidden;
}

.looper-page__focus {
  position: fixed;
  top: calc(var(--guide-masthead-height, 56px) + var(--s-4));
  right: var(--s-4);
  z-index: 3;
  background: var(--ivory);
  color: var(--ink);
}

.looper-page__motto {
  margin-bottom: var(--s-6) !important;
  font: 700 clamp(24px, 4vw, 36px)/1.15 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.looper-page__controls {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-6) var(--s-5);
  align-items: end;
  width: min(100% - 32px, 1240px);
  box-sizing: border-box;
  margin: var(--s-8) auto 0;
}

.looper-page__knobs {
  display: flex;
  gap: var(--s-5);
}

.looper-page fieldset {
  display: flex;
  flex-wrap: wrap;
  gap: var(--s-3);
  min-width: 0;
  margin: 0;
  padding: 0;
  border: 0;
}

.looper-page legend {
  width: 100%;
  margin-bottom: var(--s-4);
  padding: 0;
  color: var(--ivory);
  font: 700 18px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.looper-page__reading {
  display: grid;
  gap: var(--s-3);
  width: min(100% - 32px, 1240px);
  margin: var(--s-8) auto 0;
  pointer-events: none;
}

.looper-page__reading strong {
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

.looper-page__reading span {
  max-width: 68ch;
  color: var(--ivory-2);
  font: var(--t-body-s-mono);
}

@media (max-width: 640px) {
  .looper-page__header :deep(.focused-poster__blurb p:last-child) { display: none; }
  .looper-page__controls { width: calc(100% - 24px); gap: var(--s-5); }
  .looper-page__knobs { width: 100%; justify-content: space-between; }
  .looper-page fieldset { width: 100%; }
  .looper-page fieldset .guide-chip { flex: 1; padding-inline: 6px; }
  .looper-page__reading { width: calc(100% - 24px); }
}
</style>
