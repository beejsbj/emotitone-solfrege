<script setup lang="ts">
import { computed } from "vue";
import type { LabKnobFaceProps } from "@/types/primitivesLab";

/*
 * Direction B · Chicken Head. A jazz-club amp knob: a printed skirt with a
 * tick scale and a tapered pointer cut from the tone's stock. The value reads
 * against the scale, like hardware; the number sits in the open gap at the
 * bottom. Options print their names round the skirt; Boolean prints OFF/ON.
 */
const props = defineProps<LabKnobFaceProps>();

const SWEEP_START = -135;
const polar = (angle: number, radius: number) => {
  const radians = ((angle - 90) * Math.PI) / 180;
  return { x: 50 + Math.cos(radians) * radius, y: 50 + Math.sin(radians) * radius };
};

const stops = computed(() => {
  if (props.role === "boolean") return [{ angle: -50, label: "OFF" }, { angle: 50, label: "ON" }];
  if (props.role === "options") {
    const count = props.optionLabels.length;
    return props.optionLabels.map((label, index) => ({
      angle: count <= 1 ? 0 : SWEEP_START + (index * 270) / (count - 1),
      label: label.slice(0, 3),
    }));
  }
  return Array.from({ length: 11 }, (_, index) => ({ angle: SWEEP_START + index * 27, label: index % 5 === 0 ? String(index) : "" }));
});

const pointerAngle = computed(() => {
  if (props.role === "boolean") return props.active ? 50 : -50;
  if (props.role === "options") return stops.value[props.optionIndex]?.angle ?? 0;
  return SWEEP_START + Math.max(0, Math.min(1, props.value)) * 270;
});

const ticks = computed(() => stops.value.map((stop, index) => {
  const inner = polar(stop.angle, 41);
  const outer = polar(stop.angle, 47);
  const text = polar(stop.angle, props.role === "range" ? 35 : 36);
  const selected = props.role === "options" ? index === props.optionIndex
    : props.role === "boolean" ? (index === 1) === props.active : false;
  return { ...stop, inner, outer, text, selected };
}));
</script>

<template>
  <svg class="chicken" :class="[`chicken--${tone}`, `chicken--${role}`]" viewBox="0 0 100 100" aria-hidden="true">
    <circle class="chicken__skirt" cx="50" cy="50" r="48" />
    <g v-for="tick in ticks" :key="tick.angle">
      <line class="chicken__tick" :class="{ 'chicken__tick--on': tick.selected }" :x1="tick.inner.x" :y1="tick.inner.y" :x2="tick.outer.x" :y2="tick.outer.y" />
      <text
        v-if="tick.label && role !== 'range'"
        class="chicken__print"
        :class="{ 'chicken__print--on': tick.selected }"
        :x="tick.text.x"
        :y="tick.text.y"
      >{{ tick.label }}</text>
    </g>
    <circle class="chicken__cap-shadow" cx="51.5" cy="53" r="25" />
    <circle class="chicken__cap" cx="50" cy="50" r="25" />
    <g class="chicken__pointer" :style="{ rotate: `${pointerAngle}deg` }">
      <path d="M50 8 L57 44 Q50 56 43 44 Z" />
      <circle cx="50" cy="50" r="9" />
    </g>
    <text v-if="role === 'range'" class="chicken__value" x="50" y="93">{{ display }}{{ unit }}</text>
  </svg>
</template>

<style scoped>
.chicken {
  --stock: var(--ivory);
  --stock-dark: var(--ivory-4);
  display: block;
  overflow: visible;
}

.chicken--brass { --stock: var(--brass); --stock-dark: var(--brass-lo); }

.chicken__skirt { fill: var(--ink-2); }

.chicken__tick {
  stroke: var(--ivory-4);
  stroke-width: 2.4;
  transition: stroke var(--dur-ui) var(--ease-brush);
}

.chicken__tick--on,
.chicken--range .chicken__tick { stroke: var(--ivory-3); }
.chicken__tick--on { stroke: var(--stock); }

.chicken__print {
  fill: var(--ivory-3);
  font: 700 9px var(--font-display);
  letter-spacing: .04em;
  text-anchor: middle;
  dominant-baseline: middle;
  text-transform: uppercase;
}

.chicken__print--on { fill: var(--stock); }

.chicken__cap-shadow { fill: var(--ink); }
.chicken__cap { fill: var(--ink-4); }

.chicken__pointer {
  fill: var(--stock);
  transform-origin: 50px 50px;
  transform-box: view-box;
  transition: rotate var(--dur-ui) var(--ease-swing);
}

.chicken__pointer path { filter: drop-shadow(1px 1.5px 0 var(--ink)); }
.chicken__pointer circle { fill: var(--stock-dark); }

.chicken__value {
  fill: var(--stock);
  font: 700 12px var(--font-display);
  text-anchor: middle;
}

@media (prefers-reduced-motion: reduce) {
  .chicken__pointer,
  .chicken__tick { transition: none; }
}
</style>
