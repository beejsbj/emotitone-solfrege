<script setup lang="ts">
import { ref } from "vue";
import Mark from "../../components/primatives/Mark.vue";
import type { MarkName } from "../../components/primatives/Mark.vue";

type SprinkleTone = "bone" | "cobalt" | "mustard" | "pine" | "plum" | "stage" | "tomato";
type SprinkleLocation = "inside" | "outside";
type SprinkleLayer = "behind" | "front";

interface Sprinkle {
  name: MarkName;
  x: number;
  y: number;
  size: number;
  rotate: number;
  tone: SprinkleTone;
  location: SprinkleLocation;
  layer: SprinkleLayer;
  opacity?: number;
}

interface MarkTreatment {
  id: "A" | "B" | "C";
  name: string;
  description: string;
  verdict: string;
  sprinkles: Sprinkle[];
}

const lightStage = ref(false);

const treatments: MarkTreatment[] = [
  {
    id: "A",
    name: "Gathered Crown",
    description: "A compact favicon body crowns the ET; abstract and musical prints live inside.",
    verdict: "Best balance of favicon memory, paper overlap, and ET readability.",
    sprinkles: [
      { name: "disk", x: 68, y: -2, size: 50, rotate: -8, tone: "plum", location: "outside", layer: "behind", opacity: .88 },
      { name: "half-circle", x: 37, y: 14, size: 27, rotate: -25, tone: "cobalt", location: "outside", layer: "behind", opacity: .9 },
      { name: "eighth", x: 112, y: -1, size: 29, rotate: 14, tone: "mustard", location: "outside", layer: "front" },
      { name: "diamond", x: 5, y: 43, size: 15, rotate: -16, tone: "tomato", location: "outside", layer: "front" },
      { name: "disk", x: 133, y: 44, size: 17, rotate: 8, tone: "pine", location: "outside", layer: "behind", opacity: .9 },
      { name: "wave", x: 54, y: 55, size: 19, rotate: -5, tone: "bone", location: "inside", layer: "front" },
      { name: "eighth", x: 91, y: 69, size: 18, rotate: 4, tone: "bone", location: "inside", layer: "front" },
      { name: "slur", x: 72, y: 121, size: 84, rotate: 0, tone: "stage", location: "outside", layer: "front", opacity: .8 },
    ],
  },
  {
    id: "B",
    name: "Offbeat Bouquet",
    description: "The favicon body leans left and falls through a musical diagonal.",
    verdict: "The most expressive and rhythmically active option.",
    sprinkles: [
      { name: "disk", x: 47, y: -1, size: 48, rotate: 9, tone: "plum", location: "outside", layer: "behind", opacity: .86 },
      { name: "whole", x: 15, y: 20, size: 29, rotate: -24, tone: "cobalt", location: "outside", layer: "front", opacity: .95 },
      { name: "half-circle", x: 86, y: -1, size: 26, rotate: 22, tone: "mustard", location: "outside", layer: "behind", opacity: .88 },
      { name: "grace", x: 130, y: 29, size: 22, rotate: 13, tone: "tomato", location: "outside", layer: "front" },
      { name: "diamond", x: 139, y: 62, size: 15, rotate: 16, tone: "pine", location: "outside", layer: "front" },
      { name: "diamond", x: 22, y: 38, size: 9, rotate: -12, tone: "bone", location: "inside", layer: "front" },
      { name: "eighth", x: 91, y: 69, size: 18, rotate: 4, tone: "bone", location: "inside", layer: "front" },
      { name: "wave", x: 54, y: 55, size: 18, rotate: -5, tone: "bone", location: "inside", layer: "front" },
      { name: "slur", x: 76, y: 122, size: 80, rotate: -5, tone: "stage", location: "outside", layer: "front", opacity: .8 },
    ],
  },
  {
    id: "C",
    name: "Close Embrace",
    description: "The strongest large-head body hugs the paper cuts above a broad arch.",
    verdict: "The fullest and most faithful compositional translation.",
    sprinkles: [
      { name: "disk", x: 76, y: -4, size: 52, rotate: -7, tone: "plum", location: "outside", layer: "behind", opacity: .88 },
      { name: "half-circle", x: 40, y: 12, size: 28, rotate: -28, tone: "cobalt", location: "outside", layer: "behind", opacity: .92 },
      { name: "whole", x: 118, y: 5, size: 30, rotate: 20, tone: "mustard", location: "outside", layer: "front", opacity: .95 },
      { name: "diamond", x: 4, y: 51, size: 16, rotate: -12, tone: "tomato", location: "outside", layer: "front" },
      { name: "eighth", x: 140, y: 48, size: 21, rotate: 9, tone: "pine", location: "outside", layer: "front" },
      { name: "wave", x: 55, y: 55, size: 19, rotate: -5, tone: "bone", location: "inside", layer: "front" },
      { name: "eighth", x: 91, y: 69, size: 18, rotate: 4, tone: "bone", location: "inside", layer: "front" },
      { name: "disk", x: 56, y: 90, size: 7, rotate: 0, tone: "tomato", location: "inside", layer: "front" },
      { name: "slur", x: 72, y: 120, size: 94, rotate: 0, tone: "stage", location: "outside", layer: "front", opacity: .75 },
    ],
  },
];

