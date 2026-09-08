<script setup lang="ts">
import { ref } from "vue";
import Mark from "../../components/primatives/Mark.vue";

type SprinkleTone = "bone" | "cobalt" | "mustard" | "pine" | "plum" | "tomato";
type SprinkleLocation = "inside" | "outside";

interface Sprinkle {
  name:
    | "accent"
    | "diamond"
    | "disk"
    | "eighth"
    | "grace"
    | "star"
    | "staccato"
    | "triangle"
    | "wave"
    | "zigzag";
  x: number;
  y: number;
  size: number;
  rotate: number;
  tone: SprinkleTone;
  location: SprinkleLocation;
}

interface MarkTreatment {
  id: "A" | "B" | "C" | "D";
  name: string;
  description: string;
  verdict: string;
  sprinkles: Sprinkle[];
}

const lightStage = ref(false);

const treatments: MarkTreatment[] = [
  {
    id: "A",
    name: "Balanced Scatter",
    description: "Three prints in the paper, with four loose flecks around it.",
    verdict: "Balanced inside and out; the ET silhouette stays in charge.",
    sprinkles: [
      { name: "diamond", x: 22, y: 37, size: 10, rotate: -12, tone: "bone", location: "inside" },
      { name: "wave", x: 55, y: 55, size: 19, rotate: -5, tone: "bone", location: "inside" },
      { name: "disk", x: 56, y: 90, size: 7, rotate: 0, tone: "tomato", location: "inside" },
      { name: "triangle", x: 2, y: 7, size: 11, rotate: -18, tone: "mustard", location: "outside" },
      { name: "star", x: 128, y: 0, size: 9, rotate: 12, tone: "plum", location: "outside" },
      { name: "disk", x: 148, y: 45, size: 6, rotate: 0, tone: "cobalt", location: "outside" },
      { name: "diamond", x: 132, y: 108, size: 8, rotate: 18, tone: "tomato", location: "outside" },
    ],
  },
  {
    id: "B",
    name: "Musical Orbit",
    description: "Notation lands on the cuts and continues in a loose orbit.",
    verdict: "The most explicitly musical field.",
    sprinkles: [
      { name: "eighth", x: 91, y: 69, size: 18, rotate: 4, tone: "bone", location: "inside" },
      { name: "staccato", x: 55, y: 90, size: 21, rotate: 0, tone: "pine", location: "inside" },
      { name: "accent", x: 1, y: 12, size: 14, rotate: -12, tone: "mustard", location: "outside" },
      { name: "grace", x: 130, y: -2, size: 16, rotate: 9, tone: "tomato", location: "outside" },
      { name: "disk", x: 148, y: 54, size: 6, rotate: 0, tone: "plum", location: "outside" },
      { name: "star", x: 126, y: 111, size: 9, rotate: -8, tone: "cobalt", location: "outside" },
    ],
  },
  {
    id: "C",
    name: "Confetti Halo",
    description: "Two paper prints sit inside a wider structural halo.",
    verdict: "The fullest and most celebratory scatter.",
    sprinkles: [
      { name: "wave", x: 55, y: 55, size: 19, rotate: -5, tone: "bone", location: "inside" },
      { name: "diamond", x: 91, y: 70, size: 9, rotate: 12, tone: "bone", location: "inside" },
      { name: "triangle", x: 0, y: 18, size: 11, rotate: -16, tone: "mustard", location: "outside" },
      { name: "disk", x: -4, y: 76, size: 7, rotate: 0, tone: "tomato", location: "outside" },
      { name: "zigzag", x: 40, y: -8, size: 20, rotate: -4, tone: "plum", location: "outside" },
      { name: "star", x: 116, y: -5, size: 10, rotate: 12, tone: "cobalt", location: "outside" },
      { name: "diamond", x: 146, y: 36, size: 8, rotate: 16, tone: "pine", location: "outside" },
      { name: "wave", x: 145, y: 88, size: 15, rotate: 6, tone: "mustard", location: "outside" },
    ],
  },
  {
    id: "D",
    name: "Five Satellites",
    description: "Five colour disks orbit one print, echoing the favicon constellation.",
    verdict: "The clearest bridge from the recognizable old favicon.",
    sprinkles: [
      { name: "wave", x: 55, y: 55, size: 19, rotate: -5, tone: "bone", location: "inside" },
      { name: "disk", x: 70, y: -9, size: 13, rotate: 0, tone: "plum", location: "outside" },
      { name: "disk", x: -5, y: 42, size: 9, rotate: 0, tone: "cobalt", location: "outside" },
      { name: "disk", x: 145, y: 42, size: 9, rotate: 0, tone: "mustard", location: "outside" },
      { name: "disk", x: 10, y: 107, size: 7, rotate: 0, tone: "tomato", location: "outside" },
      { name: "disk", x: 130, y: 107, size: 7, rotate: 0, tone: "pine", location: "outside" },
    ],
  },
];

function sprinkleStyle(sprinkle: Sprinkle) {
  return {
    left: `${(sprinkle.x / 140) * 100}%`,
    top: `${(sprinkle.y / 120) * 100}%`,
    width: `${(sprinkle.size / 140) * 100}%`,
    color: `var(--${sprinkle.tone})`,
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
        <p class="logo-lab__eyebrow">Brand Logo · Definition Lab · Round 06</p>
        <h1>Sprinkle Marks.<br><span>Keep the cutouts.</span></h1>
      </div>
      <div class="logo-lab__intro">
        <p>
          The six-cut Tight Weave is fixed. Every treatment now mixes Marks printed into the paper
          with Marks scattered around its silhouette; none changes the letter construction or colour assignment.
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

    <section class="logo-lab__grid" aria-label="Four Mark treatments on the selected Tight Weave logo">
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
                :name="sprinkle.name"
                tone="ivory"
                size="100"
                :data-location="sprinkle.location"
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
                  :name="sprinkle.name"
                  tone="ivory"
                  size="100"
                  :data-location="sprinkle.location"
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
      <strong>A balances the field; D preserves the favicon memory.</strong>
      <span>Which treatment has the right amount and kind of Mark language?</span>
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

.logo-lab__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
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
  grid-template-rows: auto minmax(340px, 1fr) auto auto;
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
}

.paper-lockup strong {
  color: var(--lab-primary);
  font: 700 clamp(68px, 7vw, 102px)/1 var(--font-display);
  letter-spacing: .01em;
}

.embellished-mark {
  position: relative;
  aspect-ratio: 140 / 120;
  isolation: isolate;
}

.embellished-mark > svg:first-child {
  display: block;
  width: 100%;
  height: auto;
  overflow: visible;
}

.embellished-mark__sprinkle {
  position: absolute;
  z-index: 1;
  height: auto;
  pointer-events: none;
}

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
  .logo-lab__grid { grid-template-columns: 1fr; }
}

@media (max-width: 520px) {
  .logo-lab { padding: 18px 12px 32px; }
  .logo-lab__header h1 { font-size: 56px; }
  .anatomy { padding-inline: 12px; }
  .anatomy ol { grid-template-columns: repeat(2, 1fr); }
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
