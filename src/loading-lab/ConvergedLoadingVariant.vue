<script setup lang="ts">
import { computed } from "vue";
import BrandLogo from "../components/uniques/BrandLogo.vue";
import Mark from "../components/primatives/Mark.vue";
import Sticker from "../components/primatives/Sticker.vue";
import { CHROMATIC_NOTES, getScaleForMode } from "../data";
import { DEFAULT_CONFIG } from "../data/visual-config-metadata";
import { resolveExactMusicColorsByPitchClass } from "../services/musicColor";
import type { DynamicColorConfig } from "../types";

type LoadingStage = { label: string; complete: boolean; active: boolean };
type Surface = "ivory" | "ink";
type LaneTreatment = "neutral-bars" | "chromatic-bars";

const props = withDefaults(defineProps<{
  surface?: Surface;
  laneTreatment?: LaneTreatment;
  progress?: number;
  stages?: LoadingStage[];
  phase?: string;
  message?: string;
}>(), {
  surface: "ivory",
  laneTreatment: "neutral-bars",
  progress: 38,
  stages: () => [
    { label: "Visual stage", complete: true, active: false },
    { label: "Instrument samples", complete: false, active: true },
    { label: "Audio system", complete: false, active: false },
    { label: "Ready to play", complete: false, active: false },
  ],
  phase: "Loading instrument samples",
  message: "Gathering the sounds for your first notes.",
});

const percent = computed(() => (
  Math.round(Math.min(100, Math.max(0, Number.isFinite(props.progress) ? props.progress : 0)))
));

const bars = [38, 58, 45, 72, 54, 82, 63, 47, 76, 56, 88, 68, 49, 79, 61, 92, 70, 52, 84, 64, 46, 74, 57, 86];
const tones = ["cobalt", "tomato", "mustard", "plum", "pine"];
const laneHeights = [94, 61, 82, 68, 88, 76, 58, 92, 64, 80, 60, 86];

const fixedColorConfig: DynamicColorConfig = {
  ...DEFAULT_CONFIG.dynamicColors,
  musicColorMode: "fixed",
};

const chromaticScale = getScaleForMode("chromatic");
const lanes = CHROMATIC_NOTES.map((pitch, index) => ({
  pitch,
  syllable: chromaticScale.solfege[index]?.name ?? pitch,
  accidental: pitch.includes("#"),
  color: resolveExactMusicColorsByPitchClass(
    pitch,
    "chromatic",
    "C",
    4,
    fixedColorConfig,
  )?.primary ?? "var(--foreground)",
  height: laneHeights[index],
}));

const filledBars = computed(() => Math.round((percent.value / 100) * bars.length));
const frontier = computed(() => Math.min(bars.length - 1, filledBars.value));

function barStyle(height: number, index: number) {
  const group = Math.min(tones.length - 1, Math.floor(index / Math.ceil(bars.length / tones.length)));
  return {
    "--bar-height": height / 100,
    "--bar-low": Math.max(.18, height / 185),
    "--bar-tone": `var(--${tones[group]})`,
    "--bar-delay": `${(index - frontier.value) * 42}ms`,
  };
}

function laneStyle(lane: typeof lanes[number], index: number) {
  return {
    "--lane-color": lane.color,
    "--lane-height": `${lane.height}%`,
    "--lane-delay": `${index * 18}ms`,
  };
}
</script>

