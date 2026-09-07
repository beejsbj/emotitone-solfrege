<template>
  <main class="workbench">
    <header class="workbench__header">
      <p class="workbench__eyebrow">Definition workbench · one shared candidate</p>
      <h1>Card.vue</h1>
      <p>
        The selected first CardShell is the soul. Spine Card and Pattern Card below
        render through the same workbench-only shell before production formalization.
      </p>
    </header>

    <section class="workbench__section">
      <SectionHead index="01" title="Card soul" note="Selected recipe · Ivory spine folded in" />
      <CardCandidate class="soul-card">
        <template #label>01 — Stage / Ivory</template>
        <template #mark><span class="ordinal">01</span></template>
        <h3 class="editorial-title">A dark room. Ivory type.</h3>
        <p class="editorial-body">
          Ink-3 fill, Ink-5 hairline, square slab, floating label, optional mark,
          and a 4px full-height Ivory spine.
        </p>
      </CardCandidate>
      <p class="definition-note">
        Card owns this shell and its optional anchors. It does not own a fixed
        height, title/body requirement, controls, state, or motion.
      </p>
    </section>

    <section class="workbench__section">
      <SectionHead index="02" title="Spine Card" note="Card variant · brand changes the spine" />
      <div class="spine-grid">
        <CardCandidate
          v-for="card in spineCards"
          :key="card.tone"
          class="spine-variant"
          :spine="`var(--${card.tone})`"
        >
          <template #label>{{ card.index }} — {{ card.kicker }} / {{ card.tone }}</template>
          <h3 class="spine-variant__title">{{ card.title }}</h3>
          <p class="spine-variant__body">{{ card.body }}</p>
        </CardCandidate>
      </div>
      <p class="definition-note">
        The variant moves its kicker metadata into Card's edge label, then adds
        Brand Color, stamped headline, and body. It needs no second internal label.
      </p>
    </section>

    <section class="workbench__section">
      <SectionHead index="03" title="Pattern Card" note="Card variant · Ivory spine + Bar Tape" />
      <div class="pattern-stack">
        <p class="surface-label">List density</p>
        <CardCandidate class="pattern-candidate" flush>
          <template #label>Pattern 01 — Piano / C Major</template>
          <div class="pattern-row">
            <span class="pattern-number">01</span>
            <span class="pattern-copy">
              <strong>{{ productionPattern.name }}</strong>
              <small>Piano · C major</small>
            </span>
            <small class="pattern-count">14 notes</small>
          </div>
          <template #footer><BarTape :segments="timeline" /></template>
        </CardCandidate>

        <p class="surface-label">Focused density</p>
        <CardCandidate class="pattern-candidate pattern-candidate--focused">
          <template #label>Pattern 01 — Piano / C Major</template>
          <template #mark><span class="ordinal ordinal--pattern">01</span></template>
          <h3 class="pattern-focus__title">{{ productionPattern.name }}</h3>
          <p class="pattern-focus__meta">14 events · duration weighted</p>
          <div class="pattern-focus__state">
            <span>1 of 4</span>
            <span>Actions remain Pattern Card-owned</span>
          </div>
          <template #footer><BarTape :segments="timeline" /></template>
        </CardCandidate>
      </div>
      <p class="definition-note">
        Pattern Card supplies density, identity, actions, selection, and list
        behavior. It inherits the Ivory spine; the musical sequence speaks through
        Bar Tape instead of a second accent color.
      </p>
    </section>

    <section class="workbench__section">
      <details class="reference">
        <summary>Current sources used for comparison</summary>
        <div class="reference__grid">
          <div>
            <p class="surface-label">Extracted CardShell</p>
            <CardShell
              label="01 — Stage / Ivory"
              title="A dark room. Ivory type."
              body="The selected source recipe before the Ivory spine."
            >
              <template #mark><span class="ordinal">01</span></template>
            </CardShell>
          </div>
          <div>
            <p class="surface-label">Existing separate SpineCard</p>
            <SpineCard
              kicker="Preset"
              stamp="Warm-up"
              body="Currently duplicates its own surface, edge, and spine shell."
            />
          </div>
        </div>
        <div class="reference__patterns">
          <p class="surface-label">Existing guide PatternCard</p>
          <GuidePatternCard
            num="01"
            name="Twinkle fragment"
            sub="C major · current guide"
            when="14 notes"
            :bar-tape="timeline"
          />
          <p class="surface-label">Existing production PatternCard</p>
          <ProductionPatternCard :pattern="productionPattern" />
        </div>
      </details>
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
import CardCandidate from "./CardCandidate.vue";
import type { BarTapeSegment } from "../../components/primatives/BarTape.vue";
import type { SpineCardTone } from "../../components/primatives/SpineCard.vue";

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

