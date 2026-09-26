<template>
  <main class="tabs-page focused-page guide-paper--tomato">
    <FocusedPoster layer="primitives" unit-id="tabs" kicker="Focused page · one live source" title="Tabs">
      <p>
        One live source, three real footprints: the chip slide on its own, then through the same
        panel seam Instrument and Config use.
      </p>
    </FocusedPoster>

    <div class="focused-page__body">
      <section class="tabs-page__comparison" aria-label="Current tabs comparison">
        <article class="focused-sheet">
          <header class="focused-sheet__head">
            <div>
              <p class="focused-sheet__source">Authoritative source · Tabs.vue</p>
              <h2 class="focused-sheet__title">Accepted chip slide</h2>
            </div>
            <Sticker variant="outline" color="ivory">Source</Sticker>
          </header>

          <div class="focused-well tabs-page__stage">
            <Tabs
              v-model="sourceValue"
              :tabs="sourceTabs"
              aria-label="Current guide tabs"
            />
          </div>

          <dl class="focused-facts">
            <div><dt>Active</dt><dd>One chip slides beneath the selected label.</dd></div>
            <div><dt>Rail</dt><dd>Framed ink shell with a continuous dark streak.</dd></div>
            <div><dt>Motion</dt><dd>Swing transition plus a brief directional smear.</dd></div>
            <div><dt>Edition</dt><dd>One guide variant is shared across unpinned Tabs per app load.</dd></div>
          </dl>
        </article>

        <article class="focused-sheet">
          <header class="focused-sheet__head">
            <div>
              <p class="focused-sheet__source">Production consumer · TabbedOverlayPanel.vue</p>
              <h2 class="focused-sheet__title">Instrument footprint</h2>
            </div>
            <Sticker variant="fill" color="ivory">Live</Sticker>
          </header>

          <div class="focused-well tabs-page__stage tabs-page__stage--panel">
            <TabbedOverlayPanel
              v-model="instrumentValue"
              :tabs="instrumentTabs"
              tab-test-id-prefix="tabs-page-instrument"
              tabs-aria-label="Instrument footprint tabs"
              width="100%"
              max-height="none"
            >
              <template #header>
                <p class="tabs-page__panel-kicker">Instrument picker footprint</p>
              </template>
              <template #default="{ activeValue }">
                <div class="tabs-page__panel-body">
                  {{ labelFor(instrumentTabs, activeValue) }}
                </div>
              </template>
            </TabbedOverlayPanel>
          </div>

          <dl class="focused-facts">
            <div><dt>Active</dt><dd>The same selected chip moves beneath the current bank.</dd></div>
            <div><dt>Rail</dt><dd>The panel footer imports the authoritative primitive.</dd></div>
            <div><dt>Motion</dt><dd>Swipes track the finger; rail taps slide the same paired pages.</dd></div>
            <div><dt>Scale</dt><dd>The compact rail scrolls and keeps the active item in view.</dd></div>
          </dl>
        </article>
      </section>

      <section class="focused-sheet">
        <header class="focused-sheet__head">
          <div>
            <p class="focused-sheet__source">Production stress case · same source</p>
            <h2 class="focused-sheet__title">Fifteen destinations</h2>
          </div>
          <Sticker variant="fill" color="ivory">Live recipe</Sticker>
        </header>

        <div class="focused-well tabs-page__stage tabs-page__stage--panel">
          <TabbedOverlayPanel
            v-model="configValue"
            :tabs="configTabs"
            tab-test-id-prefix="tabs-page-config"
            tabs-aria-label="Configuration stress-case tabs"
            width="100%"
            max-height="none"
          >
            <template #header>
              <p class="tabs-page__panel-kicker">Config menu footprint</p>
            </template>
            <template #default="{ activeValue }">
              <div class="tabs-page__panel-body">
                {{ labelFor(configTabs, activeValue) }}
              </div>
            </template>
          </TabbedOverlayPanel>
        </div>
      </section>

      <aside class="focused-slip">
        <p class="focused-slip__kicker">Accepted definition</p>
        <h2>One moving surface</h2>
        <p>
          Tabs remain one visibly continuous selector and content viewport. The cut-paper chip changes
          as a stable page-load edition; swiped or tapped pages move as a pair, and explicit guide
          specimens stay pinned so every allowed variant remains inspectable.
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
import Tabs, { type TabItem } from "../components/primatives/Tabs.vue";
import TabbedOverlayPanel, { type TabbedOverlayTab } from "../components/TabbedOverlayPanel.vue";

const sourceValue = ref("instrument");
const instrumentValue = ref("keys");
const configValue = ref("home");

const sourceTabs: TabItem[] = [
  { label: "Anim", value: "instrument" },
  { label: "Freq", value: "config" },
  { label: "Color", value: "pattern" },
  { label: "Scope", value: "stage" },
];

const instrumentTabs: TabbedOverlayTab[] = [
  { value: "keys", label: "Keyboards", shortLabel: "Keys" },
  { value: "synth", label: "Synths", shortLabel: "Synth" },
  { value: "gm", label: "General MIDI", shortLabel: "GM" },
  { value: "drums", label: "Drums", shortLabel: "Drums" },
];

const configLabels = [
  ["home", "Scenes", "Home"],
  ["blobs", "Blobs", "Blobs"],
  ["ambient", "Ambient Glow", "Glow"],
  ["particles", "Particles", "Dust"],
  ["strings", "Strings", "Lines"],
  ["animation", "Animation", "Anim"],
  ["frequencyMapping", "Frequency Mapping", "Freq"],
  ["dynamicColors", "Dynamic Colors", "Color"],
  ["hilbertScope", "Hilbert Scope", "Scope"],
  ["uiBeat", "UI Beat", "Beat"],
  ["patterns", "Patterns", "Patt"],
  ["keyboard", "Keyboard", "Keys"],
  ["codeStrip", "Code Strip", "Code"],
  ["midi", "MIDI & ROLI", "MIDI"],
  ["presets", "Presets", "Presets"],
] as const;

const configTabs: TabbedOverlayTab[] = configLabels.map(([value, label, shortLabel]) => ({
  value,
  label,
  shortLabel,
}));

const labelFor = (tabs: TabbedOverlayTab[], value: string) =>
  tabs.find((tab) => tab.value === value)?.label;
</script>

<style scoped>
.tabs-page__comparison {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 440px), 1fr));
  gap: var(--s-9) var(--s-7);
}

.tabs-page__stage { min-height: 220px; }
.tabs-page__stage--panel { align-items: stretch; }

.tabs-page__panel-kicker {
  margin: 0;
  color: var(--ivory-2);
  font: var(--t-body-s-mono);
}

.tabs-page__panel-body {
  display: grid;
  min-height: 70px;
  place-items: center;
  color: var(--ivory-3);
  font: 700 26px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

@media (max-width: 760px) {
  .tabs-page__stage { min-height: 180px; }
}
</style>
