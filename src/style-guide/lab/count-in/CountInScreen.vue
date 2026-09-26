<script setup lang="ts">
import { computed } from "vue";
import MidiPermissionIcon from "@/components/MidiPermissionIcon.vue";
import Mark from "@/components/primatives/Mark.vue";
import Sticker from "@/components/primatives/Sticker";
import type { LabLoadingScreenProps, LabLoadingStage } from "@/types/styleGuide";
import CountInLogo from "./CountInLogo.vue";

/**
 * Direction A · Count-In. The load is the band counting in: each required
 * stage is one beat of "one, two, three, four", pasted up as a gig-poster
 * tile when it lands. MIDI is the "and" — the pickup, optional.
 */
const props = withDefaults(defineProps<LabLoadingScreenProps>(), { still: false });
const emit = defineEmits<{ start: [] }>();

const PAPERS = ["tomato", "mustard", "cobalt", "pine"] as const;
const INKS = ["ink", "ink", "ivory", "ivory"] as const;
const WORDS = ["ONE", "TWO", "THREE", "FOUR"];

const required = computed(() => props.stages.filter((stage) => !stage.optional));
const midi = computed(() => props.stages.find((stage) => stage.optional));

function stageState(stage: LabLoadingStage) {
  if (stage.complete) return "is-complete";
  if (stage.active) return "is-active";
  return "is-pending";
}

function stageLabel(stage: LabLoadingStage) {
  const state = stage.complete
    ? stage.stamp === "SKIP" ? "skipped" : stage.stamp === "N/A" ? "not available" : "complete"
    : stage.active ? "current" : "pending";
  return [stage.label, stage.optional ? "optional" : "", state, stage.detail].filter(Boolean).join(", ");
}

const midiPaper = computed(() => (midi.value?.stamp === "SET" ? "plum" : "ink-4"));
</script>

<template>
  <section
    class="count-screen"
    :class="{ 'is-ready': ready, 'is-still': still }"
    aria-label="EmotiTone loading screen · Count-In"
  >
    <div class="count-screen__marks" aria-hidden="true">
      <Mark class="count-screen__float count-screen__float--1" name="wave" tone="inherit" :size="30" />
      <Mark class="count-screen__float count-screen__float--2" name="sharp" tone="inherit" :size="22" />
      <Mark class="count-screen__float count-screen__float--3" name="star" tone="inherit" :size="24" />
    </div>

    <div class="count-screen__stage">
    <header class="count-screen__head">
      <CountInLogo class="count-screen__logo" size="var(--count-logo)" :live="!still" />
      <div class="count-screen__call">
        <p class="count-screen__kicker">
          <span>SOUNDCHECK</span>
          <span class="count-screen__tempo">♩ = 104</span>
        </p>
        <h1 class="count-screen__title">COUNT<br>IT IN.</h1>
      </div>
    </header>

    <div class="count-screen__board">
      <ol
        class="count-screen__tiles"
        role="progressbar"
        aria-label="Loading progress"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <li
          v-for="(stage, index) in required"
          :key="stage.label"
          class="count-tile"
          :class="stageState(stage)"
          :style="{
            '--tile-paper': `var(--${PAPERS[index]})`,
            '--tile-ink': `var(--${INKS[index]})`,
            '--tile-fill': stage.active ? stageFraction : stage.complete ? 1 : 0,
            '--tile-tilt': index % 2 ? 'var(--rot-mark)' : 'var(--rot-sticker)',
          }"
          :aria-label="stageLabel(stage)"
          :aria-current="stage.active ? 'step' : undefined"
        >
          <span class="count-tile__fill" aria-hidden="true" />
          <span class="count-tile__number" aria-hidden="true">{{ index + 1 }}</span>
          <span class="count-tile__word" aria-hidden="true">{{ WORDS[index] }}</span>
          <span class="count-tile__label">{{ stage.label }}</span>
          <span class="count-tile__stamp" aria-hidden="true">
            <Sticker variant="fill" color="ink">SET</Sticker>
          </span>
        </li>
      </ol>

      <div
        v-if="midi"
        class="count-and"
        :class="stageState(midi)"
        :style="{ '--and-paper': `var(--${midiPaper})` }"
        :aria-label="stageLabel(midi)"
      >
        <span class="count-and__glyph" aria-hidden="true">&amp;</span>
        <span class="count-and__copy">
          <span class="count-and__label">
            <MidiPermissionIcon class="count-and__icon" />
            {{ midi.label }}
            <small>optional</small>
          </span>
          <span class="count-and__detail">{{ midi.detail }}</span>
        </span>
        <span class="count-and__stamp" aria-hidden="true">
          <Sticker variant="fill" color="ivory">{{ midi.stamp ?? "…" }}</Sticker>
        </span>
      </div>
    </div>

    <footer class="count-screen__foot">
      <p class="count-screen__status" role="status" aria-live="polite">
        <strong>{{ phase }}</strong>
        <span>{{ message }}</span>
        <em>{{ String(percent).padStart(2, "0") }}%</em>
      </p>

      <button v-if="ready" type="button" class="count-gate" aria-label="Play EmotiTone" @click="emit('start')">
        <span class="count-gate__label"><span aria-hidden="true">►</span> PLAY</span>
        <span class="count-gate__sub">on the downbeat</span>
      </button>
      <div v-else class="count-gate-slot" aria-hidden="true">
        <span v-for="beat in 4" :key="beat" class="count-gate-slot__beat" :style="{ '--beat-index': beat - 1 }" />
        <span class="count-gate-slot__copy">waiting for the downbeat</span>
      </div>
    </footer>
    </div>
  </section>
