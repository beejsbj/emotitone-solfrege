<script setup lang="ts">
import { computed } from "vue";
import MidiPermissionIcon from "../components/MidiPermissionIcon.vue";
import BrandLogo from "../components/uniques/BrandLogo.vue";
import Mark from "../components/primatives/Mark.vue";
import type { MarkName } from "../components/primatives/Mark.vue";
import Sticker from "../components/primatives/Sticker.vue";
import { CHROMATIC_NOTES, getScaleForMode } from "../data";
import { DEFAULT_CONFIG } from "../data/visual-config-metadata";
import { resolveExactMusicColorsByPitchClass } from "../services/musicColor";
import type { DynamicColorConfig } from "../types";

type LoadingStage = { label: string; complete: boolean; active: boolean; icon?: "midi" };
type FloatingMark = {
  name: MarkName;
  x: string;
  y: string;
  size: number;
  color: string;
  rotation: string;
};

const props = withDefaults(defineProps<{
  progress?: number;
  stages?: LoadingStage[];
  phase?: string;
  message?: string;
}>(), {
  progress: 38,
  stages: () => [
    { label: "Visual stage", complete: true, active: false },
    { label: "Instrument samples", complete: false, active: true },
    { label: "Audio system", complete: false, active: false },
    { label: "Ready to play", complete: false, active: false },
    { label: "MIDI input", complete: false, active: false, icon: "midi" },
  ],
  phase: "Loading instrument samples",
  message: "Gathering the sounds for your first notes.",
});

const emit = defineEmits<{ enter: [] }>();

const percent = computed(() => (
  Math.round(Math.min(100, Math.max(0, Number.isFinite(props.progress) ? props.progress : 0)))
));

const bars = [38, 58, 45, 72, 54, 82, 63, 47, 76, 56, 88, 68, 49, 79, 61, 92, 70, 52, 84, 64, 46, 74, 57, 86];
const tones = ["cobalt", "tomato", "mustard", "plum", "pine"];
const floatingMarks: FloatingMark[] = [
  { name: "wave", x: "7%", y: "18%", size: 23, color: "tomato", rotation: "-9deg" },
  { name: "star", x: "91%", y: "15%", size: 21, color: "cobalt", rotation: "8deg" },
  { name: "grace", x: "93%", y: "48%", size: 22, color: "mustard", rotation: "11deg" },
  { name: "whole", x: "54%", y: "72%", size: 20, color: "ivory", rotation: "-7deg" },
  { name: "sharp", x: "48%", y: "8%", size: 18, color: "plum", rotation: "-4deg" },
];
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
  const direction = index % 2 === 0 ? -1 : 1;
  return {
    "--lane-color": lane.color,
    "--lane-delay": `${index * 24}ms`,
    "--lane-sway-a": `${direction * (1 + index % 3)}px`,
    "--lane-sway-b": `${direction * -(1 + (index + 1) % 3)}px`,
    "--lane-lift": `${-(2 + index % 4)}px`,
    "--lane-play-duration": `${2.4 + (index % 4) * .24}s`,
  };
}

function floatingMarkStyle(mark: FloatingMark, index: number) {
  return {
    left: mark.x,
    top: mark.y,
    color: `var(--${mark.color})`,
    "--floating-mark-rotation": mark.rotation,
    "--floating-mark-delay": `${index * -430}ms`,
    "--floating-mark-duration": `${3.5 + (index % 3) * .45}s`,
  };
}
</script>

