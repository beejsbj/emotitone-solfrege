<template>
  <main class="rough-page">
    <header class="masthead">
      <div>
        <p class="eyebrow">Visual rough · definition only</p>
        <h1>Kicker × Marks × Beat × Particles</h1>
      </div>
      <div class="status">Not accepted</div>
    </header>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="section-number">01 · The shared question</p>
        <h2 id="hero-title">One vocabulary.<br>Four different jobs.</h2>
        <p>
          Kicker names a section. Marks decorate. Beat Indicator tells time. Stage particles
          leave a trace of a played note. This page tests family resemblance without pretending
          those jobs are interchangeable.
        </p>
      </div>

      <div class="hero-field" aria-label="Marks surrounding the current Beat Indicator">
        <div class="hero-mark hero-mark--triangle"><Mark name="triangle" tone="brass" size="88" /></div>
        <div class="hero-mark hero-mark--wave"><Mark name="wave" tone="pine" size="72" /></div>
        <div class="hero-mark hero-mark--diamond"><Mark name="diamond" tone="tomato" size="52" /></div>
        <div class="hero-mark hero-mark--star"><Mark name="star" tone="mustard" size="46" /></div>
        <div class="hero-beat">
          <span>Current source</span>
          <BeatIndicator size="lg" aria-label="Current four beat indicator" />
        </div>
      </div>
    </section>

    <section class="section-block" aria-labelledby="sources-title">
      <div class="section-heading">
        <p class="section-number">02 · Source check</p>
        <h2 id="sources-title">What exists now</h2>
        <p>These are real source seams, not redrawn stand-ins.</p>
      </div>

      <div class="source-grid">
        <article class="source-card">
          <div class="source-card__topline"><span>Guide only</span><strong>Mark</strong></div>
          <div class="mark-run" aria-label="Current structural Mark family">
            <Mark name="triangle" tone="brass" size="48" />
            <Mark name="disk" tone="tomato" size="48" />
            <Mark name="zigzag" tone="ivory" size="62" />
            <Mark name="diamond" tone="mustard" size="44" />
            <Mark name="star" tone="pine" size="46" />
          </div>
          <p>Flat, cut-paper SVG silhouettes. Twenty names currently share one public primitive.</p>
        </article>

        <article class="source-card">
          <div class="source-card__topline"><span>Guide only</span><strong>Beat Indicator</strong></div>
          <div class="beat-stack">
            <BeatIndicator :beats="4" aria-label="Four beat current indicator" />
            <BeatIndicator :beats="3" size="sm" aria-label="Three beat current indicator" />
            <BeatIndicator :beats="6" size="sm" aria-label="Six beat current indicator" />
          </div>
          <p>Outlined square cells run their own CSS loop. Brass marks beat one; timing is not transport-linked.</p>
        </article>

        <article class="source-card">
          <div class="source-card__topline"><span>Guide only</span><strong>Kicker</strong></div>
          <div class="kicker-stack" aria-label="Current Kicker variants">
            <Kicker tone="tomato">Section · 03</Kicker>
            <Kicker tone="brass">Live · 01</Kicker>
            <Kicker tone="open">Waiting · 04</Kicker>
            <Kicker tone="plum" dot="bar-h">Particles</Kicker>
          </div>
          <p>A mono section label with one tiny color-bearing dot or bar. Its real structural relationship is currently Kicker → Spine Card.</p>
        </article>

        <article class="source-card source-card--canvas">
          <div class="source-card__topline"><span>Production Stage</span><strong>Particles · native 2–6px</strong></div>
          <StageParticleSample />
          <p>The real canvas particle source: note-colored circle, star, diamond, sparkle, and mist.</p>
        </article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="directions-title">
      <div class="section-heading">
        <p class="section-number">03 · Rough directions</p>
        <h2 id="directions-title">What should the beat feel like?</h2>
        <p>Three route-local hypotheses. None changes the source component yet.</p>
      </div>

      <div class="direction-grid">
        <article class="direction-card direction-card--current">
          <div class="direction-index">A</div>
          <div class="direction-stage">
            <div class="direction-lockup">
              <Kicker tone="brass">Live · 4/4</Kicker>
              <BeatIndicator size="lg" aria-label="Existing instrument square direction" />
            </div>
          </div>
          <h3>Instrument squares</h3>
          <p>Precise, quiet, metronomic. Strongest time signal; least related to the poster marks.</p>
        </article>

        <article class="direction-card direction-card--paper">
          <div class="direction-index">B</div>
          <div class="direction-stage">
            <div class="direction-lockup">
              <Kicker tone="tomato">Measure · 04</Kicker>
              <div class="paper-beats" role="img" aria-label="Four beat cut-paper disk hypothesis">
                <Mark
                  v-for="beat in 4"
                  :key="beat"
                  name="disk"
                  :tone="beat === 1 ? 'brass' : 'ivory'"
                  size="34"
                  :style="{ '--rough-beat-delay': `calc(-2s * ${beat - 1} / 4)` }"
                />
              </div>
            </div>
          </div>
          <h3>Paper pulse</h3>
          <p>One repeated cut silhouette joins the poster family while preserving count and downbeat.</p>
        </article>

        <article class="direction-card direction-card--filled">
          <div class="direction-index">C</div>
          <div class="direction-stage">
            <div class="direction-lockup">
              <Kicker tone="open">Waiting · 04</Kicker>
              <div class="filled-beats" role="img" aria-label="Four beat dim-filled square hypothesis">
                <i v-for="beat in 4" :key="beat" :class="{ downbeat: beat === 1 }" :style="{ '--rough-beat-delay': `calc(-2s * ${beat - 1} / 4)` }"></i>
              </div>
            </div>
          </div>
          <h3>Quiet filled blocks</h3>
          <p>Still instrumental, but removes the default outline and glow. Calmer at rest; heavier as a row.</p>
        </article>
      </div>
    </section>

    <section class="section-block shape-bridge" aria-labelledby="bridge-title">
      <div class="section-heading">
        <p class="section-number">04 · Stage relationship</p>
        <h2 id="bridge-title">Shared names are not yet shared geometry</h2>
        <p>
          Mark and particles both say “circle”, “star”, and “diamond”, but draw different contours.
          Judge the native field before deciding if geometry deserves a common lower owner.
        </p>
      </div>

      <div class="bridge-grid">
        <article class="bridge-card bridge-card--marks">
          <div class="bridge-label">SVG Mark source · enlarged</div>
          <div class="bridge-shapes">
            <div><Mark name="disk" tone="ivory" size="76" /><span>disk</span></div>
            <div><Mark name="star" tone="ivory" size="76" /><span>star</span></div>
            <div><Mark name="diamond" tone="ivory" size="76" /><span>diamond</span></div>
          </div>
        </article>

        <article class="bridge-card bridge-card--particles">
          <div class="bridge-label">Real particle renderer · 4× loupe</div>
          <StageParticleSample :scale="4" :burst-count="5" />
        </article>
      </div>
    </section>

    <footer>
      <p class="section-number">Decision frontier</p>
      <p>
        Pick the beat direction first. Then decide whether Kicker and Stage should inherit a small
        structural subset from Marks—or remain deliberately more elemental at their native sizes.
      </p>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import BeatIndicator from "@/components/primatives/BeatIndicator.vue";
