<template>
  <AnatomyDisplay
    title="Sticker &middot; Decoration Primitive"
    :features="features"
    caption="Outline, fill, and badge share the same color vocabulary. Outline and fill receive randomized cut-paper geometry per instance; badge keeps fixed geometry and applies color to the edge and text."
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

    <VariantGrid title="Variants &mdash; Badge">
      <VariantCell caption="Brass sheen edge &middot; brass sheen text">
        <Sticker variant="badge" color="brass-sheen">Signal</Sticker>
      </VariantCell>
      <VariantCell caption="Tomato edge &middot; tomato text">
        <Sticker variant="badge" color="tomato">Alert</Sticker>
      </VariantCell>
      <VariantCell caption="Pine edge &middot; pine text">
        <Sticker variant="badge" color="pine">Live</Sticker>
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
  { label: "Badge", value: "fixed geometry · color controls edge and text" },
  { label: "Geometry", value: "randomized transform / clip-path / shadow for outline + fill only" },
];
</script>
