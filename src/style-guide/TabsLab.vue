<template>
  <main class="tabs-lab">
    <header class="tabs-lab__header">
      <p class="tabs-lab__eyebrow">EmotiTone · focused design lab</p>
      <h1>Tabs.</h1>
      <p class="tabs-lab__intro">
        One live source, three real footprints. The accepted chip-slide is shown directly, then
        through the same panel seam used by Instrument and Config.
      </p>
    </header>

    <section class="tabs-lab__comparison" aria-label="Current tabs comparison">
      <article class="tabs-lab__surface">
        <header class="tabs-lab__surface-heading">
          <div>
            <p class="tabs-lab__source">Authoritative source · Tabs.vue</p>
            <h2>Accepted chip slide.</h2>
          </div>
          <span class="tabs-lab__status">Source</span>
        </header>

        <div class="tabs-lab__stage tabs-lab__stage--chip">
          <Tabs
            v-model="sourceValue"
            :tabs="sourceTabs"
            aria-label="Current guide tabs"
          />
        </div>

        <dl class="tabs-lab__facts">
          <div><dt>Active</dt><dd>One chip slides beneath the selected label.</dd></div>
          <div><dt>Rail</dt><dd>Framed ink shell with a continuous dark streak.</dd></div>
          <div><dt>Motion</dt><dd>Swing transition plus a brief directional smear.</dd></div>
          <div><dt>Edition</dt><dd>One guide variant is shared across unpinned Tabs per app load.</dd></div>
        </dl>
      </article>

      <article class="tabs-lab__surface">
        <header class="tabs-lab__surface-heading">
          <div>
            <p class="tabs-lab__source">Production consumer · TabbedOverlayPanel.vue</p>
            <h2>Instrument footprint.</h2>
          </div>
          <span class="tabs-lab__status tabs-lab__status--live">Live</span>
        </header>

        <div class="tabs-lab__stage tabs-lab__stage--panel">
          <TabbedOverlayPanel
            v-model="instrumentValue"
            :tabs="instrumentTabs"
            tab-test-id-prefix="tabs-lab-instrument"
            tabs-aria-label="Instrument footprint tabs"
            width="100%"
            max-height="none"
          >
            <template #header>
              <p class="tabs-lab__panel-kicker">Instrument picker footprint</p>
            </template>
            <div class="tabs-lab__panel-body">
              {{ activeInstrumentLabel }}
            </div>
          </TabbedOverlayPanel>
        </div>

        <dl class="tabs-lab__facts">
          <div><dt>Active</dt><dd>The same selected chip moves beneath the current bank.</dd></div>
          <div><dt>Rail</dt><dd>The panel footer imports the authoritative primitive.</dd></div>
          <div><dt>Motion</dt><dd>Selection changes retain the shared swing and smear.</dd></div>
          <div><dt>Scale</dt><dd>The compact rail scrolls and keeps the active item in view.</dd></div>
        </dl>
      </article>
    </section>

    <section class="tabs-lab__surface tabs-lab__surface--wide">
      <header class="tabs-lab__surface-heading">
        <div>
          <p class="tabs-lab__source">Production stress case · same source</p>
          <h2>Sixteen destinations.</h2>
        </div>
        <span class="tabs-lab__status tabs-lab__status--live">Live recipe</span>
      </header>

      <div class="tabs-lab__stage tabs-lab__stage--panel">
        <TabbedOverlayPanel
          v-model="configValue"
          :tabs="configTabs"
          tab-test-id-prefix="tabs-lab-config"
          tabs-aria-label="Configuration stress-case tabs"
          width="100%"
          max-height="none"
        >
          <template #header>
            <p class="tabs-lab__panel-kicker">Config menu footprint</p>
          </template>
          <div class="tabs-lab__panel-body">
            {{ activeConfigLabel }}
          </div>
        </TabbedOverlayPanel>
      </div>
    </section>

    <aside class="tabs-lab__question">
      <p class="tabs-lab__eyebrow">Accepted definition</p>
      <h2>One moving surface.</h2>
      <p>
        Tabs remain one visibly continuous selector. The cut-paper chip changes as a stable
        page-load edition; explicit guide specimens stay pinned so every allowed variant remains inspectable.
      </p>
    </aside>
  </main>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Tabs, { type TabItem } from "../components/primatives/Tabs.vue";
