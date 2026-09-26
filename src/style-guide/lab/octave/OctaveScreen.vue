<script setup lang="ts">
import { computed } from "vue";
import MidiPermissionIcon from "@/components/MidiPermissionIcon.vue";
import Mark from "@/components/primatives/Mark.vue";
import Sticker from "@/components/primatives/Sticker";
import type { LabLoadingScreenProps, LabLoadingStage } from "@/types/styleGuide";
import { LAB_SOLFEGE_STEPS } from "../labSolfege";
import OctaveLogo from "./OctaveLogo.vue";

/**
 * Direction B · Tuning Up. Seven solfège columns drift out of tune while the
 * app loads and lock to pitch as progress passes them. Ready lands the high
 * Do — the one Brass Play gate.
 */
const props = withDefaults(defineProps<LabLoadingScreenProps>(), { still: false });
const emit = defineEmits<{ start: [] }>();

// Authored detune per string: how far flat or sharp, and how fast it beats.
const DETUNE = [
  { sharp: 1.14, flat: .8, period: 1.3 },
  { sharp: 1.08, flat: .74, period: .9 },
  { sharp: 1.2, flat: .86, period: 1.1 },
  { sharp: 1.1, flat: .78, period: 1.45 },
  { sharp: 1.16, flat: .84, period: .95 },
  { sharp: 1.06, flat: .8, period: 1.25 },
  { sharp: 1.12, flat: .88, period: 1.05 },
];

const lockedCount = computed(() => (props.ready ? 7 : Math.floor((props.percent / 100) * 7)));

const columns = computed(() => LAB_SOLFEGE_STEPS.map((step, index) => ({
  ...step,
  index,
  locked: index < lockedCount.value,
  tuning: index === lockedCount.value,
  style: {
    "--col-color": step.color,
    "--col-fg": step.foreground,
    "--col-height": `${38 + index * 10.3}%`,
    "--col-sharp": DETUNE[index].sharp,
    "--col-flat": DETUNE[index].flat,
    "--col-period": `${DETUNE[index].period}s`,
    "--col-index": index,
  },
})));

function stageLabel(stage: LabLoadingStage) {
  const state = stage.complete
    ? stage.stamp === "SKIP" ? "skipped" : stage.stamp === "N/A" ? "not available" : "complete"
    : stage.active ? "current" : "pending";
  return [stage.label, stage.optional ? "optional" : "", state, stage.detail].filter(Boolean).join(", ");
}
</script>

