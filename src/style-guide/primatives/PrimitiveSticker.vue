<template>
  <AnatomyDisplay
    title="Sticker &middot; Decoration Primitive"
    :features="features"
    caption="Outline and fill share the full color vocabulary, accept an optional leading or trailing Mark, and receive randomized cut-paper geometry. Badge keeps fixed geometry: Brass is its default signal material, while Ivory is the committed-latch state used by Joystick."
  >
    <template #hero>
      <Sticker variant="outline" color="ivory">Piano</Sticker>
    </template>

    <VariantGrid title="Variants &mdash; Outline color">
      <VariantCell
        v-for="color in stickerColors"
        :key="`outline-${color.value}`"
        :caption="`${color.label} outline`"
      >
        <Sticker variant="outline" :color="color.value">{{ color.label }}</Sticker>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Fill color">
      <VariantCell
        v-for="color in stickerColors"
        :key="`fill-${color.value}`"
        :caption="`${color.label} fill`"
      >
        <Sticker variant="fill" :color="color.value">{{ color.label }}</Sticker>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Content &mdash; Optional Mark">
      <VariantCell caption="Leading Mark &middot; filled Sticker">
        <Sticker variant="fill" color="tomato" mark="eighth">Live &middot; 04</Sticker>
      </VariantCell>
      <VariantCell caption="Trailing Mark &middot; outlined Sticker">
        <Sticker variant="outline" color="ivory" mark="repeat" mark-position="after">Repeat</Sticker>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Badge">
      <VariantCell caption="Brass sheen edge &middot; brass sheen text">
        <Sticker variant="badge" color="brass-sheen">Signal</Sticker>
      </VariantCell>
      <VariantCell caption="Ivory body &middot; Ink edge and text">
        <Sticker variant="badge" color="ivory">Latched</Sticker>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import Sticker from "../../components/primatives/Sticker.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const stickerColors = [
  { label: "Ink", value: "ink" },
  { label: "Ink-5", value: "ink-5" },
  { label: "Ivory", value: "ivory" },
  { label: "Brass", value: "brass" },
  { label: "Brass sheen", value: "brass-sheen" },
  { label: "Brass glow", value: "brass-glow" },
  { label: "Brass sheen glow", value: "brass-sheen-glow" },
  { label: "Tomato", value: "tomato" },
  { label: "Pine", value: "pine" },
  { label: "Plum", value: "plum" },
  { label: "Bone", value: "bone" },
  { label: "Mustard", value: "mustard" },
] as const;

const features = [
  { label: "Variants", value: "outline · fill · badge" },
  { label: "Color", value: "applies to outline wire or fill surface" },
  { label: "Outline", value: "transparent fill · 1px color wire · ivory wordmark" },
  { label: "Fill", value: "color surface · no outline / border" },
  { label: "Mark", value: "optional leading or trailing Mark · inherits foreground color" },
  { label: "Badge", value: "fixed geometry · Brass signal or Ivory committed-latch state" },
  { label: "Geometry", value: "randomized transform / clip-path / shadow for outline + fill only" },
];
</script>
