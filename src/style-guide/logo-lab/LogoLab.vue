<script setup lang="ts">
import { ref } from "vue";

const lightStage = ref(false);
</script>

<template>
  <main class="logo-lab" :class="{ 'logo-lab--light': lightStage }">
    <svg class="logo-lab__symbols" aria-hidden="true">
      <defs>
        <symbol id="mark-open-bell" viewBox="0 0 120 96">
          <path
            fill="currentColor"
            fill-rule="evenodd"
            d="M8 40 41 31C60 26 79 18 104 4l8 80C82 72 62 65 41 62L8 57Zm29 4 43-13 2 18-45-2Z"
            clip-rule="evenodd"
          />
          <path fill="currentColor" d="m7 37 31-8 4 36-31-6Z" />
          <path fill="currentColor" d="m15 59 13 2-5 25H10Z" />
        </symbol>

        <symbol id="mark-paper-duet" viewBox="0 0 104 104">
          <path
            class="paper-duet__e"
            fill="var(--paper-duet-e, currentColor)"
            d="M7 10 58 6l2 20-30 2 1 12 24-2 2 19-24 2 1 16 31-3 2 22-55 4Z"
          />
          <path
            class="paper-duet__t"
            fill="var(--paper-duet-t, currentColor)"
            d="m42 14 56-8-1 24-16 2 6 62-24 4-6-62-15 2Z"
          />
        </symbol>

        <symbol id="mark-resonance" viewBox="0 0 128 92">
          <path fill="var(--resonance-source, currentColor)" d="m7 46 18-18 18 18-18 18Z" />
          <path fill="currentColor" d="M48 31c11 8 11 22 0 30l7 8c19-13 19-37 0-49Z" />
          <path fill="currentColor" d="M65 19c19 15 19 39 0 54l8 9c29-21 29-57 0-78Z" />
          <path fill="currentColor" d="M83 9c26 23 26 51 1 73l8 8c35-29 35-63 0-90Z" />
        </symbol>
      </defs>
    </svg>

    <header class="logo-lab__header">
      <div>
        <p class="logo-lab__eyebrow">Brand Logo · Definition Lab · Round 01</p>
        <h1>Four new identities.<br><span>Nothing accepted yet.</span></h1>
      </div>
      <div class="logo-lab__intro">
        <p>
          Judge the silhouette and the relationship between mark and name. Each direction gets the
          same large, compact, and one-colour proofs; staging belongs to this lab, not the logo.
        </p>
        <button type="button" @click="lightStage = !lightStage">
          {{ lightStage ? "View on ink" : "View on bone" }}
        </button>
      </div>
    </header>

    <section class="logo-lab__grid" aria-label="Four Brand Logo directions">
      <article class="concept concept--offbeat">
        <header class="concept__header">
          <span>01</span>
          <div>
            <h2>Offbeat</h2>
            <p>The name becomes a syncopated poster.</p>
          </div>
        </header>

        <div class="concept__hero">
          <div class="offbeat-lockup" aria-label="EmotiTone">
            <span class="offbeat-lockup__top">EMOTI</span>
            <span class="offbeat-lockup__bottom"><i aria-hidden="true" />TONE</span>
          </div>
        </div>

        <div class="concept__proofs">
          <div>
            <span class="concept__proof-label">Compact</span>
            <div class="offbeat-lockup offbeat-lockup--compact" aria-label="EmotiTone">
              <span class="offbeat-lockup__top">EMOTI</span>
              <span class="offbeat-lockup__bottom"><i aria-hidden="true" />TONE</span>
            </div>
          </div>
          <div class="concept__mono">
            <span class="concept__proof-label">One colour</span>
            <div class="offbeat-lockup offbeat-lockup--mark" aria-label="ET monogram">
              <span class="offbeat-lockup__top">E</span>
              <span class="offbeat-lockup__bottom"><i aria-hidden="true" />T</span>
            </div>
          </div>
        </div>

        <p class="concept__question">Does splitting the name feel musical—or merely broken?</p>
      </article>

      <article class="concept concept--bell">
        <header class="concept__header">
          <span>02</span>
          <div>
            <h2>Open Bell</h2>
            <p>An instrument-shaped “e” opens into sound.</p>
          </div>
        </header>

        <div class="concept__hero">
          <div class="bell-lockup">
            <svg viewBox="0 0 120 96" role="img" aria-label="Open bell mark"><use href="#mark-open-bell" /></svg>
            <div>
              <strong>EMOTITONE</strong>
              <span>PLAY WHAT YOU FEEL</span>
            </div>
          </div>
        </div>

        <div class="concept__proofs">
          <div>
            <span class="concept__proof-label">Compact</span>
            <div class="bell-lockup bell-lockup--compact">
              <svg viewBox="0 0 120 96" aria-hidden="true"><use href="#mark-open-bell" /></svg>
              <strong>EMOTITONE</strong>
            </div>
          </div>
          <div class="concept__mono">
            <span class="concept__proof-label">One colour</span>
            <svg class="concept__solo-mark" viewBox="0 0 120 96" role="img" aria-label="Open bell mark in one colour"><use href="#mark-open-bell" /></svg>
          </div>
        </div>

        <p class="concept__question">Is an instrument mark ownable—or too specific for the whole product?</p>
      </article>

      <article class="concept concept--duet">
        <header class="concept__header">
          <span>03</span>
          <div>
            <h2>Paper Duet</h2>
            <p>Two cut forms make one imperfect ET.</p>
          </div>
        </header>

        <div class="concept__hero">
          <div class="duet-lockup">
            <svg viewBox="0 0 104 104" role="img" aria-label="Interlocking E and T mark"><use href="#mark-paper-duet" /></svg>
            <strong>EMOTITONE</strong>
          </div>
        </div>

        <div class="concept__proofs">
          <div>
            <span class="concept__proof-label">Compact</span>
            <div class="duet-lockup duet-lockup--compact">
              <svg viewBox="0 0 104 104" aria-hidden="true"><use href="#mark-paper-duet" /></svg>
              <strong>EMOTITONE</strong>
            </div>
          </div>
          <div class="concept__mono">
            <span class="concept__proof-label">One colour</span>
            <svg class="concept__solo-mark paper-duet--mono" viewBox="0 0 104 104" role="img" aria-label="ET mark in one colour"><use href="#mark-paper-duet" /></svg>
          </div>
        </div>

        <p class="concept__question">Does the emblem read as ET before it reads as collage?</p>
      </article>

      <article class="concept concept--resonance">
        <header class="concept__header">
          <span>04</span>
          <div>
            <h2>Resonance</h2>
            <p>Feeling leaves a small source and fills the room.</p>
          </div>
        </header>

        <div class="concept__hero">
          <div class="resonance-lockup">
            <svg viewBox="0 0 128 92" role="img" aria-label="Expanding resonance mark"><use href="#mark-resonance" /></svg>
            <strong>EMOTITONE</strong>
          </div>
        </div>

        <div class="concept__proofs">
          <div>
            <span class="concept__proof-label">Compact</span>
            <div class="resonance-lockup resonance-lockup--compact">
              <svg viewBox="0 0 128 92" aria-hidden="true"><use href="#mark-resonance" /></svg>
              <strong>EMOTITONE</strong>
            </div>
          </div>
          <div class="concept__mono">
            <span class="concept__proof-label">One colour</span>
            <svg class="concept__solo-mark" viewBox="0 0 128 92" role="img" aria-label="Resonance mark in one colour"><use href="#mark-resonance" /></svg>
          </div>
        </div>

        <p class="concept__question">Does the signal feel emotional and musical—or too much like broadcast?</p>
      </article>
    </section>

    <footer class="logo-lab__footer">
      <strong>Choose by number.</strong>
      <span>Tell me what survives, what dies, and what you want crossed between directions.</span>
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
  margin: 0 auto clamp(32px, 5vw, 72px);
  align-items: end;
}

