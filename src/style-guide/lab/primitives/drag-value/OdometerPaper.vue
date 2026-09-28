<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { LabDragPaperProps } from "@/types/primitivesLab";

/*
 * Direction B · Odometer. A mechanical counter window: each character sits on
 * its own drum behind a bezel, and when the value changes only the drums that
 * changed roll to their new face — up when the value rises, down when it
 * falls. The analog reading of the floating value.
 */
const props = defineProps<LabDragPaperProps>();

const direction = ref<"up" | "down">("up");
const rollKeys = ref<number[]>([...props.value].map(() => 0));

watch(() => props.value, (next, before) => {
  const a = Number.parseFloat(before);
  const b = Number.parseFloat(next);
  direction.value = Number.isFinite(a) && Number.isFinite(b) && b < a ? "down" : "up";
  rollKeys.value = [...next].map((char, index) =>
    char === before[index] ? (rollKeys.value[index] ?? 0) : (rollKeys.value[index] ?? 0) + 1);
});

const drums = computed(() => [...props.value].map((char, index) => ({
  char,
  key: `${index}-${rollKeys.value[index] ?? 0}`,
  space: char === " ",
})));
</script>

<template>
  <span class="odo" :class="[`odo--${tone}`, `odo--${direction}`]">
    <span v-for="drum in drums" :key="drum.key" class="odo__drum" :class="{ 'odo__drum--space': drum.space }">
      <span class="odo__face">{{ drum.char }}</span>
    </span>
  </span>
</template>

<style scoped>
.odo {
  --bezel: var(--ink-4);
  --drum: var(--ivory);
  --digit: var(--ink);
  display: inline-flex;
  gap: 2px;
  padding: 4px;
  background: var(--bezel);
  border-radius: var(--r-xs);
  box-shadow: 0 2px 0 var(--ink), inset 0 1px 0 rgb(255 255 255 / 10%);
  font: 700 20px/1 var(--font-mono);
  text-transform: uppercase;
  white-space: nowrap;
}

.odo--brass { --bezel: var(--brass-fill); --drum: var(--ink-2); --digit: var(--brass-hi); box-shadow: 0 2px 0 var(--ink), var(--shadow-glow-brass); }
.odo--ivory-badge { --bezel: var(--ivory-3); }

.odo__drum {
  position: relative;
  display: inline-grid;
  place-items: center;
  min-inline-size: .72em;
  block-size: 1.3em;
  overflow: hidden;
  background: var(--drum);
  color: var(--digit);
  /* The drum's curvature: darker at top and bottom. */
  box-shadow: inset 0 5px 5px -3px rgb(0 0 0 / 40%), inset 0 -5px 5px -3px rgb(0 0 0 / 40%);
}

.odo__drum--space { min-inline-size: .36em; }

.odo__face {
  display: block;
  padding-inline: 2px;
  animation: odo-roll-up var(--dur-ui) var(--ease-swing) both;
}

.odo--down .odo__face { animation-name: odo-roll-down; }

@keyframes odo-roll-up { from { translate: 0 100%; } to { translate: 0 0; } }
@keyframes odo-roll-down { from { translate: 0 -100%; } to { translate: 0 0; } }

@media (prefers-reduced-motion: reduce) {
  .odo__face { animation: none; }
}

@media (forced-colors: active) {
  .odo { background: Canvas; border: 1px solid CanvasText; box-shadow: none; }
  .odo__drum { background: Canvas; color: CanvasText; box-shadow: none; }
}
</style>