import Kicker from "@/components/primatives/Kicker.vue";
import Mark from "@/components/primatives/Mark.vue";
import StageParticleSample from "./StageParticleSample.vue";

onMounted(() => document.body.classList.add("rough-page-route"));
onUnmounted(() => document.body.classList.remove("rough-page-route"));
</script>

<style scoped>
.rough-page {
  min-height: 100vh;
  padding: clamp(18px, 4vw, 56px);
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px) 0 0 / 42px 42px,
    linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px) 0 0 / 42px 42px,
    var(--ink);
  color: var(--ivory);
  font-family: var(--font-body);
}

.masthead,
.hero,
.section-block,
footer {
  width: min(1180px, 100%);
  margin-inline: auto;
}

.masthead {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
  padding-bottom: 18px;
  border-bottom: 1px solid var(--ink-5);
}

h1,
h2,
h3,
p {
  margin: 0;
}

h1,
h2,
h3 {
  font-family: var(--font-display);
  font-weight: 700;
}

h1 {
  font-size: clamp(28px, 5vw, 58px);
  line-height: 0.88;
  letter-spacing: -0.025em;
}

h2 {
  font-size: clamp(34px, 6vw, 74px);
  line-height: 0.87;
  letter-spacing: -0.035em;
}

h3 {
  font-size: 30px;
  line-height: 0.95;
}

