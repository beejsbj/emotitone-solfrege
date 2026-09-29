<script setup lang="ts">
import { computed, ref, type Component } from "vue";
import Knob from "@/components/primatives/Knob/index.vue";
import type { JoystickVisual } from "@/components/uniques/Joystick/edition";
import { JOYSTICK_OPTIONS } from "@/components/uniques/Joystick/joystickOptions";
import type { HarmonyAlteration } from "@/domain/harmony";
import LabCell from "../LabCell.vue";
import LabJoystick from "./LabJoystick.vue";

/**
 * Joystick states through the real source. `face` swaps only the painted face;
 * `editions` lists which production editions the sheet shows.
 */
const props = withDefaults(defineProps<{ face?: Component | null; editions?: JoystickVisual[] }>(), {
  face: null,
  editions: () => ["analog", "digital"],
});

const live = ref<HarmonyAlteration>("auto");
const slot = ref<HarmonyAlteration>("jazzy7");
const bpm = ref(96);
const liveLabel = computed(() => JOYSTICK_OPTIONS.find((option) => option.value === live.value)?.label);
const STATES: { value: HarmonyAlteration; caption: string }[] = [
  { value: "auto", caption: "Automatic" },
  { value: "jazzy7", caption: "Latched · Jazzy" },
  { value: "augmented", caption: "Latched · Dreamy (diagonal)" },
];
</script>

<template>
  <div class="ulab-bench">
    <LabCell
      v-for="visual in props.editions"
      :key="`live-${visual}`"
      :caption="`${visual === 'analog' ? 'Analog' : 'Digital'} · live: drag to preview, release to latch, hold to restore, tap to return to Automatic · ${liveLabel}`"
      tall
    >
      <LabJoystick v-model="live" :face="face" :visual="visual" size="112px" :data-lab-joystick="`live-${visual}`" />
    </LabCell>
    <LabCell
      v-for="visual in props.editions"
      :key="`states-${visual}`"
      :caption="`${visual === 'analog' ? 'Analog' : 'Digital'} states · ${STATES.map((item) => item.caption).join(' · ')}`"
    >
      <LabJoystick
        v-for="item in STATES"
        :key="item.value"
        :model-value="item.value"
        :face="face"
        :visual="visual"
        size="64px"
      />
    </LabCell>
    <LabCell caption="Control Bar slot · beside an Ivory LED-collar Analog Knob at the same size (compare the wells)" wide>
      <span class="ulab-slot">
        <Knob v-model="bpm" type="range" visual="ring" label="BPM" :min="40" :max="200" :haptic="false" />
        <LabJoystick v-model="slot" :face="face" :visual="props.editions[0]" size="var(--ulab-slot)" />
      </span>
    </LabCell>
  </div>
</template>

<style scoped>
.ulab-slot {
  --ulab-slot: clamp(3rem, 12vw, 4.5rem);
  display: flex;
  gap: var(--s-5);
  align-items: start;
}

.ulab-slot :deep(.instrument-control) { --instrument-control-size: var(--ulab-slot); }
</style>
