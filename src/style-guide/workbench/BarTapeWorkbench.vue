<template>
  <main class="workbench">
    <header class="workbench__header">
      <p class="workbench__eyebrow">Definition workbench · current sources</p>
      <h1>Bar Tape</h1>
      <p>
        One focused comparison: the extracted primitive, its real PatternStrip
        consumer, and the PatternReel mounted in production today.
      </p>
    </header>

    <section class="workbench__section">
      <div class="workbench__section-head">
        <div>
          <p class="workbench__index">01</p>
          <h2>Current primitive</h2>
        </div>
        <p>Chronological events · duration-proportional width</p>
      </div>

      <div class="primitive-stage">
        <div class="primitive-stage__hero">
          <span>{{ productionPattern.name }}</span>
          <BarTape :segments="sequenceSegments" />
        </div>
        <div class="primitive-stage__variants">
          <label>
            Twinkle · repeated notes and held ending
            <BarTape :segments="sequenceSegments" />
          </label>
          <label>
            Mary · varied pitch order
            <BarTape :segments="marySegments" />
          </label>
          <label>
            Hot Cross Buns · short pulses and long notes
            <BarTape :segments="pulseSegments" />
          </label>
        </div>
      </div>
    </section>

    <section class="workbench__section">
      <div class="workbench__section-head">
        <div>
          <p class="workbench__index">02</p>
          <h2>Guide-only consumer</h2>
        </div>
        <p>Background PatternStrip composes Bar Tape on its top edge</p>
      </div>

      <PatternStrip :item="patternStripItem" />
    </section>

    <section class="workbench__section">
      <div class="workbench__section-head">
        <div>
          <p class="workbench__index">03</p>
          <h2>Production today</h2>
        </div>
        <p>Real production PatternReel · note order and duration drive each tape</p>
      </div>

      <ProductionPatternList />
    </section>
  </main>
</template>

<script setup lang="ts">
import BarTape from "../../components/primatives/BarTape.vue";
import PatternStrip from "../../components/compounds/PatternStrip.vue";
import ProductionPatternList from "../../components/patterns/PatternList.vue";
import { useColorSystem } from "../../composables/useColorSystem";
import { CHROMATIC_NOTES } from "../../data";
import { defaultPatterns } from "../../data/patterns";
import type { BarTapeSegment } from "../../components/primatives/BarTape.vue";
import type { Pattern } from "../../types/patterns";

const productionPattern = defaultPatterns[0];
const {
  getStaticPrimaryColorByScaleIndex,
  getStaticPrimaryColorByPitchClass,
} = useColorSystem();

const toTimeline = (pattern: Pattern): BarTapeSegment[] =>
  pattern.notes.map((note) => ({
    color: getStaticPrimaryColorByScaleIndex(
      note.scaleIndex,
      pattern.mode,
      pattern.key,
      note.octave,
    ),
    durationMs: note.duration,
  }));

const sequenceSegments = toTimeline(productionPattern);
const marySegments = toTimeline(defaultPatterns[1]);
const pulseSegments = toTimeline(defaultPatterns[2]);
const rootOctave = productionPattern.notes.find((note) => note.scaleIndex === 0)?.octave
  ?? productionPattern.notes[0]?.octave
  ?? 4;
const rootPitchClass = Math.max(0, CHROMATIC_NOTES.indexOf(productionPattern.key));
const patternStripItem = {
  id: productionPattern.id,
  name: productionPattern.name ?? "Untitled pattern",
  rootLabel: `${productionPattern.key}${rootOctave}`,
  spine: getStaticPrimaryColorByPitchClass(
    rootPitchClass,
    productionPattern.mode,
    productionPattern.key,
    rootOctave,
  ),
  barTape: sequenceSegments,
  canDelete: false,
};
</script>

<style scoped>
:global(html.bar-tape-workbench-route),
:global(body.bar-tape-workbench-route),
:global(body.bar-tape-workbench-route #app) {
  min-height: 100%;
  margin: 0;
  background: var(--ink);
}

.workbench {
  box-sizing: border-box;
  width: min(760px, 100%);
  min-height: 100vh;
  margin: 0 auto;
  padding: clamp(28px, 7vw, 72px) clamp(18px, 5vw, 44px) 96px;
  color: var(--ivory);
}

.workbench__header {
  margin-bottom: 52px;
}

.workbench__eyebrow,
.workbench__index,
.workbench__section-head > p,
.primitive-stage label {
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.workbench__header h1,
.workbench__section h2 {
  margin: 0;
  font-family: var(--font-display);
  text-transform: uppercase;
}

.workbench__header h1 {
  margin-top: 8px;
  font-size: clamp(42px, 9vw, 76px);
  letter-spacing: -.035em;
  line-height: .92;
}

.workbench__header > p:last-child {
  max-width: 560px;
  margin: 18px 0 0;
  color: var(--ivory-3);
  font-size: 13px;
  line-height: 1.6;
}

.workbench__section {
  padding: 28px 0 34px;
  border-top: 1px solid var(--hairline);
}

.workbench__section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.workbench__section h2 {
  margin-top: 4px;
  font-size: clamp(20px, 4vw, 30px);
  letter-spacing: -.01em;
}

.workbench__section-head > p {
  max-width: 260px;
  text-align: right;
}

.primitive-stage {
  border: 1px solid var(--hairline);
  background: var(--ink-2);
}

.primitive-stage__hero {
  padding: 22px;
}

.primitive-stage__hero > span {
  display: block;
  margin-bottom: 10px;
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.primitive-stage__variants {
  display: grid;
  gap: 18px;
  padding: 18px 22px 22px;
  border-top: 1px solid var(--hairline);
}

.primitive-stage label {
  display: grid;
  gap: 8px;
}

@media (max-width: 560px) {
  .workbench__section-head {
    align-items: start;
    flex-direction: column;
  }

  .workbench__section-head > p {
    text-align: left;
  }
}
</style>
