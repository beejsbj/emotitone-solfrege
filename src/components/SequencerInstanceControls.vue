<script setup lang="ts">
import { ref } from "vue";
import InstrumentSelector from "@/components/InstrumentSelector.vue";
import Knob from "@/components/primatives/Knob/index.vue";
import Button from "@/components/primatives/Button.vue";
import { Play } from "lucide-vue-next";

interface Props {
  sequencerId?: string;
}

const props = defineProps<Props>();

// Inert local state
const instrument = ref("synth");
const themeColors = null as any;
const dynamicStyles = {} as any;

const selectInstrument = (instrumentId: string) => {
  instrument.value = instrumentId;
};
</script>

<template>
  <div
    class="flex flex-col gap-3 rounded-md p-3 bg-black/80 border shadow-lg backdrop-blur-sm"
  >
    <!-- Inert Header Placeholder -->
    <div class="text-xs text-white/60">Sequencer Controls (inactive)</div>

    <!-- Instrument Selector -->
    <div class="w-full">
      <InstrumentSelector
        :current-instrument="instrument"
        :on-select-instrument="selectInstrument"
        :compact="true"
      />
    </div>

    <!-- Control Sections (inert placeholders) -->
    <div class="flex gap-3 items-center">
      <div class="grid justify-items-center gap-1">
        <Button disabled aria-label="Play" title="Play"><Play :size="16" /></Button>
        <span class="text-[10px] text-white/60">Play</span>
      </div>
      <Knob type="range" :model-value="120" label="Vol" :min="0" :max="1" :step="0.1" />
      <Knob type="range" :model-value="4" label="Octave" :min="2" :max="8" :step="1" />
    </div>
  </div>
</template>

<style scoped>
</style>
