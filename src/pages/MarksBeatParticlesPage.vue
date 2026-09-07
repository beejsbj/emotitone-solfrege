<template>
  <main class="rough-page">
    <header class="masthead">
      <div>
        <p class="eyebrow">Shared visual rough · accepted direction</p>
        <h1>Marks, beating<br>&amp; in flight.</h1>
      </div>
      <p class="status">Unified · pass 01</p>
    </header>

    <section class="hero" aria-labelledby="hero-title">
      <div class="hero-copy">
        <p class="section-number">01 · One source</p>
        <h2 id="hero-title">One Mark family.<br>Two ways it moves.</h2>
        <p>
          Beat Indicator arranges Marks in time. Stage releases the same Marks through space.
          Neither invents a second shape vocabulary.
        </p>
        <div class="lineage" aria-label="Mark lineage">
          <strong>Mark</strong><span>→</span><span>Beat Indicator</span><span>+</span><span>Stage particles</span>
        </div>
      </div>

      <div class="hero-stage">
        <StageParticleSample :scale="2.2" :burst-count="14" />
        <div class="hero-beat">
          <span>4 Marks · 1 loop</span>
          <BeatIndicator
            :marks="['disk', 'eighth', 'wave', 'star']"
            size="lg"
            aria-label="Four different Marks beating in sequence"
          />
        </div>
      </div>
    </section>

    <section class="section-block" aria-labelledby="family-title">
      <div class="section-heading">
        <p class="section-number">02 · Core family</p>
        <h2 id="family-title">No musical annex.</h2>
        <p>
          All twenty shapes are Marks. The names help selection; they do not split the family into
          structural and musical tiers.
        </p>
      </div>

      <div class="mark-field">
        <article v-for="(mark, index) in markShelf" :key="mark" class="mark-tile">
          <Mark :name="mark" :tone="toneFor(index)" size="clamp(42px, 6vw, 78px)" />
          <span>{{ mark }}</span>
        </article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="beat-title">
      <div class="section-heading">
        <p class="section-number">03 · Compound</p>
        <h2 id="beat-title">Beat selects.<br>Mark draws.</h2>
        <p>
          A Beat Indicator owns meter, sequence, pulse, and downbeat. Its visible cells are just
          Mark instances, including notation glyphs.
        </p>
      </div>

      <div class="beat-grid">
        <article v-for="set in beatSets" :key="set.label" class="beat-card">
          <div class="card-label"><span>{{ set.index }}</span><strong>{{ set.label }}</strong></div>
          <div class="beat-stage">
            <BeatIndicator :beats="set.beats" :marks="set.marks" size="lg" :aria-label="`${set.label} beat set`" />
          </div>
          <p>{{ set.note }}</p>
        </article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="identity-title">
      <div class="section-heading">
        <p class="section-number">04 · Stable note identities</p>
        <h2 id="identity-title">Played notes keep<br>their own Mark.</h2>
        <p>
          The assignment follows the interval identity, so the same musical function releases the
          same Mark across modes. Music Color still supplies the tone.
        </p>
      </div>

      <div class="identity-grid">
        <article v-for="(identity, index) in identities" :key="identity.interval" class="identity-card">
          <div class="identity-mark">
            <Mark :name="identity.mark" :tone="toneFor(index)" size="54" />
          </div>
          <div>
            <span>{{ identity.interval }}</span>
            <strong>{{ identity.name }}</strong>
            <small>{{ identity.mark }}</small>
          </div>
        </article>
      </div>
    </section>

    <section class="section-block" aria-labelledby="particle-title">
      <div class="section-heading">
        <p class="section-number">05 · Stage particles</p>
        <h2 id="particle-title">Same contour.<br>Optically scaled.</h2>
        <p>
          Tiny notation needs more optical area than a solid disk. That compensation lives beside
          each Mark’s paths; particle physics, lifetime, and Music Color stay with Stage.
        </p>
      </div>

      <div class="particle-grid">
        <article class="particle-card">
          <div class="card-label"><span>A</span><strong>Native Stage scale</strong></div>
          <StageParticleSample :burst-count="18" />
        </article>
        <article class="particle-card">
          <div class="card-label"><span>B</span><strong>3× inspection loupe</strong></div>
          <StageParticleSample :scale="3" :burst-count="12" />
        </article>
      </div>
    </section>

    <footer>
      <p class="section-number">Current verdict</p>
      <p>
        Mark is the only geometry family. Beat Indicator and Stage particles are two consumers with
        different motion jobs. Sparkle and mist are gone; Kicker and Spine Card are outside this pass.
      </p>
    </footer>
  </main>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted } from "vue";
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import Mark, { type MarkTone } from "@/components/primatives/Mark.vue";
import { MARK_NAMES, type MarkName } from "@/components/primatives/marks";
import { INTERVAL_IDENTITY_MAP, INTERVAL_TO_SOLFEGE } from "@/data/solfege";
import StageParticleSample from "./StageParticleSample.vue";