.logo-lab__eyebrow,
.concept__header > span,
.concept__header p,
.concept__proof-label,
.concept__question,
.logo-lab__intro p,
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
  max-width: 13ch;
  margin: 0;
  font: 700 clamp(48px, 7vw, 96px)/1.12 var(--font-display);
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

.logo-lab__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: clamp(16px, 2.5vw, 36px);
  width: min(1440px, 100%);
  margin: 0 auto;
}

.concept {
  display: grid;
  grid-template-rows: auto minmax(340px, 1fr) auto auto;
  min-width: 0;
  background: var(--lab-panel);
}

.concept__header {
  display: flex;
  gap: 16px;
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
  padding: clamp(28px, 5vw, 72px) 24px;
  place-items: center;
}

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

.concept__mono { color: var(--lab-primary); }

.concept__question {
  min-height: 58px;
  margin: 0;
  padding: 16px 20px;
  border-top: 1px solid var(--lab-wire);
  color: var(--lab-muted);
  font-size: 10px;
  line-height: 1.5;
}

.concept__solo-mark {
  width: 76px;
  max-height: 70px;
  color: currentColor;
}

.offbeat-lockup {
  display: grid;
  width: min-content;
  color: var(--lab-primary);
  font: 700 clamp(78px, 8vw, 126px)/.67 var(--font-display);
  letter-spacing: -.015em;
  text-transform: uppercase;
}