const spineCards: Array<{
  index: string;
  tone: SpineCardTone;
  kicker: string;
  title: string;
  body: string;
}> = [
  { index: "01", tone: "tomato", kicker: "Preset", title: "Warm-up", body: "A bright entry into the exercise." },
  { index: "02", tone: "pine", kicker: "Live", title: "Listening", body: "Quiet status on the same underlying Card." },
  { index: "03", tone: "mustard", kicker: "Lesson", title: "Call & response", body: "Brand changes the edition, not the shell." },
];
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

.workbench__section { padding: 28px 0 34px; border-top: 1px solid var(--hairline); }
.section-head {
  display: flex;
  align-items: end;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 20px;
}
.section-head h2 { margin-top: 4px; font-size: clamp(20px, 4vw, 30px); }
.section-head > p { max-width: 280px; text-align: right; }

.soul-card { min-height: 190px; }
.ordinal { font: 400 52px/1 var(--font-display); letter-spacing: var(--tracking-display); }
.editorial-title,
.spine-variant__title,
.pattern-focus__title {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}
.editorial-title { max-width: 14ch; margin-bottom: 10px; padding-right: 64px; font-size: 19px; line-height: 1.12; }
.editorial-body { max-width: 28ch; margin: 0; color: var(--ivory-3); font: var(--t-body-s); }
.definition-note { margin: 14px 0 0; color: var(--ivory-3); font: var(--t-body-s-mono); }

.spine-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.spine-variant { min-height: 168px; }
.spine-variant :deep(.card-candidate__content) { display: flex; flex-direction: column; }
.spine-variant__title { font-size: 28px; line-height: .9; }
.spine-variant__body { margin: auto 0 0; color: var(--ivory-3); font: var(--t-body-s-mono); }

.pattern-stack { display: grid; gap: 12px; }
.surface-label { margin-top: 8px; }
.pattern-row {
  display: grid;
  grid-template-columns: 52px minmax(0, 1fr) auto;
  align-items: center;
  gap: 12px;
  min-height: 50px;
  padding: 0 14px 0 20px;
}
.pattern-number { color: var(--ivory-4); font: var(--t-display-m); text-align: center; }
.pattern-copy { min-width: 0; }
.pattern-copy strong,
.pattern-copy small,
.pattern-count { display: block; text-transform: uppercase; }
.pattern-copy strong { overflow: hidden; font: var(--t-h2); text-overflow: ellipsis; white-space: nowrap; }
.pattern-copy small,
.pattern-count { color: var(--ivory-3); font: var(--t-caption); letter-spacing: .12em; }
.pattern-candidate--focused { margin-top: 8px; }
.ordinal--pattern { font-size: 48px; }
.pattern-focus__title { max-width: calc(100% - 72px); font: var(--t-display-m); }
.pattern-focus__meta { margin: 4px 0 22px; color: var(--ivory-3); font: var(--t-caption); letter-spacing: .12em; text-transform: uppercase; }
.pattern-focus__state {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  padding-top: 12px;
  border-top: 1px solid var(--hairline);
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .12em;
  text-transform: uppercase;
}

.reference { color: var(--ivory-3); }
.reference summary { cursor: pointer; font: var(--t-label); letter-spacing: var(--tracking-label); text-transform: uppercase; }
.reference__grid { display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-top: 24px; }
.reference__grid > div,
.reference__patterns { display: grid; gap: 12px; }
.reference__patterns { margin-top: 20px; }

@media (max-width: 640px) {
  .section-head { align-items: start; flex-direction: column; }
  .section-head > p { text-align: left; }
  .spine-grid,
  .reference__grid { grid-template-columns: 1fr; }
  .pattern-row { grid-template-columns: 42px minmax(0, 1fr) auto; gap: 8px; padding-right: 10px; padding-left: 12px; }
  .pattern-count { max-width: 6ch; text-align: right; }
  .pattern-focus__state { align-items: start; flex-direction: column; }
}
</style>