</template>

<style scoped>
.count-screen {
  --lab-beat: 577ms;

  position: relative;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  background: var(--ink);
  color: var(--ivory);
  container-type: size;
  isolation: isolate;
}

.count-screen__stage {
  --count-logo: clamp(76px, 24cqi, 108px);
  --gate-height: clamp(76px, 10cqh, 96px);

  display: grid;
  height: 100%;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: clamp(12px, 2.2cqh, 22px);
  padding: clamp(16px, 5cqi, 28px) clamp(16px, 5cqi, 28px) clamp(14px, 2.4cqh, 24px);
}

.count-screen *,
.count-screen *::before,
.count-screen *::after { box-sizing: border-box; }

/* ── Floating Marks ─────────────────────────────── */
.count-screen__marks { position: absolute; z-index: -1; inset: 0; pointer-events: none; }
.count-screen__float { position: absolute; opacity: .7; animation: count-float calc(var(--lab-beat) * 8) var(--ease-brush) infinite alternate; }
.count-screen__float--1 { top: 22%; right: 6%; color: var(--cobalt); rotate: -12deg; }
.count-screen__float--2 { top: 17%; right: 4%; color: var(--plum); rotate: 8deg; animation-delay: calc(var(--lab-beat) * -3); }
.count-screen__float--3 { bottom: 20%; left: 3%; color: var(--mustard); rotate: 14deg; animation-delay: calc(var(--lab-beat) * -5); }

/* ── Head ───────────────────────────────────────── */
.count-screen__head {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: end;
  gap: clamp(12px, 4cqi, 24px);
}

.count-screen__kicker {
  display: flex;
  flex-wrap: wrap;
  gap: 6px 10px;
  margin: 0 0 6px;
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
}

.count-screen__kicker > span:first-child {
  padding: 4px 6px 3px;
  background: var(--ivory);
  color: var(--ink);
  clip-path: var(--clip-tab);
}

.count-screen__tempo { align-self: center; color: var(--ivory-3); }

.count-screen__title {
  margin: 0;
  font: 700 clamp(44px, 15cqi, 64px)/1.14 var(--font-display);
  letter-spacing: var(--tracking-display);
}

/* ── Count tiles ────────────────────────────────── */
.count-screen__board {
  display: grid;
  min-height: 0;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: clamp(10px, 1.6cqh, 16px);
}

.count-screen__tiles {
  display: grid;
  min-height: 0;
  margin: 0;
  padding: 0;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  grid-template-rows: repeat(2, minmax(0, 1fr));
  gap: clamp(8px, 3cqi, 16px);
  list-style: none;
}

.count-tile {
  position: relative;
  display: grid;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  padding: clamp(8px, 3cqi, 16px);
  grid-template-rows: minmax(0, 1fr) auto auto;
  align-items: end;
  background: var(--ink-2);
  color: var(--ivory-3);
  clip-path: var(--clip-tile);
  transition: background-color var(--dur-ui) var(--ease-brush), color var(--dur-ui) var(--ease-brush);
}

.count-tile__fill {
  position: absolute;
  inset: 0;
  background: var(--tile-paper);
  clip-path: var(--clip-offcut);
  transform: translateY(calc((1 - var(--tile-fill)) * 104%));
  transition: transform var(--dur-panel) var(--ease-brush);
}

