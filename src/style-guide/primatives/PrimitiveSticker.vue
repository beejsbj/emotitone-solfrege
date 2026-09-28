<template>
  <AnatomyDisplay
    title="Sticker &middot; Decoration Primitive"
    :features="features"
    caption="Outline and fill are applied paper stuck onto the hardware. Each mounted Sticker draws one paper at random — cut paper, torn tape, or a rubber stamp — with its own geometry, so every reload is a slightly different pressing; the paper prop pins one. They share the full color vocabulary and an optional leading or trailing Mark. Badge is Brass hardware, not paper: fixed geometry and a closed material API, Brass sheen by default, with Ivory reserved for Joystick's committed-latch state."
  >
    <template #hero>
      <Sticker variant="outline" color="ivory">Piano</Sticker>
    </template>

    <VariantGrid
      v-for="paper in papers"
      :key="`playing-${paper.value}`"
      :title="`Paper — ${paper.label} · playing zone`"
    >
      <template v-for="color in playingColors" :key="`${paper.value}-${color.value}`">
        <VariantCell :caption="`${paper.label} · ${color.label} outline`">
          <Sticker variant="outline" :paper="paper.value" :color="color.value">{{ color.label }}</Sticker>
        </VariantCell>
        <VariantCell :caption="`${paper.label} · ${color.label} fill`">
          <Sticker variant="fill" :paper="paper.value" :color="color.value">{{ color.label }}</Sticker>
        </VariantCell>
      </template>
    </VariantGrid>

    <VariantGrid
      v-for="paper in papers"
      :key="`brand-${paper.value}`"
      :title="`Paper — ${paper.label} · brand zone`"
    >
      <template v-for="color in brandColors" :key="`brand-${paper.value}-${color.value}`">
        <VariantCell :caption="`${paper.label} · ${color.label} outline`">
          <Sticker variant="outline" :paper="paper.value" :color="color.value">{{ color.label }}</Sticker>
        </VariantCell>
        <VariantCell :caption="`${paper.label} · ${color.label} fill`">
          <Sticker variant="fill" :paper="paper.value" :color="color.value">{{ color.label }}</Sticker>
        </VariantCell>
      </template>
    </VariantGrid>

    <VariantGrid title="Content &mdash; Optional Mark">
      <VariantCell caption="Leading Mark &middot; filled Sticker">
        <Sticker variant="fill" color="ivory" mark="eighth">Live &middot; 04</Sticker>
      </VariantCell>
      <VariantCell caption="Trailing Mark &middot; outlined Sticker">
        <Sticker variant="outline" color="ivory" mark="repeat" mark-position="after">Repeat</Sticker>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Badge">
      <VariantCell caption="Brass sheen edge &middot; brass sheen text">
        <Sticker variant="badge">Signal</Sticker>
      </VariantCell>
      <VariantCell caption="Ivory body &middot; Ink edge and text">
        <Sticker variant="badge" color="ivory">Latched</Sticker>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import Sticker from "../../components/primatives/Sticker";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const papers = [
  { label: "Cut", value: "cut" },
  { label: "Tape", value: "tape" },
  { label: "Stamp", value: "stamp" },
] as const;

/* Gallery grouping; production consumers retain their existing color choices. */
const playingColors = [
  { label: "Ink", value: "ink" },
  { label: "Ink-5", value: "ink-5" },
  { label: "Ivory", value: "ivory" },
  { label: "Brass", value: "brass" },
  { label: "Brass sheen", value: "brass-sheen" },
  { label: "Brass glow", value: "brass-glow" },
  { label: "Brass sheen glow", value: "brass-sheen-glow" },
] as const;

const brandColors = [
  { label: "Tomato", value: "tomato" },
  { label: "Mustard", value: "mustard" },
  { label: "Plum", value: "plum" },
  { label: "Cobalt", value: "cobalt" },
  { label: "Pine", value: "pine" },
  { label: "Bone", value: "bone" },
] as const;

const features = [
  { label: "Variants", value: "outline · fill · badge" },
  { label: "Color", value: "applies to outline wire or fill surface" },
  { label: "Outline", value: "cut wire · tape edge bands · stamp double rule" },
  { label: "Fill", value: "color surface · tape fibre · stamp inner rule" },
  { label: "Mark", value: "optional leading or trailing Mark · inherits foreground color" },
  { label: "Badge", value: "fixed geometry · Brass sheen default or Ivory committed-latch state" },
  { label: "Paper", value: "cut · tape · stamp — one drawn at random per mount; paper prop pins it; never Badge" },
  { label: "Tape", value: "torn ends · fibre grain · random tilt · outline = Ink strip colored on its long edges" },
  { label: "Stamp", value: "worn speckled ink · crooked tilt · outline = double rule · fill = inked block with inner rule" },
  { label: "Geometry", value: "randomized per paper for outline + fill only; Badge stays fixed" },
];
</script>
