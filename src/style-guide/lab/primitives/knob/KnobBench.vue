<script setup lang="ts">
import { ref, type Component } from "vue";
import type { KnobVisual } from "@/components/primatives/Knob/types";
import LabCell from "../LabCell.vue";
import LabKnob from "./LabKnob.vue";

/**
 * Knob roles and materials. The real Knob is always mounted; `component` (a lab face) swaps only
 * the painted face, `visual` pins a production edition when it is absent.
 */
defineProps<{ component?: Component | null; visual?: KnobVisual }>();

const MODES = ["Ionian", "Dorian", "Phrygian", "Lydian", "Mixolydian", "Aeolian", "Locrian"];
const SHAPES = ["Sine", "Tri", "Saw"];
const volume = ref(64);
const sync = ref(true);
const mode = ref("Phrygian");
const release = ref(3.5);
const latch = ref(false);
const shape = ref("Tri");
const deck = ref([72, 40, 55, 20, 88]);
</script>

<template>
  <div class="plab-bench">
    <LabCell caption="Brass · Range drag, Boolean tap, Options (real modes)">
      <LabKnob v-model="volume" :face="component" :visual="visual" type="range" tone="brass" label="Volume" />
      <LabKnob v-model="sync" :face="component" :visual="visual" type="boolean" tone="brass" label="Sync" />
      <LabKnob v-model="mode" :face="component" :visual="visual" type="options" tone="brass" label="Mode" :options="MODES" />
    </LabCell>
    <LabCell caption="Ivory · Range with unit, Boolean off, three Options">
      <LabKnob
        v-model="release"
        :face="component"
        :visual="visual"
        type="range"
        label="Release"
        :min="0"
        :max="10"
        :step="0.1"
        :format-value="(value: number) => `${value.toFixed(1)}s`"
      />
      <LabKnob v-model="latch" :face="component" :visual="visual" type="boolean" label="Latch" />
      <LabKnob v-model="shape" :face="component" :visual="visual" type="options" label="Shape" :options="SHAPES" />
    </LabCell>
    <LabCell caption="Control Bar density · five Ivory Knobs at 52px" wide>
      <span class="plab-deck">
        <LabKnob
          v-for="(label, index) in ['Key', 'Mode', 'BPM', 'Octave', 'Swing']"
          :key="label"
          v-model="deck[index]"
          :face="component"
          :visual="visual"
          type="range"
          :label="label"
          size="52px"
        />
      </span>
    </LabCell>
    <LabCell caption="Disabled · dependent control while its owner is off">
      <LabKnob :model-value="40" :face="component" :visual="visual" type="range" label="Depth" is-disabled />
    </LabCell>
  </div>
</template>

<style scoped>
.plab-deck {
  display: grid;
  grid-template-columns: repeat(5, 52px);
  gap: var(--s-5);
}

@media (max-width: 420px) {
  .plab-deck { gap: var(--s-3); }
}
</style>
