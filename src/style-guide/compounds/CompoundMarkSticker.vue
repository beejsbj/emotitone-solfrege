<template>
  <AnatomyDisplay
    title="Mark Sticker &middot; Compound"
    :features="features"
    caption="Mark Sticker replaces Kicker by putting an authoritative Mark inside Sticker's cut-paper surface. It may stand alone or carry one short label; it owns no geometry or material of its own."
  >
    <template #hero>
      <div class="hero-pair">
        <MarkSticker mark="eighth" color="tomato">Live · 04</MarkSticker>
        <MarkSticker mark="crescendo" variant="outline" color="ivory" aria-label="Crescendo section" />
      </div>
    </template>

    <VariantGrid title="Usage &mdash; Mark plus short label">
      <VariantCell v-for="example in labelled" :key="example.label" :caption="example.caption">
        <MarkSticker :mark="example.mark" :color="example.color">{{ example.label }}</MarkSticker>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Usage &mdash; Mark only">
      <VariantCell v-for="example in marksOnly" :key="example.mark" :caption="example.caption">
        <MarkSticker :mark="example.mark" :color="example.color" :aria-label="example.caption" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import MarkSticker from "@/components/compounds/MarkSticker.vue";
import type { MarkName } from "@/components/primatives/marks";
import type { StickerColor } from "@/components/primatives/Sticker.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

interface Example {
  mark: MarkName;
  color: StickerColor;
  label?: string;
  caption: string;
}

const labelled: Example[] = [
  { mark: "disk", color: "brass", label: "Measure · 01", caption: "Brass downbeat" },
  { mark: "eighth", color: "tomato", label: "Live · 04", caption: "Tomato eighth" },
  { mark: "wave", color: "pine", label: "Listening", caption: "Pine wave" },
  { mark: "natural", color: "plum", label: "Natural", caption: "Plum natural" },
];

const marksOnly: Example[] = [
  { mark: "quarter", color: "tomato", caption: "Quarter Mark Sticker" },
  { mark: "repeat", color: "pine", caption: "Repeat Mark Sticker" },
  { mark: "crescendo", color: "mustard", caption: "Crescendo Mark Sticker" },
  { mark: "bass-clef", color: "plum", caption: "Bass clef Mark Sticker" },
];

const features = [
  { label: "Class", value: "compound; Mark inside Sticker" },
  { label: "Geometry", value: "Mark registry" },
  { label: "Material", value: "Sticker fill or outline" },
  { label: "Content", value: "Mark only or Mark plus one short label" },
  { label: "Replacement", value: "retires Kicker as a design-system unit" },
];
</script>

<style scoped>
.hero-pair {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: 18px;
  width: 100%;
}
</style>
