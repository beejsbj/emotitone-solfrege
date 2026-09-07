<script setup lang="ts">
import { ref } from "vue";

const lightStage = ref(false);
</script>

<template>
  <main class="logo-lab" :class="{ 'logo-lab--light': lightStage }">
    <svg class="logo-lab__symbols" aria-hidden="true">
      <defs>
        <symbol id="mark-tight-weave" viewBox="0 0 140 120">
          <polygon class="cut cut--e-stem" data-cut="e-stem" points="12,16 31,12 33,104 13,108" />
          <polygon class="cut cut--t-stem" data-cut="t-stem" points="83,34 106,32 101,111 77,114" />
          <polygon class="cut cut--e-top" data-cut="e-top" points="36,13 78,9 77,31 36,34" />
          <polygon class="cut cut--e-middle" data-cut="e-middle" points="36,45 70,42 71,63 36,66" />
          <polygon class="cut cut--e-bottom" data-cut="e-bottom" points="36,80 77,77 80,100 36,103" />
          <polygon class="cut cut--t-cap" data-cut="t-cap" points="62,14 130,8 127,33 61,39" />
        </symbol>

      </defs>
    </svg>

    <header class="logo-lab__header">
      <div>
        <p class="logo-lab__eyebrow">Brand Logo · Definition Lab · Round 03</p>
        <h1>A, cut clean.<br><span>Six distinct tones.</span></h1>
      </div>
      <div class="logo-lab__intro">
        <p>
          Tight Weave survives. Its six pieces now have six distinct assignments: the five Brand
          colours plus Ink. On an Ink field, that final cut uses the explicit Ivory inverse.
        </p>
        <button type="button" @click="lightStage = !lightStage">
          {{ lightStage ? "View on ink" : "View on bone" }}
        </button>
      </div>
    </header>

    <section class="anatomy" aria-labelledby="anatomy-title">
      <header>
        <p>Construction rule</p>
        <h2 id="anatomy-title">4 × E + 2 × T</h2>
      </header>
      <ol>
        <li class="anatomy__piece anatomy__piece--e-stem"><i />E stem</li>
        <li class="anatomy__piece anatomy__piece--e-top"><i />E top tooth</li>
        <li class="anatomy__piece anatomy__piece--e-middle"><i />E middle tooth</li>
        <li class="anatomy__piece anatomy__piece--e-bottom"><i />E bottom tooth</li>
        <li class="anatomy__piece anatomy__piece--t-cap"><i />T cap</li>
        <li class="anatomy__piece anatomy__piece--t-stem"><i />T stem · Ink / Ivory</li>
      </ol>
    </section>

    <section class="logo-lab__grid" aria-label="Selected six-cut Paper Duet direction">
      <article class="concept">
        <header class="concept__header">
          <span>A</span>
          <div>
            <h2>Tight Weave</h2>
            <p>The T passes behind the E teeth.</p>
          </div>
        </header>

        <div class="concept__hero">
          <div class="paper-lockup">
            <svg viewBox="0 0 140 120" role="img" aria-label="Tight Weave six-cut ET mark">
              <use href="#mark-tight-weave" />
            </svg>
            <strong>EMOTITONE</strong>
          </div>
        </div>

        <div class="concept__proofs">
          <div>
            <span class="concept__proof-label">Compact</span>
            <div class="paper-lockup paper-lockup--compact">
              <svg viewBox="0 0 140 120" aria-hidden="true"><use href="#mark-tight-weave" /></svg>
              <strong>EMOTITONE</strong>
            </div>
          </div>
          <div class="concept__mono">
            <span class="concept__proof-label">One colour</span>
            <svg class="paper-mark paper-mark--mono" viewBox="0 0 140 120" role="img" aria-label="Tight Weave mark in one colour">
              <use href="#mark-tight-weave" />
            </svg>
          </div>
        </div>

        <p class="concept__question">Five Brand colours, one Ink neutral, and no repeated assignment.</p>
      </article>
    </section>

    <section class="context-pair" aria-label="Tight Weave background inversions">
      <article class="context-proof context-proof--bone">
        <span>On Bone · T stem is Ink</span>
        <div class="context-proof__lockup">
          <svg viewBox="0 0 140 120" role="img" aria-label="Tight Weave mark on Bone with Ink T stem">
            <use href="#mark-tight-weave" />
          </svg>
          <strong>EMOTITONE</strong>
        </div>
      </article>
      <article class="context-proof context-proof--ink">
        <span>On Ink · T stem is Ivory</span>
        <div class="context-proof__lockup">
          <svg viewBox="0 0 140 120" role="img" aria-label="Tight Weave mark on Ink with Ivory T stem">
            <use href="#mark-tight-weave" />
          </svg>
          <strong>EMOTITONE</strong>
        </div>
      </article>
    </section>

    <footer class="logo-lab__footer">
      <strong>One colour question remains.</strong>
      <span>Is Ink right on the T stem, or should it trade places with another cut?</span>
    </footer>
  </main>