const markShelf = MARK_NAMES;
const tones: MarkTone[] = ["brass", "tomato", "ivory", "pine", "mustard", "plum", "ivory-2"];
const toneFor = (index: number) => tones[index % tones.length];

const beatSets: Array<{ index: string; label: string; beats: number; marks: MarkName[]; note: string }> = [
  { index: "A", label: "One repeated", beats: 4, marks: ["disk"], note: "The quietest meter: identity comes from repetition." },
  { index: "B", label: "Mixed four", beats: 4, marks: ["triangle", "eighth", "wave", "star"], note: "A chosen phrase, with brass reserved for beat one." },
  { index: "C", label: "Notation six", beats: 6, marks: ["eighth", "accent", "flat"], note: "Musical Marks remain readable as rhythmic material." },
];

const identities = Object.entries(INTERVAL_IDENTITY_MAP).map(([interval, identity]) => ({
  interval,
  name: INTERVAL_TO_SOLFEGE[interval],
  mark: identity.mark,
}));

onMounted(() => document.body.classList.add("rough-page-route"));
onUnmounted(() => document.body.classList.remove("rough-page-route"));
</script>

<style scoped>
.rough-page {
  min-height: 100vh;
  padding: clamp(18px, 4vw, 56px);
  overflow: hidden;
  background:
    linear-gradient(90deg, rgba(255, 255, 255, 0.018) 1px, transparent 1px) 0 0 / 42px 42px,
    linear-gradient(rgba(255, 255, 255, 0.018) 1px, transparent 1px) 0 0 / 42px 42px,
    var(--ink);
  color: var(--ivory);
  font-family: var(--font-body);
}

.masthead, .hero, .section-block, footer { width: min(1180px, 100%); margin-inline: auto; }
.masthead { display: flex; align-items: flex-start; justify-content: space-between; gap: 24px; padding-bottom: 20px; border-bottom: 1px solid var(--ink-5); }
h1, h2, p { margin: 0; }
h1, h2 { font-family: var(--font-display); font-weight: 700; }
h1 { font-size: clamp(32px, 5.5vw, 64px); line-height: .86; letter-spacing: -.03em; }
h2 { font-size: clamp(40px, 7vw, 80px); line-height: .84; letter-spacing: -.04em; }
.eyebrow, .section-number, .status, .card-label, .mark-tile span, .identity-card span, .identity-card small {
  font-family: var(--font-mono); font-size: 10px; font-weight: 700; letter-spacing: .14em; text-transform: uppercase;
}
.eyebrow, .section-number, .mark-tile span, .identity-card span, .identity-card small { color: var(--ivory-3); }
.eyebrow { margin-bottom: 12px; }
.status { flex: none; padding: 9px 11px 7px; background: var(--brass); color: var(--ink); transform: rotate(1.5deg); }

.hero { display: grid; grid-template-columns: minmax(0, .85fr) minmax(420px, 1.15fr); gap: clamp(32px, 7vw, 100px); align-items: center; min-height: min(720px, 82vh); padding-block: clamp(70px, 10vw, 124px); }
.hero-copy h2 { margin: 18px 0 28px; }
.hero-copy > p:nth-of-type(2), .section-heading > p:last-child, .beat-card > p, footer > p:last-child { color: var(--ivory-2); font-size: 15px; line-height: 1.55; }
.hero-copy > p:nth-of-type(2) { max-width: 48ch; }
.lineage { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; margin-top: 30px; color: var(--ivory-3); font: 700 10px/1 var(--font-mono); letter-spacing: .08em; text-transform: uppercase; }
.lineage strong { padding: 8px 10px 6px; background: var(--tomato); color: var(--ink); }

