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

const sheets: Array<{ tone: string; mark: MarkName; ink: boolean }> = [
  { tone: "cobalt", mark: "wave", ink: false },
  { tone: "tomato", mark: "eighth", ink: false },
  { tone: "mustard", mark: "staccato", ink: true },
  { tone: "plum", mark: "diamond", ink: false },
  { tone: "pine", mark: "grace", ink: false },
];
</script>

<template>
  <section
    class="color-press"
    :class="{ 'color-press--ready': percent === 100 }"
    aria-label="EmotiTone loading preview"
  >
    <div class="color-press__sheets" aria-hidden="true">
      <div
        v-for="(sheet, index) in sheets"
        :key="sheet.tone"
        class="color-press__sheet"
        :class="{ 'color-press__sheet--ink': sheet.ink }"
        :style="{
          '--sheet-color': `var(--${sheet.tone})`,
          '--sheet-delay': `${index * -0.47}s`,
          '--sheet-zig': index % 2 === 0 ? '-12px' : '12px',
        }"
      >
        <Mark :name="sheet.mark" tone="inherit" size="48" />
        <span>0{{ index + 1 }}</span>
      </div>
    </div>

    <header class="color-press__header">
      <span>THE COLOUR ROOM</span>
      <span>{{ String(percent).padStart(2, "0") }} / 100</span>
    </header>

    <article class="color-press__plate">
      <BrandLogo layout="compact" :size="48" />
      <p class="color-press__eyebrow">
        {{ percent === 100 ? "READY WHEN YOU ARE" : "SETTING THE STAGE" }}
      </p>
      <h1>Something musical<br><em>is taking shape.</em></h1>

      <div class="color-press__status">
        <div>
          <p class="color-press__phase" role="status">{{ phase }}</p>
          <p class="color-press__message">{{ message }}</p>
        </div>
        <span>{{ percent }}%</span>
      </div>

      <div
        class="color-press__track"
        role="progressbar"
        aria-label="Loading progress"
        :aria-valuenow="percent"
        aria-valuemin="0"
        aria-valuemax="100"
      >
        <span :style="{ transform: `scaleX(${percent / 100})` }" />
      </div>
    </article>

    <footer class="color-press__footer">SOLFÈGE IS A FEELING YOU CAN PLAY</footer>
  </section>
</template>

<style scoped>
.color-press {
  position: relative;
  display: flex;
  min-height: 660px;
  height: 100%;
  overflow: hidden;
  flex-direction: column;
  justify-content: space-between;
  padding: clamp(22px, 4vw, 46px);
  background: var(--bone);
  color: var(--ink);
  isolation: isolate;
}

.color-press__sheets {
  position: absolute;
  z-index: -1;
  inset: -8%;
  display: flex;
  transform: rotate(-4deg) scale(1.08);
}

.color-press__sheet {
  display: flex;
  width: 20%;
  min-width: 0;
  align-items: center;
  justify-content: space-around;
  flex-direction: column;
  padding: 18vh 4px;
  background: var(--sheet-color);
  color: var(--ivory);
  animation: color-press-shift 3.8s ease-in-out var(--sheet-delay) infinite;
  will-change: transform;
}

.color-press__sheet--ink { color: var(--ink); }

.color-press__sheet span {
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .16em;
}

.color-press__header,
.color-press__footer {
  position: relative;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  color: var(--ink);
  font: var(--t-mono);
  font-size: 9px;
  font-weight: 700;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.color-press__plate {
  width: min(720px, 88vw);
  margin: auto;
  padding: clamp(26px, 5vw, 54px);
  background: var(--ink);
  box-shadow: 12px 12px 0 color-mix(in srgb, var(--ink) 38%, transparent);
  color: var(--ivory);
  clip-path: var(--clip-offcut);
  transform: rotate(.6deg);
}

.color-press__eyebrow {
  margin: clamp(46px, 8vh, 72px) 0 12px;
  color: var(--mustard);
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .2em;
}

.color-press h1 {
  margin: 0;
  font: 700 clamp(38px, 6vw, 68px)/.9 var(--font-display);
  letter-spacing: -.01em;
  text-transform: uppercase;
}

.color-press h1 em {
  color: var(--tomato);
  font-style: normal;
}

.color-press__status {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 24px;
  margin-top: clamp(46px, 9vh, 84px);
}

.color-press__phase {
  margin: 0 0 5px;
  font: var(--t-h2);
  text-transform: uppercase;
}

.color-press__message {
  max-width: 42ch;
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-caption);
}

.color-press__status > span {
  font: 700 clamp(34px, 5vw, 58px)/.8 var(--font-display);
  font-variant-numeric: tabular-nums;
}

.color-press__track {
  height: 5px;
  margin-top: 16px;
  overflow: hidden;
  background: var(--ink-5);
}

.color-press__track span {
  display: block;
  width: 100%;
  height: 100%;
  background: var(--ivory);
  transform-origin: left;
  transition: transform 280ms var(--ease-brush);
}

.color-press--ready .color-press__sheet { animation: none; }

@keyframes color-press-shift {
  0%, 100% { transform: translate3d(0, var(--sheet-zig), 0); }
  50% { transform: translate3d(0, 0, 0); }
}

@media (max-width: 640px) {
  .color-press { min-height: 620px; padding: 20px; }
  .color-press__header span:first-child { display: none; }
  .color-press__header { justify-content: flex-end; }
  .color-press__plate { width: 94vw; padding: 32px 26px; }
  .color-press__eyebrow { margin-top: 42px; }
  .color-press__status { align-items: flex-start; flex-direction: column; margin-top: 52px; }
  .color-press__footer { max-width: 24ch; line-height: 1.5; }
  .color-press__sheet :deep(svg) { width: 30px; height: 30px; }
}

@media (prefers-reduced-motion: reduce) {
  .color-press__sheet { animation: none; }
  .color-press__track span { transition: none; }
}

@media (forced-colors: active) {
  .color-press { background: Canvas; color: CanvasText; }
  .color-press__sheet { border-right: 1px solid CanvasText; background: Canvas; color: CanvasText; }
  .color-press__plate { border: 2px solid CanvasText; background: Canvas; color: CanvasText; }
  .color-press h1 em,
  .color-press__eyebrow { color: CanvasText; }
  .color-press__track span { background: Highlight; }
}
</style>
