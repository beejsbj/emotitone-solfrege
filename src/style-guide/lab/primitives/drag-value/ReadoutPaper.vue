<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { LabDragPaperProps } from "@/types/primitivesLab";

/*
 * Direction C · Segment Readout. A recessed display window: lit characters
 * over faint unlit "8" segments, the way a synth's LCD always shows its ghost
 * digits. Each change flickers the display like a refresh. The digital
 * reading of the floating value, paired with the Odometer's analog one.
 */
const props = defineProps<LabDragPaperProps>();

const refresh = ref(0);
watch(() => props.value, () => { refresh.value += 1; });
const ghost = computed(() => [...props.value].map((char) => (char === " " ? " " : "8")).join(""));
</script>

<template>
  <span class="readout" :class="`readout--${tone}`">
    <span class="readout__ghost" aria-hidden="true">{{ ghost }}</span>
    <span :key="refresh" class="readout__lit">{{ value }}</span>
  </span>
</template>

<style scoped>
.readout {
  --lit: var(--ivory);
  --glow: rgb(244 239 230 / 55%);
  --bezel: var(--ink-4);
  position: relative;
  display: inline-grid;
  padding: 7px 10px 6px;
  background: var(--ink);
  border-radius: var(--r-xs);
  box-shadow: 0 0 0 3px var(--bezel), inset 0 2px 5px rgb(0 0 0 / 80%);
  font: 700 20px/1 var(--font-mono);
  letter-spacing: .08em;
  text-transform: uppercase;
  white-space: nowrap;
}

.readout--brass { --lit: var(--brass-hi); --glow: rgb(224 169 58 / 70%); --bezel: var(--brass); }
.readout--ivory-badge { --bezel: var(--ivory); }

.readout__ghost,
.readout__lit { grid-area: 1 / 1; }

.readout__ghost { color: color-mix(in srgb, var(--lit) 9%, transparent); }

.readout__lit {
  color: var(--lit);
  text-shadow: 0 0 8px var(--glow);
  animation: readout-refresh 140ms steps(2) both;
}

@keyframes readout-refresh { from { opacity: .35; } to { opacity: 1; } }

@media (prefers-reduced-motion: reduce) {
  .readout__lit { animation: none; }
}

@media (forced-colors: active) {
  .readout { background: Canvas; box-shadow: none; border: 2px solid CanvasText; }
  .readout__lit { color: CanvasText; text-shadow: none; }
  .readout__ghost { display: none; }
}
</style>