<template>
  <section
    class="octave-screen"
    :class="{ 'is-ready': ready, 'is-still': still }"
    aria-label="EmotiTone loading screen · Tuning Up"
  >
    <div class="octave-screen__stage">
      <header class="octave-screen__head">
        <OctaveLogo class="octave-screen__logo" size="var(--octave-logo)" :live="!still" />
        <div>
          <p class="octave-screen__kicker">TUNING UP</p>
          <h1 class="octave-screen__title">SEVEN NOTES<br>FIND THEIR PITCH.</h1>
          <p class="octave-screen__sub">The eighth is yours.</p>
        </div>
      </header>

      <ol class="octave-cues" aria-label="Loading stages">
        <li
          v-for="stage in stages"
          :key="stage.label"
          class="octave-cue"
          :class="{ 'is-complete': stage.complete, 'is-active': stage.active, 'is-optional': stage.optional }"
          :aria-label="stageLabel(stage)"
          :aria-current="stage.active ? 'step' : undefined"
        >
          <Mark class="octave-cue__bullet" :name="stage.complete ? 'whole' : 'disk'" tone="inherit" :size="12" aria-hidden="true" />
          <span class="octave-cue__label">
            <MidiPermissionIcon v-if="stage.icon === 'midi'" class="octave-cue__icon" />
            {{ stage.label }}
            <small v-if="stage.optional">optional</small>
          </span>
          <span class="octave-cue__stamp" aria-hidden="true">
            <Sticker variant="fill" color="ivory">{{ stage.stamp ?? "SET" }}</Sticker>
          </span>
          <span v-if="stage.detail && (stage.active || stage.complete)" class="octave-cue__detail">{{ stage.detail }}</span>
        </li>
      </ol>

      <div
        class="octave-stair"
        role="progressbar"
        aria-label="Loading progress"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="octave-stair__readout" aria-hidden="true">
          <strong>{{ String(percent).padStart(2, "0") }}%</strong>
          <span>{{ lockedCount }} of 7 in tune</span>
        </div>
        <div class="octave-stair__accidentals" aria-hidden="true">
          <template v-if="!ready">
            <Mark class="octave-acc octave-acc--sharp" name="sharp" tone="inherit" :size="30" />
            <Mark class="octave-acc octave-acc--flat" name="flat" tone="inherit" :size="30" />
          </template>
          <Mark v-else class="octave-acc octave-acc--natural" name="natural" tone="inherit" :size="34" />
        </div>
        <div class="octave-stair__columns">
          <span
            v-for="column in columns"
            :key="column.syllable"
            class="octave-col"
            :class="{ 'is-locked': column.locked, 'is-tuning': column.tuning }"
            :style="column.style"
            aria-hidden="true"
          >
            <span class="octave-col__bar">
              <span class="octave-col__syllable">{{ column.syllable }}</span>
            </span>
          </span>
        </div>
      </div>

      <footer class="octave-screen__foot">
        <p class="octave-screen__status" role="status" aria-live="polite">
          <strong>{{ phase }}</strong>
          <span>{{ message }}</span>
        </p>

        <button v-if="ready" type="button" class="octave-gate" aria-label="Play EmotiTone" @click="emit('start')">
          <Mark class="octave-gate__note" name="whole" tone="inherit" :size="40" aria-hidden="true" />
          <span class="octave-gate__label">PLAY</span>
          <span class="octave-gate__sub">high do</span>
        </button>
        <div v-else class="octave-gate-slot" aria-hidden="true">
          <span>the eighth note waits here</span>
        </div>
      </footer>
    </div>
  </section>
</template>

