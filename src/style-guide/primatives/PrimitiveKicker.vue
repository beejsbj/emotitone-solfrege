<template>
  <AnatomyDisplay
    title="Kicker &middot; Section Marker Primitive"
    :features="features"
    caption="Kicker is the tiny section marker: one color-bearing dot plus one mono label. The source component owns tone, dot geometry, density, inverse, and dot/label-only forms. The specimen keeps grid staging and tilt theatre local."
  >
    <template #hero>
      <Kicker tone="tomato">Section &middot; 03</Kicker>
    </template>

    <VariantGrid title="Variants &mdash; Brand tones">
      <VariantCell
        v-for="tone in brandTones"
        :key="tone"
        :caption="tone"
      >
        <Kicker :tone="tone">{{ tone }} &middot; {{ toneIndex(tone) }}</Kicker>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Treatments">
      <VariantCell caption="Brass dot">
        <Kicker tone="brass">Live &middot; 01</Kicker>
      </VariantCell>
      <VariantCell caption="Ivory dot">
        <Kicker tone="ivory">Neutral &middot; 02</Kicker>
      </VariantCell>
      <VariantCell caption="Open ring">
        <Kicker tone="open">Open &middot; 03</Kicker>
      </VariantCell>
      <VariantCell caption="Large dot">
        <Kicker tone="tomato" dot="large">Large &middot; 04</Kicker>
      </VariantCell>
      <VariantCell caption="Micro dot">
        <Kicker tone="tomato" dot="micro">Micro</Kicker>
      </VariantCell>
      <VariantCell caption="Dot only">
        <Kicker tone="tomato" form="dot">Hidden</Kicker>
      </VariantCell>
      <VariantCell caption="Label only">
        <Kicker tone="tomato" form="label">Label &middot; 07</Kicker>
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Axis and density">
      <VariantCell caption="Vertical bar">
        <Kicker tone="tomato" dot="bar-v">Vert &middot; 01</Kicker>
      </VariantCell>
      <VariantCell caption="Horizontal bar">
        <Kicker tone="plum" dot="bar-h">Horz &middot; 04</Kicker>
      </VariantCell>
      <VariantCell caption="Dense track">
        <Kicker tone="mustard" density="dense">Tight</Kicker>
      </VariantCell>
      <VariantCell caption="Airy track">
        <Kicker tone="mustard" density="airy">Wide</Kicker>
      </VariantCell>
      <VariantCell caption="Inverse on bone" stage="bone">
        <Kicker tone="tomato" inverse>Inverse &middot; 04</Kicker>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import Kicker from "../../components/primatives/Kicker.vue";
import type { KickerTone } from "../../components/primatives/Kicker.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const brandTones: KickerTone[] = ["tomato", "pine", "plum", "mustard", "bone"];

const toneIndex = (tone: KickerTone) =>
  String(brandTones.indexOf(tone) + 1).padStart(2, "0");

const features = [
  { label: "Root", value: "inline-flex · 8px gap · uppercase mono marker" },
  { label: "Dot", value: "8px square default · tone drives color" },
  { label: "Label", value: "mono 9px · ivory-3 · tracking-label" },
  { label: "Tone", value: "brand colors plus brass, ivory, and open ring" },
  { label: "Dot axis", value: "square, micro, large, vertical bar, horizontal bar" },
  { label: "Density", value: "dense/default/airy letter spacing" },
  { label: "Form", value: "full, dot-only, label-only" },
  { label: "Rule", value: "one kicker per section/panel line" },
];
</script>
