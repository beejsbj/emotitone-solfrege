<script setup lang="ts">
import { computed } from "vue";
import type { LabKnobFaceProps } from "@/types/primitivesLab";

/*
 * Direction A · Knurled Dial. A machined control: a knurled grip ring that
 * visibly turns with the value, around a brushed Ink cap with an engraved
 * index. Brass Knobs get a Brass grip — the metal you actually hold. The
 * readout sits engraved in the cap.
 */
const props = defineProps<LabKnobFaceProps>();

const KNURLS = 44;
const knurls = Array.from({ length: KNURLS }, (_, index) => (index * 360) / KNURLS);

const angle = computed(() => {
  if (props.role === "boolean") return props.active ? 45 : -45;
  if (props.role === "options") {
    const count = props.optionLabels.length;
    return count <= 1 ? 0 : -135 + (props.optionIndex * 270) / (count - 1);
  }
  return -135 + Math.max(0, Math.min(1, props.value)) * 270;
});

const readout = computed(() => {
  if (props.role === "range") return props.display;
  if (props.role === "boolean") return props.active ? "ON" : "OFF";
  return props.optionLabels[props.optionIndex]?.slice(0, 4) ?? "";
});
</script>

<template>
  <span class="dial" :class="[`dial--${tone}`, `dial--${role}`, { 'dial--on': active }]" aria-hidden="true">
    <svg class="dial__svg" viewBox="0 0 100 100">
      <g class="dial__grip" :style="{ rotate: `${angle}deg` }">
        <circle class="dial__ring" cx="50" cy="50" r="46" />
        <line
          v-for="knurl in knurls"
          :key="knurl"
          class="dial__knurl"
          x1="50"
          y1="5.5"
          x2="50"
          y2="12.5"
          :transform="`rotate(${knurl} 50 50)`"
        />
        <circle class="dial__cap" cx="50" cy="50" r="35" />
        <rect class="dial__index" x="48" y="17" width="4" height="12" rx="1" />
      </g>
    </svg>
    <span class="dial__readout">
      <span class="dial__value">{{ readout }}</span>
      <span v-if="unit" class="dial__unit">{{ unit }}</span>
    </span>
  </span>
</template>

<style scoped>
.dial {
  --grip: var(--ink-5);
  --knurl: var(--ink-3);
  --index: var(--ivory);
  position: relative;
  display: block;
}

.dial--brass { --grip: var(--brass); --knurl: var(--brass-lo); --index: var(--brass-hi); }

.dial__svg {
  position: absolute;
  inset: 4%;
  width: 92%;
  height: 92%;
  overflow: visible;
  filter: drop-shadow(0 2px 0 var(--ink));
}

.dial__grip {
  transform-box: view-box;
  transform-origin: 50px 50px;
  transition: rotate var(--dur-ui) var(--ease-swing);
}

.dial__ring { fill: var(--grip); }
.dial__knurl { stroke: var(--knurl); stroke-width: 2.2; }

.dial__cap {
  fill: var(--ink-3);
  stroke: rgb(255 255 255 / 8%);
  stroke-width: 1;
}

.dial__index { fill: var(--index); }
.dial--boolean:not(.dial--on) .dial__index { fill: var(--ivory-4); }

.dial__readout {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  padding-top: 12%;
  color: var(--ivory);
  line-height: 1;
  pointer-events: none;
}

.dial--brass .dial__readout { color: var(--brass-hi); }
.dial__value { font: 700 clamp(8px, 16cqi, 17px)/1 var(--font-display); letter-spacing: .02em; }
.dial__unit { font: 600 clamp(6px, 9cqi, 10px)/1 var(--font-display); opacity: .7; }
.dial--options .dial__value,
.dial--boolean .dial__value { font-size: clamp(7px, 12cqi, 13px); text-transform: uppercase; }
.dial--boolean:not(.dial--on) .dial__readout { color: var(--ivory-3); }

@media (prefers-reduced-motion: reduce) {
  .dial__grip { transition: none; }
}
</style>
