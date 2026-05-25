<template>
  <AnatomyDisplay
    title="Knobs &middot; Analog Ring Primitive"
    :features="features"
    caption="Analog knobs use the shared Knob primitive with the ring visual. The source owns the knob frame, label/footer anatomy, role states, brass/ivory treatment, disabled treatment, played glow, and beat-timed button motion. The specimen only groups ring examples."
  >
    <template #hero>
      <Knob visual="ring" role="range" value-label="64" size="hero" lit />
    </template>

    <VariantGrid title="Functional Role &mdash; With Brass">
      <VariantCell
        v-for="knob in roleKnobs"
        :key="knob.role"
        :caption="knob.caption"
        stage="ink3"
      >
        <Knob
          visual="ring"
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
          visual="ring"
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
  { role: "range", label: "Ring", sublabel: "Range", foot: "Volume", valueLabel: "64", caption: "Range", lit: true },
  { role: "boolean", label: "Ring", sublabel: "Boolean", foot: "Sync", valueLabel: "ON", caption: "Boolean", lit: true },
  { role: "options", label: "Ring", sublabel: "Options", foot: "Wave", valueLabel: "SQ", caption: "Options" },
  { role: "button", label: "Ring", sublabel: "Button", foot: "Live", valueLabel: "REC", caption: "Button", lit: true },
];

const features = [
  { label: "Visual", value: "ring; radial-gradient dome body with conic sweep" },
  { label: "Body", value: "ink-4 to ink-2 dome with ink-5 border" },
  { label: "Role", value: "range, boolean, options, or button" },
  { label: "Tone", value: "brass marks lit value; ivory-only removes brass signal" },
  { label: "Motion", value: "button sweep spins at beat x5; reduced motion stops it" },
  { label: "State", value: "lit, played glow, and disabled treatment live in source" },
  { label: "Frame", value: "optional source-owned label and foot anatomy" },
  { label: "Boundary", value: "style-guide visual primitive, not production knob control" },
];
</script>
