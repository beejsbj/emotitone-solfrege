<script setup lang="ts">
import { computed } from "vue";
import BrandLogo from "../components/uniques/BrandLogo.vue";
import Mark from "../components/primatives/Mark.vue";
import type { MarkName } from "../components/primatives/Mark.vue";

const props = withDefaults(defineProps<{
  progress?: number;
  phase?: string;
  message?: string;
}>(), {
  progress: 38,
  phase: "Loading instruments",
  message: "Gathering the sounds for your first notes.",
});

const percent = computed(() => (
  Math.round(Math.min(100, Math.max(0, Number.isFinite(props.progress) ? props.progress : 0)))
));

const papers: Array<{
  mark: MarkName;
  tone: string;
  position: string;
  rotate: number;
}> = [
  { mark: "wave", tone: "cobalt", position: "8%; 14%", rotate: -12 },
  { mark: "diamond", tone: "tomato", position: "83%; 18%", rotate: 9 },
  { mark: "eighth", tone: "mustard", position: "12%; 70%", rotate: 7 },
  { mark: "grace", tone: "pine", position: "82%; 72%", rotate: -8 },
  { mark: "star", tone: "plum", position: "66%; 4%", rotate: 11 },
];
</script>

<template>
  <section
    class="first-note"
    :class="{ 'first-note--ready': percent === 100 }"
    aria-label="EmotiTone loading preview"
  >
    <div class="first-note__grain" aria-hidden="true" />

    <div
      v-for="(paper, index) in papers"
      :key="paper.mark"
      class="first-note__paper"
      :class="{ 'first-note__paper--arrived': percent >= (index + 1) * 20 }"
      :style="{
        '--paper-color': `var(--${paper.tone})`,
        '--paper-left': paper.position.split('; ')[0],
        '--paper-top': paper.position.split('; ')[1],
        '--paper-rotate': `${paper.rotate}deg`,
        '--paper-delay': `${index * -0.43}s`,
      }"
      aria-hidden="true"
    >
      <Mark :name="paper.mark" tone="inherit" size="38" />
    </div>

    <header class="first-note__header">
      <span>EMOTITONE · SOLFÈGE</span>
      <span>SOUND / FEELING / PLAY</span>
    </header>

    <div class="first-note__center">
      <p class="first-note__eyebrow">
        {{ percent === 100 ? "THE ROOM IS READY" : "YOUR FIRST NOTE IS CLOSE" }}
      </p>
      <BrandLogo class="first-note__logo" :size="'min(250px, 58vw)'" />
      <p class="first-note__promise">Feel it. Find it. Play it.</p>
    </div>

    <footer class="first-note__footer">
      <div class="first-note__status">
        <p class="first-note__phase" role="status">{{ phase }}</p>
        <p class="first-note__message">{{ message }}</p>
      </div>

      <div class="first-note__meter">
        <span class="first-note__percent">{{ String(percent).padStart(2, "0") }}</span>
        <div
          class="first-note__track"
          role="progressbar"
          aria-label="Loading progress"
          :aria-valuenow="percent"
          aria-valuemin="0"
          aria-valuemax="100"
        >
          <span :style="{ transform: `scaleX(${percent / 100})` }" />
        </div>
        <span class="first-note__unit">%</span>
      </div>
    </footer>
  </section>
</template>

<style scoped>
.first-note {
  position: relative;
  display: flex;
  min-height: 660px;
  height: 100%;
  overflow: hidden;
  flex-direction: column;
  padding: clamp(24px, 4vw, 48px);
  background: var(--ink);
  color: var(--ivory);
  isolation: isolate;
}

.first-note__grain {
  position: absolute;
  z-index: -2;
  inset: 0;
  opacity: .42;
  background:
    radial-gradient(circle at 50% 44%, color-mix(in srgb, var(--plum) 17%, transparent), transparent 36%),
    repeating-linear-gradient(0deg, transparent 0 82px, var(--hairline-2) 82px 83px);
}

