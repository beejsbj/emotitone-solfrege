<script setup lang="ts">
import { ref } from "vue";
import DrawerShell from "../../components/primatives/DrawerShell.vue";

type PaneName = "instrument" | "presets" | "settings";

const drawerOpen = ref(false);
const activePane = ref<PaneName>("instrument");

const triggers: Array<{ pane: PaneName; label: string; primary?: boolean }> = [
  { pane: "instrument", label: "Instrument picker", primary: true },
  { pane: "presets", label: "Visual presets" },
  { pane: "settings", label: "Settings" },
];

const instruments = ["clavisynth", "fmpiano", "celesta", "piano", "steinway", "harpsichord"];
const soundTabs = ["Sound", "All Sounds"];
const synthTabs = ["Mall", "Strin", "Orga", "Winds", "Synth"];
const presetRows = [
  { name: "Soft Glass", color: "var(--tomato)" },
  { name: "Pulse Lab", color: "var(--tomato)" },
  { name: "Ambient Bloom", color: "var(--plum)" },
  { name: "Classroom", color: "var(--pine)" },
];
const presetTabs = ["Anim", "Freq", "Color", "Popup", "Scope"];
const settings = [
  { name: "MIDI Input", value: "2 DEVICES · ROLI · BLOCKS" },
  { name: "Haptic feedback", value: "ON · MEDIUM" },
  { name: "Audio engine", value: "SUPERDOUGH · 48 KHZ" },
  { name: "Reduced motion", value: "SYSTEM" },
];
const params = [
  { value: "E", label: "Key" },
  { value: "LOCRIAN", label: "Mode", compact: true },
  { value: "120", label: "BPM" },
  { value: "4", label: "Octave" },
  { value: "3", label: "Rows" },
];
const tiles = [
  { key: "E5", syllable: "Do", pitch: "E4", background: "hsl(18 85% 56%)" },
  { key: "F5", syllable: "Ra", pitch: "F4", background: "hsl(78 72% 52%)" },
  { key: "G5", syllable: "Me", pitch: "G4", background: "hsl(108 62% 48%)" },
  { key: "A5", syllable: "Fa", pitch: "A4", background: "hsl(178 68% 50%)" },
  { key: "A#5", syllable: "Se", pitch: "A#4", background: "hsl(228 78% 58%)", dark: true },
  { key: "C6", syllable: "Le", pitch: "C5", background: "hsl(282 66% 60%)", dark: true },
  { key: "D6", syllable: "Te", pitch: "D5", background: "hsl(342 80% 56%)", dark: true },
];

const openPane = (pane: PaneName) => {
  activePane.value = pane;
  drawerOpen.value = true;
};
</script>

