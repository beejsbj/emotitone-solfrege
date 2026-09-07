<template>
  <AnatomyDisplay
    title="Joystick · Harmony Primitive"
    :features="features"
    caption="Tap a direction to latch it. Hold a direction for a momentary override; releasing restores the prior latch. Center returns to automatic scale-derived harmony."
  >
    <template #hero>
      <div class="joystick-specimen__hero">
        <Joystick
          v-model="latched"
          label="Harmony"
          @effective-change="effective = $event"
        />
        <div class="joystick-specimen__readout" aria-live="polite">
          <b>{{ effectiveOption.label }}</b>
          <span>{{ effectiveOption.description }}</span>
          <code>latched={{ latched }} · effective={{ effective }}</code>
        </div>
      </div>
    </template>

    <VariantGrid title="Controlled states">
      <VariantCell caption="Center · automatic" stage="ink3">
        <Joystick model-value="auto" label="Harmony" />
      </VariantCell>
      <VariantCell caption="Right · jazzy seventh" stage="ink3">
        <Joystick model-value="jazzy7" label="Harmony" />
      </VariantCell>
      <VariantCell caption="320px production-sized slot" stage="ink3">
        <div class="joystick-specimen__slot">
          <Joystick model-value="sus4" label="Harmony" />
        </div>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Joystick from "@/components/primatives/Joystick.vue";
import { JOYSTICK_OPTIONS } from "@/components/primatives/joystickOptions";
import type { HarmonyAlteration } from "@/domain/harmony";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const latched = ref<HarmonyAlteration>("auto");
const effective = ref<HarmonyAlteration>("auto");
const effectiveOption = computed(() =>
  JOYSTICK_OPTIONS.find((option) => option.value === effective.value)!,
);

const features = [
  { label: "Center", value: "automatic scale-derived harmony" },
  { label: "Directions", value: "eight explicit HiChord-inspired chord alterations" },
  { label: "Tap", value: "latches the selected chord character" },
  { label: "Hold", value: "momentary override; release restores the prior latch" },
  { label: "Keyboard", value: "roving direction grid; arrows move, Space/Enter select" },
  { label: "Boundary", value: "directional state only; no harmony generation, audio, or Knob anatomy" },
];
</script>

<style scoped>
.joystick-specimen__hero {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 20px;
  padding: 24px;
}

.joystick-specimen__readout {
  display: grid;
  gap: 3px;
  min-width: 210px;
  color: var(--ivory-3);
  font: var(--t-mono);
}

.joystick-specimen__readout b {
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: 20px;
}

.joystick-specimen__readout code { color: var(--brass); }

.joystick-specimen__slot { width: 53px; }
</style>
