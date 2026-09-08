<template>
  <InstrumentSelector
    :current-instrument="currentInstrument"
    :on-select-instrument="selectInstrument"
  />

  <main class="picker-page">
    <header class="picker-page__header">
      <p class="picker-page__eyebrow">EmotiTone · focused style-guide page</p>
      <h1>Instrument Picker.</h1>
      <p class="picker-page__intro">
        This page mounts the real production picker in isolation. Open the Instrument handle in the
        top-left corner to inspect its live library, search, banks, and selection states.
      </p>
    </header>

    <section class="picker-page__surface" aria-labelledby="picker-direction-title">
      <header class="picker-page__surface-heading">
        <div>
          <p class="picker-page__source">Accepted · production source</p>
          <h2 id="picker-direction-title">A loose library of labels.</h2>
        </div>
        <span class="picker-page__status">Adopted</span>
      </header>

      <div class="picker-page__stage">
        <p class="picker-page__stage-number" aria-hidden="true">01</p>
        <div>
          <p class="picker-page__stage-label">Live specimen</p>
          <p>
            The fixed Instrument handle and its drawer come directly from
            <code>InstrumentSelector</code>. No gallery copy sits between this page and the
            production composition.
          </p>
        </div>
      </div>

      <dl class="picker-page__facts">
        <div><dt>Available</dt><dd>Ivory outline Sticker; the default library texture.</dd></div>
        <div><dt>Cold</dt><dd>The same outline Sticker dimmed, without inventing another surface.</dd></div>
        <div><dt>Current</dt><dd>Filled Ivory Sticker; selection is the strongest stable event.</dd></div>
        <div><dt>Warming</dt><dd>Filled Ivory Sticker held with the current/ready sounds while the progress banner names the load.</dd></div>
        <div><dt>Icons</dt><dd>The shared instrument resolver identifies both Drawer handles and choice Stickers.</dd></div>
        <div><dt>Button</dt><dd>Invisible native semantics only; Sticker owns all visible geometry and material.</dd></div>
      </dl>
    </section>

    <aside class="picker-page__decision">
      <p class="picker-page__eyebrow">Definition closed</p>
      <h2>Sticker is the choice language.</h2>
      <p>
        The picker owns grouping, ready-first ordering, and state mapping, not another choice
        component. Badge and brass have no role in this composition.
      </p>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { ref } from "vue";
import InstrumentSelector from "../components/InstrumentSelector.vue";

const currentInstrument = ref("piano");

function selectInstrument(instrumentId: string) {
  currentInstrument.value = instrumentId;
}
</script>

<style scoped>
.picker-page {
  min-height: 100vh;
  background: var(--ink);
  color: var(--ivory);
  padding: clamp(72px, 10vw, 112px) clamp(24px, 5vw, 72px) clamp(32px, 6vw, 80px);
}

.picker-page__header,
.picker-page__surface,
.picker-page__decision {
  width: min(100%, 820px);
  margin-inline: auto;
}

.picker-page__header { margin-bottom: 40px; }

.picker-page__eyebrow,
.picker-page__source,
.picker-page__status,
.picker-page__stage,
.picker-page__facts {
  font-family: var(--font-mono);
}

.picker-page__eyebrow,
.picker-page__source,
.picker-page__status,
.picker-page__stage-label,
.picker-page__facts dt {
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.picker-page__eyebrow,
.picker-page__source,
.picker-page__stage-label { color: var(--ivory-3); }
.picker-page h1 { margin: 8px 0 14px; font: var(--t-display-xl); }
.picker-page h2 { margin: 5px 0 0; font: var(--t-h1); }

.picker-page__intro,
.picker-page__decision > p:last-child {
  max-width: 72ch;
  color: var(--ivory-2);
  font: var(--t-body-mono);
}

.picker-page__surface {
  border: 1px solid var(--ivory-3);
  background: var(--ink-2);
  padding: clamp(14px, 3vw, 28px);
}

.picker-page__surface-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.picker-page__status {
  flex: none;
  border: 1px solid var(--brass-lo);
  color: var(--brass-hi);
  padding: 6px 8px;
}

.picker-page__stage {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: clamp(18px, 4vw, 42px);
  min-height: 15rem;
  border: 1px solid var(--ink-5);
  background: #050505;
  padding: clamp(24px, 5vw, 48px);
}

.picker-page__stage-number {
  margin: 0;
  color: var(--ivory);
  font: var(--t-display-xl);
}

.picker-page__stage-label { margin: 0 0 8px; }
.picker-page__stage p:last-child {
  max-width: 52ch;
  margin: 0;
  color: var(--ivory-2);
  font-size: 12px;
  line-height: 1.65;
}
.picker-page__stage code { color: var(--ivory); }

.picker-page__facts { display: grid; margin-top: 18px; }
.picker-page__facts div {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 12px;
  border-top: 1px solid var(--ink-5);
  padding: 10px 0;
}
.picker-page__facts dt { color: var(--ivory); }
.picker-page__facts dd { margin: 0; color: var(--ivory-3); font-size: 11px; line-height: 1.5; }

.picker-page__decision {
  margin-top: 18px;
  border-left: 5px solid var(--ivory);
  background: var(--ink-2);
  padding: 24px 28px;
}

@media (max-width: 460px) {
  .picker-page { padding: 80px 12px 32px; }
  .picker-page h1 { font: var(--t-display-l); }
  .picker-page__surface { padding: 10px; }
  .picker-page__status { display: none; }
  .picker-page__stage { grid-template-columns: 1fr; min-height: 13rem; }
  .picker-page__stage-number { font: var(--t-display-l); }
}
</style>
