<script setup lang="ts">
import { computed } from "vue";
import type { LabKnobFaceProps } from "@/types/primitivesLab";

/*
 * Direction A · Paper Pie. The value is a solid wedge of paper, not a stroke:
 * a slice cut from the tone's stock and laid on a flat Ink disc with a hard
 * edge shadow. Options become a pie of equal slices with the chosen one cut
 * out in paper; Boolean is the whole disc or an empty plate.
 */
const props = defineProps<LabKnobFaceProps>();

const count = computed(() => Math.max(1, props.optionLabels.length));
const sweep = computed(() => {
  if (props.role === "range") return `${Math.max(0, Math.min(1, props.value)) * 270}deg`;
  if (props.role === "boolean") return props.active ? "360deg" : "0deg";
  return `${360 / count.value - 6}deg`;
});
const from = computed(() => {
  if (props.role === "range") return "225deg";
  if (props.role === "boolean") return "0deg";
  return `${props.optionIndex * (360 / count.value) + 3 - 180 / count.value}deg`;
});
const center = computed(() => {
  if (props.role === "range") return props.display;
  if (props.role === "boolean") return props.active ? "On" : "Off";
  return props.optionLabels[props.optionIndex]?.slice(0, 4) ?? "";
});
</script>

<template>
  <span
    class="pie"
    :class="[`pie--${tone}`, `pie--${role}`, { 'pie--active': active }]"
    :style="{ '--lab-pie-sweep': sweep, '--pie-from': from, '--pie-count': count }"
    aria-hidden="true"
  >
    <span class="pie__plate" />
    <span class="pie__slot" />
    <span class="pie__wedge" />
    <span class="pie__cap">
      <span class="pie__value">{{ center }}</span>
      <span v-if="unit" class="pie__unit">{{ unit }}</span>
    </span>
  </span>
</template>

<style>
@property --lab-pie-sweep {
  syntax: "<angle>";
  inherits: true;
  initial-value: 0deg;
}
</style>

<style scoped>
.pie {
  --paper: var(--ivory);
  --paper-ink: var(--ink);
  position: relative;
  display: block;
  transition: --lab-pie-sweep var(--dur-ui) var(--ease-swing);
}

.pie--brass { --paper: var(--brass); --paper-ink: var(--brass-edge); }

.pie__plate,
.pie__slot,
.pie__wedge,
.pie__cap {
  position: absolute;
  border-radius: 50%;
}

.pie__plate { inset: 6%; background: var(--ink-3); }

/* The empty cut-out the wedge can fill: range sweep or option slices. */
.pie__slot {
  inset: 10%;
  background: conic-gradient(from 225deg, var(--ink-4) 0 270deg, transparent 270deg);
}

.pie--options .pie__slot {
  background: repeating-conic-gradient(
    from calc(3deg - 180deg / var(--pie-count)),
    var(--ink-4) 0 calc(360deg / var(--pie-count) - 6deg),
    transparent calc(360deg / var(--pie-count) - 6deg) calc(360deg / var(--pie-count))
  );
}

.pie--boolean .pie__slot { background: var(--ink-4); }

.pie__wedge {
  inset: 10%;
  background: conic-gradient(from var(--pie-from), var(--paper) 0 var(--lab-pie-sweep), transparent var(--lab-pie-sweep));
  filter: drop-shadow(1.5px 2px 0 var(--ink));
  rotate: -.8deg;
}

.pie--brass .pie__wedge {
  background: conic-gradient(from var(--pie-from), var(--brass-hi) 0 calc(var(--lab-pie-sweep) * .5), var(--brass) 0 var(--lab-pie-sweep), transparent var(--lab-pie-sweep));
}

.pie__cap {
  inset: 31%;
  display: grid;
  place-content: center;
  justify-items: center;
  background: var(--ink);
  color: var(--paper);
  line-height: 1;
}

.pie--boolean.pie--active .pie__cap { background: var(--paper-ink); }

.pie__value { font: 700 clamp(9px, 17cqi, 18px)/1 var(--font-display); letter-spacing: .02em; }
.pie__unit { font: 600 clamp(6px, 9cqi, 10px)/1 var(--font-display); opacity: .7; }
.pie--options .pie__value,
.pie--boolean .pie__value { font-size: clamp(7px, 12cqi, 13px); text-transform: uppercase; }

@media (prefers-reduced-motion: reduce) {
  .pie { transition: none; }
}
</style>