<template>
  <section
    class="converged-loader"
    :class="{ 'is-ready': percent === 100 }"
    aria-label="EmotiTone loading preview"
  >
    <div class="converged-loader__floating-marks" aria-hidden="true">
      <Mark
        v-for="(mark, index) in floatingMarks"
        :key="mark.name"
        class="converged-loader__floating-mark"
        :name="mark.name"
        tone="inherit"
        :size="mark.size"
        :style="floatingMarkStyle(mark, index)"
      />
    </div>

    <main class="converged-loader__main">
      <div class="converged-loader__logo" aria-hidden="true">
        <BrandLogo
          layout="stacked"
          surface="ink"
          size="var(--loading-logo-size)"
        />
      </div>

      <div class="converged-loader__content">
        <div class="converged-loader__copy">
          <p>PIECE BY PIECE,</p>
          <h1>LET'S MAKE<br>SOME MUSIC.</h1>
        </div>

        <div class="converged-loader__status" role="status" aria-live="polite">
          <div class="converged-loader__status-copy">
            <strong>{{ phase }}</strong>
            <span>{{ message }}</span>
          </div>
        </div>

        <ol class="converged-loader__stages" aria-label="Loading stages">
          <li
            v-for="stage in stages"
            :key="stage.label"
            :class="{ 'is-complete': stage.complete, 'is-active': stage.active }"
          >
            <Mark class="converged-loader__bullet" name="disk" tone="inherit" :size="8" aria-hidden="true" />
            <span class="converged-loader__stage-label">
              <MidiPermissionIcon v-if="stage.icon === 'midi'" class="converged-loader__midi-icon" />
              <span>{{ stage.label }}</span>
            </span>
            <span class="converged-loader__stamp" :class="{ 'is-visible': stage.complete }" aria-hidden="true">
              <Sticker color="ivory" variant="fill">SET</Sticker>
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

      <button
        v-if="percent === 100"
        type="button"
        class="converged-loader__completion-action"
        aria-label="Enter EmotiTone"
        title="Enter EmotiTone"
        @click="emit('enter')"
      >
        <span class="converged-loader__completion-label">
          <span aria-hidden="true">►</span>
          PLAY
        </span>
      </button>

      <div class="converged-loader__lanes" aria-hidden="true">
        <span
          v-for="(lane, index) in lanes"
          :key="lane.pitch"
          class="converged-loader__lane"
          :class="{ 'is-accidental': lane.accidental }"
          :style="laneStyle(lane, index)"
        >
          <span class="converged-loader__lane-bar" />
          <span class="converged-loader__lane-peek">
            <span class="converged-loader__lane-label">{{ lane.syllable }}</span>
          </span>
        </span>
      </div>
    </div>
  </section>
</template>