.first-note__header,
.first-note__footer {
  position: relative;
  z-index: 3;
  display: flex;
  justify-content: space-between;
  gap: 24px;
}

.first-note__header {
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.first-note__header span:last-child { text-align: right; }

.first-note__center {
  position: relative;
  z-index: 2;
  display: grid;
  flex: 1;
  place-content: center;
  justify-items: center;
  padding: 42px 0;
}

.first-note__eyebrow {
  margin: 0 0 16px;
  color: var(--ivory-2);
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .22em;
}

.first-note__logo {
  animation: first-note-breathe 3.4s ease-in-out infinite;
  will-change: transform;
}

.first-note__promise {
  margin: 22px 0 0;
  color: var(--ivory);
  font: 700 clamp(22px, 4vw, 34px)/1 var(--font-display);
  letter-spacing: .02em;
  text-transform: uppercase;
}

.first-note__paper {
  position: absolute;
  z-index: 1;
  left: var(--paper-left);
  top: var(--paper-top);
  display: grid;
  width: clamp(58px, 8vw, 84px);
  aspect-ratio: 1;
  place-items: center;
  background: var(--paper-color);
  color: var(--ivory);
  clip-path: var(--clip-offcut);
  opacity: .24;
  transform: rotate(var(--paper-rotate)) scale(.92);
  animation: first-note-float 3.1s ease-in-out var(--paper-delay) infinite;
  transition: opacity var(--dur-ui) var(--ease-brush);
  will-change: transform;
}

.first-note__paper:nth-of-type(4) { color: var(--ink); }
.first-note__paper--arrived { opacity: 1; }

.first-note__footer {
  align-items: end;
}

.first-note__phase {
  margin: 0 0 5px;
  font: var(--t-h2);
  text-transform: uppercase;
}

.first-note__message {
  max-width: 42ch;
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-caption);
}

.first-note__meter {
  display: grid;
  min-width: min(260px, 34vw);
  grid-template-columns: auto minmax(80px, 1fr) auto;
  align-items: end;
  gap: 10px;
}

.first-note__percent {
  font: 700 clamp(34px, 5vw, 56px)/.72 var(--font-display);
  font-variant-numeric: tabular-nums;
}

.first-note__unit {
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 10px;
}

.first-note__track {
  height: 3px;
  margin-bottom: 3px;
  overflow: hidden;
  background: var(--ink-5);
}

.first-note__track span {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--ivory);
  transform-origin: left;
  transition: transform 280ms var(--ease-brush);
}

.first-note--ready .first-note__logo,
.first-note--ready .first-note__paper { animation: none; }

@keyframes first-note-breathe {
  0%, 100% { transform: scale(1) rotate(-.4deg); }
  50% { transform: scale(1.025) rotate(.4deg); }
}

@keyframes first-note-float {
  0%, 100% { transform: translate3d(0, 0, 0) rotate(var(--paper-rotate)) scale(.92); }
  50% { transform: translate3d(0, -9px, 0) rotate(calc(var(--paper-rotate) + 3deg)) scale(1); }
}

@media (max-width: 640px) {
  .first-note { min-height: 620px; }
  .first-note__header span:last-child { display: none; }
  .first-note__promise { max-width: 10ch; text-align: center; }
  .first-note__footer { align-items: stretch; flex-direction: column; }
  .first-note__meter { width: 100%; min-width: 0; }
  .first-note__paper { width: 54px; }
}

@media (prefers-reduced-motion: reduce) {
  .first-note__logo,
  .first-note__paper { animation: none; }
  .first-note__paper,
  .first-note__track span { transition: none; }
}

@media (forced-colors: active) {
  .first-note { background: Canvas; color: CanvasText; }
  .first-note__paper { border: 1px solid CanvasText; background: Canvas; color: CanvasText; }
  .first-note__track { background: CanvasText; }
  .first-note__track span { background: Highlight; }
}
</style>
