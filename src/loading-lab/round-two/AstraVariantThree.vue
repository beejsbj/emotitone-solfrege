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
<section class="scene colour-assembly" :class="{ ready: percent === 100 }" aria-label="Colour Assembly loading preview"><div class="side-print" aria-hidden="true" /><div class="scatter" aria-hidden="true"><span v-for="(mark, index) in marks" :key="mark" class="loose-mark" :style="{ left: spots[index][0] + '%', top: spots[index][1] + '%', '--delay': index * -.37 + 's', '--angle': (index % 2 ? 12 : -12) + 'deg' }"><Mark :name="mark" tone="inherit" :size="index % 3 === 0 ? 48 : 30" /></span></div><header class="topline"><span>A feeling you can play</span><span>{{ percent === 100 ? 'Ready when you are' : 'Preparing your room' }}</span></header><main class="hero"><div class="logo"><BrandLogo surface="bone" size="min(270px, 62vw)" /></div><div class="assembly"><p class="kicker">Piece by piece,</p><h1>Let's make<br>some music.</h1><ul class="stages" aria-label="Loading stages">
  <li v-for="(stage, index) in visibleStages" :key="stage.label" :class="{ complete: stage.complete }">
    <span class="bullet" aria-hidden="true">{{ stage.complete ? "•" : "◦" }}</span>
    <span class="stage-label">{{ stage.label }}</span>
    <span v-if="stage.complete" class="stamp"><Sticker variant="fill" :color="index % 2 ? 'mustard' : 'ink'">READY</Sticker></span>
    <span v-else class="working" aria-label="Loading">···</span>
  </li>
</ul><p class="message" role="status">{{ phase }} · {{ message }}</p></div></main><div class="skyline"><div class="bars" aria-hidden="true"><span v-for="i in 25" :key="i" :style="{ '--i': i, '--bar-color': 'var(--' + colors[(i - 1) % 5] + ')' }" :class="{ lit: percent >= i * 4 }" /></div><div class="skyline-label"><span>Sound is taking shape.</span><strong>{{ percent }}%</strong></div><div class="meter" role="progressbar" aria-label="Loading progress" :aria-valuenow="percent" aria-valuemin="0" aria-valuemax="100"><span :style="{ transform: 'scaleX(' + percent / 100 + ')' }" /></div></div></section>
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

.colour-assembly { background: var(--bone); color: var(--ink); display: flex; flex-direction: column; padding-bottom: 0; }
.side-print { position: absolute; z-index: -1; left: -12%; top: -15%; width: 30%; height: 145%; background: var(--plum); transform: rotate(14deg); }
.colour-assembly .hero { display: grid; grid-template-columns: 1fr 1fr; gap: 54px; align-items: center; width: min(760px, 100%); margin: auto; padding: 42px 0 32px; }
.colour-assembly .logo { background: var(--bone); padding: 18px; }
.colour-assembly .assembly { background: var(--bone); padding: 12px; }
.colour-assembly h1 { font-size: clamp(42px, 5vw, 64px); line-height: 1.2; }
.colour-assembly .kicker { color: var(--pine); }
.colour-assembly .bullet { color: var(--ink); }
.colour-assembly .loose-mark { color: var(--tomato); }
.colour-assembly .loose-mark:nth-child(2n) { color: var(--cobalt); }
.colour-assembly .loose-mark:nth-child(3n) { color: var(--pine); }
.skyline { position: relative; z-index: 2; margin: 0 calc(clamp(24px, 4vw, 48px) * -1); }
.skyline .bars { gap: 0; height: 120px; }
.skyline .bars > span { opacity: 1; }
.skyline-label { padding: 18px clamp(24px, 4vw, 48px); display: flex; align-items: baseline; justify-content: space-between; gap: 20px; background: var(--ink); color: var(--ivory); }
.skyline-label span { font: 700 23px var(--font-display); text-transform: uppercase; }
.skyline-label strong { font: 700 42px/.9 var(--font-display); }
.skyline .meter { height: 5px; }
.skyline .meter > span { background: var(--mustard); }
@media(max-width: 640px) {
  .colour-assembly .topline > span:last-child { display: none; }
  .colour-assembly .hero, .colour-assembly .assembly { min-width: 0; }
  .colour-assembly .stages li { display: grid; grid-template-columns: 12px minmax(0, 1fr) auto; }
  .colour-assembly .stage-label { min-width: 0; overflow-wrap: anywhere; }
  .colour-assembly .stamp { margin-right: 3px; }
  .colour-assembly .stamp :deep(.sticker) { font-size: 10px; }
}
@media(max-width: 700px) { .colour-assembly .hero { grid-template-columns: 1fr; gap: 20px; padding: 24px 0; } .colour-assembly .logo { padding: 8px; } .colour-assembly .assembly { width: min(400px, 100%); margin: auto; } .colour-assembly h1 { font-size: 40px; } .skyline { margin-inline: -22px; } .skyline .bars { height: 65px; } .skyline-label span { font-size: 19px; } }

</style>
