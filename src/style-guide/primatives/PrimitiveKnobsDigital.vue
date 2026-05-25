<template>
  <AnatomyDisplay
    title="Knobs &middot; Digital Arc Primitive"
    :features="features"
    caption="Digital knobs use the same source Knob primitive with the arc visual. The source owns SVG track grammar, butt caps, value stroke, brass/ivory treatment, center glyph/value, and beat-timed button segment."
  >
    <template #hero>
      <Knob visual="arc" role="range" value-label="64" size="hero" lit />
    </template>

    <VariantGrid title="Functional Role &mdash; With Brass">
      <VariantCell
        v-for="knob in roleKnobs"
        :key="knob.role"
        :caption="knob.caption"
        stage="ink3"
      >
        <Knob
          visual="arc"
          :role="knob.role"
          :label="knob.label"
          :sublabel="knob.sublabel"
          :foot="knob.foot"
          :value-label="knob.valueLabel"
          :lit="knob.lit"
          framed
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Treatment &mdash; Ivory Only">
      <VariantCell
        v-for="knob in roleKnobs"
        :key="`ivory-${knob.role}`"
        :caption="`${knob.caption} / ivory`"
        stage="ink3"
      >
        <Knob
          visual="arc"
          :role="knob.role"
          tone="ivory"
          :label="knob.label"
          :sublabel="`${knob.sublabel} / ivory`"
          :foot="knob.foot"
          :value-label="knob.valueLabel"
          :lit="knob.lit"
          framed
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import Knob from "../../components/primatives/Knob.vue";
import type { KnobRole } from "../../components/primatives/Knob.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

interface KnobExample {
  role: KnobRole;
  label: string;
  sublabel: string;
  foot: string;
  valueLabel: string;
  caption: string;
  lit?: boolean;
}

const roleKnobs: KnobExample[] = [
  { role: "range", label: "Arc", sublabel: "Range", foot: "Volume", valueLabel: "64", caption: "Range", lit: true },
  { role: "boolean", label: "Arc", sublabel: "Boolean", foot: "Sync", valueLabel: "", caption: "Boolean", lit: true },
  { role: "options", label: "Arc", sublabel: "Options", foot: "Wave", valueLabel: "SQ", caption: "Options" },
  { role: "button", label: "Arc", sublabel: "Button", foot: "Live", valueLabel: "", caption: "Button" },
];

const features = [
  { label: "Visual", value: "arc; flat SVG sweep with 270 degree range track" },
  { label: "Track", value: "2px background stroke and 8px value stroke" },
  { label: "Stroke", value: "butt caps and miter joins from the source recipe" },
  { label: "Role", value: "range, boolean, options, or button" },
  { label: "Signal", value: "one brass mark only: value arc, ball, or segment" },
  { label: "Tone", value: "brass or ivory treatment on the same anatomy" },
  { label: "Motion", value: "button segment spins at beat x5; reduced motion stops it" },
  { label: "Boundary", value: "style-guide visual primitive, not production knob control" },
];
</script>
