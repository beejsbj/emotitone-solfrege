<template>
  <AnatomyDisplay
    title="Spine Card &middot; Brand-Marked Shell"
    :features="features"
    caption="SpineCard is the brand-color card shell: one colored spine, one matching Kicker, one stamped headline, and one bottom body. The preset row remains gate-parked as a compound/control-row candidate."
  >
    <template #hero>
      <SpineCard
        tone="tomato"
        kicker="Section &middot; 03"
        stamp="Danger."
        body="Kicker dot, danger badge, brand splash on hero."
      />
    </template>

    <VariantGrid title="Variants &mdash; Brand tones">
      <VariantCell
        v-for="card in brandCards"
        :key="card.tone"
        :caption="card.tone"
      >
        <SpineCard v-bind="card" compact />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Gate-Parked &mdash; Preset row">
      <VariantCell caption="Compound candidate &middot; apply action" stage="ink3">
        <div class="preset-row-demo preset-row-demo--tomato">
          <Kicker tone="tomato">Soft Glass</Kicker>
          <span class="preset-row-demo__name">Soft Glass.</span>
          <button class="preset-row-demo__button">Apply</button>
        </div>
      </VariantCell>
      <VariantCell caption="Compound candidate &middot; applied state" stage="ink3">
        <div class="preset-row-demo preset-row-demo--plum">
          <Kicker tone="plum">Ambient &middot; bloom</Kicker>
          <span class="preset-row-demo__name">Ambient.</span>
          <span class="preset-row-demo__meta">Applied</span>
        </div>
      </VariantCell>
      <VariantCell caption="Compound candidate &middot; expiring state" stage="ink3">
        <div class="preset-row-demo preset-row-demo--mustard">
          <Kicker tone="mustard">Hot &middot; take</Kicker>
          <span class="preset-row-demo__name">Pulse Lab.</span>
          <span class="preset-row-demo__meta">2:14 left</span>
        </div>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import SpineCard from "../../components/primatives/SpineCard.vue";
import type { SpineCardTone } from "../../components/primatives/SpineCard.vue";
import Kicker from "../../components/primatives/Kicker.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

interface SpineCardExample {
  tone: SpineCardTone;
  kicker: string;
  stamp: string;
  body: string;
}

const brandCards: SpineCardExample[] = [
  {
    tone: "tomato",
    kicker: "Section &middot; 03",
    stamp: "Danger.",
    body: "Kicker dot, danger badge, brand splash on hero.",
  },
  {
    tone: "pine",
    kicker: "Live &middot; demo",
    stamp: "Live.",
    body: "Quiet running marker, classroom preset spine.",
  },
  {
    tone: "plum",
    kicker: "Ambient &middot; bloom",
    stamp: "Ambient.",
    body: "Visual-preset spine, decorative scrap accent.",
  },
  {
    tone: "bone",
    kicker: "Brand &middot; sticker",
    stamp: "Brand.",
    body: "Hero background, sticker face, paper-on-stage panel.",
  },
  {
    tone: "mustard",
    kicker: "Hot &middot; take",
    stamp: "Hot.",
    body: "Record button, sticker scrap, capture moment.",
  },
];

const features = [
  { label: "Panel", value: "ink-2 · 1px hairline · bone tone lifts to ink-3" },
  { label: "Spine", value: "4px full-height brand strip · one color per card" },
  { label: "Kicker", value: "composes Kicker with matching tone" },
  { label: "Stamp", value: "Jazz display · 32px · period-terminated" },
  { label: "Body", value: "mono 11px · ivory-3 · pinned to bottom" },
  { label: "Compact", value: "144px minimum · 22px stamp · grid specimen mode" },
  { label: "Boundary", value: "preset rows are compound candidates, not primitive source" },
  { label: "Rule", value: "one brand color per card" },
];
</script>

<style scoped>
.preset-row-demo {
  --preset-row-spine: var(--tomato);
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  padding: 10px 12px 10px 16px;
  background: var(--ink-2);
  border: 1px solid var(--hairline);
}

.preset-row-demo::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  background: var(--preset-row-spine);
}

.preset-row-demo--tomato {
  --preset-row-spine: var(--tomato);
}

.preset-row-demo--plum {
  --preset-row-spine: var(--plum);
}

.preset-row-demo--mustard {
  --preset-row-spine: var(--mustard);
}

.preset-row-demo__name {
  flex: 1;
  min-width: 0;
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: var(--tracking-display);
  line-height: .95;
  text-transform: uppercase;
}

.preset-row-demo__button {
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid var(--hairline);
  background: transparent;
  color: var(--ivory-3);
  cursor: pointer;
  font: 700 10px var(--font-display);
  letter-spacing: .14em;
  text-transform: uppercase;
  transition:
    color var(--dur-tap) var(--ease-brush),
    border-color var(--dur-tap) var(--ease-brush);
}

.preset-row-demo__button:hover {
  color: var(--ivory);
}

.preset-row-demo__meta {
  flex-shrink: 0;
  margin-left: 8px;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
}
</style>