.count-tile.is-pending .count-tile__fill { opacity: 0; }
.count-tile.is-active .count-tile__fill { opacity: .9; }

.count-tile__number {
  position: relative;
  align-self: start;
  justify-self: start;
  margin: 0 0 0 -.02em;
  font: 700 clamp(88px, 32cqi, 200px)/.92 var(--font-display);
  color: transparent;
  -webkit-text-stroke: 2px var(--ivory-4);
}

.count-tile__word {
  position: relative;
  font: 700 11px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  opacity: .8;
}

.count-tile__label {
  position: relative;
  margin-top: 4px;
  font: 700 clamp(15px, 4.4cqi, 22px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.count-tile__stamp {
  position: absolute;
  top: clamp(8px, 2.6cqi, 14px);
  right: clamp(8px, 2.6cqi, 14px);
  opacity: 0;
  transform: scale(1.6) rotate(-14deg);
}

.count-tile__stamp :deep(.sticker) { font-size: 12px; padding: 4px 8px 3px; }

/* Active: the beat is being counted right now. */
.count-tile.is-active { color: var(--ivory); }
.count-tile.is-active .count-tile__number {
  -webkit-text-stroke-color: var(--ivory);
  transform-origin: 20% 80%;
  animation: count-beat var(--lab-beat) var(--ease-stab) infinite;
}

/* Complete: pasted up, slapped on at a tilt. */
.count-tile.is-complete {
  background: var(--tile-paper);
  color: var(--tile-ink);
  transform: rotate(var(--tile-tilt));
  animation: count-slap var(--dur-scene) var(--ease-stab) both;
}

.count-tile.is-complete .count-tile__number {
  color: var(--tile-ink);
  -webkit-text-stroke-color: transparent;
}

.count-tile.is-complete .count-tile__stamp {
  opacity: 1;
  transform: rotate(var(--rot-sticker));
  transition: opacity var(--dur-tap) var(--ease-stab) 120ms, transform var(--dur-ui) var(--ease-stab) 120ms;
}

/* ── The "and": MIDI, the pickup ────────────────── */
.count-and {
  position: relative;
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 8px 14px 8px 10px;
  background: var(--ink-2);
  color: var(--ivory-3);
  clip-path: var(--clip-offcut);
}

.count-and__glyph {
  padding: 4px 0 2px 6px;
  font: 700 clamp(40px, 12cqi, 56px)/1 var(--font-display);
  color: transparent;
  -webkit-text-stroke: 1.5px currentColor;
}

.count-and__copy { display: grid; min-width: 0; gap: 3px; }

.count-and__label {
  display: flex;
  align-items: center;
  gap: 6px;
  font: 700 17px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.count-and__label small {
  font: 700 9px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  opacity: .8;
}

.count-and__icon { width: 16px; height: 16px; flex: 0 0 auto; }

.count-and__detail {
  display: -webkit-box;
  overflow: hidden;
  font: var(--t-caption);
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.count-and__stamp { opacity: 0; }
.count-and__stamp :deep(.sticker) { font-size: 12px; padding: 4px 8px 3px; }

.count-and.is-active { color: var(--ivory); }
.count-and.is-active .count-and__glyph { animation: count-beat var(--lab-beat) var(--ease-stab) calc(var(--lab-beat) / 2) infinite; }

.count-and.is-complete {
  background: var(--and-paper);
  color: var(--ivory);
  animation: count-slap var(--dur-scene) var(--ease-stab) both;
}

.count-and.is-complete .count-and__glyph { color: var(--ivory); -webkit-text-stroke-color: transparent; }
.count-and.is-complete .count-and__stamp { opacity: 1; }

/* ── Foot: status and the Play gate ─────────────── */
.count-screen__foot { display: grid; gap: clamp(10px, 1.6cqh, 16px); }

.count-screen__status {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: 2px 12px;
  margin: 0;
}

.count-screen__status strong {
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.count-screen__status span {
  grid-row: 2;
  color: var(--ivory-3);
  font: var(--t-caption);
}

.count-screen__status em {
  grid-row: 1 / span 2;
  grid-column: 2;
  align-self: center;
  font: 700 34px/1 var(--font-display);
  font-style: normal;
  font-variant-numeric: tabular-nums;
}

.count-gate,
.count-gate-slot {
  position: relative;
  display: flex;
  width: 100%;
  height: var(--gate-height);
  align-items: center;
  justify-content: center;
}

.count-gate {
  flex-direction: column;
  gap: 8px;
  border: 0;
  background: var(--brass-fill);
  box-shadow: 0 3px 0 var(--brass-lo), var(--shadow-glow-brass);
  color: var(--brass-edge);
  clip-path: var(--clip-tab);
  cursor: pointer;
  isolation: isolate;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  animation: count-gate-in var(--dur-scene) var(--ease-swing) both;
}

.count-gate::after {
  content: "";
  position: absolute;
  z-index: -1;
  inset: -10% -30%;
  background: var(--brass-sheen);
  background-size: 220% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: screen;
  animation: brass-sheen 6.5s var(--ease-brush) infinite;
}

.count-gate__label {
  display: inline-flex;
  align-items: center;
  gap: .3em;
  font: 700 clamp(30px, 9cqi, 44px)/1 var(--font-display);
  letter-spacing: .14em;
}

.count-gate__label > span { font-size: .5em; }

.count-gate__sub {
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.count-gate:active { transform: translateY(2px); }
.count-gate:focus-visible { outline: 2px solid var(--ivory); outline-offset: 3px; }

.count-gate-slot {
  gap: 10px;
  background: var(--ink-2);
  color: var(--ivory-3);
  clip-path: var(--clip-tab);
}

.count-gate-slot__beat {
  width: 10px;
  aspect-ratio: 1;
  border-radius: 50%;
  background: var(--ivory-4);
  animation: count-tick calc(var(--lab-beat) * 4) var(--ease-stab) calc(var(--beat-index) * var(--lab-beat)) infinite;
}

.count-gate-slot__beat:first-child { background: var(--tomato); }

.count-gate-slot__copy {
  margin-left: 6px;
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

/* ── Desktop: poster left, count right ──────────── */
@container (min-width: 820px) {
  .count-screen__stage {
    --count-logo: clamp(180px, 22cqi, 300px);
    --gate-height: clamp(84px, 11cqh, 110px);

    grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr);
    grid-template-rows: minmax(0, 1fr) auto;
    column-gap: clamp(32px, 5cqi, 80px);
    padding: clamp(28px, 4cqi, 56px);
  }

  .count-screen__head {
    grid-template-columns: 1fr;
    align-content: center;
    align-items: start;
    gap: 28px;
  }

  .count-screen__title { font-size: clamp(72px, 9cqi, 132px); }
  .count-screen__board { grid-column: 2; grid-row: 1; }
  .count-screen__foot { grid-column: 1 / -1; grid-template-columns: minmax(0, .9fr) minmax(0, 1.1fr); column-gap: clamp(32px, 5cqi, 80px); align-items: end; }
  .count-tile__number { font-size: clamp(110px, 13cqh, 200px); }
}

@container (max-height: 700px) {
  .count-screen__stage { --count-logo: 64px; --gate-height: 68px; }
  .count-screen__title { font-size: 40px; }
  .count-tile__number { font-size: clamp(56px, 12cqh, 120px); }
  .count-tile__word { display: none; }
}

/* ── Keyframes ──────────────────────────────────── */
@keyframes count-beat {
  0% { transform: scale(1.08) rotate(-2deg); }
  40%, 100% { transform: scale(1) rotate(0); }
}

@keyframes count-slap {
  0% { opacity: 0; transform: scale(1.22) rotate(-7deg); }
  60% { opacity: 1; transform: scale(.98) rotate(var(--tile-tilt, 0deg)); }
  100% { opacity: 1; transform: scale(1) rotate(var(--tile-tilt, 0deg)); }
}

@keyframes count-gate-in {
  from { opacity: 0; transform: translateY(60%) rotate(-3deg); }
  to { opacity: 1; transform: none; }
}

@keyframes count-tick {
  0% { transform: scale(1.7); background: var(--ivory); }
  25%, 100% { transform: scale(1); }
}

@keyframes count-float {
  from { translate: 0 -6px; }
  to { translate: 0 6px; }
}

/* ── Still frame: Reduced Motion, or forced for review ── */
.count-screen.is-still *,
.count-screen.is-still *::after { animation: none !important; transition: none !important; }

@media (prefers-reduced-motion: reduce) {
  .count-screen *,
  .count-screen *::after { animation: none !important; transition: none !important; }
}

@media (forced-colors: active) {
  .count-tile.is-complete,
  .count-and.is-complete { background: Highlight; color: HighlightText; }
  .count-gate { border: 2px solid ButtonText; background: ButtonFace; color: ButtonText; }
}
</style>
