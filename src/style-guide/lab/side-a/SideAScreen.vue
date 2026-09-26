<script setup lang="ts">
import { computed } from "vue";
import MidiPermissionIcon from "@/components/MidiPermissionIcon.vue";
import Mark from "@/components/primatives/Mark.vue";
import Sticker from "@/components/primatives/Sticker";
import type { LabLoadingScreenProps, LabLoadingStage } from "@/types/styleGuide";

/**
 * Direction C · Side A. The record slides out of its sleeve as the app loads.
 * Each stage is a track, played outside-in like a real groove; MIDI is the
 * bonus track. Ready drops the needle: the Brass Play gate.
 */
const props = withDefaults(defineProps<LabLoadingScreenProps>(), { still: false });
const emit = defineEmits<{ start: [] }>();

// Grooves from the rim inward: A1 is the outermost, the bonus track the innermost.
const GROOVE_RADII = [46, 41, 36, 31, 26];

const grooves = computed(() => props.stages.map((stage, index) => {
  const radius = GROOVE_RADII[index] ?? 24;
  const circumference = 2 * Math.PI * radius;
  const drawn = stage.complete ? 1 : stage.active ? (stage.optional ? .5 : props.stageFraction) : 0;
  return {
    key: stage.label,
    radius,
    circumference,
    offset: circumference * (1 - drawn),
    optional: stage.optional,
    active: stage.active,
  };
}));

const tracks = computed(() => props.stages.map((stage, index) => ({
  stage,
  code: stage.optional ? "B1" : `A${index + 1}`,
})));

function stageLabel(stage: LabLoadingStage) {
  const state = stage.complete
    ? stage.stamp === "SKIP" ? "skipped" : stage.stamp === "N/A" ? "not available" : "complete"
    : stage.active ? "current" : "pending";
  return [stage.label, stage.optional ? "optional bonus track" : "", state, stage.detail].filter(Boolean).join(", ");
}

// The disc peeks at 8% and slides out to 58% of its width by ready.
const slide = computed(() => `${8 + (props.ready ? 50 : props.percent * .5)}%`);
</script>

<template>
  <section
    class="side-screen"
    :class="{ 'is-ready': ready, 'is-still': still }"
    aria-label="EmotiTone loading screen · Side A"
  >
    <div class="side-screen__stage">
      <header class="side-screen__head">
        <p class="side-screen__kicker">
          <span>EMOTITONE</span>
          <span>LONG PLAYER · 33⅓</span>
        </p>
        <h1 class="side-screen__title">SIDE A</h1>
      </header>

      <div
        class="side-record"
        role="progressbar"
        aria-label="Loading progress"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="side-record__object" :style="{ '--slide': slide }">
          <svg class="side-record__disc" viewBox="0 0 100 100" aria-hidden="true">
            <circle class="side-record__vinyl" cx="50" cy="50" r="49" />
            <circle
              v-for="groove in grooves"
              :key="`${groove.key}-bed`"
              class="side-record__groove-bed"
              cx="50"
              cy="50"
              :r="groove.radius"
            />
            <circle
              v-for="groove in grooves"
              :key="groove.key"
              class="side-record__groove"
              :class="{ 'is-optional': groove.optional, 'is-active': groove.active }"
              cx="50"
              cy="50"
              :r="groove.radius"
              :stroke-dasharray="groove.circumference"
              :stroke-dashoffset="groove.offset"
              transform="rotate(-90 50 50)"
            />
            <g class="side-record__label">
              <path class="side-record__label-a" d="M50 32 A18 18 0 0 1 50 68 Z" />
              <path class="side-record__label-b" d="M50 68 A18 18 0 0 1 50 32 Z" />
              <circle class="side-record__spindle" cx="50" cy="50" r="2.4" />
            </g>
          </svg>

          <svg class="side-record__sleeve" viewBox="0 0 100 100" aria-hidden="true">
            <polygon class="side-record__paper" points="3,4 97,2 98,97 2,98" />
            <polygon class="side-record__glyph" points="16,22 30,21 31,80 17,81" />
            <polygon class="side-record__glyph" points="27,21 47,20 47,33 27,34" />
            <polygon class="side-record__glyph" points="27,45 43,44 43,56 27,57" />
            <polygon class="side-record__glyph" points="27,68 48,67 48,80 27,81" />
            <polygon class="side-record__glyph" points="53,22 84,20 84,35 53,36" />
            <polygon class="side-record__glyph" points="62,34 76,33 75,84 62,85" />
          </svg>

          <Mark class="side-record__star" name="star" tone="inherit" :size="44" aria-hidden="true" />
          <Mark class="side-record__eighth" name="eighth" tone="inherit" :size="40" aria-hidden="true" />
        </div>

        <p class="side-record__percent" aria-hidden="true">{{ String(percent).padStart(2, "0") }}<small>%</small></p>
      </div>

      <div class="side-screen__liner">
        <ol class="side-tracks" aria-label="Loading stages">
          <li
            v-for="track in tracks"
            :key="track.stage.label"
            class="side-track"
            :class="{ 'is-complete': track.stage.complete, 'is-active': track.stage.active, 'is-optional': track.stage.optional }"
            :aria-label="stageLabel(track.stage)"
            :aria-current="track.stage.active ? 'step' : undefined"
          >
            <span class="side-track__code">{{ track.code }}</span>
            <span class="side-track__label">
              <MidiPermissionIcon v-if="track.stage.icon === 'midi'" class="side-track__icon" />
              {{ track.stage.label }}
              <small v-if="track.stage.optional">bonus · optional</small>
            </span>
            <span class="side-track__stamp" aria-hidden="true">
              <Sticker variant="fill" :color="track.stage.optional ? 'mustard' : 'ivory'">{{ track.stage.stamp ?? "SET" }}</Sticker>
            </span>
            <span v-if="track.stage.detail && (track.stage.active || track.stage.complete)" class="side-track__detail">{{ track.stage.detail }}</span>
          </li>
        </ol>

        <p class="side-screen__status" role="status" aria-live="polite">
          <strong>{{ phase }}</strong>
          <span>{{ message }}</span>
        </p>

        <button v-if="ready" type="button" class="side-gate" aria-label="Play EmotiTone" @click="emit('start')">
          <span class="side-gate__label"><span aria-hidden="true">►</span> PLAY</span>
          <span class="side-gate__sub">drop the needle</span>
        </button>
        <div v-else class="side-gate-slot" aria-hidden="true">
          <span>cueing side A</span>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped>