function sprinkleStyle(sprinkle: Sprinkle) {
  return {
    left: `${(sprinkle.x / 140) * 100}%`,
    top: `${(sprinkle.y / 120) * 100}%`,
    width: `${(sprinkle.size / 140) * 100}%`,
    color: sprinkle.tone === "stage" ? "var(--lab-primary)" : `var(--${sprinkle.tone})`,
    opacity: sprinkle.opacity ?? 1,
    transform: `translate(-50%, -50%) rotate(${sprinkle.rotate}deg)`,
  };
}
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
        <p class="logo-lab__eyebrow">Brand Logo · Definition Lab · Round 07</p>
        <h1>Gather the Marks.<br><span>Remember the favicon.</span></h1>
      </div>
      <div class="logo-lab__intro">
        <p>
          A's abstract flecks and B's musical glyphs now work together. Each treatment rebuilds the
          favicon's dominant head, smaller clustered body, paper overlap, and pale upward arch.
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
        <li class="anatomy__piece anatomy__piece--t-stem"><i />T stem · Cobalt</li>
      </ol>
    </section>

    <section class="favicon-memory" aria-labelledby="favicon-memory-title">
      <img src="/icon.svg" alt="Current EmotiTone favicon" width="88" height="88">
      <div>
        <p>Source memory · current favicon</p>
        <h2 id="favicon-memory-title">One dominant blob + four smaller forms + an upward arch.</h2>
        <span>Its recognition comes from hierarchy and gathering—not merely five circles. All three options translate that composition through real Marks.</span>
      </div>
    </section>

    <section class="logo-lab__grid" aria-label="Three favicon-informed Mark treatments on the selected Tight Weave logo">
      <article v-for="treatment in treatments" :key="treatment.id" class="concept">
        <header class="concept__header">
          <span>{{ treatment.id }}</span>
          <div>
            <h2>{{ treatment.name }}</h2>
            <p>{{ treatment.description }}</p>
          </div>
        </header>

        <div class="concept__hero">
          <div class="paper-lockup">
            <div class="embellished-mark">
              <svg viewBox="0 0 140 120" role="img" :aria-label="`Tight Weave with ${treatment.name} treatment`">
                <use href="#mark-tight-weave" />
              </svg>
              <Mark
                v-for="(sprinkle, index) in treatment.sprinkles"
                :key="`${treatment.id}-${sprinkle.name}-${index}`"
                class="embellished-mark__sprinkle"
                :class="`embellished-mark__sprinkle--${sprinkle.layer}`"
                :name="sprinkle.name"
                tone="inherit"
                size="100"
                :data-location="sprinkle.location"
                :data-layer="sprinkle.layer"
                :style="sprinkleStyle(sprinkle)"
              />
            </div>
            <strong>EMOTITONE</strong>
          </div>
        </div>

        <div class="concept__proofs">
          <div class="concept__compact-proof">
            <span class="concept__proof-label">Compact survival</span>
            <div class="paper-lockup paper-lockup--compact">
              <div class="embellished-mark">
                <svg viewBox="0 0 140 120" aria-hidden="true"><use href="#mark-tight-weave" /></svg>
                <Mark
                  v-for="(sprinkle, index) in treatment.sprinkles"
                  :key="`compact-${treatment.id}-${sprinkle.name}-${index}`"
                  class="embellished-mark__sprinkle"
                  :class="`embellished-mark__sprinkle--${sprinkle.layer}`"
                  :name="sprinkle.name"
                  tone="inherit"
                  size="100"
                  :data-location="sprinkle.location"
                  :data-layer="sprinkle.layer"
                  :style="sprinkleStyle(sprinkle)"
                  aria-hidden="true"
                />
              </div>
              <strong>EMOTITONE</strong>
            </div>
          </div>
          <div class="concept__mark-list">
            <span class="concept__proof-label">Marks used</span>
            <span>{{ treatment.sprinkles.map((sprinkle) => sprinkle.name).join(" · ") }}</span>
          </div>
        </div>

        <p class="concept__question">{{ treatment.verdict }}</p>
      </article>
    </section>

    <footer class="logo-lab__footer">
      <strong>Astra recommends A · Gathered Crown.</strong>
      <span>Which cluster carries the old recognition without overwhelming the new ET?</span>
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
.anatomy__piece--t-stem { --piece-colour: var(--cobalt); }
.anatomy__piece--t-stem i { box-shadow: inset 0 0 0 1px var(--lab-muted); }

