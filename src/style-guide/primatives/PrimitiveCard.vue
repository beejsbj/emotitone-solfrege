<template>
  <AnatomyDisplay
    title="Card &middot; Fundamental Shell"
    :features="features"
    caption="Card is one dark square-edged shell with a notched edge label and a 4px spine. Ivory is the default; other colors are ordinary Card inputs, not named variants. Content anatomy remains consumer-owned."
  >
    <template #hero>
      <Card class="card-specimen card-specimen--hero" label="01 — Stage / Ivory">
        <template #mark>
          <span class="card-specimen__ordinal">01</span>
        </template>
        <h3 class="card-specimen__title">A dark room. Ivory type.</h3>
        <p class="card-specimen__body">
          Everything sits on the dark stage. Ivory at four steps is the only light.
        </p>
      </Card>
    </template>

    <VariantGrid title="Cards &mdash; Spine color inputs">
      <VariantCell
        v-for="card in coloredCards"
        :key="card.tone"
        :caption="`${card.tone} spine`"
      >
        <Card
          class="card-specimen card-specimen--color"
          :label="`${card.index} — ${card.label} / ${card.tone}`"
          :spine="`var(--${card.tone})`"
        >
          <h3 class="card-specimen__title card-specimen__title--color">{{ card.title }}</h3>
          <p class="card-specimen__body card-specimen__body--color">{{ card.body }}</p>
        </Card>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Cards &mdash; Consumer anatomy">
      <VariantCell caption="Optional mark">
        <Card class="card-specimen card-specimen--small" label="02 — Mode / Aeolian">
          <template #mark>
            <span class="card-specimen__glyph" aria-hidden="true">♪</span>
          </template>
          <h3 class="card-specimen__title card-specimen__title--small">Mode picker.</h3>
          <p class="card-specimen__body">Card only positions the mark anchor.</p>
        </Card>
      </VariantCell>
      <VariantCell caption="Flexible content">
        <Card class="card-specimen card-specimen--small" label="03 — Content / Free">
          <div class="card-specimen__free-content">
            <span>Card does not require</span>
            <strong>a title/body recipe</strong>
          </div>
        </Card>
      </VariantCell>
      <VariantCell caption="Footer seam">
        <Card class="card-specimen card-specimen--small" label="04 — Footer / Owned">
          <p class="card-specimen__body">Consumers may attach full-width lower content.</p>
          <template #footer>
            <span class="card-specimen__footer" aria-hidden="true"></span>
          </template>
        </Card>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import Card from "../../components/primatives/Card.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const coloredCards = [
  {
    index: "01",
    tone: "tomato",
    label: "Preset",
    title: "Warm-up",
    body: "A bright entry into the exercise.",
  },
  {
    index: "02",
    tone: "pine",
    label: "Live",
    title: "Listening",
    body: "Quiet status on the same Card.",
  },
  {
    index: "03",
    tone: "mustard",
    label: "Lesson",
    title: "Call & response",
    body: "Color changes; the component does not.",
  },
];

const features = [
  { label: "Panel", value: "ink-3 fill · 1px ink-5 hairline · square geometry" },
  { label: "Spine", value: "4px full-height · Ivory default · color input" },
  { label: "Label", value: "required floating mono label · content supplied by consumer" },
  { label: "Content", value: "unopinionated slot · consumer owns density and hierarchy" },
  { label: "Mark", value: "optional top-right decorative anchor · pointer inert" },
  { label: "Footer", value: "optional full-width lower seam" },
  { label: "Element", value: "article by default · semantic root selectable by consumer" },
  { label: "Rejected", value: "no named color variants, compact, borderless, or inversion modes" },
];
</script>

<style scoped>
.card-specimen { width: 100%; }
.card-specimen--hero { min-height: 190px; }
.card-specimen--color { min-height: 168px; }
.card-specimen--small { min-height: 142px; }
.card-specimen--color :deep(.system-card__content) { display: flex; flex-direction: column; }

.card-specimen__ordinal {
  font: 400 52px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
}

.card-specimen__title {
  max-width: 14ch;
  margin: 0 0 10px;
  padding-right: 64px;
  font: 400 19px/1.12 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.card-specimen__title--color {
  max-width: none;
  padding-right: 0;
  font-size: 28px;
  line-height: .9;
}

.card-specimen__title--small {
  padding-right: 28px;
  font-size: 16px;
}

.card-specimen__body {
  max-width: 28ch;
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-body-s);
}

.card-specimen__body--color {
  margin-top: auto;
  font: var(--t-body-s-mono);
}

.card-specimen__glyph { font-size: 24px; }

.card-specimen__free-content {
  display: grid;
  gap: 8px;
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .12em;
  text-transform: uppercase;
}

.card-specimen__free-content strong {
  color: var(--ivory);
  font: var(--t-h2);
}

.card-specimen__footer {
  display: block;
  height: 4px;
  background: var(--ivory);
}
</style>
