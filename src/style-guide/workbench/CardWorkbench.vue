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
      <SectionHead index="01" title="Extracted CardShell" note="Guide-only · no production consumer" />
      <div class="card-grid">
        <CardShell
          label="01 — Stage / Ivory"
          title="A dark room. Ivory type."
          body="Required title, optional label, body, and decorative mark."
        >
          <template #mark><span class="ordinal">01</span></template>
        </CardShell>
        <CardShell
          compact
          label="Compact"
          title="Editorial anatomy."
          body="The source also owns fixed minimum height, padding, and type hierarchy."
        />
        <CardShell
          compact
          :bordered="false"
          label="Borderless"
          title="Still a template."
          body="Removing the border does not make the content contract flexible."
        >
          <template #mark><span class="ordinal ordinal--small">02</span></template>
        </CardShell>
      </div>
    </section>

    <section class="workbench__section">
      <SectionHead index="02" title="Pattern Card surfaces" note="Neither source consumes CardShell" />
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
      <SectionHead index="03" title="Adjacent card family" note="Spine Card already owns branded editorial anatomy" />
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
.card-grid { display: grid; grid-template-columns: 1.15fr 1fr 1fr; gap: 14px; align-items: stretch; }
.card-grid :deep(.card-shell) { width: 100%; height: 100%; }
.ordinal { font: 400 52px/1 var(--font-display); }
.ordinal--small { font-size: 32px; }
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
  .card-grid,
  .adjacent-grid { grid-template-columns: 1fr; }
}
</style>
