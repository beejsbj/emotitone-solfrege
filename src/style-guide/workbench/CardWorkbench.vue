<template>
  <main class="workbench">
    <header class="workbench__header">
      <p class="workbench__eyebrow">Definition workbench · current real sources</p>
      <h1>Card</h1>
      <p>
        Is Card an editorial content template, or the reusable structural surface that
        lets Pattern Card own its own anatomy?
      </p>
    </header>

    <section class="workbench__section">
      <SectionHead index="01" title="Selected CardShell" note="The one current iteration worth preserving" />
      <div class="single-card">
        <CardShell
          label="01 — Stage / Ivory"
          title="A dark room. Ivory type."
          body="Required title, optional label, body, and decorative mark."
        >
          <template #mark><span class="ordinal">01</span></template>
        </CardShell>
        <p>
          Compact, borderless, and light-inversion experiments are rejected rather
          than promoted as Card variants.
        </p>
      </div>
    </section>

    <section class="workbench__section">
      <SectionHead index="02" title="Recommended soul" note="Same Card grammar · flexible content" />
      <div class="soul-grid">
        <article class="card-study">
          <span class="card-study__label">01 — Stage / Ivory</span>
          <span class="card-study__mark">01</span>
          <div class="card-study__content">
            <h3>A dark room. Ivory type.</h3>
            <p>The selected editorial anatomy, now grounded by a full-height Ink spine.</p>
          </div>
        </article>
        <article class="card-study card-study--pattern">
          <div class="pattern-study__row">
            <span class="pattern-study__num">01</span>
            <span>
              <strong>Twinkle fragment</strong>
              <small>C major · arbitrary consumer anatomy</small>
            </span>
            <small>14 notes</small>
          </div>
          <BarTape :segments="timeline" />
        </article>
      </div>
      <p class="definition-note">
        Card owns the Ink-3 fill, Ink-5 hairline, square slab, 4px Ink spine,
        positioning, and containment. Label, mark, typography, padding, controls,
        state, and motion belong to the consumer.
      </p>
    </section>

    <section class="workbench__section">
      <SectionHead index="03" title="Pattern Card surfaces" note="Neither source consumes CardShell" />
      <div class="surface-stack">
        <div class="surface-label">Guide source · sleek</div>
        <GuidePatternCard
          num="01"
          name="Twinkle fragment"
          sub="C major · pattern identity"
          when="14 notes"
          :bar-tape="timeline"
        />
        <div class="surface-label">Guide source · active</div>
        <GuidePatternCard
          shape="active"
          num="01"
          name="Twinkle fragment"
          sub="C major · selected pattern"
          footer-text="1 of 4"
          status-text="active"
          :show-actions="false"
        />
        <div class="surface-label">Production source · interactive track</div>
        <ProductionPatternCard :pattern="productionPattern" />
      </div>
    </section>

    <section class="workbench__section">
      <SectionHead index="04" title="Adjacent card family" note="Spine Card already owns branded editorial anatomy" />
      <div class="adjacent-grid">
        <SpineCard
          kicker="Preset"
          stamp="Warm-up"
          body="Brand-colored spine, Kicker, stamped headline, and body are a separate accepted family."
        />
        <div class="boundary-note">
          <strong>Boundary question</strong>
          <p>
            If generic Card keeps its own title/body/mark grammar, it overlaps Spine Card
            while still failing to host Pattern Card. A structural Card could instead own
            only the neutral surface, containment, and optional interaction state.
          </p>
        </div>
      </div>
    </section>
  </main>
</template>

<script setup lang="ts">
import { defineComponent, h } from "vue";
import BarTape from "../../components/primatives/BarTape.vue";
import CardShell from "../../components/primatives/CardShell.vue";
import SpineCard from "../../components/primatives/SpineCard.vue";
import GuidePatternCard from "../../components/compounds/PatternCard.vue";
import ProductionPatternCard from "../../components/patterns/PatternCard.vue";
import { useColorSystem } from "../../composables/useColorSystem";
import { defaultPatterns } from "../../data/patterns";
import type { BarTapeSegment } from "../../components/primatives/BarTape.vue";

const SectionHead = defineComponent({
  props: { index: String, title: String, note: String },
  setup(props) {
    return () =>
      h("div", { class: "section-head" }, [
        h("div", [h("p", props.index), h("h2", props.title)]),
        h("p", props.note),
      ]);
  },
});