</template>

<style scoped>
.logo-lab {
  --lab-stage: var(--ink);
  --lab-panel: var(--ink-2);
  --lab-wire: var(--ink-5);
  --lab-primary: var(--ivory);
  --lab-muted: var(--ivory-3);
  min-height: 100vh;
  padding: clamp(20px, 4vw, 56px);
  background: var(--lab-stage);
  color: var(--lab-primary);
}

.logo-lab--light {
  --lab-stage: var(--bone);
  --lab-panel: #e4dac2;
  --lab-wire: #b8aa8e;
  --lab-primary: var(--ink);
  --lab-muted: var(--ink-5);
}

.logo-lab__symbols {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.logo-lab__header {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(280px, .65fr);
  gap: clamp(24px, 6vw, 88px);
  width: min(1440px, 100%);
  margin: 0 auto clamp(28px, 4vw, 56px);
  align-items: end;
}

.logo-lab__eyebrow,
.logo-lab__intro p,
.anatomy p,
.anatomy li,
.concept__header > span,
.concept__header p,
.concept__proof-label,
.concept__question,
.context-proof > span,
.logo-lab__footer span {
  font-family: var(--font-mono);
}

.logo-lab__eyebrow {
  margin: 0 0 16px;
  color: var(--brass);
  font-size: 10px;
  letter-spacing: .2em;
  text-transform: uppercase;
}

.logo-lab__header h1 {
  max-width: 11ch;
  margin: 0;
  font: 700 clamp(56px, 8vw, 112px)/1.08 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.logo-lab__header h1 span { color: var(--lab-muted); }

.logo-lab__intro {
  display: grid;
  gap: 18px;
}

.logo-lab__intro p {
  margin: 0;
  color: var(--lab-muted);
  font-size: 12px;
  line-height: 1.65;
}

.logo-lab__intro button {
  width: fit-content;
  min-height: 40px;
  border: 0;
  padding: 8px 16px;
  background: var(--lab-primary);
  color: var(--lab-stage);
  cursor: pointer;
  font: 700 13px/1 var(--font-display);
  letter-spacing: .12em;
  text-transform: uppercase;
}

.anatomy {
  display: grid;
  grid-template-columns: minmax(180px, .35fr) minmax(0, 1.65fr);
  gap: 24px;
  width: min(1440px, 100%);
  margin: 0 auto clamp(20px, 2.5vw, 36px);
  padding: 18px 20px;
  border-block: 1px solid var(--lab-wire);
  align-items: center;
}

.anatomy header {
  display: flex;
  gap: 12px;
  align-items: baseline;
}

.anatomy p {
  margin: 0;
  color: var(--lab-muted);
  font-size: 9px;
  text-transform: uppercase;
}

.anatomy h2 {
  margin: 0;
  font: 700 22px/1 var(--font-display);
  text-transform: uppercase;
}

.anatomy ol {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 10px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.anatomy li {
  display: grid;
  gap: 8px;
  color: var(--lab-muted);
  font-size: 9px;
  line-height: 1.3;
}

.anatomy i {
  display: block;
  width: 100%;
  height: 12px;
  background: var(--piece-colour);
  clip-path: polygon(1% 18%, 98% 0, 96% 82%, 3% 100%);
}

.anatomy__piece--e-stem { --piece-colour: var(--pine); }
.anatomy__piece--e-top { --piece-colour: var(--mustard); }
.anatomy__piece--e-middle { --piece-colour: var(--tomato); }
.anatomy__piece--e-bottom { --piece-colour: var(--bone); }
.anatomy__piece--e-bottom i { box-shadow: inset 0 0 0 1px var(--lab-wire); }
.anatomy__piece--t-cap { --piece-colour: var(--plum); }
.anatomy__piece--t-stem { --piece-colour: var(--ink); }
.anatomy__piece--t-stem i { box-shadow: inset 0 0 0 1px var(--lab-muted); }

.logo-lab__grid {
  display: grid;
  width: min(1440px, 100%);
  margin: 0 auto;
}

.concept {
  --e-stem: var(--pine);
  --e-top: var(--mustard);
  --e-middle: var(--tomato);
  --e-bottom: var(--bone);
  --t-cap: var(--plum);
  --t-stem: var(--ink);
  display: grid;
  grid-template-rows: auto minmax(420px, 1fr) auto auto;
  min-width: 0;
  background: var(--lab-panel);
}

.logo-lab:not(.logo-lab--light) .concept { --t-stem: var(--ivory); }

.concept__header {
  display: flex;
  gap: 14px;
  min-height: 76px;
  padding: 18px 20px;
  border-bottom: 1px solid var(--lab-wire);
  align-items: baseline;
}

.concept__header > span {
  color: var(--brass);
  font-size: 10px;
}

.concept__header h2 {
  margin: 0;
  font: 700 28px/.95 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.concept__header p {
  margin: 6px 0 0;
  color: var(--lab-muted);
  font-size: 10px;
}

.concept__hero {
  display: grid;
  min-width: 0;
  padding: clamp(28px, 4vw, 56px) 20px;
  place-items: center;
}

.paper-lockup {
  display: grid;
  gap: 18px;
  justify-items: center;
}

.paper-lockup svg {
  width: clamp(210px, 22vw, 320px);
  overflow: visible;
}

.paper-lockup strong {
  color: var(--lab-primary);
  font: 700 clamp(68px, 7vw, 102px)/1 var(--font-display);
  letter-spacing: .01em;
}

.cut--e-stem { fill: var(--e-stem); }
.cut--e-top { fill: var(--e-top); }
.cut--e-middle { fill: var(--e-middle); }
.cut--e-bottom { fill: var(--e-bottom); }
.cut--t-cap { fill: var(--t-cap); }
.cut--t-stem { fill: var(--t-stem); }

.concept__proofs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  min-height: 150px;
  border-top: 1px solid var(--lab-wire);
}

.concept__proofs > div {
  display: grid;
  min-width: 0;
  padding: 16px;
  place-items: center;
}

.concept__proofs > div + div { border-left: 1px solid var(--lab-wire); }

.concept__proof-label {
  justify-self: start;
  align-self: start;
  color: var(--lab-muted);
  font-size: 8px;
  letter-spacing: .18em;
  text-transform: uppercase;
}

.paper-lockup--compact {
  display: flex;
  gap: 8px;
  align-items: center;
}

.paper-lockup--compact svg { width: 44px; }
.paper-lockup--compact strong { font-size: 22px; }

.paper-mark {
  width: 76px;
  max-height: 70px;
  overflow: visible;
}

.paper-mark--mono {
  --e-stem: currentColor;
  --e-top: currentColor;
  --e-middle: currentColor;
  --e-bottom: currentColor;
  --t-cap: currentColor;
  --t-stem: currentColor;
  color: var(--lab-primary);
}

.concept__question {
  min-height: 58px;
  margin: 0;
  padding: 16px 20px;
  border-top: 1px solid var(--lab-wire);
  color: var(--lab-muted);
  font-size: 10px;
  line-height: 1.5;
}

.context-pair {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 2vw, 28px);
  width: min(1440px, 100%);
  margin: clamp(20px, 2.5vw, 36px) auto 0;
}

.context-proof {
  --e-stem: var(--pine);
  --e-top: var(--mustard);
  --e-middle: var(--tomato);
  --e-bottom: var(--bone);
  --t-cap: var(--plum);
  display: grid;
  gap: 24px;
  min-height: 260px;
  padding: 20px;
  align-content: space-between;
}

.context-proof > span {
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.context-proof--bone {
  --t-stem: var(--ink);
  background: var(--bone);
  color: var(--ink);
}

.context-proof--ink {
  --t-stem: var(--ivory);
  background: var(--ink);
  color: var(--ivory);
}

.context-proof__lockup {
  display: flex;
  gap: clamp(16px, 3vw, 36px);
  align-items: center;
  justify-content: center;
}

.context-proof__lockup svg {
  width: clamp(110px, 12vw, 170px);
  overflow: visible;
}

.context-proof__lockup strong {
  font: 700 clamp(42px, 5vw, 72px)/1 var(--font-display);
  letter-spacing: .01em;
}

.logo-lab__footer {
  display: flex;
  gap: 14px;
  width: min(1440px, 100%);
  margin: clamp(28px, 5vw, 64px) auto 0;
  padding-top: 18px;
  border-top: 1px solid var(--lab-wire);
  align-items: baseline;
}

.logo-lab__footer strong {
  font: 700 18px/1 var(--font-display);
  letter-spacing: .08em;
  text-transform: uppercase;
}

.logo-lab__footer span {
  color: var(--lab-muted);
  font-size: 10px;
}

@media (max-width: 1080px) {
  .concept { grid-template-rows: auto minmax(320px, 1fr) auto auto; }
  .paper-lockup svg { width: clamp(180px, 30vw, 260px); }
  .paper-lockup strong { font-size: clamp(58px, 9vw, 84px); }
  .paper-lockup--compact svg { width: 44px; }
  .paper-lockup--compact strong { font-size: 24px; }
}

@media (max-width: 900px) {
  .logo-lab__header { grid-template-columns: 1fr; }
  .anatomy { grid-template-columns: 1fr; }
  .anatomy ol { grid-template-columns: repeat(3, 1fr); }
  .context-pair { grid-template-columns: 1fr; }
}

@media (max-width: 520px) {
  .logo-lab { padding: 18px 12px 32px; }
  .logo-lab__header h1 { font-size: 56px; }
  .anatomy { padding-inline: 12px; }
  .anatomy ol { grid-template-columns: repeat(2, 1fr); }
  .concept__hero { min-height: 300px; padding-inline: 16px; }
  .paper-lockup svg { width: 190px; }
  .paper-lockup strong { font-size: 54px; }
  .paper-lockup--compact svg { width: 40px; }
  .paper-lockup--compact strong { font-size: 20px; }
  .context-proof__lockup { gap: 14px; }
  .context-proof__lockup svg { width: 96px; }
  .context-proof__lockup strong { font-size: 38px; }
  .logo-lab__footer { display: grid; }
}

@media (forced-colors: active) {
  .logo-lab,
  .logo-lab--light {
    --lab-stage: Canvas;
    --lab-panel: Canvas;
    --lab-wire: CanvasText;
    --lab-primary: CanvasText;
    --lab-muted: CanvasText;
  }

  .concept,
  .context-proof {
    --e-stem: CanvasText;
    --e-top: CanvasText;
    --e-middle: CanvasText;
    --e-bottom: CanvasText;
    --t-cap: CanvasText;
    --t-stem: CanvasText;
  }
}
</style>
