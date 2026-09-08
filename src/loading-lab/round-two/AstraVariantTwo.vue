<script setup lang="ts">
import { computed } from "vue";
import BrandLogo from "../../components/uniques/BrandLogo.vue";
import Mark from "../../components/primatives/Mark.vue";
import type { MarkName } from "../../components/primatives/Mark.vue";
import Sticker from "../../components/primatives/Sticker.vue";
const props = withDefaults(defineProps<{
  progress?: number;
  stages?: Array<{ label: string; complete: boolean; active: boolean }>;
  phase?: string;
  message?: string;
}>(), { progress: 38, phase: "Loading audio samples", message: "Gathering the sounds for your first notes." });
const percent = computed(() => Math.round(Math.min(100, Math.max(0, Number.isFinite(props.progress) ? props.progress : 0))));
const visibleStages = computed(() => (props.stages ?? [
  { label: "Visual engine", complete: percent.value >= 33, active: percent.value < 33 },
  { label: "Instruments", complete: percent.value >= 99, active: percent.value >= 33 && percent.value < 99 },
  { label: "Audio system", complete: percent.value === 100, active: percent.value >= 99 && percent.value < 100 },
]).filter(stage => stage.complete || stage.active));
const colors = ["cobalt", "tomato", "mustard", "plum", "pine"];
const marks: MarkName[] = ["wave", "eighth", "star", "grace", "diamond", "whole", "sharp", "triangle"];
const spots = [[5,14], [88,18], [15,43], [83,58], [7,79], [92,85], [70,7], [30,90]];
</script>

<template>
<section class="scene mustard-soundcheck" :class="{ ready: percent === 100 }" aria-label="Mustard Soundcheck loading preview"><div class="scatter" aria-hidden="true"><span v-for="(mark, index) in marks" :key="mark" class="loose-mark" :style="{ left: spots[index][0] + '%', top: spots[index][1] + '%', '--delay': index * -.37 + 's', '--angle': (index % 2 ? 12 : -12) + 'deg' }"><Mark :name="mark" tone="inherit" :size="index % 3 === 0 ? 48 : 30" /></span></div><header class="topline"><span>EmotiTone / Solfège</span><span>Soundcheck {{ percent }}%</span></header><main class="hero"><div class="identity"><p class="kicker">Make room for a little noise.</p><div class="logo"><BrandLogo surface="bone" size="min(290px, 65vw)" /></div><h1>Something good<br>is warming up.</h1></div><div class="receipt"><p class="kicker">{{ percent === 100 ? 'Soundcheck complete' : 'Coming together' }}</p><ul class="stages" aria-label="Loading stages">
  <li v-for="(stage, index) in visibleStages" :key="stage.label" :class="{ complete: stage.complete }">
    <span class="bullet" aria-hidden="true">{{ stage.complete ? "•" : "◦" }}</span>
    <span class="stage-label">{{ stage.label }}</span>
    <span v-if="stage.complete" class="stamp"><Sticker variant="fill" :color="index % 2 ? 'mustard' : 'ivory'">READY</Sticker></span>
    <span v-else class="working" aria-label="Loading">···</span>
  </li>
</ul><div class="wave-block"><div class="bars" aria-hidden="true"><span v-for="i in 25" :key="i" :style="{ '--i': i, '--bar-color': 'var(--' + colors[(i - 1) % 5] + ')' }" :class="{ lit: percent >= i * 4 }" /></div><span class="percent">{{ percent }}<small>%</small></span></div><div class="meter" role="progressbar" aria-label="Loading progress" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100"><span :style="{ transform: 'scaleX(' + percent / 100 + ')' }" /></div><p class="phase" role="status">{{ phase }}</p><p class="message">{{ message }}</p></div></main><footer class="foot">First a feeling. Then a note.</footer></section>
</template>

<style scoped>

