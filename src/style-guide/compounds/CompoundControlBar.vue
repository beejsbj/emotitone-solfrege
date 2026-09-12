<template>
  <AnatomyDisplay
    title="Control Bar · Instrument Compound"
    :features="features"
    caption="Five controlled Knobs and one directional Harmony Joystick share equal-width slots. The Drawer handle owns keyboard sizing."
  >
    <template #hero>
      <div class="control-bar-specimen">
        <ControlBar
          v-model:key-value="keyValue"
          v-model:mode-value="modeValue"
          v-model:bpm="bpm"
          v-model:octave="octave"
          v-model:play-mode="playMode"
          v-model:harmony-value="harmonyValue"
          :change-signals="changeSignals"
          joystick-visual="analog"
          @harmony-effective="harmonyEffective = $event"
        />
        <button class="context-load" type="button" @click="loadAlternatePattern">
          Load alternate pattern context
        </button>
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
            v-model:play-mode="playMode"
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
          play-mode="arp-up-down:16"
          harmony-value="jazzy7"
          joystick-visual="digital"
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import ControlBar from "@/components/compounds/ControlBar.vue";
import type { HarmonyAlteration } from "@/domain/harmony";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const keyValue = ref("C");
const modeValue = ref("major");
const bpm = ref(120);
const octave = ref(4);
const playMode = ref("together");
const harmonyValue = ref<HarmonyAlteration>("auto");
const harmonyEffective = ref<HarmonyAlteration>("auto");
const changeSignals = reactive({ key: 0, mode: 0, bpm: 0, octave: 0 });
let alternateContext = false;

function loadAlternatePattern() {
  alternateContext = !alternateContext;
  keyValue.value = alternateContext ? "D" : "C";
  modeValue.value = alternateContext ? "minor" : "major";
  bpm.value = alternateContext ? 96 : 120;
  octave.value = alternateContext ? 5 : 4;
  for (const control of ["key", "mode", "bpm", "octave"] as const) {
    changeSignals[control] += 1;
  }
}

const features = [
  { label: "Order", value: "Key · Mode · BPM · Octave · Style · Harmony" },
  { label: "Layout", value: "five Knobs plus one Joystick across equal-width slots; no horizontal scroller" },
  { label: "Density", value: "no horizontal padding; outer hardware aligns to an 8px inset" },
  { label: "Motion", value: "only controls changed by a loaded Pattern receive the shared elastic face rebound" },
  { label: "Surface", value: "shared translucent instrument-bar plane; stage remains visible behind it" },
  { label: "Source", value: "real controlled Knob primitives and Joystick unique; no production stores in the compound" },
  { label: "Boundary", value: "arrangement only; callers retain musical state while Drawer owns row sizing" },
];
</script>

<style scoped>
.control-bar-specimen {
  width: min(100%, 760px);
}

.control-bar-specimen--narrow {
  width: min(320px, 100%);
}

.context-load {
  margin-top: var(--s-4);
  padding: var(--s-3) var(--s-4);
  border: 1px solid var(--ivory-4);
  background: var(--ink-2);
  color: var(--ivory-2);
  cursor: pointer;
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
}

.context-load:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: 2px;
}
</style>
