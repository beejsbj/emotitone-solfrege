<template>
  <InstrumentSelector
    :current-instrument="currentInstrument"
    :on-select-instrument="selectInstrument"
  />

  <main class="picker-page focused-page guide-paper--cobalt">
    <FocusedPoster layer="compositions" unit-id="instrument-picker" kicker="Focused page · live composition" title="Instrument Picker">
      <p>
        The real production picker, mounted in isolation. Open the Instrument handle at the top left
        to inspect its live library, search, banks, and selection states.
      </p>
    </FocusedPoster>

    <div class="focused-page__body">
      <section class="focused-sheet" aria-labelledby="picker-direction-title">
        <header class="focused-sheet__head">
          <div>
            <p class="focused-sheet__source">Accepted · production source</p>
            <h2 id="picker-direction-title" class="focused-sheet__title">A loose library of labels</h2>
          </div>
          <Sticker variant="outline" color="ivory">Adopted</Sticker>
        </header>

        <div class="focused-well picker-page__stage">
          <p class="picker-page__stage-number" aria-hidden="true">01</p>
          <div>
            <p class="label">Live specimen</p>
            <p class="focused-sheet__prose">
              The fixed Instrument handle and its drawer come directly from
              <code>InstrumentSelector</code>. No gallery copy sits between this page and the
              production composition.
            </p>
          </div>
        </div>

        <dl class="focused-facts">
          <div><dt>Available</dt><dd>Ivory outline Sticker; the default library texture.</dd></div>
          <div><dt>Cold</dt><dd>The same outline Sticker dimmed, without inventing another surface.</dd></div>
          <div><dt>Current</dt><dd>Filled Ivory Sticker; selection is the strongest stable event.</dd></div>
          <div><dt>Warming</dt><dd>Filled Ivory Sticker held with the current/ready sounds while the progress banner names the load.</dd></div>
          <div><dt>Icons</dt><dd>The shared instrument resolver identifies both Drawer handles and choice Stickers.</dd></div>
          <div><dt>Choice button</dt><dd>Invisible native semantics only; Sticker owns all visible choice geometry and material.</dd></div>
          <div><dt>Sound shaping</dt><dd>The leftmost Brass Shape tab holds six unframed Knobs for every instrument, with Reset in the panel header. Narrow screens use two rows of three.</dd></div>
        </dl>
      </section>

      <aside class="focused-slip">
        <p class="focused-slip__kicker">Definition closed</p>
        <h2>Sticker is the choice language</h2>
        <p>
          The picker owns grouping, ready-first ordering, and state mapping, not another choice
          component. Badge remains absent; brass is reserved for the Shape tab and its six Knobs and
          never enters the Sticker choice language.
        </p>
      </aside>
    </div>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Sticker from "@/components/primatives/Sticker";
import FocusedPoster from "./focused/FocusedPoster.vue";
import "./focused/focused-page.css";
import InstrumentSelector from "../components/InstrumentSelector.vue";
import { DEFAULT_INSTRUMENT } from "../data/instruments";

const currentInstrument = ref(DEFAULT_INSTRUMENT);

function selectInstrument(instrumentId: string) {
  currentInstrument.value = instrumentId;
}
</script>

<style scoped>
.picker-page { min-height: 100vh; }

.picker-page__stage {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: clamp(18px, 4vw, 42px);
  min-height: 15rem;
  padding: clamp(24px, 5vw, 48px);
}

.picker-page__stage-number {
  margin: 0;
  padding: .14em .18em .1em;
  background: var(--guide-paper);
  color: var(--guide-paper-ink);
  clip-path: var(--clip-tile);
  font: 700 clamp(56px, 10vw, 96px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  transform: rotate(var(--rot-tile-2));
}

.picker-page__stage .label { margin-bottom: var(--s-4); }

@media (max-width: 460px) {
  .picker-page__stage { grid-template-columns: 1fr; min-height: 13rem; }
  .picker-page__stage-number { justify-self: start; }
}
</style>
