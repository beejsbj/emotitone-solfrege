<template>
  <main class="workbench">
    <header class="workbench__header">
      <p class="workbench__eyebrow">Accepted foundation · one shared source</p>
      <h1>Card.vue</h1>
      <p>
        The selected first CardShell recipe is now Card. Colored Cards and Pattern
        Card below render through the same authoritative source.
      </p>
    </header>

    <section class="workbench__section">
      <SectionHead index="01" title="Card soul" note="Selected recipe · Ivory spine folded in" />
      <Card class="soul-card" label="01 — Stage / Ivory">
        <template #mark><span class="ordinal">01</span></template>
        <h3 class="editorial-title">A dark room. Ivory type.</h3>
        <p class="editorial-body">
          Ink-3 fill, Ink-5 hairline, square slab, floating label, optional mark,
          and a 4px full-height Ivory spine.
        </p>
      </Card>
      <p class="definition-note">
        Card owns this shell and its optional anchors. It does not own a fixed
        height, title/body requirement, controls, state, or motion.
      </p>
    </section>

    <section class="workbench__section">
      <SectionHead index="02" title="Card color" note="Same Card · only the spine color changes" />
      <div class="color-grid">
        <Card
          v-for="card in coloredCards"
          :key="card.tone"
          class="color-card"
          :label="`${card.index} — ${card.kicker} / ${card.tone}`"
          :spine="`var(--${card.tone})`"
        >
          <h3 class="color-card__title">{{ card.title }}</h3>
          <p class="color-card__body">{{ card.body }}</p>
        </Card>
      </div>
      <p class="definition-note">
        These are Cards. The notch owns their metadata and the spine input changes
        color; neither creates a variant, subtype, or second component.
      </p>
    </section>

    <section class="workbench__section">
      <SectionHead index="03" title="Pattern Card" note="Pattern anatomy · Card + Ivory spine + Bar Tape" />
      <div class="pattern-stack">
        <p class="surface-label">List density</p>
        <Card class="pattern-candidate" label="Pattern 01 — Piano / C Major" flush>
          <div class="pattern-row">
            <span class="pattern-number">01</span>
            <span class="pattern-copy">
              <strong>{{ productionPattern.name }}</strong>
              <small>Piano · C major</small>
            </span>
            <small class="pattern-count">14 notes</small>
          </div>
          <template #footer><BarTape :segments="timeline" /></template>
        </Card>

        <p class="surface-label">Focused density</p>
        <Card
          class="pattern-candidate pattern-candidate--focused"
          label="Pattern 01 — Piano / C Major"
        >
          <template #mark><span class="ordinal ordinal--pattern">01</span></template>
          <h3 class="pattern-focus__title">{{ productionPattern.name }}</h3>
          <p class="pattern-focus__meta">14 events · duration weighted</p>
          <div class="pattern-focus__state">
            <span>1 of 4</span>
            <span>Actions remain Pattern Card-owned</span>
          </div>
          <template #footer><BarTape :segments="timeline" /></template>
        </Card>
      </div>
      <p class="definition-note">
        Pattern Card supplies density, identity, actions, selection, and list
        behavior. It inherits the Ivory spine; the musical sequence speaks through
        Bar Tape instead of a second accent color.
      </p>
    </section>

    <section class="workbench__section">
      <details class="reference">
        <summary>Current Pattern Card sources used for comparison</summary>
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
import Card from "../../components/primatives/Card.vue";
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

const coloredCards: Array<{
  index: string;
  tone: "tomato" | "pine" | "mustard";
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
.color-card__title,
.pattern-focus__title {
  margin: 0;
  font-family: var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}
.editorial-title { max-width: 14ch; margin-bottom: 10px; padding-right: 64px; font-size: 19px; line-height: 1.12; }
.editorial-body { max-width: 28ch; margin: 0; color: var(--ivory-3); font: var(--t-body-s); }
.definition-note { margin: 14px 0 0; color: var(--ivory-3); font: var(--t-body-s-mono); }

.color-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; }
.color-card { min-height: 168px; }
.color-card :deep(.system-card__content) { display: flex; flex-direction: column; }
.color-card__title { font-size: 28px; line-height: .9; }
.color-card__body { margin: auto 0 0; color: var(--ivory-3); font: var(--t-body-s-mono); }

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
.reference__patterns { display: grid; gap: 12px; }
.reference__patterns { margin-top: 20px; }

@media (max-width: 640px) {
  .section-head { align-items: start; flex-direction: column; }
  .section-head > p { text-align: left; }
  .color-grid { grid-template-columns: 1fr; }
  .pattern-row { grid-template-columns: 42px minmax(0, 1fr) auto; gap: 8px; padding-right: 10px; padding-left: 12px; }
  .pattern-count { max-width: 6ch; text-align: right; }
  .pattern-focus__state { align-items: start; flex-direction: column; }
}
</style>
