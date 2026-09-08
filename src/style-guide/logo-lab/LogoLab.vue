<script setup lang="ts">
import { ref } from "vue";
import Mark from "../../components/primatives/Mark.vue";
import type { MarkName } from "../../components/primatives/Mark.vue";

type SprinkleTone = "cobalt" | "ink" | "ivory" | "mustard" | "pine" | "plum" | "tomato";
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
  backdrop: Sprinkle[];
  sprinkles: Sprinkle[];
}

const lightStage = ref(false);

const treatments: MarkTreatment[] = [
  {
    id: "A",
    name: "Centered Cluster",
    description: "The favicon's exact five-blob hierarchy sits behind a crisp Ink E and Ivory T.",
    verdict: "Closest to the old favicon silhouette; the foreground monogram stays calm.",
    backdrop: [
      { name: "disk", x: 70, y: 25, size: 146, rotate: -8, tone: "plum", location: "outside", layer: "behind" },
      { name: "disk", x: 23, y: 62, size: 86, rotate: 9, tone: "cobalt", location: "outside", layer: "behind" },
      { name: "disk", x: 117, y: 43, size: 86, rotate: -12, tone: "mustard", location: "outside", layer: "behind" },
      { name: "disk", x: 39, y: 100, size: 66, rotate: 7, tone: "tomato", location: "outside", layer: "behind" },
      { name: "disk", x: 96, y: 102, size: 68, rotate: -6, tone: "pine", location: "outside", layer: "behind" },
    ],
    sprinkles: [
      { name: "wave", x: 54, y: 55, size: 19, rotate: -5, tone: "ivory", location: "inside", layer: "front" },
      { name: "eighth", x: 91, y: 69, size: 18, rotate: 4, tone: "ink", location: "inside", layer: "front" },
      { name: "staccato", x: 72, y: 5, size: 14, rotate: 0, tone: "ivory", location: "outside", layer: "front" },
      { name: "diamond", x: 5, y: 44, size: 13, rotate: -16, tone: "tomato", location: "outside", layer: "front" },
      { name: "grace", x: 135, y: 55, size: 17, rotate: 12, tone: "mustard", location: "outside", layer: "front" },
    ],
  },
  {
    id: "B",
    name: "Left-Leaning Cluster",
    description: "The same five blobs lean left while musical Marks pull the eye diagonally.",
    verdict: "Keeps the favicon body but gives the scatter the most rhythmic movement.",
    backdrop: [
      { name: "disk", x: 59, y: 23, size: 146, rotate: -8, tone: "plum", location: "outside", layer: "behind" },
      { name: "disk", x: 20, y: 61, size: 84, rotate: 9, tone: "cobalt", location: "outside", layer: "behind" },
      { name: "disk", x: 111, y: 43, size: 94, rotate: -12, tone: "mustard", location: "outside", layer: "behind" },
      { name: "disk", x: 35, y: 99, size: 66, rotate: 7, tone: "tomato", location: "outside", layer: "behind" },
      { name: "disk", x: 94, y: 102, size: 70, rotate: -6, tone: "pine", location: "outside", layer: "behind" },
    ],
    sprinkles: [
      { name: "whole", x: 19, y: 30, size: 17, rotate: -18, tone: "ink", location: "outside", layer: "front" },
      { name: "wave", x: 55, y: 55, size: 19, rotate: -5, tone: "ivory", location: "inside", layer: "front" },
      { name: "eighth", x: 91, y: 69, size: 18, rotate: 4, tone: "ink", location: "inside", layer: "front" },
      { name: "grace", x: 132, y: 42, size: 18, rotate: 10, tone: "tomato", location: "outside", layer: "front" },
      { name: "diamond", x: 124, y: 101, size: 13, rotate: 14, tone: "pine", location: "outside", layer: "front" },
      { name: "staccato", x: 53, y: 8, size: 13, rotate: 0, tone: "ivory", location: "outside", layer: "front" },
    ],
  },
  {
    id: "C",
    name: "Full Cluster",
    description: "A broader five-blob field lets the Ink/Ivory cuts interrupt more colour.",
    verdict: "The boldest backdrop and the loosest scatter; strongest at larger sizes.",
    backdrop: [
      { name: "disk", x: 72, y: 27, size: 160, rotate: -8, tone: "plum", location: "outside", layer: "behind" },
      { name: "disk", x: 23, y: 63, size: 94, rotate: 9, tone: "cobalt", location: "outside", layer: "behind" },
      { name: "disk", x: 117, y: 46, size: 94, rotate: -12, tone: "mustard", location: "outside", layer: "behind" },
      { name: "disk", x: 38, y: 101, size: 74, rotate: 7, tone: "tomato", location: "outside", layer: "behind" },
      { name: "disk", x: 98, y: 104, size: 76, rotate: -6, tone: "pine", location: "outside", layer: "behind" },
    ],
    sprinkles: [
      { name: "half-circle", x: 8, y: 24, size: 17, rotate: -22, tone: "ink", location: "outside", layer: "front" },
      { name: "wave", x: 55, y: 55, size: 19, rotate: -5, tone: "ivory", location: "inside", layer: "front" },
      { name: "eighth", x: 91, y: 69, size: 18, rotate: 4, tone: "ink", location: "inside", layer: "front" },
      { name: "staccato", x: 56, y: 90, size: 14, rotate: 0, tone: "ivory", location: "inside", layer: "front" },
      { name: "diamond", x: 138, y: 52, size: 13, rotate: 17, tone: "tomato", location: "outside", layer: "front" },
      { name: "grace", x: 120, y: 111, size: 17, rotate: 8, tone: "mustard", location: "outside", layer: "front" },
    ],
  },
];