.scene { position: relative; isolation: isolate; min-height: 700px; height: 100%; overflow: hidden; color: var(--ivory); padding: clamp(24px, 4vw, 48px); }
.scene *, .scene *::before, .scene *::after { box-sizing: border-box; }
.topline { position: relative; z-index: 2; display: flex; justify-content: space-between; gap: 16px; font: 10px var(--font-mono); letter-spacing: .15em; text-transform: uppercase; }
.scatter { position: absolute; inset: 0; z-index: 1; pointer-events: none; }
.loose-mark { position: absolute; color: var(--ivory); transform: rotate(var(--angle)); animation: drift 3.2s ease-in-out var(--delay) infinite; }
.loose-mark:nth-child(3n) { color: var(--ink); }
.hero { position: relative; z-index: 2; }
.logo { display: grid; justify-items: center; }
.logo :deep(.brand-logo__backdrop) { animation: breathe 3s ease-in-out infinite; }
.logo :deep(.brand-logo__backdrop:nth-child(2n)) { animation-delay: -1.5s; }
.logo :deep(.brand-logo__cut) { transform-box: fill-box; transform-origin: center; animation: cut-in 600ms cubic-bezier(.16,1,.3,1) both; }
.logo :deep(.brand-logo__cut:nth-child(2n)) { animation-delay: 90ms; }
.logo :deep(.brand-logo__cut:nth-child(3n)) { animation-delay: 180ms; }
.logo :deep(.brand-logo__sprinkle path) { animation: mark-rock 2.8s ease-in-out infinite; transform-box: fill-box; transform-origin: center; }
.logo :deep(.brand-logo__sprinkle:nth-child(2n) path) { animation-delay: -1.4s; }
.kicker { margin: 0 0 12px; font: 10px var(--font-mono); letter-spacing: .16em; text-transform: uppercase; }
h1 { margin: 0; font: 700 clamp(30px, 4vw, 48px)/.95 var(--font-display); text-transform: uppercase; }
.phase { margin: 0 0 8px; font: 700 18px var(--font-display); text-transform: uppercase; }
.message { margin: 0; font: 12px/1.5 var(--font-mono); opacity: .65; max-width: 36ch; }
.stages { list-style: none; margin: 20px 0 0; padding: 0; min-height: 138px; }
.stages li { display: flex; align-items: center; gap: 12px; min-height: 44px; animation: arrive 220ms ease-out both; }
.stage-label { font: 12px var(--font-mono); }
.bullet { color: var(--mustard); font-size: 26px; line-height: 1; }
.stamp { display: inline-flex; margin-left: auto; animation: stamp 280ms cubic-bezier(.16,1,.3,1) both; }
.stamp :deep(.sticker) { font-size: 12px; }
.working { margin-left: auto; font: 20px var(--font-mono); }
.bars { display: flex; align-items: flex-end; gap: 4px; height: 62px; }
.bars > span { flex: 1; min-width: 0; height: 100%; background: var(--bar-color); transform-origin: bottom; transform: scaleY(.22); opacity: .42; animation: equalize calc(.5s + var(--i) * .022s) ease-in-out calc(var(--i) * -.09s) infinite alternate; }
.bars > .lit { opacity: 1; }
.meter { height: 3px; background: var(--ink-5); overflow: hidden; }
.meter > span { display: block; width: 100%; height: 100%; background: var(--ivory); transform-origin: left; transition: transform 250ms ease-out; }
.ready .bars > span { animation: none; transform: scaleY(.18); opacity: 1; }
.ready .loose-mark, .ready .logo :deep(.brand-logo__backdrop), .ready .logo :deep(.brand-logo__sprinkle path) { animation: none; }
@keyframes drift { 50% { transform: translateY(-9px) rotate(calc(var(--angle) + 7deg)); } }
@keyframes breathe { 50% { transform: translate(-50%, -50%) scale(1.08); } }
@keyframes mark-rock { 50% { transform: rotate(12deg); } }
@keyframes cut-in { from { opacity: 0; transform: translateY(-14px) rotate(-9deg); } to { opacity: 1; transform: none; } }
@keyframes arrive { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
@keyframes stamp { 0% { opacity: 0; transform: scale(1.7) rotate(-14deg); } 65% { opacity: 1; transform: scale(.94) rotate(2deg); } 100% { opacity: 1; transform: none; } }
@keyframes equalize { from { transform: scaleY(.15); } to { transform: scaleY(.93); } }
@media (max-width: 640px) { .scene { padding: 22px; min-height: 760px; } .topline { font-size: 8px; } .loose-mark :deep(svg) { width: 26px; height: 26px; } .stage-label { font-size: 11px; } .stages li { gap: 8px; } }
@media (prefers-reduced-motion: reduce) { .loose-mark, .bars > span, .stages li, .stamp, .logo :deep(.brand-logo__backdrop), .logo :deep(.brand-logo__cut), .logo :deep(.brand-logo__sprinkle path) { animation: none; } .meter > span { transition: none; } }

.mustard-soundcheck { background: var(--mustard); color: var(--ink); display: flex; flex-direction: column; }
.mustard-soundcheck::before { content: ""; position: absolute; z-index: -1; top: -20%; right: -12%; width: 42%; height: 150%; background: var(--tomato); transform: rotate(14deg); }
.mustard-soundcheck .hero { display: grid; grid-template-columns: 1.1fr 1fr; gap: clamp(32px, 6vw, 80px); align-items: center; width: min(920px, 100%); margin: auto; padding: 42px 0; }
.identity { text-align: center; }
.identity .logo { margin: 24px 0; }
.identity h1 { font-size: clamp(32px, 4vw, 52px); line-height: 1.2; }
.receipt { background: var(--ink); color: var(--ivory); padding: 36px 30px; transform: rotate(-2deg); clip-path: var(--clip-offcut); }
.receipt > .kicker { color: var(--mustard); }
.receipt .stages { min-height: 160px; margin: 24px 0; }
.wave-block { display: flex; align-items: end; gap: 18px; }
.wave-block .bars { flex: 1; height: 75px; }
.percent { font: 700 64px/.8 var(--font-display); }
.percent small { font-size: 24px; }
.receipt .meter { margin: 16px 0 28px; }
.mustard-soundcheck .loose-mark { color: var(--ink); }
.mustard-soundcheck .loose-mark:nth-child(2n) { color: var(--ivory); }
@media(max-width: 640px) { .mustard-soundcheck .topline > span:last-child { display: none; } }
@media(max-width: 700px) { .mustard-soundcheck .hero { grid-template-columns: 1fr; gap: 28px; padding: 28px 0; } .identity .logo { margin: 18px 0; } .identity h1 { font-size: 32px; } .receipt { padding: 26px; width: min(410px, 100%); margin: auto; } .receipt .stages { min-height: 132px; margin: 16px 0; } .mustard-soundcheck .foot { margin-top: 8px; } }

</style>