<template>
  <section
    class="converged-loader"
    :class="[
      `converged-loader--${surface}`,
      `converged-loader--${laneTreatment}`,
      { 'is-ready': percent === 100 },
    ]"
    aria-label="EmotiTone loading preview"
  >
    <main class="converged-loader__main">
      <div class="converged-loader__logo" aria-hidden="true">
        <BrandLogo
          layout="stacked"
          :surface="surface === 'ink' ? 'ink' : 'bone'"
          size="var(--loading-logo-size)"
        />
      </div>

      <div class="converged-loader__content">
        <div class="converged-loader__copy">
          <p>PIECE BY PIECE,</p>
          <h1>LET'S MAKE<br>SOME MUSIC.</h1>
        </div>

        <div class="converged-loader__status" role="status" aria-live="polite">
          <strong>{{ phase }}</strong>
          <span>{{ message }}</span>
        </div>

        <ol class="converged-loader__stages" aria-label="Loading stages">
          <li
            v-for="stage in stages"
            :key="stage.label"
            :class="{ 'is-complete': stage.complete, 'is-active': stage.active }"
          >
            <Mark class="converged-loader__bullet" name="disk" tone="inherit" :size="8" aria-hidden="true" />
            <span>{{ stage.label }}</span>
            <span class="converged-loader__stamp" :class="{ 'is-visible': stage.complete }" aria-hidden="true">
              <Sticker :color="surface === 'ink' ? 'ivory' : 'ink'" variant="fill">SET</Sticker>
            </span>
          </li>
        </ol>
      </div>
    </main>

    <div class="converged-loader__progress-stage">
      <div
        class="converged-loader__meter"
        role="progressbar"
        aria-label="Loading progress"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <div class="converged-loader__meter-label">
          <span>{{ percent === 100 ? "SOUNDCHECK COMPLETE" : "SOUNDCHECK" }}</span>
          <strong>{{ String(percent).padStart(2, "0") }}%</strong>
        </div>
        <div class="converged-loader__bars" aria-hidden="true">
          <span
            v-for="(height, index) in bars"
            :key="index"
            :class="{
              'is-filled': index < filledBars,
              'is-frontier': percent < 100 && Math.abs(index - frontier) <= 1,
            }"
            :style="barStyle(height, index)"
          />
        </div>
      </div>

      <div class="converged-loader__lanes" aria-hidden="true">
        <span
          v-for="(lane, index) in lanes"
          :key="lane.pitch"
          class="converged-loader__lane"
          :class="{ 'is-accidental': lane.accidental }"
          :style="laneStyle(lane, index)"
        >
          <span class="converged-loader__lane-bar" />
          <span class="converged-loader__lane-label">{{ lane.syllable }}</span>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.converged-loader {
  --loading-logo-size: min(330px, 48vmin);
  --surface: var(--ivory);
  --foreground: var(--ink);
  --muted: var(--ink-5);
  --quiet: color-mix(in srgb, var(--ink) 12%, transparent);

  position: relative;
  display: grid;
  width: 100%;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  grid-template-rows: minmax(0, 1fr) auto;
  gap: clamp(8px, 1.4vh, 14px);
  padding: clamp(18px, 3.2vw, 42px) clamp(18px, 3.2vw, 42px) 0;
  background: var(--surface);
  color: var(--foreground);
  isolation: isolate;
}

.converged-loader *,
.converged-loader *::before,
.converged-loader *::after { box-sizing: border-box; }

.converged-loader--ink {
  --surface: var(--ink);
  --foreground: var(--ivory);
  --muted: var(--ivory-3);
  --quiet: color-mix(in srgb, var(--ivory) 12%, transparent);
}

.converged-loader__main {
  position: relative;
  z-index: 2;
  display: grid;
  width: min(1040px, 88vw);
  min-height: 0;
  margin: auto;
  grid-template-columns: minmax(280px, .92fr) minmax(360px, 1.08fr);
  align-items: center;
  gap: clamp(34px, 7vw, 90px);
}

.converged-loader__logo {
  display: grid;
  min-width: 0;
  justify-items: end;
}

.converged-loader__logo :deep(.brand-logo) { max-width: 100%; }

.converged-loader__logo :deep(.brand-logo__backdrop) {
  transform-origin: center;
  animation: converged-blob-breathe 4.2s cubic-bezier(.45, 0, .55, 1) infinite alternate;
  will-change: transform;
}

.converged-loader__logo :deep(.brand-logo__backdrop:nth-child(2)) { animation-delay: -1.1s; animation-duration: 4.7s; }
.converged-loader__logo :deep(.brand-logo__backdrop:nth-child(3)) { animation-delay: -2.2s; animation-duration: 3.9s; }
.converged-loader__logo :deep(.brand-logo__backdrop:nth-child(4)) { animation-delay: -.7s; animation-duration: 4.5s; }
.converged-loader__logo :deep(.brand-logo__backdrop:nth-child(5)) { animation-delay: -1.8s; animation-duration: 4.1s; }

