<template>
  <AnatomyDisplay
    title="Knobs &middot; Digital Arc Primitive"
    :features="features"
    caption="The mounted examples are the same production Knob family as Analog Ring, with only the flat Arc treatment changed. Every mark is driven by a real value, option index, or production state."
  >
    <template #hero>
      <Knob
        v-model="rangeValue"
        visual="arc"
        tone="brass"
        type="range"
        label="Volume"
        :min="0"
        :max="100"
      />
    </template>

    <VariantGrid title="Functional Role &mdash; Brass Treatment">
      <VariantCell caption="Range / drag" stage="ink3">
        <Knob
          v-model="rangeValue"
          visual="arc"
          tone="brass"
          type="range"
          label="Volume"
          :min="0"
          :max="100"
        />
      </VariantCell>
      <VariantCell caption="Boolean / full-circle / tap" stage="ink3">
        <Knob
          v-model="booleanValue"
          visual="arc"
          tone="brass"
          type="boolean"
          label="Sync"
        />
      </VariantCell>
      <VariantCell caption="Options / real four-position state" stage="ink3">
        <Knob
          v-model="optionValue"
          visual="arc"
          tone="brass"
          type="options"
          label="Wave"
          :options="options"
        />
      </VariantCell>
      <VariantCell caption="Button / production active state" stage="ink3">
        <Knob
          visual="arc"
          tone="brass"
          type="button"
          label="Live"
          button-text="REC"
          :is-active="buttonActive"
          @click="buttonActive = !buttonActive"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Semantic Treatment &mdash; Ivory">
      <VariantCell caption="Range / same behavior" stage="ink3">
        <Knob
          v-model="ivoryRangeValue"
          visual="arc"
          tone="ivory"
          type="range"
          label="Release"
          :min="0"
          :max="10"
          :step="0.1"
          :format-value="(value) => `${value.toFixed(1)}s`"
        />
      </VariantCell>
      <VariantCell caption="Boolean / full-circle / off" stage="ink3">
        <Knob
          v-model="ivoryBooleanValue"
          visual="arc"
          tone="ivory"
          type="boolean"
          label="Latch"
        />
      </VariantCell>
      <VariantCell caption="Options / real three-position state" stage="ink3">
        <Knob
          v-model="ivoryOptionValue"
          visual="arc"
          tone="ivory"
          type="options"
          label="Shape"
          :options="ivoryOptions"
        />
      </VariantCell>
      <VariantCell caption="Button / loading state" stage="ink3">
        <Knob
          visual="arc"
          tone="ivory"
          type="button"
          label="Render"
          button-text="GO"
          is-loading
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Knob from "../../components/primatives/Knob/index.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const rangeValue = ref(64);
const booleanValue = ref(true);
const optionValue = ref("SQ");
const buttonActive = ref(true);
const ivoryRangeValue = ref(3.5);
const ivoryBooleanValue = ref(false);
const ivoryOptionValue = ref("TRI");

const options = ["SIN", "TRI", "SQ", "SAW"];
const ivoryOptions = ["SIN", "TRI", "SAW"];

const features = [
  { label: "Treatment", value: "arc; flat SVG meter with butt-ended strokes" },
  { label: "Authority", value: "production Knob owns behavior, density, label, and motion" },
  { label: "Range", value: "live 270 degree normalized sweep" },
  { label: "Boolean", value: "full-circle track with production elastic center ball" },
  { label: "Options", value: "real option count, index, center label, and wrap rotation" },
  { label: "Button", value: "full-circle track; no layered half-rings or decorative idle motion" },
  { label: "Tone", value: "brass or ivory is assigned per Knob; explicit colors remain compatible" },
  { label: "Frame", value: "specimen scaffolding only; not part of production anatomy" },
];
</script>
