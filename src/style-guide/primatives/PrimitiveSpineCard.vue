<template>
  <AnatomyDisplay
    title="Spine Card &middot; Brand-Marked Shell"
    :features="features"
    caption="SpineCard is the brand-color card shell: one colored spine, one matching Kicker, one stamped headline, and one bottom body. Action rows stay as SpineCard usage, not a separate compound."
  >
    <template #hero>
      <SpineCard
        tone="tomato"
        kicker="Section &middot; 03"
        stamp="Tomato."
        body="Kicker dot, poster color, brand splash on hero."
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

    <VariantGrid title="Variants &mdash; Action slot">
      <VariantCell caption="SpineCard with filled action" stage="ink3">
        <SpineCard
          tone="tomato"
          kicker="Soft Glass"
          stamp="Soft Glass."
        >
          <span class="spine-card-demo__copy">Preset card with a filled action, not a new row component.</span>
          <button class="spine-card-demo__button" type="button">Apply</button>
        </SpineCard>
      </VariantCell>
      <VariantCell caption="SpineCard status copy" stage="ink3">
        <SpineCard
          tone="plum"
          kicker="Ambient &middot; bloom"
          stamp="Ambient."
        >
          <span class="spine-card-demo__copy">Applied. Keep the structure card-shaped unless repetition proves a compound.</span>
        </SpineCard>
      </VariantCell>
      <VariantCell caption="SpineCard timed copy" stage="ink3">
        <SpineCard
          tone="mustard"
          kicker="Hot &middot; take"
          stamp="Pulse Lab."
        >
          <span class="spine-card-demo__copy">2:14 left. This is content inside the card, not a separate preset-row grammar.</span>
        </SpineCard>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import SpineCard from "../../components/primatives/SpineCard.vue";
import type { SpineCardTone } from "../../components/primatives/SpineCard.vue";
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
    stamp: "Tomato.",
    body: "Kicker dot, poster color, brand splash on hero.",
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
  { label: "Boundary", value: "preset/action rows stay SpineCard usage until repetition proves a compound" },
  { label: "Rule", value: "one brand color per card" },
];
</script>

<style scoped>
.spine-card-demo__copy {
  display: block;
  margin-bottom: 12px;
}

.spine-card-demo__button {
  appearance: none;
  border: 0;
  background: var(--ivory);
  color: var(--ink);
  cursor: pointer;
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  padding: 7px 12px;
  text-transform: uppercase;
}

.spine-card-demo__button:hover,
.spine-card-demo__button:focus-visible {
  background: var(--bone);
  outline: none;
}
</style>