<style scoped>
.converged-loader {
  --loading-logo-size: min(330px, 48vmin);
  --surface: var(--ink);
  --foreground: var(--ivory);
  --muted: var(--ivory-3);
  --quiet: color-mix(in srgb, var(--ivory) 12%, transparent);
  --lane-strip-height: clamp(72px, 13vh, 116px);
  --entry-action-height: 92px;
  --entry-action-overlap: 30px;

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

.converged-loader__floating-marks {
  position: absolute;
  z-index: 1;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}

.converged-loader__floating-mark {
  position: absolute;
  opacity: .58;
  transform-origin: center;
  animation: converged-floating-mark var(--floating-mark-duration) cubic-bezier(.45, 0, .55, 1) var(--floating-mark-delay) infinite alternate;
  will-change: transform;
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
  color: var(--mustard);
  font: var(--t-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .19em;
}

.converged-loader__copy h1 {
  margin: 0;
  font: 700 clamp(15px, 1.7vw, 22px)/1.12 var(--font-display);
  letter-spacing: -.015em;
  text-transform: uppercase;
  text-align: center;
}

.converged-loader__status {
  position: relative;
  display: grid;
  min-height: 36px;
  min-width: 0;
  align-items: center;
  margin-top: 2px;
}

.converged-loader__status-copy {
  display: grid;
  min-width: 0;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: baseline;
  gap: 14px;
}

.converged-loader__status-copy strong {
  font: var(--t-label);
  letter-spacing: .04em;
  text-transform: uppercase;
}

.converged-loader__status-copy > span {
  overflow: hidden;
  color: var(--muted);
  font: var(--t-caption);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.converged-loader__completion-action {
  position: absolute;
  z-index: 4;
  left: 50%;
  bottom: calc(var(--lane-strip-height) - var(--entry-action-overlap));
  display: flex;
  width: calc(100% + 2px);
  min-height: var(--entry-action-height);
  align-items: center;
  justify-content: center;
  padding: 9px 24px 8px;
  border: 0;
  border-radius: 3px;
  background: var(--brass-fill);
  box-shadow: 0 2px 0 var(--brass-lo), var(--shadow-glow-brass);
  color: var(--brass-edge);
  font: 700 clamp(20px, 2vw, 26px)/1 var(--font-display);
  letter-spacing: .18em;
  text-transform: uppercase;
  opacity: 0;
  cursor: pointer;
  isolation: isolate;
  overflow: hidden;
  translate: -50% 0;
  user-select: none;
  white-space: nowrap;
  -webkit-tap-highlight-color: transparent;
  animation: converged-gate-rise 600ms cubic-bezier(.215, .61, .355, 1) 40ms both;
  transition: background-color 150ms ease, transform 150ms ease;
  will-change: translate, opacity;
}

.converged-loader__completion-action::after {
  position: absolute;
  z-index: 0;
  inset: -12% -35%;
  border-radius: inherit;
  background: var(--brass-sheen);
  content: "";
  mix-blend-mode: screen;
  pointer-events: none;
  translate: -72% 0;
  animation: converged-gate-sheen 5.8s cubic-bezier(.45, 0, .55, 1) 700ms infinite;
}

.converged-loader__completion-label {
  position: relative;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  gap: .42em;
}

.converged-loader__completion-action:active { transform: translateY(2px) scale(.99); }

.converged-loader__completion-action:focus-visible {
  outline: 2px solid var(--foreground);
  outline-offset: 3px;
}

.converged-loader__stages {
  display: grid;
  height: clamp(104px, 17vh, 132px);
  margin: 0;
  padding: 0;
  grid-template-rows: repeat(5, minmax(0, 1fr));
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

.converged-loader__stage-label {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 7px;
}

.converged-loader__midi-icon {
  width: 14px;
  height: 14px;
  flex: 0 0 auto;
}

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
  height: var(--lane-strip-height);
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
  height: 100%;
  background: var(--lane-color);
  box-shadow: inset 0 0 0 1px color-mix(in srgb, var(--foreground) 8%, transparent);
  opacity: 0;
  transform: translate3d(0, 105%, 0);
  transform-origin: center bottom;
  will-change: transform, opacity;
}

.is-ready .converged-loader__lane-bar {
  animation: converged-lane-bar-arrive 380ms cubic-bezier(.215, .61, .355, 1) var(--lane-delay) both;
}

.converged-loader__lane-peek {
  position: absolute;
  z-index: 1;
  right: 0;
  bottom: -12px;
  left: 0;
  display: grid;
  height: 44px;
  place-items: center;
  opacity: 0;
  pointer-events: none;
  transform: translate3d(0, 110%, 0);
  will-change: transform, opacity;
}

.is-ready .converged-loader__lane-peek {
  animation:
    converged-lane-peek 540ms cubic-bezier(.215, .61, .355, 1) calc(180ms + var(--lane-delay)) both,
    converged-lane-play var(--lane-play-duration) cubic-bezier(.45, 0, .55, 1) calc(720ms + var(--lane-delay)) infinite;
}

.converged-loader__lane-label {
  color: var(--lane-neutral);
  font: 700 clamp(14px, 1.55vw, 20px)/1 var(--font-display);
  letter-spacing: .02em;
  text-transform: uppercase;
  white-space: nowrap;
}

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

@keyframes converged-floating-mark {
  from { transform: translate3d(-50%, calc(-50% - 4px), 0) rotate(var(--floating-mark-rotation)); }
  to { transform: translate3d(-50%, calc(-50% + 5px), 0) rotate(calc(var(--floating-mark-rotation) + 5deg)); }
}

@keyframes converged-lane-peek {
  0% { opacity: 0; transform: translate3d(0, 110%, 0); }
  54% { opacity: 1; transform: translate3d(0, -9%, 0); }
  76% { opacity: 1; transform: translate3d(0, 5%, 0); }
  100% { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes converged-lane-bar-arrive {
  from { opacity: 0; transform: translate3d(0, 105%, 0); }
  to { opacity: 1; transform: translate3d(0, 0, 0); }
}

@keyframes converged-lane-play {
  0%, 100% { opacity: 1; transform: translate3d(0, 0, 0); }
  34% { opacity: 1; transform: translate3d(var(--lane-sway-a), var(--lane-lift), 0); }
  68% { opacity: 1; transform: translate3d(var(--lane-sway-b), 1px, 0); }
}

@keyframes converged-gate-rise {
  from {
    opacity: 0;
    translate: -50% calc(var(--lane-strip-height) + var(--entry-action-height));
  }
  to { opacity: 1; translate: -50% 0; }
}

@keyframes converged-gate-sheen {
  0%, 18% { translate: -72% 0; }
  62%, 100% { translate: 72% 0; }
}

@keyframes converged-frontier {
  from { transform: scaleY(var(--bar-low)); }
  to { transform: scaleY(var(--bar-height)); }
}

@media (max-width: 720px) {
  .converged-loader {
    --lane-strip-height: clamp(58px, 10vh, 82px);
    --entry-action-height: 78px;
    --entry-action-overlap: 29px;

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
  .converged-loader__copy h1 { font-size: clamp(12px, 3.2vw, 14px); line-height: 1.14; }
  .converged-loader__status { margin-top: 4px; }
  .converged-loader__status-copy { grid-template-columns: 1fr; gap: 2px; }
  .converged-loader__status-copy > span { font-size: 9px; }
  .converged-loader__stages { height: clamp(92px, 15vh, 112px); }
  .converged-loader__stages li { font-size: 9px; }
  .converged-loader__bars { height: clamp(32px, 6.5vh, 48px); gap: 2px; }
  .converged-loader__progress-stage { width: 100%; }
  .converged-loader__lane-label { font-size: clamp(12px, 4vw, 16px); }
}

@media (max-height: 650px) {
  .converged-loader {
    --lane-strip-height: min(52px, 11vh);
    --entry-action-height: 66px;
    --entry-action-overlap: 26px;

    padding-block: 10px 0;
  }
  .converged-loader__status { min-height: 0; margin: 0; }
  .converged-loader__status-copy { display: none; }
  .converged-loader__main { gap: 14px; }
  .converged-loader__content { gap: 4px; }
  .converged-loader__copy h1 { font-size: clamp(12px, 2.7vh, 13px); }
  .converged-loader__stages { height: min(78px, 17vh); }
  .converged-loader__bars { height: min(38px, 8vh); }
}

@media (max-width: 720px) and (max-height: 650px) {
  .converged-loader { --loading-logo-size: min(84px, 29vmin); }
}

@media (prefers-reduced-motion: reduce) {
  .converged-loader__floating-mark,
  .converged-loader__logo :deep(.brand-logo__backdrop),
  .converged-loader__logo :deep(.brand-logo__cut),
  .converged-loader__logo :deep(.brand-logo__sprinkle),
  .is-ready .converged-loader__lane-bar,
  .is-ready .converged-loader__lane-peek,
  .converged-loader__completion-action,
  .converged-loader__completion-action::after,
  .converged-loader__bars > span.is-frontier { animation: none; }

  .converged-loader__floating-mark {
    transform: translate3d(-50%, -50%, 0) rotate(var(--floating-mark-rotation));
  }

  .is-ready .converged-loader__lane-bar,
  .is-ready .converged-loader__lane-peek,
  .converged-loader__completion-action {
    opacity: 1;
    transform: none;
    translate: -50% 0;
  }

  .converged-loader__completion-action::after { translate: 0 0; }

  .converged-loader__completion-action,
  .converged-loader__stages li,
  .converged-loader__stamp,
  .converged-loader__bars > span { transition: none; }
}

@media (hover: hover) and (pointer: fine) {
  .converged-loader__completion-action:hover {
    background: var(--brass-fill);
  }
}

@media (forced-colors: active) {
  .converged-loader { background: Canvas; color: CanvasText; }
  .converged-loader__completion-action {
    border-color: ButtonText;
    background: ButtonFace;
    color: ButtonText;
    forced-color-adjust: auto;
  }
  .converged-loader__bars > span { background: GrayText; }
  .converged-loader__bars > span.is-filled,
  .converged-loader__bars > span.is-frontier { background: Highlight; }
}
</style>
