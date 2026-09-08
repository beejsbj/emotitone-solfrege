<template>
  <AnatomyDisplay
    title="Marks &middot; Decoration Primitive"
    :features="features"
    caption="Mark is one flat poster family. Structural silhouettes and musical glyphs are equal members of the same renderer-neutral geometry registry; context decides whether a Mark is displayed, beaten, or released as a particle."
  >
    <template #hero>
      <div class="hero-pair">
        <Mark name="triangle" tone="brass" size="92" />
        <Mark name="eighth" tone="ivory" size="92" />
      </div>
    </template>

    <VariantGrid title="Family &mdash; all Marks">
      <VariantCell
        v-for="mark in allMarks"
        :key="mark.name"
        :caption="mark.label"
        stage="ink3"
      >
        <Mark :name="mark.name" :tone="mark.tone" :size="mark.size" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Treatments &mdash; Star proof">
      <VariantCell
        v-for="mark in treatmentMarks"
        :key="`${mark.tone}-${mark.treatment}`"
        :caption="mark.label"
        stage="ink3"
      >
        <Mark name="star" :tone="mark.tone" :treatment="mark.treatment" size="52" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Scale &mdash; Star proof">
      <VariantCell
        v-for="size in scaleSizes"
        :key="size"
        :caption="`${size}px`"
        stage="ink3"
      >
        <Mark name="star" tone="ivory" :size="size" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import Mark from "../../components/primatives/Mark.vue";
import type { MarkName, MarkTone, MarkTreatment } from "../../components/primatives/Mark.vue";
import { MARK_NAMES } from "../../components/primatives/marks";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

interface MarkExample {
  name: MarkName;
  label: string;
  tone: MarkTone;
  size?: number;
}

interface TreatmentExample {
  tone: MarkTone;
  treatment: MarkTreatment;
  label: string;
}

const markTones: MarkTone[] = ["brass", "tomato", "plum", "ivory", "mustard", "pine", "ivory-2"];
const wideMarks = new Set<MarkName>(["zigzag", "bar", "crescendo"]);

const allMarks: MarkExample[] = MARK_NAMES.map((name, index) => ({
  name,
  label: name.replace(/-/g, " "),
  tone: markTones[index % markTones.length],
  size: wideMarks.has(name) ? 58 : 44,
}));

const treatmentMarks: TreatmentExample[] = [
  { tone: "ivory", treatment: "fill", label: "Ivory fill" },
  { tone: "brass", treatment: "fill", label: "Brass lit" },
  { tone: "tomato", treatment: "fill", label: "Tomato brand" },
  { tone: "plum", treatment: "fill", label: "Plum brand" },
  { tone: "mustard", treatment: "fill", label: "Mustard brand" },
  { tone: "ivory", treatment: "wire", label: "Wire outline" },
];

const scaleSizes = [14, 28, 56, 96];

const features = [
  { label: "Role", value: "decorative mark; never active control" },
  { label: "Family", value: "structural and musical Marks together" },
  { label: "Name", value: "one named glyph per source path set" },
  { label: "Tone", value: "ivory, brass, and brand poster colors" },
  { label: "Build", value: "one path registry feeds SVG and canvas renderers" },
  { label: "Treatment", value: "fill or wire; wire uses butt caps and miter joins" },
  { label: "Scale", value: "size prop covers inline through hero usage" },
  { label: "Rule", value: "one mark per slot" },
];
</script>

<style scoped>
.hero-pair {
  display: grid;
  grid-template-columns: 1fr 1fr;
  width: 100%;
  gap: 12px;
}

.hero-pair :deep(.mark) {
  place-self: center;
}
</style>
