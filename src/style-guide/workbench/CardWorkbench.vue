<template>
  <main class="workbench">
    <header class="workbench__header">
      <p class="workbench__eyebrow">Accepted foundation · one shared source</p>
      <h1>Card.vue</h1>
      <p>
        The selected first CardShell recipe is now Card. Colored Cards below render
        through the same authoritative source.
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

  </main>
</template>

<script setup lang="ts">
import { defineComponent, h } from "vue";
import Card from "../../components/primatives/Card.vue";

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
.section-head p {
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
.color-card__title {
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

@media (max-width: 640px) {
  .section-head { align-items: start; flex-direction: column; }
  .section-head > p { text-align: left; }
  .color-grid { grid-template-columns: 1fr; }
}
</style>