.favicon-memory {
  display: flex;
  gap: 20px;
  width: min(1440px, 100%);
  margin: 0 auto clamp(20px, 2.5vw, 36px);
  padding: 16px 20px;
  background: var(--lab-panel);
  align-items: center;
}

.favicon-memory img {
  width: 88px;
  height: 88px;
  flex: 0 0 auto;
}

.favicon-memory div {
  display: grid;
  gap: 7px;
}

.favicon-memory p,
.favicon-memory span {
  margin: 0;
  font-family: var(--font-mono);
}

.favicon-memory p {
  color: var(--brass);
  font-size: 9px;
  letter-spacing: .16em;
  text-transform: uppercase;
}

.favicon-memory h2 {
  margin: 0;
  font: 700 22px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.favicon-memory span {
  max-width: 76ch;
  color: var(--lab-muted);
  font-size: 10px;
  line-height: 1.5;
}

.logo-lab__grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: clamp(16px, 2vw, 28px);
  width: min(1440px, 100%);
  margin: 0 auto;
}

.concept {
  --e-stem: var(--pine);
  --e-top: var(--mustard);
  --e-middle: var(--tomato);
  --e-bottom: var(--bone);
  --t-cap: var(--plum);
  --t-stem: var(--cobalt);
  display: grid;
  grid-template-rows: auto minmax(420px, 1fr) auto auto;
  min-width: 0;
  background: var(--lab-panel);
}

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

.paper-lockup > .embellished-mark {
  width: clamp(210px, 22vw, 320px);
  margin-block: clamp(30px, 3vw, 44px) clamp(42px, 4vw, 60px);
}

.paper-lockup strong {
  color: var(--lab-primary);
  font: 700 clamp(54px, 5vw, 76px)/1 var(--font-display);
  letter-spacing: .01em;
}

.embellished-mark {
  position: relative;
  aspect-ratio: 140 / 120;
  isolation: isolate;
}

.embellished-mark > svg:first-child {
  position: relative;
  z-index: 1;
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.embellished-mark__sprinkle {
  position: absolute;
  height: auto;
  pointer-events: none;
}

.embellished-mark__sprinkle--behind { z-index: 0; }
.embellished-mark__sprinkle--front { z-index: 2; }

.cut--e-stem { fill: var(--e-stem); }
.cut--e-top { fill: var(--e-top); }
.cut--e-middle { fill: var(--e-middle); }
.cut--e-bottom { fill: var(--e-bottom); }
.cut--t-cap { fill: var(--t-cap); }
.cut--t-stem { fill: var(--t-stem); }

.concept__proofs {
  display: grid;
  grid-template-columns: 1.25fr .75fr;
  min-height: 132px;
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

.paper-lockup--compact .embellished-mark {
  width: 44px;
  margin-block: 7px 10px;
  flex: 0 0 auto;
}

.paper-lockup--compact strong { font-size: 22px; }

.concept__compact-proof {
  gap: 10px;
}

.concept__mark-list {
  align-content: space-between;
  justify-items: start !important;
}

.concept__mark-list > span:last-child {
  color: var(--lab-primary);
  font: 700 11px/1.5 var(--font-display);
  letter-spacing: .08em;
  text-transform: uppercase;
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

@media (max-width: 1200px) {
  .logo-lab__grid { grid-template-columns: 1fr; }
}

@media (max-width: 1080px) {
  .concept { grid-template-rows: auto minmax(320px, 1fr) auto auto; }
  .paper-lockup > .embellished-mark { width: clamp(180px, 30vw, 260px); }
  .paper-lockup strong { font-size: clamp(58px, 9vw, 84px); }
  .paper-lockup--compact .embellished-mark { width: 44px; }
  .paper-lockup--compact strong { font-size: 24px; }
}

@media (max-width: 900px) {
  .logo-lab__header { grid-template-columns: 1fr; }
  .anatomy { grid-template-columns: 1fr; }
  .anatomy ol { grid-template-columns: repeat(3, 1fr); }
}

@media (max-width: 520px) {
  .logo-lab { padding: 18px 12px 32px; }
  .logo-lab__header h1 { font-size: 56px; }
  .anatomy { padding-inline: 12px; }
  .anatomy ol { grid-template-columns: repeat(2, 1fr); }
  .favicon-memory { align-items: flex-start; padding-inline: 12px; }
  .favicon-memory img { width: 64px; height: 64px; }
  .concept__hero { min-height: 300px; padding-inline: 16px; }
  .paper-lockup > .embellished-mark { width: 190px; }
  .paper-lockup strong { font-size: 54px; }
  .paper-lockup--compact .embellished-mark { width: 40px; }
  .paper-lockup--compact strong { font-size: 20px; }
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

  .concept {
    --e-stem: CanvasText;
    --e-top: CanvasText;
    --e-middle: CanvasText;
    --e-bottom: CanvasText;
    --t-cap: CanvasText;
    --t-stem: CanvasText;
  }
}
</style>