<template>
  <section class="preview-port preview-port--composition-top-drawer">
    <div class="card">
      <div class="triggers">
        <button
          v-for="trigger in triggers"
          :key="trigger.pane"
          type="button"
          class="trig"
          :class="{ primary: trigger.primary, ghost: !trigger.primary }"
          @click="openPane(trigger.pane)"
        >
          {{ trigger.label }}
        </button>
      </div>

      <DrawerShell
        v-model="drawerOpen"
        class="composition-drawer"
        frame-height="480px"
        handle-label="Tap · ESC"
        aria-label="close top drawer"
      >
        <template #stage>
          <div class="drawer-app">
            <div class="app-panel-header">
              <span class="app-badge">Piano</span>
              <span class="app-meta">E LOCRIAN · <strong>2I</strong> · EXPIRING</span>
              <div class="app-meta-right">
                <button class="icon-btn" type="button">●</button>
                <button class="icon-btn" type="button">⎘</button>
              </div>
            </div>
            <div class="chromatic-tape"></div>
            <div class="param-row">
              <div v-for="param in params" :key="param.label" class="param">
                <span class="v" :class="{ 'v--compact': param.compact }">{{ param.value }}</span>
                <span class="lbl">{{ param.label }}</span>
              </div>
            </div>
            <div class="tile-row">
              <div
                v-for="tile in tiles"
                :key="tile.key"
                class="tile"
                :class="{ dark: tile.dark }"
                :style="{ background: tile.background }"
              >
                <span class="corner">{{ tile.key }}</span>
                <span class="syll">{{ tile.syllable }}</span>
                <span class="pitch">{{ tile.pitch }}</span>
              </div>
            </div>
          </div>
        </template>

        <div v-show="activePane === 'instrument'" class="drawer-pane">
          <div class="drawer-head">
            <div class="seg">
              <button
                v-for="tab in soundTabs"
                :key="tab"
                type="button"
                :class="{ on: tab === 'Sound' }"
              >
                {{ tab }}
              </button>
            </div>
            <span class="sample-count">992 SAMPLES</span>
          </div>
          <div class="search-bar">
            <span class="icon">⌕</span>
            <span class="placeholder">Search sounds</span>
          </div>
          <div class="group">
            <div class="group-label">Keyboards</div>
            <div class="instrument-grid">
              <button
                v-for="instrument in instruments"
                :key="instrument"
                type="button"
                class="instrument"
                :class="{ active: instrument === 'piano' }"
              >
                {{ instrument }}
              </button>
            </div>
          </div>
          <div class="seg">
            <button
              v-for="tab in synthTabs"
              :key="tab"
              type="button"
              :class="{ on: tab === 'Synth' }"
            >
              {{ tab }}
            </button>
          </div>
        </div>

        <div v-show="activePane === 'presets'" class="drawer-pane">
          <div class="drawer-head">
            <div class="title">Visual presets</div>
          </div>
          <div v-for="preset in presetRows" :key="preset.name" class="preset-row">
            <span class="preset-spine" :style="{ background: preset.color }"></span>
            <span class="preset-name">{{ preset.name }}</span>
            <button class="preset-apply" type="button">Apply</button>
          </div>
          <div class="seg seg--spaced">
            <button
              v-for="tab in presetTabs"
              :key="tab"
              type="button"
              :class="{ on: tab === 'Color' }"
            >
              {{ tab }}
            </button>
          </div>
        </div>

        <div v-show="activePane === 'settings'" class="drawer-pane">
          <div class="drawer-head">
            <div class="title">Settings</div>
          </div>
          <div v-for="setting in settings" :key="setting.name" class="setting-item">
            <div class="setting-name">{{ setting.name }}</div>
            <div class="setting-val">{{ setting.value }}</div>
          </div>
        </div>
      </DrawerShell>

      <div class="spec-grid">
        <div><b>Anchor</b><code>top edge · full width · push-down not overlay</code></div>
        <div><b>Open</b><code>translateY(-100%) → 0 · Swing via DrawerShell</code></div>
        <div><b>Edge</b><code>torn-paper SVG · grip + caption owned by primitive</code></div>
        <div><b>Dismiss</b><code>tap handle · click scrim · ESC key</code></div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.preview-port {
  display: block;
}

.triggers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 14px;
}

.trig {
  border: 0;
  cursor: pointer;
  font: 700 12px/1 var(--font-display);
  letter-spacing: .14em;
  padding: 9px 16px;
  text-transform: uppercase;
}

.trig.primary {
  background: var(--ivory);
  color: var(--ink);
}

.trig.ghost {
  border: 1px solid var(--ink-5);
  background: transparent;
  color: var(--ivory);
}

.drawer-app {
  position: relative;
  padding: 14px;
}

.drawer-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 14px;
}

.drawer-head .title {
  color: var(--ivory);
  font: 400 22px/1 var(--font-display);
  letter-spacing: .03em;
  text-transform: uppercase;
}

.sample-count {
  margin-left: auto;
  color: var(--ivory-3);
  font: var(--t-label);
  font-size: 10px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.search-bar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  border: 1px solid var(--ink-5);
  padding: 9px 14px;
}

.search-bar .icon {
  color: var(--ivory-3);
}

.search-bar .placeholder {
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 11px;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.group {
  position: relative;
  margin-bottom: 10px;
  border: 1px solid var(--ink-5);
  padding: 14px;
}

.group-label {
  position: absolute;
  top: -10px;
  left: 12px;
  background: var(--ink-3);
  color: var(--ivory);
  font: 700 13px/1 var(--font-display);
  letter-spacing: .14em;
  padding: 0 8px;
  text-transform: uppercase;
}

.instrument-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 6px;
  margin-top: 4px;
}

.instrument {
  border: 1px solid var(--ink-5);
  background: transparent;
  color: var(--ivory-3);
  cursor: pointer;
  font: var(--t-mono);
  font-size: 11px;
  letter-spacing: .12em;
  padding: 7px 10px;
  text-align: center;
}

.instrument.active {
  border-color: var(--ivory);
  background: var(--ivory);
  color: var(--ink);
}

.seg {
  display: inline-flex;
  gap: 1px;
  border: 1px solid var(--ink-5);
  background: var(--ink-2);
  padding: 2px;
}

.seg--spaced {
  margin-top: 12px;
}

.seg button {
  border: 0;
  background: transparent;
  color: var(--ivory-3);
  cursor: pointer;
  font: 700 12px/1 var(--font-display);
  letter-spacing: .12em;
  padding: 5px 10px;
  text-transform: uppercase;
}

