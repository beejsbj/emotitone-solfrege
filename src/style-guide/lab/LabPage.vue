<script setup lang="ts">
import { computed, ref } from "vue";
import Sticker from "@/components/primatives/Sticker";
import type { LabMidiOutcome } from "@/types/styleGuide";
import FocusedPoster from "../focused/FocusedPoster.vue";
import "../focused/focused-page.css";
import LabLogoSheet from "./LabLogoSheet.vue";
import { ALL_DIRECTIONS, DIRECTIONS, PRODUCTION } from "./directions";
import { LAB_STEP_COUNT, useLabRehearsal } from "./useLabRehearsal";

/*
 * Guide-only design lab. `?screen=<id>` renders one Loading Screen full-bleed
 * for true-size review; `&state=loading|midi|ready` freezes a state and
 * `&still=1` forces the Reduced Motion frame.
 */
const query = new URLSearchParams(window.location.search);
const fullScreenId = query.get("screen");
const fullScreen = ALL_DIRECTIONS.find((direction) => direction.id === fullScreenId);
const sheetOnly = ALL_DIRECTIONS.find((direction) => direction.id === query.get("sheet"));
const frozen = query.get("state");

const initial = frozen === "loading"
  ? { step: 1, fraction: .55, running: false }
  : frozen === "midi"
    ? { step: 4, fraction: .5, running: false }
    : frozen === "ready"
      ? { step: LAB_STEP_COUNT, running: false }
      : {};

const rehearsal = useLabRehearsal(initial);
const still = ref(query.get("still") === "1");
const played = ref<string | null>(null);

const midiOutcomes: { value: LabMidiOutcome; label: string }[] = [
  { value: "set", label: "Set" },
  { value: "skip", label: "Skip" },
  { value: "na", label: "N/A" },
];

const screenProps = computed(() => ({
  stages: rehearsal.stages.value,
  percent: rehearsal.percent.value,
  stageFraction: rehearsal.stageFraction.value,
  phase: rehearsal.phase.value,
  message: rehearsal.message.value,
  ready: rehearsal.ready.value,
  still: still.value,
}));

const readout = computed(() => {
  const step = rehearsal.step.value;
  if (step >= LAB_STEP_COUNT) return "All five stages · ready";
  const stage = rehearsal.stages.value[step];
  return `Stage ${step + 1} of ${LAB_STEP_COUNT} · ${stage.label} · ${rehearsal.percent.value}%`;
});

const handlePlay = (id: string) => {
  played.value = id;
  window.setTimeout(() => { if (played.value === id) played.value = null; }, 1600);
};

const fullScreenHref = (id: string, state?: string) => {
  const params = new URLSearchParams({ screen: id });
  if (state) params.set("state", state);
  return `?${params.toString()}`;
};
</script>

