<template>
  <AnatomyDisplay
    title="Marks &middot; Decoration Primitive"
    :features="features"
    caption="Marks are flat poster primitives. Structural anchors organize cut-paper surfaces; notation glyphs name musical context. The source owns SVG paths, tone, size, and fill/wire treatment. The specimen owns family panels, legends, and scale/treatment staging."
  >
    <template #hero>
      <div class="hero-pair">
        <Mark name="triangle" tone="brass" size="92" />
        <Mark name="eighth" tone="ivory" size="92" />
      </div>
    </template>

    <VariantGrid title="Families &mdash; Structural anchors">
      <VariantCell
        v-for="mark in structuralMarks"
        :key="mark.name"
        :caption="mark.label"
        stage="ink3"
      >
        <Mark :name="mark.name" :tone="mark.tone" :size="mark.size" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Families &mdash; Notation glyphs">
      <VariantCell
        v-for="mark in notationMarks"
        :key="mark.name"
        :caption="mark.label"
        stage="ink3"
      >
        <Mark :name="mark.name" tone="ivory" size="38" />
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

const structuralMarks: MarkExample[] = [
  { name: "triangle", label: "Triangle", tone: "brass", size: 44 },
  { name: "disk", label: "Disk", tone: "tomato", size: 44 },
  { name: "zigzag", label: "Zigzag", tone: "brass", size: 58 },
  { name: "blade", label: "Blade", tone: "plum", size: 44 },
  { name: "wave", label: "Wave", tone: "ivory", size: 44 },
  { name: "bar", label: "Bar", tone: "ivory-2", size: 56 },
  { name: "diamond", label: "Diamond", tone: "mustard", size: 44 },
  { name: "half-circle", label: "Half-circle", tone: "pine", size: 44 },
];

const notationMarks: MarkExample[] = [
  { name: "eighth", label: "8th", tone: "ivory" },
  { name: "beam", label: "Beam", tone: "ivory" },
  { name: "sharp", label: "Sharp", tone: "ivory" },
  { name: "flat", label: "Flat", tone: "ivory" },
  { name: "accent", label: "Accent", tone: "ivory" },
  { name: "trill", label: "Trill", tone: "ivory" },
  { name: "slur", label: "Slur", tone: "ivory" },
  { name: "fermata", label: "Fermata", tone: "ivory" },
  { name: "staccato", label: "Staccato", tone: "ivory" },
  { name: "grace", label: "Grace", tone: "ivory" },
  { name: "clef", label: "Clef", tone: "ivory" },
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
  { label: "Families", value: "structural anchors and notation glyphs" },
  { label: "Name", value: "one named glyph per source path set" },
  { label: "Tone", value: "ivory, brass, and brand poster colors" },
  { label: "Build", value: "flat SVG paths; no gradients, shadows, or hex fills" },
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