.seg button.on {
  background: var(--ivory-4);
  color: var(--ivory);
}

.preset-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
  border: 1px solid var(--ink-5);
  padding: 10px 12px;
}

.preset-spine {
  width: 4px;
  align-self: stretch;
  flex-shrink: 0;
}

.preset-name {
  flex: 1;
  color: var(--ivory);
  font: 400 18px/1 var(--font-display);
  letter-spacing: .03em;
  text-transform: uppercase;
}

.preset-apply {
  border: 1px solid var(--ink-5);
  background: transparent;
  color: var(--ivory-3);
  cursor: pointer;
  font: 700 11px/1 var(--font-display);
  letter-spacing: .14em;
  padding: 4px 10px;
  text-transform: uppercase;
}

.setting-item {
  margin-bottom: 8px;
  border: 1px solid var(--ink-5);
  padding: 12px 14px;
}

.setting-name {
  color: var(--ivory);
  font: 400 16px/1 var(--font-display);
  letter-spacing: .03em;
  text-transform: uppercase;
}

.setting-val {
  margin-top: 4px;
  color: var(--ivory-3);
  font: var(--t-label);
  letter-spacing: .16em;
}

.app-panel-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 6px;
  border: 1px solid var(--ink-5);
  background: var(--ink-3);
  padding: 9px 12px;
}

.app-badge {
  border: 1px solid var(--ink-5);
  color: var(--ivory);
  font: 400 14px/1 var(--font-display);
  letter-spacing: .05em;
  padding: 3px 8px 2px;
  text-transform: uppercase;
}

.app-meta {
  color: var(--ivory-3);
  font: var(--t-label);
  font-size: 11px;
  letter-spacing: .12em;
}

.app-meta strong {
  color: var(--ivory-2);
}

.app-meta-right {
  display: flex;
  gap: 6px;
  margin-left: auto;
}

.icon-btn {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  border: 1px solid var(--ink-5);
  background: transparent;
  color: var(--ivory-3);
  cursor: pointer;
  font-size: 10px;
}

.chromatic-tape {
  height: 5px;
  margin-top: -1px;
  margin-bottom: 14px;
  border-right: 1px solid var(--ink-5);
  border-bottom: 1px solid var(--ink-5);
  border-left: 1px solid var(--ink-5);
  background: linear-gradient(90deg, var(--note-do) 0 14%, var(--note-re) 14% 28%, var(--note-mi) 28% 43%, var(--note-fa) 43% 57%, var(--note-sol) 57% 71%, var(--note-la) 71% 86%, var(--note-ti) 86% 100%);
}

.param-row {
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 8px;
  margin-bottom: 14px;
  border-top: 1px solid var(--ink-5);
  border-bottom: 1px solid var(--ink-5);
  padding: 8px 4px;
}

.param {
  text-align: center;
}

.param .v {
  display: block;
  color: var(--ivory);
  font: 400 18px/1 var(--font-display);
  letter-spacing: .01em;
  text-transform: uppercase;
}

.param .v--compact {
  font-size: 11px;
  letter-spacing: .02em;
}

.param .lbl {
  display: block;
  margin-top: 4px;
  color: var(--ivory-3);
  font: var(--t-label);
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.tile-row {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 5px;
}

.tile {
  position: relative;
  display: flex;
  overflow: hidden;
  aspect-ratio: 1.05;
  flex-direction: column;
  justify-content: space-between;
  border: 1px solid rgba(0, 0, 0, .5);
  padding: 7px 8px 8px;
}

.tile .syll {
  color: rgba(0, 0, 0, .88);
  font: 400 26px/.9 var(--font-display);
}

.tile .pitch {
  color: rgba(0, 0, 0, .6);
  font: 400 14px/.9 var(--font-display);
}

.tile.dark .syll {
  color: rgba(255, 255, 255, .95);
}

.tile.dark .pitch {
  color: rgba(255, 255, 255, .7);
}

.tile .corner {
  position: absolute;
  top: 5px;
  right: 5px;
  color: rgba(0, 0, 0, .45);
  font: var(--t-mono);
  font-size: 8px;
  letter-spacing: .1em;
}

.tile.dark .corner {
  color: rgba(255, 255, 255, .45);
}

.spec-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 12px;
  margin-top: 14px;
  font-size: 11px;
}

.spec-grid > div {
  border-left: 2px solid var(--hairline);
  padding: 4px 0 4px 8px;
}

.spec-grid b {
  display: block;
  color: var(--ivory);
  font: 700 11px/1 var(--font-display);
  letter-spacing: .14em;
  text-transform: uppercase;
}

.spec-grid code {
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 9px;
}
</style>
