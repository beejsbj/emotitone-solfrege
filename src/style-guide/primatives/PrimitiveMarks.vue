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

const allMarks: MarkExample[] = [
  { name: "triangle", label: "Triangle", tone: "brass", size: 44 },
  { name: "disk", label: "Disk", tone: "tomato", size: 44 },
  { name: "zigzag", label: "Zigzag", tone: "brass", size: 58 },
  { name: "blade", label: "Blade", tone: "plum", size: 44 },
  { name: "wave", label: "Wave", tone: "ivory", size: 44 },
  { name: "bar", label: "Bar", tone: "ivory-2", size: 56 },
  { name: "diamond", label: "Diamond", tone: "mustard", size: 44 },
  { name: "half-circle", label: "Half-circle", tone: "pine", size: 44 },
  { name: "star", label: "Star", tone: "tomato", size: 44 },
  { name: "eighth", label: "Eighth", tone: "ivory", size: 44 },
  { name: "beam", label: "Beam", tone: "brass", size: 44 },
  { name: "sharp", label: "Sharp", tone: "tomato", size: 44 },
  { name: "flat", label: "Flat", tone: "pine", size: 44 },
  { name: "accent", label: "Accent", tone: "mustard", size: 44 },
  { name: "trill", label: "Trill", tone: "plum", size: 44 },
  { name: "slur", label: "Slur", tone: "ivory-2", size: 44 },
  { name: "fermata", label: "Fermata", tone: "brass", size: 44 },
  { name: "staccato", label: "Staccato", tone: "tomato", size: 44 },
  { name: "grace", label: "Grace", tone: "pine", size: 44 },
  { name: "clef", label: "Clef", tone: "mustard", size: 44 },
];

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
