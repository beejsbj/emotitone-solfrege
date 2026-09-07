<template>
  <AnatomyDisplay
    title="Control Bar · Instrument Compound"
    :features="features"
    caption="Five controlled Knobs and one directional Harmony Joystick share equal-width slots. The Drawer owns its separate handle."
  >
    <template #hero>
      <div class="control-bar-specimen">
        <ControlBar
          v-model:key-value="keyValue"
          v-model:mode-value="modeValue"
          v-model:bpm="bpm"
          v-model:octave="octave"
          v-model:rows="rows"
          v-model:harmony-value="harmonyValue"
          joystick-visual="analog"
          @harmony-effective="harmonyEffective = $event"
        />
      </div>
    </template>

    <VariantGrid title="Mobile-first spread">
      <VariantCell caption="320px host · all six controls" stage="ink3">
        <div class="control-bar-specimen control-bar-specimen--narrow">
          <ControlBar
            :key-value="keyValue"
            :mode-value="modeValue"
            :bpm="bpm"
            :octave="octave"
            :rows="rows"
            :harmony-value="harmonyValue"
            joystick-visual="analog"
          />
        </div>
      </VariantCell>
      <VariantCell caption="Alternate controlled state" stage="ink3">
        <ControlBar
          key-value="F"
          mode-value="dorian"
          :bpm="96"
          :octave="5"
          :rows="5"
          harmony-value="jazzy7"
          joystick-visual="digital"
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ControlBar from "@/components/compounds/ControlBar.vue";
import type { HarmonyAlteration } from "@/domain/harmony";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const keyValue = ref("C");
const modeValue = ref("major");
const bpm = ref(120);
const octave = ref(4);
const rows = ref(3);
const harmonyValue = ref<HarmonyAlteration>("auto");
const harmonyEffective = ref<HarmonyAlteration>("auto");

const features = [
  { label: "Order", value: "Key · Mode · BPM · Octave · Rows · Harmony" },
  { label: "Layout", value: "five Knobs plus one Joystick across equal-width slots; no horizontal scroller" },
  { label: "Density", value: "no horizontal padding; minimal block space protects Knob anatomy" },
  { label: "Surface", value: "shared translucent instrument-bar plane; stage remains visible behind it" },
  { label: "Source", value: "real controlled Knob primitives and Joystick unique; no production stores in the compound" },
  { label: "Boundary", value: "arrangement only; callers retain state and mutations" },
];
</script>

<style scoped>
.control-bar-specimen {
  width: min(100%, 760px);
}

.control-bar-specimen--narrow {
  width: min(320px, 100%);
}
</style>
