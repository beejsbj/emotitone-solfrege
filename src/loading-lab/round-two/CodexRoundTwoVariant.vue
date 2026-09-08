<script setup lang="ts">
import { computed } from "vue";
import BrandLogo from "../../components/uniques/BrandLogo.vue";
import Mark from "../../components/primatives/Mark.vue";
import type { MarkName } from "../../components/primatives/Mark.vue";
import Sticker from "../../components/primatives/Sticker.vue";

type Direction = "pressroom" | "split-signal" | "open-press";
type LoadingStage = { label: string; complete: boolean; active: boolean };

const props = withDefaults(defineProps<{
  direction?: Direction;
  progress?: number;
  stages?: LoadingStage[];
  phase?: string;
  message?: string;
}>(), {
  direction: "pressroom",
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

const visibleStages = computed(() => props.stages.filter((stage) => stage.complete || stage.active));

const copy = computed(() => ({
  pressroom: {
    number: "01 / CODEX",
    kicker: "THE COLOUR ROOM",
    title: "Something musical",
    accent: "is taking shape.",
  },
  "split-signal": {
    number: "02 / CODEX",
    kicker: "SOUNDCHECK IN COLOUR",
    title: "Warm up the room",
    accent: "before the first note.",
  },
  "open-press": {
    number: "03 / CODEX",
    kicker: "A SMALL MUSICAL ARRIVAL",
    title: "The room is almost",
    accent: "yours to play.",
  },
}[props.direction]));

const sheets = ["cobalt", "tomato", "mustard", "plum", "pine"];
const stampColors = ["mustard", "tomato", "plum", "pine"] as const;
const barHeights = [34, 62, 44, 82, 54, 96, 69, 42, 76, 58, 91, 49, 72, 38, 86, 61, 98, 46, 78, 57];
const barColors = ["cobalt", "tomato", "mustard", "plum", "pine"];

const scatteredMarks: Array<{
  name: MarkName;
  color: string;
  x: string;
  y: string;
  size: number;
  rotate: string;
}> = [
  { name: "wave", color: "mustard", x: "4%", y: "19%", size: 54, rotate: "-13deg" },
  { name: "eighth", color: "tomato", x: "92%", y: "14%", size: 46, rotate: "11deg" },
  { name: "staccato", color: "plum", x: "7%", y: "75%", size: 29, rotate: "8deg" },
  { name: "diamond", color: "pine", x: "88%", y: "72%", size: 39, rotate: "-8deg" },
  { name: "grace", color: "cobalt", x: "80%", y: "88%", size: 44, rotate: "15deg" },
  { name: "accent", color: "mustard", x: "21%", y: "89%", size: 34, rotate: "-10deg" },
];

function barStyle(height: number, index: number) {
  return {
    "--bar-low": Math.max(.14, height / 260),
    "--bar-high": height / 100,
    "--bar-delay": `${index * -43}ms`,
    "--bar-duration": `${520 + Math.round(height * 2.5)}ms`,
    "--bar-color": `var(--${barColors[index % barColors.length]})`,
  };
}
</script>

<template>
  <section
    class="codex-loader"
    :class="[`codex-loader--${direction}`, { 'is-ready': percent === 100 }]"
    aria-label="EmotiTone loading preview"
  >
    <div class="codex-loader__sheets" aria-hidden="true">
      <span
        v-for="(sheet, index) in sheets"
        :key="sheet"
        :style="{ '--sheet': `var(--${sheet})`, '--sheet-delay': `${index * -320}ms` }"
      />
    </div>

    <div class="codex-loader__marks" aria-hidden="true">
      <Mark
        v-for="(item, index) in scatteredMarks"
        :key="`${item.name}-${index}`"
        class="codex-loader__loose-mark"
        :name="item.name"
        tone="inherit"
        :size="item.size"
        :style="{
          '--mark-color': `var(--${item.color})`,
          '--mark-x': item.x,
          '--mark-y': item.y,
          '--mark-rotate': item.rotate,
          '--mark-delay': `${index * -310}ms`,
        }"
      />
    </div>

    <header class="codex-loader__header">
      <span>{{ copy.number }}</span>
      <span>{{ String(percent).padStart(2, "0") }} / 100</span>
    </header>

    <article class="codex-loader__stage">
      <div class="codex-loader__logo" aria-hidden="true">
        <BrandLogo
          layout="stacked"
          :surface="direction === 'open-press' ? 'bone' : 'ink'"
          size="min(310px, 54vw)"
        />
      </div>

      <div class="codex-loader__copy">
        <p>{{ copy.kicker }}</p>
        <h1>{{ copy.title }}<br><em>{{ copy.accent }}</em></h1>
      </div>

      <ol class="codex-loader__steps" aria-label="Loading stages">
        <li
          v-for="(stage, index) in visibleStages"
          :key="stage.label"
          :class="{ 'is-complete': stage.complete, 'is-active': stage.active }"
        >
          <Mark class="codex-loader__bullet" name="disk" tone="inherit" :size="10" aria-hidden="true" />
          <span class="codex-loader__step-number">0{{ index + 1 }}</span>
          <span class="codex-loader__step-label">{{ stage.label }}</span>
          <span v-if="stage.complete" class="codex-loader__stamp">
            <Sticker
              variant="fill"
              :color="stampColors[index % stampColors.length]"
              mark="star"
              mark-position="after"
              :mark-size="9"
            >DONE</Sticker>
          </span>
          <span v-else-if="stage.active" class="codex-loader__now">NOW</span>
        </li>
      </ol>

      <div class="codex-loader__waveform" aria-hidden="true">
        <span
          v-for="(height, index) in barHeights"
          :key="index"
          :class="{ 'is-lit': percent >= ((index + 1) / barHeights.length) * 100 }"
          :style="barStyle(height, index)"
        />
      </div>

      <div class="codex-loader__status" role="status" aria-live="polite">
        <strong>{{ phase }}</strong>
        <span>{{ message }}</span>
      </div>
    </article>

    <footer class="codex-loader__footer">
      <span>SOLFÈGE IS A FEELING YOU CAN PLAY</span>
      <div
        class="codex-loader__track"
        role="progressbar"
        aria-label="Loading progress"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span :style="{ transform: `scaleX(${percent / 100})` }" />
      </div>
    </footer>
  </section>
</template>

<style scoped>
.codex-loader {
  position: relative;
  display: grid;
  min-height: 660px;
  height: 100%;
  overflow: hidden;
  grid-template-rows: auto 1fr auto;
  padding: clamp(18px, 3vw, 38px);
  isolation: isolate;
}

.codex-loader *,
.codex-loader *::before,
.codex-loader *::after { box-sizing: border-box; }

.codex-loader__sheets {
  position: absolute;
  z-index: -3;
  inset: -8%;
  display: flex;
  transform: rotate(-3.5deg) scale(1.08);
}

.codex-loader__sheets > span {
  width: 20%;
  background: var(--sheet);
  animation: codex-sheet-breathe 3.8s ease-in-out var(--sheet-delay) infinite;
  will-change: transform;
}

.codex-loader__marks {
  position: absolute;
  z-index: 0;
  inset: 0;
  pointer-events: none;
}

.codex-loader__loose-mark {
  position: absolute;
  left: var(--mark-x);
  top: var(--mark-y);
  color: var(--mark-color);
  filter: drop-shadow(3px 4px 0 rgb(19 19 19 / 22%));
  transform: rotate(var(--mark-rotate));
  animation: codex-mark-float 3.4s ease-in-out var(--mark-delay) infinite;
}

.codex-loader__header,
.codex-loader__footer {
  position: relative;
  z-index: 4;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 18px;
  color: var(--ink);
  font: var(--t-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.codex-loader__stage {
  position: relative;
  z-index: 2;
  display: grid;
  width: min(1040px, 88vw);
  margin: auto;
  grid-template-columns: minmax(270px, .9fr) minmax(300px, 1.1fr);
  grid-template-areas:
    "logo copy"
    "logo steps"
    "wave status";
  gap: clamp(16px, 3vw, 34px) clamp(26px, 5vw, 66px);
  align-items: center;
  padding: clamp(28px, 4vw, 54px);
  background: var(--ink);
  box-shadow: 15px 15px 0 rgb(19 19 19 / 30%);
  color: var(--ivory);
  clip-path: var(--clip-offcut);
}

.codex-loader__logo {
  grid-area: logo;
  display: grid;
  place-items: center;
  min-width: 0;
}

.codex-loader__logo :deep(.brand-logo) {
  max-width: 100%;
}

.codex-loader__logo :deep(.brand-logo__backdrop:nth-child(1)) { animation-delay: -1.1s; }
.codex-loader__logo :deep(.brand-logo__backdrop:nth-child(2)) { animation-delay: -.88s; }
.codex-loader__logo :deep(.brand-logo__backdrop:nth-child(3)) { animation-delay: -.66s; }
.codex-loader__logo :deep(.brand-logo__backdrop:nth-child(4)) { animation-delay: -.44s; }
.codex-loader__logo :deep(.brand-logo__backdrop:nth-child(5)) { animation-delay: -.22s; }

.codex-loader__logo :deep(.brand-logo__backdrop) {
  transform-origin: center;
  animation: codex-logo-blob 2.8s ease-in-out infinite;
  will-change: transform;
}

.codex-loader__logo :deep(.brand-logo__cut) {
  transform-box: fill-box;
  transform-origin: center;
  animation: codex-logo-cut 1.9s ease-in-out infinite alternate;
}

.codex-loader__logo :deep(.brand-logo__cut:nth-child(even)) { animation-delay: -780ms; }
.codex-loader__logo :deep(.brand-logo__cut:nth-child(3n)) { animation-delay: -1.25s; }

.codex-loader__logo :deep(.brand-logo__sprinkle) {
  animation: codex-logo-sprinkle 2.4s ease-in-out infinite alternate;
}

.codex-loader__logo :deep(.brand-logo__sprinkle:nth-child(odd)) { animation-delay: -1.2s; }

.codex-loader__copy { grid-area: copy; align-self: end; }
.codex-loader__copy p {
  margin: 0 0 10px;
  color: var(--mustard);
  font: var(--t-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .2em;
}

.codex-loader__copy h1 {
  margin: 0;
  font: 700 clamp(36px, 5vw, 66px)/1 var(--font-display);
  letter-spacing: -.02em;
  text-transform: uppercase;
}

.codex-loader__copy h1 em { color: var(--tomato); font-style: normal; }

.codex-loader__steps {
  grid-area: steps;
  display: grid;
  gap: 0;
  align-self: start;
  margin: 0;
  padding: 0;
  list-style: none;
}

.codex-loader__steps li {
  display: grid;
  min-height: 38px;
  grid-template-columns: 12px 24px minmax(0, 1fr) auto;
  align-items: center;
  gap: 8px;
  border-bottom: 1px solid var(--ink-5);
  color: var(--ivory-4);
  font: var(--t-label);
  letter-spacing: .06em;
  text-transform: uppercase;
  transition: color 180ms ease-out, opacity 180ms ease-out;
}

.codex-loader__steps li.is-active,
.codex-loader__steps li.is-complete { color: var(--ivory); }
.codex-loader__steps li:not(.is-active, .is-complete) { opacity: .42; }
.codex-loader__bullet { color: currentColor; }
.codex-loader__step-number { color: var(--ivory-4); font: var(--t-mono); font-size: 8px; }
.codex-loader__stamp { animation: codex-stamp 260ms cubic-bezier(.2, 1.7, .35, 1) both; }
.codex-loader__stamp :deep(.sticker) { font-size: 9px; }
.codex-loader__now { color: var(--mustard); font: var(--t-mono); font-size: 8px; letter-spacing: .16em; }

.codex-loader__waveform {
  grid-area: wave;
  display: flex;
  height: 58px;
  align-items: end;
  gap: clamp(3px, .55vw, 7px);
}

.codex-loader__waveform > span {
  width: clamp(4px, .7vw, 8px);
  height: 100%;
  flex: 1;
  background: var(--bar-color);
  opacity: .26;
  transform: scaleY(var(--bar-low));
  transform-origin: center bottom;
  animation: codex-bar var(--bar-duration) ease-in-out var(--bar-delay) infinite alternate;
  transition: opacity 180ms ease-out;
}

.codex-loader__waveform > span.is-lit { opacity: 1; }

.codex-loader__status {
  grid-area: status;
  display: flex;
  min-width: 0;
  align-items: end;
  justify-content: space-between;
  gap: 18px;
}

.codex-loader__status strong {
  font: var(--t-h2);
  text-transform: uppercase;
}

.codex-loader__status span {
  max-width: 34ch;
  color: var(--ivory-3);
  font: var(--t-caption);
  text-align: right;
}

.codex-loader__footer { align-items: end; }
.codex-loader__track { width: min(320px, 32vw); height: 5px; overflow: hidden; background: rgb(19 19 19 / 22%); }
.codex-loader__track > span {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--ink);
  transform-origin: left;
  transition: transform 250ms var(--ease-brush);
}

.codex-loader--split-signal {
  background: var(--ink);
}

.codex-loader--split-signal .codex-loader__sheets {
  right: 48%;
  transform: rotate(0) scale(1.02);
}

.codex-loader--split-signal .codex-loader__sheets > span { width: 20%; }
.codex-loader--split-signal .codex-loader__header,
.codex-loader--split-signal .codex-loader__footer { color: var(--ivory); }

.codex-loader--split-signal .codex-loader__stage {
  width: min(1120px, 92vw);
  grid-template-columns: minmax(330px, 1.1fr) minmax(330px, .9fr);
  grid-template-areas:
    "logo copy"
    "logo steps"
    "wave status";
  background: transparent;
  box-shadow: none;
  clip-path: none;
}

.codex-loader--split-signal .codex-loader__copy,
.codex-loader--split-signal .codex-loader__steps,
.codex-loader--split-signal .codex-loader__status {
  position: relative;
  z-index: 1;
  color: var(--ink);
}

.codex-loader--split-signal .codex-loader__copy::before,
.codex-loader--split-signal .codex-loader__steps::before,
.codex-loader--split-signal .codex-loader__status::before {
  position: absolute;
  z-index: -1;
  inset: -18px -28px;
  background: var(--bone);
  content: "";
}

.codex-loader--split-signal .codex-loader__copy h1 em { color: var(--cobalt); }
.codex-loader--split-signal .codex-loader__copy h1 {
  font-size: clamp(34px, 4.2vw, 58px);
  line-height: 1.08;
}
.codex-loader--split-signal .codex-loader__steps li { border-color: var(--ink-5); color: var(--ink-5); }
.codex-loader--split-signal .codex-loader__steps li.is-active,
.codex-loader--split-signal .codex-loader__steps li.is-complete { color: var(--ink); }
.codex-loader--split-signal .codex-loader__step-number,
.codex-loader--split-signal .codex-loader__status span { color: var(--ink-5); }
.codex-loader--split-signal .codex-loader__waveform { align-self: end; }
.codex-loader--split-signal .codex-loader__track { background: var(--ink-5); }
.codex-loader--split-signal .codex-loader__track > span { background: var(--ivory); }

.codex-loader--open-press {
  background: var(--bone);
  color: var(--ink);
}

.codex-loader--open-press .codex-loader__sheets {
  inset: auto -12% -18% -12%;
  height: 37%;
  transform: rotate(2deg) scale(1.06);
}

.codex-loader--open-press .codex-loader__stage {
  width: min(1100px, 92vw);
  grid-template-columns: minmax(310px, 1fr) minmax(280px, .9fr);
  grid-template-areas:
    "logo copy"
    "logo steps"
    "wave status";
  background: transparent;
  box-shadow: none;
  color: var(--ink);
  clip-path: none;
}

.codex-loader--open-press .codex-loader__logo { transform: translateY(-8px) scale(1.06); }
.codex-loader--open-press .codex-loader__copy h1 em { color: var(--plum); }
.codex-loader--open-press .codex-loader__copy h1 {
  font-size: clamp(34px, 4.2vw, 58px);
  line-height: 1.08;
}
.codex-loader--open-press .codex-loader__steps li { border-color: var(--ink-5); color: var(--ink-5); }
.codex-loader--open-press .codex-loader__steps li.is-active,
.codex-loader--open-press .codex-loader__steps li.is-complete { color: var(--ink); }
.codex-loader--open-press .codex-loader__step-number,
.codex-loader--open-press .codex-loader__status span { color: var(--ink-5); }
.codex-loader--open-press .codex-loader__status { color: var(--ivory); }
.codex-loader--open-press .codex-loader__status span { color: var(--ivory-3); }
.codex-loader--open-press .codex-loader__waveform { padding: 0 8px; }

.is-ready .codex-loader__sheets > span,
.is-ready .codex-loader__loose-mark,
.is-ready .codex-loader__logo :deep(.brand-logo__backdrop),
.is-ready .codex-loader__logo :deep(.brand-logo__cut),
.is-ready .codex-loader__logo :deep(.brand-logo__sprinkle),
.is-ready .codex-loader__waveform > span { animation-play-state: paused; }

@keyframes codex-sheet-breathe {
  0%, 100% { transform: translate3d(0, -12px, 0); }
  50% { transform: translate3d(0, 12px, 0); }
}

@keyframes codex-mark-float {
  0%, 100% { transform: translate3d(0, -5px, 0) rotate(var(--mark-rotate)); }
  50% { transform: translate3d(0, 7px, 0) rotate(calc(var(--mark-rotate) + 5deg)); }
}

@keyframes codex-logo-blob {
  0%, 100% { transform: translate(-50%, -50%) scale(.96); }
  50% { transform: translate(-50%, -50%) scale(1.045); }
}

@keyframes codex-logo-cut {
  0% { transform: translate3d(-2px, 1px, 0) rotate(-1.5deg); }
  100% { transform: translate3d(2px, -1px, 0) rotate(1.5deg); }
}

@keyframes codex-logo-sprinkle {
  0% { transform: translate(calc(-50% - 2px), calc(-50% + 2px)) rotate(-5deg); }
  100% { transform: translate(calc(-50% + 3px), calc(-50% - 3px)) rotate(5deg); }
}

@keyframes codex-bar {
  0% { transform: scaleY(var(--bar-low)); }
  100% { transform: scaleY(var(--bar-high)); }
}

@keyframes codex-stamp {
  0% { opacity: 0; transform: translate3d(0, -7px, 0) scale(1.55) rotate(-7deg); }
  70% { opacity: 1; transform: translate3d(0, 1px, 0) scale(.92) rotate(2deg); }
  100% { opacity: 1; transform: translate3d(0, 0, 0) scale(1) rotate(0); }
}

@media (max-width: 820px) {
  .codex-loader { min-height: 720px; padding: 18px; }
  .codex-loader__stage,
  .codex-loader--split-signal .codex-loader__stage,
  .codex-loader--open-press .codex-loader__stage {
    width: min(94vw, 580px);
    grid-template-columns: 1fr;
    grid-template-areas: "logo" "copy" "steps" "wave" "status";
    gap: 18px;
    padding: 24px;
  }
  .codex-loader__copy h1 { font-size: clamp(31px, 8vw, 48px); }
  .codex-loader__status { align-items: start; flex-direction: column; gap: 4px; }
  .codex-loader__status span { max-width: 50ch; text-align: left; }
  .codex-loader--split-signal .codex-loader__copy::before,
  .codex-loader--split-signal .codex-loader__steps::before,
  .codex-loader--split-signal .codex-loader__status::before { inset: -9px -14px; }
  .codex-loader--split-signal .codex-loader__sheets { right: 0; bottom: 54%; }
  .codex-loader--open-press .codex-loader__status { color: var(--ink); }
  .codex-loader--open-press .codex-loader__status span { color: var(--ink-5); }
  .codex-loader__loose-mark { opacity: .72; transform: scale(.72) rotate(var(--mark-rotate)); }
}

@media (max-width: 520px) {
  .codex-loader { min-height: 760px; }
  .codex-loader__header span:first-child,
  .codex-loader__footer > span { display: none; }
  .codex-loader__header { justify-content: flex-end; }
  .codex-loader__track { width: 100%; }
  .codex-loader__stage,
  .codex-loader--split-signal .codex-loader__stage,
  .codex-loader--open-press .codex-loader__stage { padding: 20px; }
  .codex-loader__stamp :deep(.sticker) { font-size: 8px; }
}

@media (prefers-reduced-motion: reduce) {
  .codex-loader__sheets > span,
  .codex-loader__loose-mark,
  .codex-loader__logo :deep(.brand-logo__backdrop),
  .codex-loader__logo :deep(.brand-logo__cut),
  .codex-loader__logo :deep(.brand-logo__sprinkle),
  .codex-loader__waveform > span,
  .codex-loader__stamp { animation: none; }
  .codex-loader__steps li,
  .codex-loader__waveform > span,
  .codex-loader__track > span { transition: none; }
}
</style>
