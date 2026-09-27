<script setup lang="ts">
import { computed } from "vue";
import type { LabKnobFaceProps } from "@/types/primitivesLab";

/*
 * Direction C · LED Collar. A synth encoder: the accepted dark analog well,
 * ringed by fifteen hand-cut paper chads that light up like LEDs. The light
 * chases chad to chad as the value moves. Options light one group of chads;
 * Boolean lights the whole collar.
 */
const props = defineProps<LabKnobFaceProps>();

const CHADS = 15;
const START = -135;
const SPAN = 270;

const chads = computed(() => Array.from({ length: CHADS }, (_, index) => {
  const angle = START + (index * SPAN) / (CHADS - 1);
  const radians = ((angle - 90) * Math.PI) / 180;
  let lit = false;
  if (props.role === "range") lit = index < Math.round(Math.max(0, Math.min(1, props.value)) * CHADS);
  else if (props.role === "boolean") lit = props.active;
  else {
    const count = Math.max(1, props.optionLabels.length);
    lit = Math.min(count - 1, Math.floor((index / CHADS) * count)) === props.optionIndex;
  }
  return {
    x: 50 + Math.cos(radians) * 44,
    y: 50 + Math.sin(radians) * 44,
    angle: angle + ((index * 37) % 11) - 5,
    lit,
    delay: `${index * 14}ms`,
  };
}));

const center = computed(() => {
  if (props.role === "range") return props.display;
  if (props.role === "boolean") return props.active ? "ON" : "OFF";
  return props.optionLabels[props.optionIndex]?.slice(0, 4) ?? "";
});
</script>

<template>
  <span class="collar" :class="[`collar--${tone}`, `collar--${role}`]" aria-hidden="true">
    <span class="collar__well" />
    <svg class="collar__ring" viewBox="0 0 100 100">
      <rect
        v-for="(chad, index) in chads"
        :key="index"
        class="collar__chad"
        :class="{ 'collar__chad--lit': chad.lit }"
        :x="chad.x - 3.4"
        :y="chad.y - 3.4"
        width="6.8"
        height="6.8"
        :style="{ rotate: `${chad.angle}deg`, transformOrigin: `${chad.x}px ${chad.y}px`, transitionDelay: chad.delay }"
      />
    </svg>
    <span class="collar__center">
      <span class="collar__value">{{ center }}</span>
      <span v-if="unit" class="collar__unit">{{ unit }}</span>
    </span>
  </span>
</template>

<style scoped>
.collar {
  --led: var(--ivory);
  --led-glow: rgb(244 239 230 / 55%);
  position: relative;
  display: block;
}

.collar--brass { --led: var(--brass); --led-glow: rgb(224 169 58 / 70%); }

.collar__well {
  position: absolute;
  inset: 17%;
  border-radius: 50%;
  background: var(--instrument-control-dark-well);
  box-shadow: var(--instrument-control-dark-well-shadow);
}

.collar__ring {
  position: absolute;
  inset: 0;
  overflow: visible;
}

.collar__chad {
  fill: var(--ink-5);
  transform-box: view-box;
  transition: fill var(--dur-tap) var(--ease-stab), filter var(--dur-tap) var(--ease-stab);
}

.collar__chad--lit {
  fill: var(--led);
  filter: drop-shadow(0 0 2.5px var(--led-glow));
}

.collar__center {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  color: var(--led);
  line-height: 1;
}

.collar__value { font: 700 clamp(9px, 19cqi, 20px)/1 var(--font-display); }
.collar__unit { font: 600 clamp(6px, 10cqi, 11px)/1 var(--font-display); opacity: .7; }
.collar--options .collar__value,
.collar--boolean .collar__value { font-size: clamp(7px, 13cqi, 14px); text-transform: uppercase; }
.collar--boolean:not(:has(.collar__chad--lit)) .collar__value { color: var(--ivory-3); }

@media (prefers-reduced-motion: reduce) {
  .collar__chad { transition: none; }
}
</style>
