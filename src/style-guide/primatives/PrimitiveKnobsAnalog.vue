<template>
  <AnatomyDisplay
    title="Knobs &middot; Analog Ring Primitive"
    :features="features"
    caption="The mounted examples are the production Knob family driven by live values and states. The gallery supplies only the surrounding specimen cells; compact anatomy, labels, roles, gestures, and motion come from production."
  >
    <template #hero>
      <Knob
        v-model="rangeValue"
        visual="ring"
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
          visual="ring"
          tone="brass"
          type="range"
          label="Volume"
          :min="0"
          :max="100"
        />
      </VariantCell>
      <VariantCell caption="Boolean / tap" stage="ink3">
        <Knob
          v-model="booleanValue"
          visual="ring"
          tone="brass"
          type="boolean"
          label="Sync"
        />
      </VariantCell>
      <VariantCell caption="Options / real four-position state" stage="ink3">
        <Knob
          v-model="optionValue"
          visual="ring"
          tone="brass"
          type="options"
          label="Wave"
          :options="options"
        />
      </VariantCell>
      <VariantCell caption="Button / active state" stage="ink3">
        <Knob
          visual="ring"
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
          visual="ring"
          tone="ivory"
          type="range"
          label="Release"
          :min="0"
          :max="10"
          :step="0.1"
          :format-value="(value) => `${value.toFixed(1)}s`"
        />
      </VariantCell>
      <VariantCell caption="Boolean / off" stage="ink3">
        <Knob
          v-model="ivoryBooleanValue"
          visual="ring"
          tone="ivory"
          type="boolean"
          label="Latch"
        />
      </VariantCell>
      <VariantCell caption="Options / real three-position state" stage="ink3">
        <Knob
          v-model="ivoryOptionValue"
          visual="ring"
          tone="ivory"
          type="options"
          label="Shape"
          :options="ivoryOptions"
        />
      </VariantCell>
      <VariantCell caption="Button / loading state" stage="ink3">
        <Knob
          visual="ring"
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
import { Knob } from "../../components/knobs";
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
  { label: "Treatment", value: "ring; seated dome with a tactile rounded meter" },
  { label: "Authority", value: "production Knob owns behavior, density, label, and motion" },
  { label: "Range", value: "live 270 degree normalized sweep" },
  { label: "Boolean", value: "full-circle track with production elastic center ball" },
  { label: "Options", value: "real option count, index, center label, and wrap rotation" },
  { label: "Button", value: "full-circle track with active/loading-driven presentation" },
  { label: "Tone", value: "brass or ivory is assigned per Knob; explicit colors remain compatible" },
  { label: "Frame", value: "specimen scaffolding only; not part of production anatomy" },
];
</script>