import TabbedOverlayPanel, { type TabbedOverlayTab } from "../components/TabbedOverlayPanel.vue";

const sourceValue = ref("instrument");
const instrumentValue = ref("all");
const configValue = ref("home");

const sourceTabs: TabItem[] = [
  { label: "Anim", value: "instrument" },
  { label: "Freq", value: "config" },
  { label: "Color", value: "pattern" },
  { label: "Scope", value: "stage" },
];

const instrumentTabs: TabbedOverlayTab[] = [
  { value: "all", label: "All Sounds", shortLabel: "All" },
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
  ["floatingPopup", "Floating Popup", "Popup"],
  ["hilbertScope", "Hilbert Scope", "Scope"],
  ["beatingShapes", "Beating Shapes", "Beat"],
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

const activeInstrumentLabel = computed(
  () => instrumentTabs.find((tab) => tab.value === instrumentValue.value)?.label,
);
const activeConfigLabel = computed(
  () => configTabs.find((tab) => tab.value === configValue.value)?.label,
);
</script>

<style scoped>
.tabs-lab {
  min-height: 100vh;
  background: var(--ink);
  color: var(--ivory);
  padding: clamp(24px, 5vw, 72px);
}

.tabs-lab__header,
.tabs-lab__comparison,
.tabs-lab__surface--wide,
.tabs-lab__question {
  width: min(100%, 1120px);
  margin-inline: auto;
}

.tabs-lab__header {
  margin-bottom: 40px;
}

.tabs-lab__eyebrow,
.tabs-lab__source,
.tabs-lab__status,
.tabs-lab__panel-kicker,
.tabs-lab__facts {
  font-family: var(--font-mono);
}

.tabs-lab__eyebrow,
.tabs-lab__source,
.tabs-lab__status,
.tabs-lab__panel-kicker,
.tabs-lab__facts dt {
  font-size: 10px;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.tabs-lab__eyebrow,
.tabs-lab__source {
  color: var(--ivory-3);
}

.tabs-lab h1 {
  margin: 8px 0 14px;
  font: var(--t-display-xl);
}

.tabs-lab__intro,
.tabs-lab__question > p:last-child {
  max-width: 68ch;
  color: var(--ivory-2);
  font: var(--t-body-mono);
}

.tabs-lab__comparison {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 18px;
}

.tabs-lab__surface {
  border: 1px solid var(--ink-5);
  background: var(--ink-2);
  padding: clamp(16px, 2.5vw, 28px);
}

.tabs-lab__surface--wide,
.tabs-lab__question {
  margin-top: 18px;
}

.tabs-lab__surface-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 18px;
}

.tabs-lab h2 {
  margin: 5px 0 0;
  font: var(--t-h1);
}

.tabs-lab__status {
  flex: none;
  border: 1px solid var(--ink-5);
  color: var(--ivory-3);
  padding: 6px 8px;
}

.tabs-lab__status--live {
  color: var(--ivory);
}

.tabs-lab__stage {
  display: flex;
  align-items: center;
  min-height: 220px;
  background: #050505;
  padding: clamp(14px, 3vw, 34px);
}

.tabs-lab__stage--chip {
  align-items: center;
}

.tabs-lab__stage--panel {
  align-items: stretch;
  min-width: 0;
}

.tabs-lab__panel-kicker {
  color: var(--ivory-2);
}

.tabs-lab__panel-body {
  display: grid;
  min-height: 70px;
  place-items: center;
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .16em;
  text-transform: uppercase;
}

.tabs-lab__facts {
  display: grid;
  gap: 0;
  margin-top: 18px;
}

.tabs-lab__facts div {
  display: grid;
  grid-template-columns: 76px minmax(0, 1fr);
  gap: 12px;
  border-top: 1px solid var(--ink-5);
  padding: 10px 0;
}

.tabs-lab__facts dt {
  color: var(--ivory);
}

.tabs-lab__facts dd {
  margin: 0;
  color: var(--ivory-3);
  font-size: 11px;
  line-height: 1.5;
}

.tabs-lab__question {
  border-left: 5px solid var(--ivory);
  background: var(--ink-2);
  padding: 24px 28px;
}

@media (max-width: 760px) {
  .tabs-lab__comparison {
    grid-template-columns: 1fr;
  }

  .tabs-lab__stage {
    min-height: 180px;
  }
}
</style>
