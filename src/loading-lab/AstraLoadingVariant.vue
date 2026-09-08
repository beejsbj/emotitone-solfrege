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

const percent = computed(() => Math.round(Math.min(100, Math.max(0, Number.isFinite(props.progress) ? props.progress : 0))));
const reeds: { tone: string; mark: MarkName; tilt: number; lift: number }[] = [
  { tone: "cobalt", mark: "wave", tilt: -9, lift: 18 },
  { tone: "tomato", mark: "eighth", tilt: 5, lift: -10 },
  { tone: "mustard", mark: "star", tilt: -3, lift: 12 },
  { tone: "plum", mark: "whole", tilt: 8, lift: -15 },
  { tone: "pine", mark: "grace", tilt: -5, lift: 10 },
];
</script>

<template>
  <section class="soundcheck" :class="{ 'soundcheck--ready': percent === 100 }" aria-label="EmotiTone loading preview">
    <header class="soundcheck__header">
      <BrandLogo layout="compact" surface="bone" :size="42" />
      <span class="soundcheck__edition">SOUND + FEELING</span>
    </header>

    <div class="soundcheck__body">
      <p class="soundcheck__eyebrow">{{ percent === 100 ? 'THE ROOM IS YOURS' : 'GETTING READY TO PLAY' }}</p>
      <h1>A little<br><span>warm-up.</span></h1>

      <div class="soundcheck__ensemble" aria-hidden="true">
        <div
          v-for="(reed, index) in reeds"
          :key="reed.tone"
          class="soundcheck__reed"
          :class="{ 'soundcheck__reed--arrived': percent >= (index + 1) * 20 }"
          :style="{
            '--reed-color': `var(--${reed.tone})`,
            '--reed-tilt': `${reed.tilt}deg`,
            '--reed-lift': `${reed.lift}px`,
            '--reed-delay': `${index * -0.31}s`,
          }"
        >
          <span class="soundcheck__reed-number">0{{ index + 1 }}</span>
          <Mark :name="reed.mark" tone="inherit" :size="42" />
          <span class="soundcheck__reed-foot" />
        </div>
      </div>
      <p class="soundcheck__invitation">A few sounds. A little colour. All yours.</p>
    </div>

    <footer class="soundcheck__footer">
      <div class="soundcheck__status">
        <p class="soundcheck__phase" role="status">{{ phase }}</p>
        <p class="soundcheck__message">{{ message }}</p>
      </div>
      <div class="soundcheck__percent"><span>{{ String(percent).padStart(2, '0') }}</span><small>%</small></div>
      <div class="soundcheck__track" role="progressbar" aria-label="Loading progress" :aria-valuenow="percent" :aria-valuemin="0" :aria-valuemax="100">
        <span :style="{ transform: `scaleX(${percent / 100})` }" />
      </div>
    </footer>
  </section>
</template>

<style scoped>
.soundcheck {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 660px;
  height: 100%;
  overflow: hidden;
  padding: clamp(24px, 5vw, 52px);
  background: var(--bone);
  color: var(--ink);
}
.soundcheck__header { display: flex; justify-content: space-between; align-items: center; gap: 16px; }
.soundcheck__edition, .soundcheck__eyebrow { font: var(--t-mono); font-size: 9px; letter-spacing: .14em; }
.soundcheck__edition { text-align: right; }
.soundcheck__body { display: flex; flex: 1; flex-direction: column; justify-content: center; align-items: center; padding: 44px 0 32px; }
.soundcheck__eyebrow { margin: 0 0 18px; }
.soundcheck h1 { margin: 0; text-align: center; font: 700 clamp(48px, 7vw, 84px)/.9 var(--font-display); letter-spacing: -.025em; }
.soundcheck h1 span { color: var(--cobalt); }
.soundcheck__ensemble { display: flex; justify-content: center; gap: clamp(5px, 1.7vw, 14px); width: 100%; max-width: 420px; padding: 38px 6px 27px; }
.soundcheck__reed {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  justify-content: space-between;
  align-items: center;
  min-width: 0;
  height: clamp(108px, 19vw, 150px);
  padding: 12px 6px;
  color: var(--ivory);
  background: var(--reed-color);
  transform: translateY(var(--reed-lift)) rotate(var(--reed-tilt));
  animation: soundcheck-sway 2.4s ease-in-out var(--reed-delay) infinite;
}
.soundcheck__reed:nth-child(3) { color: var(--ink); }
.soundcheck__reed-number { align-self: flex-start; font: var(--t-mono); font-size: 9px; }
.soundcheck__reed-foot { width: 75%; height: 3px; background: currentColor; opacity: .35; transform: scaleX(.22); transform-origin: center; transition: transform .3s ease, opacity .3s ease; }
.soundcheck__reed--arrived .soundcheck__reed-foot { opacity: 1; transform: scaleX(1); }
.soundcheck__invitation { margin: 13px 0 0; font: var(--t-mono); font-size: 11px; text-align: center; line-height: 1.6; }
.soundcheck__footer { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: end; column-gap: 18px; row-gap: 16px; }
.soundcheck__phase { margin: 0 0 5px; font: 700 18px/1.15 var(--font-display); }
.soundcheck__message { margin: 0; max-width: 40ch; font: var(--t-mono); font-size: 10px; line-height: 1.5; }
.soundcheck__percent { display: flex; align-items: baseline; font: 700 44px/.9 var(--font-display); font-variant-numeric: tabular-nums; }
.soundcheck__percent small { margin-left: 3px; font: var(--t-mono); font-size: 12px; }
.soundcheck__track { grid-column: 1 / -1; height: 4px; background: color-mix(in srgb, var(--ink) 14%, transparent); overflow: hidden; }
.soundcheck__track > span { display: block; height: 100%; width: 100%; background: var(--ink); transform-origin: left; transition: transform .35s ease; }
.soundcheck--ready .soundcheck__reed { animation: none; transform: rotate(var(--reed-tilt)); }
@keyframes soundcheck-sway {
  0%, 100% { transform: translateY(var(--reed-lift)) rotate(var(--reed-tilt)); }
  50% { transform: translateY(calc(var(--reed-lift) - 9px)) rotate(calc(var(--reed-tilt) + 3deg)); }
}
@media (max-width: 420px) {
  .soundcheck { min-height: 620px; padding: 24px; }
  .soundcheck__edition { max-width: 65px; font-size: 8px; line-height: 1.6; }
  .soundcheck__body { padding-top: 36px; }
  .soundcheck__reed :deep(svg) { width: 32px; height: 32px; }
}
@media (prefers-reduced-motion: reduce) {
  .soundcheck__reed { animation: none; }
  .soundcheck__reed-foot, .soundcheck__track > span { transition: none; }
}
@media (forced-colors: active) {
  .soundcheck { background: Canvas; color: CanvasText; }
  .soundcheck h1 span { color: CanvasText; }
  .soundcheck__reed { border: 1px solid CanvasText; color: CanvasText; }
  .soundcheck__reed:nth-child(3) { color: CanvasText; }
  .soundcheck__track { border-bottom: 1px solid CanvasText; }
  .soundcheck__track > span { background: Highlight; }
}
</style>