function sprinkleStyle(sprinkle: Sprinkle) {
  return {
    left: `${(sprinkle.x / 140) * 100}%`,
    top: `${(sprinkle.y / 120) * 100}%`,
    width: `${(sprinkle.size / 140) * 100}%`,
    color: `var(--${sprinkle.tone})`,
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
        <p class="logo-lab__eyebrow">Brand Logo · Definition Lab · Round 08</p>
        <h1>Put the colour behind.<br><span>Let the Marks loose.</span></h1>
      </div>
      <div class="logo-lab__intro">
        <p>
          Five brand-colour blobs carry the favicon memory. The six paper cuts become one Ink E and
          one Ivory T, while abstract and musical Marks scatter across the complete lockup.
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
        <li class="anatomy__piece anatomy__piece--e-stem"><i />E stem · Ink</li>
        <li class="anatomy__piece anatomy__piece--e-top"><i />E top tooth · Ink</li>
        <li class="anatomy__piece anatomy__piece--e-middle"><i />E middle tooth · Ink</li>
        <li class="anatomy__piece anatomy__piece--e-bottom"><i />E bottom tooth · Ink</li>
        <li class="anatomy__piece anatomy__piece--t-cap"><i />T cap · Ivory</li>
        <li class="anatomy__piece anatomy__piece--t-stem"><i />T stem · Ivory</li>
      </ol>
    </section>

    <section class="favicon-memory" aria-labelledby="favicon-memory-title">
      <img src="/icon.svg" alt="Current EmotiTone favicon" width="88" height="88">
      <div>
        <p>Source memory · current favicon</p>
        <h2 id="favicon-memory-title">Five coloured blobs are the memory.</h2>
        <span>The cluster—not the arch—is the recognizable idea. Every option keeps one dominant head and four gathered colour bodies behind the ET.</span>
      </div>
    </section>

    <section class="logo-lab__grid" aria-label="Three coloured-cluster treatments on the selected Tight Weave logo">
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
              <Mark
                v-for="(blob, index) in treatment.backdrop"
                :key="`${treatment.id}-backdrop-${index}`"
                class="embellished-mark__backdrop"
                :name="blob.name"
                tone="inherit"
                size="100"
                data-location="behind"
                data-layer="backdrop"
                :style="sprinkleStyle(blob)"
                aria-hidden="true"
              />
              <svg class="embellished-mark__core" viewBox="0 0 140 120" role="img" :aria-label="`Tight Weave with ${treatment.name} treatment`">
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
                <Mark
                  v-for="(blob, index) in treatment.backdrop"
                  :key="`compact-${treatment.id}-backdrop-${index}`"
                  class="embellished-mark__backdrop"
                  :name="blob.name"
                  tone="inherit"
                  size="100"
                  data-location="behind"
                  data-layer="backdrop"
                  :style="sprinkleStyle(blob)"
                  aria-hidden="true"
                />
                <svg class="embellished-mark__core" viewBox="0 0 140 120" aria-hidden="true"><use href="#mark-tight-weave" /></svg>
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
            <span>5 × disk · {{ treatment.sprinkles.map((sprinkle) => sprinkle.name).join(" · ") }}</span>
          </div>
        </div>

        <p class="concept__question">{{ treatment.verdict }}</p>
      </article>
    </section>

    <footer class="logo-lab__footer">
      <strong>Astra recommends A · Centered Cluster.</strong>
      <span>Which coloured body and scatter makes the Ink/Ivory ET feel most like EmotiTone?</span>
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

.anatomy__piece--e-stem { --piece-colour: var(--ink); }
.anatomy__piece--e-top { --piece-colour: var(--ink); }
.anatomy__piece--e-middle { --piece-colour: var(--ink); }
.anatomy__piece--e-bottom { --piece-colour: var(--ink); }
.anatomy__piece--e-bottom i { box-shadow: inset 0 0 0 1px var(--lab-wire); }
.anatomy__piece--t-cap { --piece-colour: var(--ivory); }
.anatomy__piece--t-stem { --piece-colour: var(--ivory); }
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
  --e-stem: var(--ink);
  --e-top: var(--ink);
  --e-middle: var(--ink);
  --e-bottom: var(--ink);
  --t-cap: var(--ivory);
  --t-stem: var(--ivory);
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
  margin-block: clamp(88px, 7vw, 108px) clamp(36px, 3vw, 48px);
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

.embellished-mark__core {
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

.embellished-mark__backdrop {
  position: absolute;
  z-index: 0;
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