const productionPattern = defaultPatterns[0];
const { getStaticPrimaryColorByScaleIndex } = useColorSystem();
const timeline: BarTapeSegment[] = productionPattern.notes.map((note) => ({
  color: getStaticPrimaryColorByScaleIndex(
    note.scaleIndex,
    productionPattern.mode,
    productionPattern.key,
    note.octave,
  ),
  durationMs: note.duration,
}));
</script>

<style scoped>
:global(html.card-workbench-route),
:global(body.card-workbench-route),
:global(body.card-workbench-route #app) {
  min-height: 100%;
  margin: 0;
  background: var(--ink);
}

.workbench {
  box-sizing: border-box;
  width: min(840px, 100%);
  min-height: 100vh;
  margin: 0 auto;
  padding: clamp(28px, 7vw, 72px) clamp(18px, 5vw, 44px) 96px;
  color: var(--ivory);
}

.workbench__header { margin-bottom: 52px; }
.workbench__eyebrow,
.section-head p,
.surface-label {
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-mono);
  font-size: 9px;
  letter-spacing: .14em;
  text-transform: uppercase;
}

.workbench__header h1,
.section-head h2 {
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
  max-width: 620px;
  margin: 18px 0 0;
  color: var(--ivory-3);
  font-size: 13px;
  line-height: 1.6;
}

.workbench__section {
  padding: 28px 0 34px;
  border-top: 1px solid var(--hairline);
}

.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}

.section-head h2 {
  margin-top: 4px;
  font-size: clamp(20px, 4vw, 30px);
}

.section-head > p { max-width: 280px; text-align: right; }
.single-card { display: grid; grid-template-columns: minmax(240px, 1fr) 1fr; gap: 18px; align-items: center; }
.single-card > p,
.definition-note { margin: 0; color: var(--ivory-3); font: var(--t-body-s-mono); }
.soul-grid { display: grid; grid-template-columns: 1fr 1.35fr; gap: 14px; align-items: stretch; }
.card-study {
  position: relative;
  box-sizing: border-box;
  min-height: 190px;
  background: var(--ink-3);
  border: 1px solid var(--ink-5);
  color: var(--ivory);
}
.card-study::before {
  position: absolute;
  inset: 0 auto 0 0;
  width: 4px;
  background: var(--ink);
  content: "";
}
.card-study__label {
  position: absolute;
  top: -10px;
  left: 18px;
  padding: 0 4px;
  background: var(--ink-3);
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .22em;
  text-transform: uppercase;
}
.card-study__mark {
  position: absolute;
  top: 8px;
  right: 12px;
  color: var(--ivory-4);
  font: 400 52px/1 var(--font-display);
}
.card-study__content { padding: 20px 18px 22px 22px; }
.card-study__content h3 {
  max-width: 14ch;
  margin: 0 0 10px;
  font: 400 19px/1.12 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}
.card-study__content p { max-width: 28ch; margin: 0; color: var(--ivory-3); font: var(--t-body-s); }
.card-study--pattern { display: flex; min-height: 72px; flex-direction: column; justify-content: space-between; }
.pattern-study__row {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  padding: 14px 14px 14px 20px;
}
.pattern-study__num { color: var(--ivory-4); font: var(--t-display-m); }
.pattern-study__row strong,
.pattern-study__row small { display: block; text-transform: uppercase; }
.pattern-study__row strong { overflow: hidden; font: var(--t-h2); text-overflow: ellipsis; white-space: nowrap; }
.pattern-study__row small { color: var(--ivory-3); font: var(--t-caption); letter-spacing: .12em; }
.definition-note { margin-top: 14px; }
.ordinal { font: 400 52px/1 var(--font-display); }
.surface-stack { display: grid; gap: 12px; }
.surface-label { margin-top: 8px; }
.adjacent-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; }
.boundary-note {
  box-sizing: border-box;
  min-height: 168px;
  padding: 18px;
  background: var(--ink-2);
  border: 1px dashed var(--ink-5);
}
.boundary-note strong {
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}
.boundary-note p { margin: 14px 0 0; color: var(--ivory-3); font: var(--t-body-s-mono); }

@media (max-width: 640px) {
  .section-head { align-items: start; flex-direction: column; }
  .section-head > p { text-align: left; }
  .single-card,
  .soul-grid,
  .adjacent-grid { grid-template-columns: 1fr; }
}
</style>
