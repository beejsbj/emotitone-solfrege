<template>
  <ConfigPanel :visual-config-pinia="specimenPinia" />

  <main class="config-menu-page focused-page guide-paper--cobalt">
    <FocusedPoster layer="compositions" unit-id="config-menu" kicker="Focused page · live composition" title="Config Menu">
      <p>
        Open the Config handle at the top right to inspect the production composition. Stage keeps
        its Looks and master control close; related visual layers share focused destinations beside
        Global, Deck, and MIDI.
      </p>
    </FocusedPoster>

    <div class="focused-page__body">
      <section class="focused-sheet" aria-label="Accepted Config Menu direction">
        <h2 class="label">Accepted direction</h2>
        <ol class="config-menu-page__notes">
          <li><span>01</span><p>Knobs own persistent settings.</p></li>
          <li><span>02</span><p>Buttons own momentary icon actions.</p></li>
          <li><span>03</span><p>Ivory Stickers face Stage-only Looks inside Stage.</p></li>
          <li><span>04</span><p>Related Stage layers stay grouped in shallow destinations.</p></li>
        </ol>
      </section>
    </div>
  </main>
</template>

<script setup lang="ts">
import { createPinia } from "pinia";
import ConfigPanel from "../components/ConfigPanel.vue";
import { useVisualConfigStore } from "@/stores/visualConfig";
import FocusedPoster from "./focused/FocusedPoster.vue";
import "./focused/focused-page.css";

const specimenPinia = createPinia();
useVisualConfigStore(specimenPinia).useEphemeralDefaults();
</script>

<style scoped>
.config-menu-page {
  min-height: 100vh;
}

.config-menu-page__notes {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 240px), 1fr));
  gap: var(--s-6);
  margin: 0;
  padding: 0;
  list-style: none;
}

.config-menu-page__notes li {
  display: grid;
  gap: var(--s-4);
  align-content: start;
  padding: var(--s-6);
  background: var(--ink);
}

.config-menu-page__notes span {
  justify-self: start;
  padding: 6px 10px 4px;
  background: var(--guide-paper);
  color: var(--guide-paper-ink);
  clip-path: var(--clip-tile);
  font: 700 26px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  transform: rotate(var(--rot-tile-1));
}

.config-menu-page__notes li:nth-child(even) span { transform: rotate(var(--rot-tile-4)); }

.config-menu-page__notes p {
  margin: 0;
  color: var(--ivory-2);
  font: var(--t-body-s-mono);
  line-height: 1.6;
}
</style>