.hero-stage { position: relative; min-height: 450px; overflow: hidden; background: var(--ink-2); box-shadow: inset 0 0 0 1px var(--hairline); }
.hero-stage :deep(.particle-sample) { min-height: 450px; }
.hero-stage::after { content: "actual Stage particle renderer"; position: absolute; right: 16px; bottom: 16px; color: var(--ivory-4); font: 700 9px/1 var(--font-mono); letter-spacing: .14em; text-transform: uppercase; }
.hero-beat { position: absolute; inset: 50% auto auto 50%; display: grid; gap: 16px; justify-items: center; padding: 28px 34px; background: rgba(10, 9, 8, .88); transform: translate(-50%, -50%) rotate(-1deg); box-shadow: 0 18px 60px rgba(0,0,0,.35); }
.hero-beat > span { color: var(--ivory-3); font: 700 9px/1 var(--font-mono); letter-spacing: .14em; text-transform: uppercase; }

.section-block { padding-block: clamp(72px, 10vw, 124px); border-top: 1px solid var(--ink-5); }
.section-heading { display: grid; grid-template-columns: minmax(0, 1fr) minmax(230px, .42fr); gap: 18px 52px; align-items: end; margin-bottom: 38px; }
.section-heading .section-number { grid-column: 1 / -1; }

.mark-field { display: grid; grid-template-columns: repeat(5, minmax(0, 1fr)); gap: 1px; background: var(--hairline); }
.mark-tile { display: grid; place-items: center; gap: 18px; min-height: 170px; padding: 22px 10px 18px; background: var(--ink-2); }
.mark-tile:nth-child(4n + 1) :deep(.mark) { transform: rotate(-4deg); }
.mark-tile:nth-child(4n + 3) :deep(.mark) { transform: rotate(3deg); }

.beat-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
.beat-card, .particle-card { background: var(--ink-2); box-shadow: inset 0 0 0 1px var(--hairline); }
.beat-card { display: grid; grid-template-rows: auto 220px auto; gap: 18px; padding: 18px 20px 22px; }
.card-label { display: flex; align-items: center; justify-content: space-between; gap: 12px; color: var(--ivory-3); }
.card-label strong { color: var(--ivory); }
.beat-stage { display: grid; place-items: center; margin-inline: -6px; background: var(--ink); overflow: hidden; }

.identity-grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 8px; }
.identity-card { display: grid; gap: 16px; min-width: 0; padding: 14px; background: var(--ink-2); box-shadow: inset 0 0 0 1px var(--hairline); }
.identity-mark { display: grid; place-items: center; min-height: 92px; background: var(--ink); }
.identity-card > div:last-child { display: grid; gap: 5px; min-width: 0; }
.identity-card strong { font: 700 24px/.95 var(--font-display); }
.identity-card small { overflow: hidden; text-overflow: ellipsis; }

.particle-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; }
.particle-card { display: grid; gap: 16px; padding: 18px; }
.particle-card :deep(.particle-sample) { min-height: 330px; }

footer { display: grid; grid-template-columns: .35fr 1fr; gap: 24px 60px; padding: 36px 0 28px; border-top: 1px solid var(--ink-5); }
footer > p:last-child { max-width: 68ch; }

@media (max-width: 900px) {
  .hero { grid-template-columns: 1fr; min-height: auto; }
  .hero-stage { min-height: 390px; }
  .hero-stage :deep(.particle-sample) { min-height: 390px; }
  .mark-field { grid-template-columns: repeat(4, minmax(0, 1fr)); }
  .beat-grid { grid-template-columns: 1fr; }
  .identity-grid { grid-template-columns: repeat(4, minmax(0, 1fr)); }
}

@media (max-width: 620px) {
  .masthead { align-items: flex-end; }
  .status { max-width: 110px; text-align: center; }
  .section-heading { grid-template-columns: 1fr; }
  .section-heading .section-number { grid-column: auto; }
  .mark-field { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .mark-tile { min-height: 145px; }
  .identity-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .particle-grid, footer { grid-template-columns: 1fr; }
  .hero-beat { padding: 24px 22px; }
}
</style>