.offbeat-lockup__bottom {
  display: flex;
  gap: .08em;
  margin-left: .46em;
  align-items: center;
}

.offbeat-lockup__bottom i {
  width: .25em;
  height: .25em;
  background: var(--tomato);
  clip-path: var(--clip-tile);
  transform: rotate(-7deg);
}

.offbeat-lockup--compact {
  font-size: 38px;
}

.offbeat-lockup--mark {
  font-size: 48px;
}

.concept__mono .offbeat-lockup__bottom i { background: currentColor; }

.bell-lockup,
.duet-lockup,
.resonance-lockup {
  display: flex;
  align-items: center;
}

.bell-lockup { gap: clamp(16px, 2vw, 24px); }
.bell-lockup svg { width: clamp(104px, 10vw, 140px); color: var(--brass); transform: rotate(-3deg); }
.bell-lockup > div { display: grid; gap: 20px; }
.bell-lockup strong,
.duet-lockup strong,
.resonance-lockup strong {
  color: var(--lab-primary);
  font: 700 clamp(52px, 7vw, 94px)/1 var(--font-display);
  letter-spacing: .01em;
}

.bell-lockup strong { font-size: clamp(46px, 4.6vw, 64px); }

.bell-lockup span {
  color: var(--lab-muted);
  font: 600 10px/1 var(--font-mono);
  letter-spacing: .23em;
}

.bell-lockup--compact { gap: 10px; }
.bell-lockup--compact svg { width: 46px; }
.bell-lockup--compact strong { font-size: 28px; }

.duet-lockup {
  flex-direction: column;
  gap: 16px;
}

.duet-lockup svg { width: clamp(130px, 18vw, 220px); }
.duet-lockup svg {
  --paper-duet-e: var(--bone);
  --paper-duet-t: var(--plum);
}
.logo-lab--light .duet-lockup svg { --paper-duet-e: var(--ink); }
.duet-lockup strong { font-size: clamp(56px, 7vw, 96px); }

.duet-lockup--compact {
  flex-direction: row;
  gap: 10px;
}

.duet-lockup--compact svg { width: 48px; }
.duet-lockup--compact strong { font-size: 28px; }
.paper-duet--mono {
  --paper-duet-e: currentColor;
  --paper-duet-t: currentColor;
  color: currentColor;
}

.resonance-lockup {
  flex-direction: column;
  gap: 22px;
}

.resonance-lockup svg {
  --resonance-source: var(--mustard);
  width: clamp(150px, 20vw, 260px);
  color: var(--lab-primary);
}
.resonance-lockup strong { font-size: clamp(64px, 8vw, 108px); }

.resonance-lockup--compact {
  flex-direction: row;
  gap: 12px;
}

.resonance-lockup--compact svg { width: 56px; }
.resonance-lockup--compact strong { font-size: 28px; }
.concept__mono .concept__solo-mark { --resonance-source: currentColor; }

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

@media (max-width: 900px) {
  .logo-lab__header,
  .logo-lab__grid { grid-template-columns: 1fr; }
  .concept { grid-template-rows: auto minmax(300px, 1fr) auto auto; }
}

@media (max-width: 520px) {
  .logo-lab { padding: 18px 12px 32px; }
  .logo-lab__header h1 { font-size: 44px; }
  .concept__hero { min-height: 280px; padding-inline: 16px; }
  .offbeat-lockup { font-size: 68px; }
  .bell-lockup { flex-direction: column; text-align: center; }
  .bell-lockup strong { font-size: 48px; }
  .duet-lockup strong,
  .resonance-lockup strong { font-size: 54px; }
  .bell-lockup--compact strong,
  .duet-lockup--compact strong,
  .resonance-lockup--compact strong { font-size: 22px; }
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

  .offbeat-lockup__bottom i,
  .concept svg { color: CanvasText; background: CanvasText; }
}
</style>