.converged-loader__logo :deep(.brand-logo__cut) {
  transform-box: fill-box;
  transform-origin: center;
  animation: converged-cut-drift 2.8s cubic-bezier(.45, 0, .55, 1) infinite alternate;
  will-change: transform;
}

.converged-loader__logo :deep(.brand-logo__cut:nth-child(2)) { animation-delay: -1.3s; animation-duration: 3.2s; }
.converged-loader__logo :deep(.brand-logo__cut:nth-child(3)) { animation-delay: -.6s; animation-duration: 2.6s; }
.converged-loader__logo :deep(.brand-logo__cut:nth-child(4)) { animation-delay: -1.9s; animation-duration: 3.1s; }
.converged-loader__logo :deep(.brand-logo__cut:nth-child(5)) { animation-delay: -.9s; animation-duration: 2.9s; }
.converged-loader__logo :deep(.brand-logo__cut:nth-child(6)) { animation-delay: -2.1s; animation-duration: 3.3s; }

.converged-loader__logo :deep(.brand-logo__sprinkle) {
  transform-origin: center;
  animation: converged-mark-drift var(--mark-duration, 3.2s) cubic-bezier(.45, 0, .55, 1) var(--mark-delay, 0s) infinite alternate;
  will-change: translate, rotate;
}

.converged-loader__logo :deep(.brand-logo__sprinkle:nth-of-type(2)) { --mark-delay: -.4s; --mark-duration: 3.1s; }
.converged-loader__logo :deep(.brand-logo__sprinkle:nth-of-type(3)) { --mark-delay: -1.7s; --mark-duration: 3.7s; }
.converged-loader__logo :deep(.brand-logo__sprinkle:nth-of-type(4)) { --mark-delay: -2.4s; --mark-duration: 2.9s; }
.converged-loader__logo :deep(.brand-logo__sprinkle:nth-of-type(5)) { --mark-delay: -.9s; --mark-duration: 3.4s; }
.converged-loader__logo :deep(.brand-logo__sprinkle:nth-of-type(6)) { --mark-delay: -2.1s; --mark-duration: 3.8s; }
.converged-loader__logo :deep(.brand-logo__sprinkle:nth-of-type(7)) { --mark-delay: -1.2s; --mark-duration: 3s; }
.converged-loader__logo :deep(.brand-logo__sprinkle:nth-of-type(8)) { --mark-delay: -2.7s; --mark-duration: 3.5s; }
.converged-loader__logo :deep(.brand-logo__sprinkle:nth-of-type(9)) { --mark-delay: -.6s; --mark-duration: 3.9s; }
.converged-loader__logo :deep(.brand-logo__sprinkle:nth-of-type(10)) { --mark-delay: -1.9s; --mark-duration: 3.3s; }

.converged-loader__content {
  display: grid;
  min-width: 0;
  align-content: center;
  gap: clamp(10px, 1.7vh, 16px);
}

