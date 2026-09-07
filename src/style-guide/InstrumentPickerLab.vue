<template>
  <InstrumentSelector />

  <main class="picker-lab">
    <header class="picker-lab__header">
      <p class="picker-lab__eyebrow">EmotiTone · focused design lab</p>
      <h1>Instrument Picker.</h1>
      <p class="picker-lab__intro">
        This page mounts the real production picker in isolation. Open the Sound handle in the
        top-left corner to inspect its live library, search, banks, and selection states.
      </p>
    </header>

    <section class="picker-lab__surface" aria-labelledby="picker-direction-title">
      <header class="picker-lab__surface-heading">
        <div>
          <p class="picker-lab__source">Accepted · production source</p>
          <h2 id="picker-direction-title">A loose library of labels.</h2>
        </div>
        <span class="picker-lab__status">Adopted</span>
      </header>

      <div class="picker-lab__stage">
        <p class="picker-lab__stage-number" aria-hidden="true">01</p>
        <div>
          <p class="picker-lab__stage-label">Live specimen</p>
          <p>
            The fixed Sound handle and its drawer come directly from
            <code>InstrumentSelector</code>. No gallery copy sits between this page and the
            production composition.
          </p>
        </div>
      </div>

      <dl class="picker-lab__facts">
        <div><dt>Available</dt><dd>Ivory outline Sticker; the default library texture.</dd></div>
        <div><dt>Cold</dt><dd>The same outline Sticker dimmed, without inventing another surface.</dd></div>
        <div><dt>Current</dt><dd>Filled Ivory Sticker; selection is the strongest stable event.</dd></div>
        <div><dt>Warming</dt><dd>Filled brass Sticker; a temporary loading signal without introducing Badge.</dd></div>
        <div><dt>Button</dt><dd>Invisible native semantics only; Sticker owns all visible geometry and material.</dd></div>
      </dl>
    </section>

    <aside class="picker-lab__decision">
      <p class="picker-lab__eyebrow">Definition closed</p>
      <h2>Sticker is the choice language.</h2>
      <p>
        The picker owns grouping and state mapping, not another choice component. Badge has no
        role in this composition.
      </p>
    </aside>
  </main>
</template>

<script setup lang="ts">
import InstrumentSelector from "../components/InstrumentSelector.vue";
</script>

<style scoped>
.picker-lab {
  min-height: 100vh;
  background: var(--ink);
  color: var(--ivory);
  padding: clamp(72px, 10vw, 112px) clamp(24px, 5vw, 72px) clamp(32px, 6vw, 80px);
}

.picker-lab__header,
.picker-lab__surface,
.picker-lab__decision {
  width: min(100%, 820px);
  margin-inline: auto;
}

.picker-lab__header { margin-bottom: 40px; }

.picker-lab__eyebrow,
.picker-lab__source,
.picker-lab__status,
.picker-lab__stage,
.picker-lab__facts {
  font-family: var(--font-mono);
}

.picker-lab__eyebrow,
.picker-lab__source,
.picker-lab__status,
.picker-lab__stage-label,
.picker-lab__facts dt {
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.picker-lab__eyebrow,
.picker-lab__source,
.picker-lab__stage-label { color: var(--ivory-3); }
.picker-lab h1 { margin: 8px 0 14px; font: var(--t-display-xl); }
.picker-lab h2 { margin: 5px 0 0; font: var(--t-h1); }

.picker-lab__intro,
.picker-lab__decision > p:last-child {
  max-width: 72ch;
  color: var(--ivory-2);
  font: var(--t-body-mono);
}

.picker-lab__surface {
  border: 1px solid var(--ivory-3);
  background: var(--ink-2);
  padding: clamp(14px, 3vw, 28px);
}

.picker-lab__surface-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
  margin-bottom: 18px;
}

.picker-lab__status {
  flex: none;
  border: 1px solid var(--brass-lo);
  color: var(--brass-hi);
  padding: 6px 8px;
}

.picker-lab__stage {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: clamp(18px, 4vw, 42px);
  min-height: 15rem;
  border: 1px solid var(--ink-5);
  background: #050505;
  padding: clamp(24px, 5vw, 48px);
}

.picker-lab__stage-number {
  margin: 0;
  color: var(--ivory);
  font: var(--t-display-xl);
}

.picker-lab__stage-label { margin: 0 0 8px; }
.picker-lab__stage p:last-child {
  max-width: 52ch;
  margin: 0;
  color: var(--ivory-2);
  font-size: 12px;
  line-height: 1.65;
}
.picker-lab__stage code { color: var(--ivory); }

.picker-lab__facts { display: grid; margin-top: 18px; }
.picker-lab__facts div {
  display: grid;
  grid-template-columns: 88px minmax(0, 1fr);
  gap: 12px;
  border-top: 1px solid var(--ink-5);
  padding: 10px 0;
}
.picker-lab__facts dt { color: var(--ivory); }
.picker-lab__facts dd { margin: 0; color: var(--ivory-3); font-size: 11px; line-height: 1.5; }

.picker-lab__decision {
  margin-top: 18px;
  border-left: 5px solid var(--ivory);
  background: var(--ink-2);
  padding: 24px 28px;
}

@media (max-width: 460px) {
  .picker-lab { padding: 80px 12px 32px; }
  .picker-lab h1 { font: var(--t-display-l); }
  .picker-lab__surface { padding: 10px; }
  .picker-lab__status { display: none; }
  .picker-lab__stage { grid-template-columns: 1fr; min-height: 13rem; }
  .picker-lab__stage-number { font: var(--t-display-l); }
}
</style>