.side-screen {
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

.side-screen *,
.side-screen *::before,
.side-screen *::after { box-sizing: border-box; }

.side-screen__stage {
  --gate-height: clamp(76px, 10cqh, 96px);
  --record: min(62cqi, 34cqh);

  display: grid;
  height: 100%;
  grid-template-areas: "head" "record" "liner";
  grid-template-rows: auto minmax(0, 1fr) auto;
  gap: clamp(10px, 1.8cqh, 18px);
  padding: clamp(16px, 5cqi, 28px) clamp(16px, 5cqi, 28px) clamp(14px, 2.4cqh, 24px);
}

/* ── Head ───────────────────────────────────────── */
.side-screen__head { grid-area: head; }

.side-screen__kicker {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  margin: 0;
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
}

.side-screen__kicker span:last-child { color: var(--ivory-3); }

.side-screen__title {
  margin: 4px 0 0;
  font: 700 clamp(72px, 26cqi, 110px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
}

/* ── The record object ──────────────────────────── */
.side-record {
  grid-area: record;
  position: relative;
  display: grid;
  min-height: 0;
  align-items: center;
}

.side-record__object {
  position: relative;
  width: var(--record);
  aspect-ratio: 1;
}

.side-record__sleeve,
.side-record__disc {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.side-record__disc {
  inset: 3%;
  width: 94%;
  height: 94%;
  transform: translateX(var(--slide));
  transition: transform var(--dur-ui) var(--ease-sustain);
}

.is-ready .side-record__disc {
  transition: transform var(--dur-scene) var(--ease-swing);
}

.side-record__sleeve { transform: rotate(var(--rot-sticker)); }

.side-record__vinyl { fill: var(--ink-2); stroke: var(--ivory-4); stroke-width: .8; }
.side-record__groove-bed { fill: none; stroke: var(--ink-4); stroke-width: 1.6; }

.side-record__groove {
  fill: none;
  stroke: var(--ivory-2);
  stroke-width: 1.6;
  transition: stroke-dashoffset var(--dur-ui) var(--ease-sustain);
}

.side-record__groove.is-active { stroke: var(--ivory); }
.side-record__groove.is-optional { stroke: var(--mustard); }

.side-record__label-a { fill: var(--tomato); }
.side-record__label-b { fill: var(--mustard); }
.side-record__spindle { fill: var(--ink); }

/* The label turns a quarter per beat: a platter finding speed, not a spinner. */
.side-record__label {
  transform-box: view-box;
  transform-origin: 50px 50px;
  animation: side-turn calc(var(--lab-beat) * 4) steps(4, end) infinite;
}

.is-ready .side-record__label { animation-duration: calc(var(--lab-beat) * 2); }

.side-record__paper { fill: var(--cobalt); }
.side-record__glyph { fill: var(--ivory); }

.side-record__star {
  position: absolute;
  top: -6%;
  left: -5%;
  width: 18%;
  height: auto;
  color: var(--mustard);
  rotate: -14deg;
  animation: side-bob calc(var(--lab-beat) * 2) var(--ease-stab) infinite;
}

.side-record__eighth {
  position: absolute;
  top: -10%;
  right: -52%;
  width: 16%;
  height: auto;
  color: var(--ivory);
  opacity: 0;
  transition: opacity var(--dur-ui) var(--ease-brush);
}

.is-ready .side-record__eighth {
  opacity: 1;
  animation: side-bob var(--lab-beat) var(--ease-stab) infinite;
}

.side-record__percent {
  position: absolute;
  right: 0;
  bottom: 0;
  margin: 0;
  font: 700 clamp(34px, 10cqi, 48px)/1 var(--font-display);
  font-variant-numeric: tabular-nums;
}

.side-record__percent small { font-size: .5em; }

/* ── Liner notes ────────────────────────────────── */
.side-screen__liner {
  grid-area: liner;
  display: grid;
  gap: clamp(10px, 1.6cqh, 14px);
}

.side-tracks {
  display: grid;
  gap: 2px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.side-track {
  display: grid;
  grid-template-columns: 26px minmax(0, 1fr) auto;
  align-items: center;
  column-gap: 8px;
  min-height: 26px;
  color: var(--ivory-4);
  transition: color var(--dur-ui) var(--ease-brush);
}

.side-track.is-optional {
  margin-top: 6px;
  padding-top: 8px;
  border-top: 2px dashed var(--ink-5);
}

.side-track__code { font: 700 11px/1 var(--font-mono); letter-spacing: .06em; }

.side-track__label {
  display: flex;
  align-items: center;
  gap: 6px;
  min-width: 0;
  font: 700 clamp(15px, 4.6cqi, 20px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  white-space: nowrap;
}

.side-track__label small {
  font: 700 9px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  opacity: .8;
}

.side-track__icon { width: 15px; height: 15px; flex: 0 0 auto; }
.side-track__detail { grid-column: 2 / -1; color: var(--ivory-3); font: var(--t-caption); }

.side-track__stamp { opacity: 0; transform: scale(1.5) rotate(-12deg); }
.side-track__stamp :deep(.sticker) { font-size: 11px; padding: 3px 7px 2px; }

.side-track.is-active { color: var(--ivory); }
.side-track.is-active .side-track__code { animation: side-bob var(--lab-beat) var(--ease-stab) infinite; }
.side-track.is-complete { color: var(--ivory-2); }

.side-track.is-complete .side-track__stamp {
  opacity: 1;
  transform: rotate(var(--rot-sticker));
  transition: opacity var(--dur-tap) var(--ease-stab), transform var(--dur-ui) var(--ease-stab);
}

.side-screen__status { display: grid; gap: 2px; margin: 0; }

.side-screen__status strong {
  font: 700 16px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.side-screen__status span { color: var(--ivory-3); font: var(--t-caption); }

/* ── Gate ───────────────────────────────────────── */
.side-gate,
.side-gate-slot {
  position: relative;
  display: flex;
  width: 100%;
  height: var(--gate-height);
  align-items: center;
  justify-content: center;
}

.side-gate {
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
  animation: side-gate-in var(--dur-scene) var(--ease-swing) both;
}

.side-gate::after {
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

.side-gate__label {
  display: inline-flex;
  align-items: center;
  gap: .3em;
  font: 700 clamp(30px, 9cqi, 44px)/1 var(--font-display);
  letter-spacing: .14em;
}

.side-gate__label > span { font-size: .5em; }

.side-gate__sub {
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.side-gate:active { transform: translateY(2px); }
.side-gate:focus-visible { outline: 2px solid var(--ivory); outline-offset: 3px; }

.side-gate-slot {
  background: var(--ink-2);
  color: var(--ivory-3);
  clip-path: var(--clip-tab);
  font: 700 10px/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

/* ── Desktop: the record takes the left half ────── */
@container (min-width: 820px) {
  .side-screen__stage {
    --record: min(34cqi, 62cqh);
    --gate-height: clamp(84px, 11cqh, 110px);

    grid-template-areas: "record head" "record liner";
    grid-template-columns: minmax(0, 1.15fr) minmax(320px, .85fr);
    grid-template-rows: auto minmax(0, 1fr);
    column-gap: clamp(32px, 5cqi, 72px);
    padding: clamp(28px, 4cqi, 56px);
  }

  .side-screen__title { font-size: clamp(96px, 11cqi, 160px); }
  .side-screen__liner { align-content: end; }
  .side-record__percent { right: auto; left: 0; bottom: 0; }
}

@container (max-height: 700px) {
  .side-screen__stage { --gate-height: 64px; }
  .side-screen__title { font-size: 52px; }
  .side-track { min-height: 20px; }
  .side-track__detail { display: none; }
}

/* ── Keyframes ──────────────────────────────────── */
@keyframes side-turn { to { transform: rotate(360deg); } }

@keyframes side-bob {
  0% { transform: translateY(-3px); }
  40%, 100% { transform: translateY(0); }
}

@keyframes side-gate-in {
  from { opacity: 0; transform: translateY(50%); }
  to { opacity: 1; transform: none; }
}

/* ── Still frame ────────────────────────────────── */
.side-screen.is-still *,
.side-screen.is-still *::after { animation: none !important; transition: none !important; }

@media (prefers-reduced-motion: reduce) {
  .side-screen *,
  .side-screen *::after { animation: none !important; transition: none !important; }
}

@media (forced-colors: active) {
  .side-record__paper { fill: CanvasText; }
  .side-record__glyph { fill: Canvas; }
  .side-gate { border: 2px solid ButtonText; background: ButtonFace; color: ButtonText; }
}
</style>
