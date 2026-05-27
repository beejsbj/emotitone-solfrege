<template>
  <AnatomyDisplay
    title="Spine Card &middot; Brand-Marked Shell"
    :features="features"
    caption="SpineCard is the brand-color card shell: one colored spine, one matching Kicker, one stamped headline, and one bottom body. PresetRow is the promoted compound for the action/status row that used to live here."
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

    <VariantGrid title="Compound &mdash; Preset row">
      <VariantCell caption="PresetRow compound &middot; apply action" stage="ink3">
        <PresetRow
          tone="tomato"
          kicker="Soft Glass"
          name="Soft Glass."
          action-label="Apply"
        />
      </VariantCell>
      <VariantCell caption="PresetRow compound &middot; applied state" stage="ink3">
        <PresetRow
          tone="plum"
          kicker="Ambient &middot; bloom"
          name="Ambient."
          meta="Applied"
        />
      </VariantCell>
      <VariantCell caption="PresetRow compound &middot; expiring state" stage="ink3">
        <PresetRow
          tone="mustard"
          kicker="Hot &middot; take"
          name="Pulse Lab."
          meta="2:14 left"
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import SpineCard from "../../components/primatives/SpineCard.vue";
import type { SpineCardTone } from "../../components/primatives/SpineCard.vue";
import PresetRow from "../../components/compounds/PresetRow.vue";
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
  { label: "Boundary", value: "preset rows are promoted to the PresetRow compound" },
  { label: "Rule", value: "one brand color per card" },
];
</script>
