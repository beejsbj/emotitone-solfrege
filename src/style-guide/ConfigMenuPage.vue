<template>
  <ConfigPanel :visual-config-pinia="specimenPinia" />

  <main class="config-menu-page">
    <header class="config-menu-page__header">
      <p class="config-menu-page__eyebrow">EmotiTone · focused style-guide page</p>
      <h1>Config Menu.</h1>
      <p>
        Open the Config handle above to inspect the production composition. Its Looks-first library,
        consolidated Stage, separate system destinations, Knobs, Buttons, and Sticker actions all
        cross the same source seam used by the app.
      </p>
    </header>

    <section class="config-menu-page__notes" aria-label="Accepted Config Menu direction">
      <div><span>01</span><p>Knobs own persistent settings.</p></div>
      <div><span>02</span><p>Buttons own momentary icon actions.</p></div>
      <div><span>03</span><p>Ivory Stickers face Stage-only Looks.</p></div>
      <div><span>04</span><p>Brass marks only global and Stage/section masters; Badge stays out.</p></div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { createPinia } from "pinia";
import ConfigPanel from "../components/ConfigPanel.vue";
import { useVisualConfigStore } from "@/stores/visualConfig";

const specimenPinia = createPinia();
useVisualConfigStore(specimenPinia).useEphemeralDefaults();
</script>

<style scoped>
.config-menu-page {
  min-height: 100vh;
  padding: clamp(34rem, 72vh, 48rem) clamp(20px, 5vw, 72px) clamp(32px, 6vw, 80px);
  background: var(--ink);
  color: var(--ivory);
}

.config-menu-page__header,
.config-menu-page__notes {
  width: min(100%, 820px);
  margin-inline: auto;
}

.config-menu-page__eyebrow,
.config-menu-page__notes {
  font-family: var(--font-mono);
}

.config-menu-page__eyebrow {
  margin: 0;
  color: var(--ivory-3);
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.config-menu-page h1 {
  margin: var(--s-2) 0 var(--s-3);
  font: var(--t-display-xl);
}

.config-menu-page__header > p:last-child {
  max-width: 72ch;
  margin: 0;
  color: var(--ivory-2);
  font: var(--t-body-mono);
  line-height: 1.6;
}

.config-menu-page__notes {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1px;
  margin-top: var(--s-8);
  background: var(--ink-5);
}

.config-menu-page__notes div {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  gap: var(--s-3);
  padding: var(--s-4);
  background: var(--ink-2);
}

.config-menu-page__notes span {
  color: var(--ivory);
  font-weight: 700;
}

.config-menu-page__notes p {
  margin: 0;
  color: var(--ivory-3);
  font-size: 11px;
}

@media (max-width: 520px) {
  .config-menu-page { padding-inline: 12px; }
  .config-menu-page h1 { font: var(--t-display-l); }
  .config-menu-page__notes { grid-template-columns: 1fr; }
}
</style>
