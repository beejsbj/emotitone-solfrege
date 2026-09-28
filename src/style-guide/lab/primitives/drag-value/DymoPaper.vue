<script setup lang="ts">
import { computed, ref, watch } from "vue";
import type { LabDragPaperProps } from "@/types/primitivesLab";

/*
 * Direction A · Dymo Label. The value is punched into label-maker tape and
 * stuck onto the gear: raised letters, a glossy strip, diagonal cut ends.
 * Every new value is punched again, letter by letter, like the embosser's
 * click. Ink tape for everyday Knobs, Brass tape for masters, Ivory tape for
 * a latched Joystick.
 */
const props = defineProps<LabDragPaperProps>();

// Alternating keys restart the punch on every value change.
const punch = ref(0);
watch(() => props.value, () => { punch.value += 1; });
const letters = computed(() => [...props.value]);
</script>

<template>
  <span class="dymo" :class="`dymo--${tone}`">
    <span :key="punch" class="dymo__text">
      <span
        v-for="(letter, index) in letters"
        :key="index"
        class="dymo__letter"
        :class="{ 'dymo__letter--space': letter === ' ' }"
        :style="{ animationDelay: `${index * 28}ms` }"
      >{{ letter }}</span>
    </span>
  </span>
</template>

<style scoped>
.dymo {
  --tape: var(--ink-3);
  --letter: var(--ivory);
  --emboss: rgb(0 0 0 / 70%);
  --gloss: rgb(255 255 255 / 12%);
  display: inline-flex;
  align-items: center;
  padding: 7px 14px 6px;
  background:
    linear-gradient(to bottom, var(--gloss) 0 38%, transparent 38%),
    var(--tape);
  color: var(--letter);
  clip-path: polygon(6px 0, 100% 0, calc(100% - 6px) 100%, 0 100%);
  filter: drop-shadow(0 2px 0 var(--ink));
  font: 700 20px/1 var(--font-mono);
  letter-spacing: .06em;
  text-transform: uppercase;
  white-space: nowrap;
}

.dymo--brass { --tape: var(--brass); --letter: var(--brass-edge); --emboss: rgb(255 255 255 / 45%); --gloss: rgb(255 255 255 / 28%); }
.dymo--ivory-badge { --tape: var(--ivory); --letter: var(--ink); --emboss: rgb(255 255 255 / 80%); --gloss: rgb(255 255 255 / 40%); }

.dymo--brass { filter: drop-shadow(0 2px 0 var(--ink)) drop-shadow(0 0 7px rgb(224 169 58 / 45%)); }

.dymo__text { display: inline-flex; }

/* Raised letters: a hard highlight on one side, a shadow on the other. */
.dymo__letter {
  display: inline-block;
  min-inline-size: .62em;
  text-align: center;
  text-shadow: 0 1px 0 var(--emboss), 0 -1px 0 rgb(0 0 0 / 25%);
  animation: dymo-punch 160ms var(--ease-stab) both;
}

.dymo__letter--space { min-inline-size: .4em; }

@keyframes dymo-punch {
  from { scale: 1 .4; opacity: 0; }
  to { scale: 1 1; opacity: 1; }
}

@media (prefers-reduced-motion: reduce) {
  .dymo__letter { animation: none; }
}

@media (forced-colors: active) {
  .dymo { background: Canvas; color: CanvasText; border: 1px solid CanvasText; filter: none; }
}
</style>