<style scoped>
.octave-screen {
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

.octave-screen *,
.octave-screen *::before,
.octave-screen *::after { box-sizing: border-box; }

.octave-screen__stage {
  --octave-logo: clamp(72px, 22cqi, 96px);
  --gate-height: clamp(76px, 10cqh, 96px);

  display: grid;
  height: 100%;
  grid-template-areas: "head" "cues" "stair" "foot";
  grid-template-rows: auto auto minmax(0, 1fr) auto;
  gap: clamp(12px, 2cqh, 20px);
  padding: clamp(16px, 5cqi, 28px) clamp(16px, 5cqi, 28px) clamp(14px, 2.4cqh, 24px);
}

/* ── Head ───────────────────────────────────────── */
.octave-screen__head {
  grid-area: head;
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: clamp(12px, 4cqi, 22px);
}

.octave-screen__kicker {
  display: table;
  margin: 0 0 8px;
  padding: 4px 7px 3px;
  background: var(--plum);
  color: var(--ivory);
  clip-path: var(--clip-tab);
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  transform: rotate(var(--rot-sticker));
}

.octave-screen__title {
  margin: 0;
  font: 700 clamp(26px, 8.4cqi, 36px)/1.16 var(--font-display);
  letter-spacing: var(--tracking-display);
}

.octave-screen__sub {
  margin: 12px 0 0;
  color: var(--ivory-3);
  font: var(--t-caption);
}

/* ── Cue list ───────────────────────────────────── */
.octave-cues {
  grid-area: cues;
  display: grid;
  margin: 0;
  padding: 0;
  gap: 2px;
  list-style: none;
}

.octave-cue {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 10px;
  min-height: 26px;
  color: var(--ivory-4);
  transition: color var(--dur-ui) var(--ease-brush);
}

.octave-cue__label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font: 700 clamp(15px, 4.4cqi, 19px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  white-space: nowrap;
}

.octave-cue__label small {
  font: 700 9px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  opacity: .8;
}

.octave-cue__icon { width: 15px; height: 15px; flex: 0 0 auto; }

.octave-cue__detail {
  grid-column: 2 / -1;
  color: var(--ivory-3);
  font: var(--t-caption);
}

.octave-cue__stamp {
  opacity: 0;
  transform: scale(1.5) rotate(-12deg);
}

.octave-cue__stamp :deep(.sticker) { font-size: 11px; padding: 3px 7px 2px; }

.octave-cue.is-active { color: var(--ivory); }
.octave-cue.is-active .octave-cue__bullet { animation: octave-pulse var(--dur-scene) var(--ease-brush) infinite alternate; }
.octave-cue.is-complete { color: var(--ivory-2); }

.octave-cue.is-complete .octave-cue__stamp {
  opacity: 1;
  transform: rotate(var(--rot-sticker));
  transition: opacity var(--dur-tap) var(--ease-stab), transform var(--dur-ui) var(--ease-stab);
}

/* ── The stair ──────────────────────────────────── */
.octave-stair {
  grid-area: stair;
  position: relative;
  display: grid;
  min-height: 0;
  grid-template-rows: auto minmax(0, 1fr);
  gap: 6px;
}

.octave-stair__readout {
  display: flex;
  align-items: baseline;
  gap: 10px;
}

.octave-stair__readout strong {
  font: 700 clamp(30px, 9cqi, 40px)/1 var(--font-display);
  font-variant-numeric: tabular-nums;
}

.octave-stair__readout span {
  color: var(--ivory-3);
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

/* Sharp and flat hover while strings are out of tune; a natural settles on ready. */
.octave-stair__accidentals { position: absolute; z-index: 2; inset: 0; pointer-events: none; }
.octave-acc { position: absolute; }
.octave-acc--sharp { top: 14%; right: 6%; color: var(--tomato); animation: octave-acc-drift calc(577ms * 4) var(--ease-bend) infinite alternate; }
.octave-acc--flat { top: 30%; right: 34%; color: var(--cobalt); animation: octave-acc-drift calc(577ms * 5) var(--ease-bend) -1s infinite alternate-reverse; }
.octave-acc--natural { top: 0; right: 2%; color: var(--mustard); rotate: 8deg; animation: octave-note-land var(--dur-bounce) var(--ease-bounce) both; }

.octave-stair__columns {
  display: grid;
  min-height: 0;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  align-items: end;
  gap: clamp(3px, 1.4cqi, 8px);
}

.octave-col {
  position: relative;
  display: block;
  height: var(--col-height);
}

/* The pitch it is reaching for: a dashed target line. */
.octave-col::before {
  content: "";
  position: absolute;
  z-index: 1;
  top: -1px;
  right: -2px;
  left: -2px;
  border-top: 2px dashed var(--ivory-3);
  transition: opacity var(--dur-ui) var(--ease-brush);
}

.octave-col__bar {
  position: absolute;
  inset: 0;
  display: flex;
  justify-content: center;
  padding-top: 8px;
  background: var(--col-color);
  clip-path: var(--clip-tile);
  opacity: .34;
  transform-origin: 50% 100%;
  animation: octave-detune var(--col-period) var(--ease-bend) calc(var(--col-index) * -170ms) infinite alternate;
}

.octave-col__syllable {
  color: var(--col-fg);
  font: 700 clamp(14px, 4.6cqi, 26px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  writing-mode: vertical-rl;
  rotate: 180deg;
}

/* The string being tuned right now beats harder and brighter. */
.octave-col.is-tuning .octave-col__bar { opacity: .7; animation-duration: calc(var(--col-period) * .55); }

/* In tune: the column locks to the line with a bounce, and the line goes. */
.octave-col.is-locked::before { opacity: 0; }
.octave-col.is-locked .octave-col__bar {
  opacity: 1;
  animation: octave-lock var(--dur-bounce) var(--ease-bounce) both;
}

/* Ready: the scale is sung once, bottom to top. */
.is-ready .octave-col.is-locked .octave-col__bar {
  animation:
    octave-lock var(--dur-bounce) var(--ease-bounce) both,
    octave-sing calc(577ms * 8) var(--ease-stab) calc(var(--col-index) * 577ms + 600ms) infinite;
}

/* ── Foot ───────────────────────────────────────── */
.octave-screen__foot { grid-area: foot; display: grid; gap: clamp(10px, 1.6cqh, 14px); }

.octave-screen__status { display: grid; gap: 2px; margin: 0; }

.octave-screen__status strong {
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.octave-screen__status span { color: var(--ivory-3); font: var(--t-caption); }

.octave-gate,
.octave-gate-slot {
  position: relative;
  display: flex;
  width: 100%;
  height: var(--gate-height);
  align-items: center;
  justify-content: center;
}

.octave-gate {
  gap: 14px;
  border: 0;
  background: var(--brass-fill);
  box-shadow: 0 3px 0 var(--brass-lo), var(--shadow-glow-brass);
  color: var(--brass-edge);
  clip-path: var(--clip-offcut);
  cursor: pointer;
  isolation: isolate;
  overflow: hidden;
  -webkit-tap-highlight-color: transparent;
  animation: octave-gate-in var(--dur-scene) var(--ease-swing) both;
}

.octave-gate::after {
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

.octave-gate__note { animation: octave-note-land var(--dur-bounce) var(--ease-bounce) 200ms both; }

.octave-gate__label {
  font: 700 clamp(32px, 9cqi, 46px)/1 var(--font-display);
  letter-spacing: .14em;
}

.octave-gate__sub {
  align-self: center;
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.octave-gate:active { transform: translateY(2px); }
.octave-gate:focus-visible { outline: 2px solid var(--ivory); outline-offset: 3px; }

.octave-gate-slot {
  border: 2px dashed var(--ink-5);
  color: var(--ivory-4);
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

/* ── Desktop: cues left, the stair takes the stage ── */
@container (min-width: 820px) {
  .octave-screen__stage {
    --octave-logo: clamp(150px, 16cqi, 220px);
    --gate-height: clamp(84px, 11cqh, 110px);

    grid-template-areas:
      "head stair"
      "cues stair"
      "status foot";
    grid-template-columns: minmax(300px, .72fr) minmax(0, 1.28fr);
    grid-template-rows: auto minmax(0, 1fr) auto;
    column-gap: clamp(32px, 5cqi, 72px);
    padding: clamp(28px, 4cqi, 56px);
  }

  .octave-screen__head { grid-template-columns: 1fr; gap: 24px; }
  .octave-screen__title { font-size: clamp(40px, 4.2cqi, 60px); }
  .octave-cues { align-content: center; gap: 8px; max-width: 420px; }
  .octave-screen__foot { display: contents; }
  .octave-screen__status { grid-area: status; align-self: end; }
  .octave-gate, .octave-gate-slot { grid-area: foot; }
  .octave-col__syllable { writing-mode: horizontal-tb; rotate: none; font-size: clamp(18px, 2.2cqi, 34px); }
}

@container (max-height: 700px) {
  .octave-screen__stage { --octave-logo: 56px; --gate-height: 64px; }
  .octave-screen__title { font-size: 24px; }
  .octave-cue { min-height: 20px; }
  .octave-cue__detail { display: none; }
}

/* ── Keyframes ──────────────────────────────────── */
@keyframes octave-detune {
  from { transform: scaleY(var(--col-flat)); }
  to { transform: scaleY(var(--col-sharp)); }
}

@keyframes octave-lock {
  from { transform: scaleY(var(--col-sharp)); }
  to { transform: scaleY(1); }
}

@keyframes octave-sing {
  0% { transform: scaleY(1.06); filter: brightness(1.2); }
  10%, 100% { transform: scaleY(1); filter: none; }
}

@keyframes octave-acc-drift {
  from { transform: translateY(-8px) rotate(-10deg); }
  to { transform: translateY(8px) rotate(8deg); }
}

@keyframes octave-pulse {
  from { opacity: .5; }
  to { opacity: 1; }
}

@keyframes octave-gate-in {
  from { opacity: 0; transform: translateY(40%) scaleY(.7); }
  to { opacity: 1; transform: none; }
}

@keyframes octave-note-land {
  from { opacity: 0; transform: translateY(-60px) rotate(-30deg); }
  to { opacity: 1; transform: none; }
}

/* ── Still frame: every column locked at its step, nothing moving ── */
.octave-screen.is-still *,
.octave-screen.is-still *::after { animation: none !important; transition: none !important; }

@media (prefers-reduced-motion: reduce) {
  .octave-screen *,
  .octave-screen *::after { animation: none !important; transition: none !important; }
}

@media (forced-colors: active) {
  .octave-col__bar { background: CanvasText; opacity: 1; }
  .octave-gate { border: 2px solid ButtonText; background: ButtonFace; color: ButtonText; }
}
</style>