.converged-loader__copy p {
  margin: 0 0 7px;
  color: var(--pine);
  font: var(--t-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .19em;
}

.converged-loader--ink .converged-loader__copy p { color: var(--mustard); }

.converged-loader__copy h1 {
  margin: 0;
  font: 700 clamp(40px, 5vw, 66px)/1.04 var(--font-display);
  letter-spacing: -.015em;
  text-transform: uppercase;
  text-align: center;
}

.converged-loader__status {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: baseline;
  gap: 14px;
  margin-top: 2px;
}

.converged-loader__status strong {
  font: var(--t-label);
  letter-spacing: .04em;
  text-transform: uppercase;
}

.converged-loader__status span {
  overflow: hidden;
  color: var(--muted);
  font: var(--t-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.converged-loader__stages {
  display: grid;
  height: clamp(104px, 17vh, 132px);
  margin: 0;
  padding: 0;
  grid-template-rows: repeat(4, minmax(0, 1fr));
  list-style: none;
}

.converged-loader__stages li {
  display: grid;
  min-width: 0;
  grid-template-columns: 10px minmax(0, 1fr) 46px;
  align-items: center;
  gap: 9px;
  color: var(--muted);
  font: var(--t-label);
  font-size: 10px;
  letter-spacing: .05em;
  opacity: .36;
  text-transform: uppercase;
  transition: color 180ms ease-out, opacity 180ms ease-out;
}

.converged-loader__stages li.is-active { opacity: .72; }
.converged-loader__stages li.is-complete { color: var(--foreground); opacity: 1; }
.converged-loader__bullet { color: currentColor; }

.converged-loader__stamp {
  display: inline-flex;
  justify-content: flex-end;
  opacity: 0;
  pointer-events: none;
  transform: translate3d(0, -3px, 0) scale(.92) rotate(-3deg);
  transition: opacity 120ms ease-out, transform 180ms cubic-bezier(.215, .61, .355, 1);
}

.converged-loader__stamp.is-visible {
  opacity: 1;
  transform: translate3d(0, 0, 0) scale(1) rotate(0);
}

.converged-loader__stamp :deep(.sticker) {
  font-size: 8px;
  padding: 4px 8px 3px;
}

.converged-loader__meter {
  min-width: 0;
}

.converged-loader__progress-stage {
  position: relative;
  z-index: 2;
  width: min(56vw, 720px);
  min-width: 0;
  justify-self: end;
}

.converged-loader__meter-label {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 7px;
  color: var(--muted);
  font: var(--t-mono);
  font-size: 8px;
  font-weight: 700;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.converged-loader__meter-label strong {
  color: var(--foreground);
  font: 700 22px/1 var(--font-display);
  letter-spacing: 0;
  font-variant-numeric: tabular-nums;
}

.converged-loader__bars {
  display: flex;
  height: clamp(38px, 8vh, 62px);
  align-items: end;
  gap: clamp(2px, .35vw, 5px);
}

.converged-loader__lanes {
  display: grid;
  height: clamp(72px, 13vh, 116px);
  overflow: hidden;
  grid-template-columns: repeat(12, minmax(0, 1fr));
  align-items: end;
  gap: clamp(1px, .22vw, 3px);
}

.converged-loader__lane {
  --lane-neutral: var(--ivory);

  position: relative;
  display: flex;
  height: 100%;
  min-width: 0;
  align-items: end;
  justify-content: center;
}

.converged-loader__lane.is-accidental { --lane-neutral: var(--ink); }

.converged-loader__lane-bar {
  position: absolute;
  inset: auto 0 -10px;
  height: var(--lane-height);
  background: var(--lane-neutral);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--foreground) 8%, transparent);
  transform-origin: center bottom;
  animation: converged-lane-arrive 280ms cubic-bezier(.215, .61, .355, 1) var(--lane-delay) both;
}

.converged-loader--chromatic-bars .converged-loader__lane-bar { background: var(--lane-color); }

.converged-loader__lane-label {
  position: relative;
  z-index: 1;
  bottom: -5px;
  color: var(--lane-color);
  font: 700 clamp(14px, 1.55vw, 20px)/1 var(--font-display);
  letter-spacing: .02em;
  text-transform: uppercase;
  writing-mode: vertical-rl;
  transform: rotate(180deg);
}

.converged-loader--chromatic-bars .converged-loader__lane-label { color: var(--lane-neutral); }

.converged-loader__bars > span {
  height: 100%;
  min-width: 2px;
  flex: 1;
  background: var(--quiet);
  opacity: .72;
  transform: scaleY(.12);
  transform-origin: center bottom;
  transition:
    background-color 180ms ease-out,
    opacity 180ms ease-out,
    transform 240ms cubic-bezier(.215, .61, .355, 1);
}

.converged-loader__bars > span.is-filled {
  background: var(--bar-tone);
  opacity: 1;
  transform: scaleY(var(--bar-height));
}

.converged-loader__bars > span.is-frontier {
  background: var(--bar-tone);
  opacity: .88;
  animation: converged-frontier 760ms cubic-bezier(.45, 0, .55, 1) var(--bar-delay) infinite alternate;
}

.is-ready .converged-loader__logo :deep(.brand-logo__backdrop),
.is-ready .converged-loader__logo :deep(.brand-logo__cut),
.is-ready .converged-loader__logo :deep(.brand-logo__sprinkle) {
  animation-play-state: paused;
}

@keyframes converged-blob-breathe {
  from { transform: translate(-50%, -50%) scale(.985); }
  to { transform: translate(-50%, -50%) scale(1.025); }
}

@keyframes converged-cut-drift {
  from { transform: translate3d(-1.5px, 1px, 0) rotate(-.7deg); }
  to { transform: translate3d(1.5px, -1px, 0) rotate(.7deg); }
}

@keyframes converged-mark-drift {
  from { translate: -1px 1px; rotate: -5deg; }
  to { translate: 1px -1px; rotate: 5deg; }
}

@keyframes converged-lane-arrive {
  from { opacity: 0; transform: translate3d(0, 16%, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes converged-frontier {
  from { transform: scaleY(var(--bar-low)); }
  to { transform: scaleY(var(--bar-height)); }
}

@media (max-width: 720px) {
  .converged-loader {
    gap: 8px;
    padding: 12px 18px 0;
  }

  .converged-loader__main {
    width: min(100%, 440px);
    grid-template-columns: 1fr;
    align-content: center;
    gap: clamp(6px, 1.3vh, 11px);
  }

  .converged-loader__logo { justify-items: center; }
  .converged-loader__logo :deep(.brand-logo__wordmark) { font-size: min(42px, 11vw); }
  .converged-loader__content { gap: clamp(9px, 1.4vh, 13px); }
  .converged-loader__copy p { margin-bottom: 3px; font-size: 8px; }
  .converged-loader__copy h1 { font-size: clamp(34px, 10vw, 43px); line-height: 1.1; }
  .converged-loader__status { margin-top: 4px; }
  .converged-loader__status { grid-template-columns: 1fr; gap: 2px; }
  .converged-loader__status span { font-size: 9px; }
  .converged-loader__stages { height: clamp(92px, 15vh, 112px); }
  .converged-loader__stages li { font-size: 9px; }
  .converged-loader__bars { height: clamp(32px, 6.5vh, 48px); gap: 2px; }
  .converged-loader__progress-stage { width: 100%; }
  .converged-loader__lanes { height: clamp(58px, 10vh, 82px); }
  .converged-loader__lane-label { font-size: clamp(12px, 4vw, 16px); }
}

@media (max-height: 650px) {
  .converged-loader { padding-block: 10px 0; }
  .converged-loader__status { display: none; }
  .converged-loader__main { gap: 6px; }
  .converged-loader__content { gap: 6px; }
  .converged-loader__copy h1 { font-size: clamp(30px, 8vh, 42px); }
  .converged-loader__stages { height: min(96px, 20vh); }
  .converged-loader__bars { height: min(38px, 8vh); }
  .converged-loader__lanes { height: min(52px, 11vh); }
}

@media (max-width: 720px) and (max-height: 650px) {
  .converged-loader { --loading-logo-size: min(128px, 40vmin); }
}

@media (prefers-reduced-motion: reduce) {
  .converged-loader__logo :deep(.brand-logo__backdrop),
  .converged-loader__logo :deep(.brand-logo__cut),
  .converged-loader__logo :deep(.brand-logo__sprinkle),
  .converged-loader__lane-bar,
  .converged-loader__bars > span.is-frontier { animation: none; }

  .converged-loader__stages li,
  .converged-loader__stamp,
  .converged-loader__bars > span { transition: none; }
}

@media (forced-colors: active) {
  .converged-loader { background: Canvas; color: CanvasText; }
  .converged-loader__bars > span { background: GrayText; }
  .converged-loader__bars > span.is-filled,
  .converged-loader__bars > span.is-frontier { background: Highlight; }
}
</style>