<template>
  <div v-if="fullScreen" class="lab-full">
    <component :is="fullScreen.screen" v-bind="screenProps" @start="rehearsal.replay()" />
  </div>

  <main v-else-if="sheetOnly" class="lab-sheet-only">
    <LabLogoSheet :id="`lab-logo-${sheetOnly.id}`" :logo="sheetOnly.logo" :name="sheetOnly.logoName" />
  </main>

  <main v-else class="lab-page focused-page guide-paper--cobalt">
    <FocusedPoster layer="compositions" unit-id="loading-logo-lab" kicker="Design lab · guide only" title="Loading Lab">
      <p>
        Three reimagined Brand Logo and Loading Screen pairs, each a different idea, beside the accepted
        production pair mounted from its real sources. One rehearsal drives every screen: replay the load,
        step the stages, jump to ready, choose the MIDI outcome, or freeze the Reduced Motion still.
      </p>
    </FocusedPoster>

    <div class="focused-page__body">
      <section class="focused-sheet lab-controls" aria-label="Rehearsal controls">
        <div class="lab-controls__row">
          <button class="guide-chip" type="button" @click="rehearsal.replay()">Replay load</button>
          <button class="guide-chip" type="button" @click="rehearsal.stepOnce()">Step stage</button>
          <button class="guide-chip" type="button" @click="rehearsal.jumpReady()">Jump to ready</button>
          <button class="guide-chip" type="button" :aria-pressed="still" @click="still = !still">
            Still frame {{ still ? "on" : "off" }}
          </button>
        </div>
        <fieldset class="lab-controls__row">
          <legend>MIDI outcome</legend>
          <button
            v-for="outcome in midiOutcomes"
            :key="outcome.value"
            class="guide-chip"
            type="button"
            :aria-pressed="rehearsal.midiOutcome.value === outcome.value"
            @click="rehearsal.midiOutcome.value = outcome.value"
          >
            {{ outcome.label }}
          </button>
        </fieldset>
        <p class="lab-controls__readout" aria-live="polite">{{ readout }}</p>
      </section>

      <section
        v-for="direction in [PRODUCTION, ...DIRECTIONS]"
        :id="`lab-${direction.id}`"
        :key="direction.id"
        class="focused-sheet lab-direction"
        :class="`lab-direction--${direction.paper}`"
      >
        <header class="focused-sheet__head">
          <div>
            <p class="focused-sheet__source">
              {{ direction.id === "current" ? "Production · LoadingScreen.vue + BrandLogo.vue" : `Direction ${direction.letter} · src/style-guide/lab/${direction.id}/` }}
            </p>
            <h2 class="focused-sheet__title">{{ direction.name }} <span class="lab-direction__logo-name">+ {{ direction.logoName }}</span></h2>
          </div>
          <Sticker v-if="direction.id === 'current'" variant="fill" color="ivory">Accepted</Sticker>
          <Sticker v-else variant="fill" :color="direction.paper === 'cobalt' ? 'ivory' : direction.paper">Direction {{ direction.letter }}</Sticker>
        </header>

        <p class="focused-sheet__prose">{{ direction.idea }}</p>

        <div class="lab-direction__frames">
          <figure class="lab-frame lab-frame--phone">
            <div class="lab-frame__screen">
              <component :is="direction.screen" v-bind="screenProps" @start="handlePlay(direction.id)" />
              <span v-if="played === direction.id" class="lab-frame__played" aria-live="polite">Play pressed</span>
            </div>
            <figcaption>
              Phone · 390 × 844 ·
              <a :href="fullScreenHref(direction.id)">full screen</a> ·
              <a :href="fullScreenHref(direction.id, 'loading')">loading</a> ·
              <a :href="fullScreenHref(direction.id, 'ready')">ready</a>
            </figcaption>
          </figure>

          <figure class="lab-frame lab-frame--desktop">
            <div class="lab-frame__screen">
              <component :is="direction.screen" v-bind="screenProps" @start="handlePlay(direction.id)" />
            </div>
            <figcaption>Desktop · 16 : 10</figcaption>
          </figure>
        </div>

        <h3 class="lab-direction__subhead">Brand Logo · {{ direction.logoName }}</h3>
        <LabLogoSheet :id="`lab-logo-${direction.id}`" :logo="direction.logo" :name="direction.logoName" />

        <dl v-if="direction.id !== 'current'" class="focused-facts">
          <div><dt>Better because</dt><dd>{{ direction.better }}</dd></div>
          <div><dt>Risks</dt><dd>{{ direction.risks }}</dd></div>
        </dl>
      </section>
    </div>
  </main>
</template>

<style scoped>
.lab-full {
  position: fixed;
  z-index: 20000;
  inset: 0;
  background: var(--ink);
}

.lab-sheet-only { padding: var(--s-8) var(--s-6); background: var(--ink-2); }

.lab-controls {
  position: sticky;
  z-index: 5;
  top: var(--s-4);
  gap: var(--s-4);
  padding-block: var(--s-6);
}

.lab-controls__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: var(--s-3);
  margin: 0;
  padding: 0;
  border: 0;
}

.lab-controls__row legend {
  float: left;
  margin-right: var(--s-4);
  color: var(--ivory);
  font: 700 17px/40px var(--font-display);
  text-transform: uppercase;
}

.lab-controls__readout {
  margin: 0;
  color: var(--ivory-2);
  font: var(--t-body-s-mono);
}

.lab-direction__logo-name { color: var(--ivory-3); }

.lab-direction__subhead {
  margin: var(--s-6) 0 0;
  color: var(--ivory);
  font: 700 24px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.lab-direction__frames {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  align-items: start;
  gap: var(--s-8);
}

.lab-frame { display: grid; gap: var(--s-3); min-width: 0; margin: 0; }

.lab-frame figcaption {
  color: var(--ivory-3);
  font: var(--t-caption);
}

.lab-frame figcaption a { color: var(--ivory-2); }

.lab-frame__screen {
  position: relative;
  width: 100%;
  overflow: hidden;
  background: var(--ink);
  box-shadow: 0 0 0 6px var(--ink-4);
}

.lab-frame--phone { width: min(100%, 390px); }
.lab-frame--phone .lab-frame__screen { aspect-ratio: 390 / 844; }
.lab-frame--desktop .lab-frame__screen { aspect-ratio: 16 / 10; }

.lab-frame__played {
  position: absolute;
  z-index: 30;
  top: 50%;
  left: 50%;
  padding: 8px 14px 6px;
  background: var(--ivory);
  color: var(--ink);
  clip-path: var(--clip-tab);
  font: 700 22px/1 var(--font-display);
  text-transform: uppercase;
  translate: -50% -50%;
}

@media (max-width: 1080px) {
  .lab-frame--phone { justify-self: center; }
  .lab-frame--desktop { display: none; }
}
</style>