.eyebrow,
.section-number,
.status,
.source-card__topline,
.bridge-label {
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.eyebrow,
.section-number,
.source-card__topline span,
.bridge-label {
  color: var(--ivory-3);
}

.eyebrow {
  margin-bottom: 12px;
}

.status {
  flex: none;
  padding: 9px 11px 7px;
  background: var(--tomato);
  color: var(--ink);
  transform: rotate(1.5deg);
}

.hero {
  display: grid;
  grid-template-columns: minmax(0, 0.8fr) minmax(420px, 1.2fr);
  gap: clamp(28px, 7vw, 100px);
  align-items: center;
  min-height: min(700px, 76vh);
  padding-block: clamp(64px, 9vw, 116px);
}

.hero-copy > p:last-child,
.section-heading > p:last-child,
.source-card > p,
.direction-card > p,
footer > p:last-child {
  color: var(--ivory-2);
  font-size: 15px;
  line-height: 1.55;
}

.hero-copy h2 {
  margin: 18px 0 28px;
}

.hero-copy > p:last-child {
  max-width: 46ch;
}

.hero-field {
  position: relative;
  min-height: 430px;
  overflow: hidden;
  background:
    radial-gradient(circle at 50% 50%, rgba(224, 169, 58, 0.08), transparent 38%),
    var(--ink-2);
  box-shadow: inset 0 0 0 1px var(--hairline);
}

.hero-field::after {
  content: "stage / chrome boundary";
  position: absolute;
  right: 16px;
  bottom: 14px;
  color: var(--ivory-4);
  font: 700 9px/1 var(--font-mono);
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.hero-beat {
  position: absolute;
  inset: 50% auto auto 50%;
  display: grid;
  gap: 16px;
  justify-items: center;
  padding: 28px 32px;
  background: rgba(10, 9, 8, 0.86);
  transform: translate(-50%, -50%);
}

.hero-beat span {
  color: var(--ivory-3);
  font: 700 9px/1 var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.hero-mark {
  position: absolute;
  opacity: 0.8;
}

.hero-mark--triangle { top: 32px; left: 9%; transform: rotate(-9deg); }
.hero-mark--wave { top: 18%; right: 8%; transform: rotate(12deg); }
.hero-mark--diamond { bottom: 14%; left: 17%; transform: rotate(8deg); }
.hero-mark--star { right: 18%; bottom: 12%; transform: rotate(-8deg); }

.section-block {
  padding: clamp(64px, 9vw, 112px) 0;
  border-top: 1px solid var(--ink-5);
}

.section-heading {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(220px, 0.45fr);
  gap: 18px 48px;
  align-items: end;
  margin-bottom: 34px;
}

.section-heading .section-number {
  grid-column: 1 / -1;
}

.source-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.source-card,
.direction-card,
.bridge-card {
  background: var(--ink-2);
  box-shadow: inset 0 0 0 1px var(--hairline);
}

.source-card {
  display: grid;
  gap: 28px;
  min-height: 300px;
  padding: 22px;
}

.source-card--canvas { padding-bottom: 18px; }

.source-card__topline {
  display: flex;
  justify-content: space-between;
  gap: 12px;
}

.source-card__topline strong {
  color: var(--ivory);
}

.mark-run,
.beat-stack,
.kicker-stack {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 20px;
}

.beat-stack {
  flex-direction: column;
  align-items: flex-start;
  width: max-content;
  margin: auto;
}

.kicker-stack {
  flex-direction: column;
  align-items: flex-start;
  width: max-content;
  margin: auto;
}

.direction-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 12px;
}

.direction-card {
  position: relative;
  display: grid;
  grid-template-rows: 210px auto auto;
  gap: 18px;
  padding: 14px 22px 24px;
  overflow: hidden;
}

.direction-index {
  position: absolute;
  top: 13px;
  left: 16px;
  z-index: 1;
  color: var(--ivory-4);
  font: 700 12px/1 var(--font-mono);
}

.direction-stage {
  display: grid;
  place-items: center;
  margin-inline: -8px;
  background: var(--ink);
}

.direction-lockup {
  display: grid;
  gap: 22px;
  justify-items: start;
}

.paper-beats,
.filled-beats {
  display: flex;
  align-items: center;
  gap: 11px;
}

.paper-beats :deep(.mark) {
  opacity: 0.16;
  animation: rough-paper-beat 2s steps(1) infinite;
  animation-delay: var(--rough-beat-delay);
}

.filled-beats i {
  width: 28px;
  height: 28px;
  background: var(--ivory-4);
  opacity: 0.42;
  animation: rough-filled-beat 2s steps(1) infinite;
  animation-delay: var(--rough-beat-delay);
}

.filled-beats i.downbeat {
  background: var(--brass);
}

@keyframes rough-paper-beat {
  0%, 18% { opacity: 1; transform: scale(1.08) rotate(-2deg); }
  20%, 100% { opacity: 0.16; transform: scale(1) rotate(0); }
}

@keyframes rough-filled-beat {
  0%, 18% { opacity: 1; transform: translateY(-2px); }
  20%, 100% { opacity: 0.42; transform: translateY(0); }
}

.shape-bridge {
  padding-bottom: clamp(74px, 10vw, 128px);
}

.bridge-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
}

.bridge-card {
  min-height: 330px;
  padding: 18px;
}

.bridge-shapes {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  place-items: center;
  min-height: 260px;
}

.bridge-shapes > div {
  display: grid;
  gap: 14px;
  justify-items: center;
}

.bridge-shapes span {
  color: var(--ivory-3);
  font: 700 9px/1 var(--font-mono);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.bridge-card--particles :deep(.particle-sample) {
  min-height: 280px;
  margin-top: 14px;
}

footer {
  display: grid;
  grid-template-columns: 0.35fr 1fr;
  gap: 24px;
  padding: 30px 0 60px;
  border-top: 1px solid var(--ink-5);
}

footer > p:last-child {
  max-width: 62ch;
  font-size: 18px;
}

@media (max-width: 780px) {
  .hero,
  .section-heading,
  footer {
    grid-template-columns: 1fr;
  }

  .hero {
    min-height: auto;
  }

  .hero-field {
    min-height: 360px;
  }

  .direction-grid {
    grid-template-columns: 1fr;
  }

  .direction-card {
    grid-template-rows: 190px auto auto;
  }
}

@media (max-width: 560px) {
  .rough-page {
    padding: 16px;
  }

  .status {
    font-size: 8px;
  }

  .source-grid,
  .bridge-grid {
    grid-template-columns: 1fr;
  }

  .hero-field {
    min-height: 320px;
  }

  .hero-beat {
    padding: 22px 18px;
  }

  .bridge-shapes {
    min-height: 220px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .paper-beats :deep(.mark),
  .filled-beats i {
    animation: none;
  }

  .paper-beats :deep(.mark:first-child),
  .filled-beats i:first-child {
    opacity: 1;
  }
}
</style>

<style>
body.rough-page-route {
  overflow-x: hidden;
  overflow-y: auto;
  background: var(--ink);
}
</style>
