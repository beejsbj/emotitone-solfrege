<script setup lang="ts">
import type { LabLogoProps } from "@/types/styleGuide";
import LabMarkGlyph from "../LabMarkGlyph.vue";
import { LAB_SOLFEGE_STEPS } from "../labSolfege";

/**
 * Direction B · Octave. Seven cut steps, Do to Ti, coloured by the real Music
 * Color resolver, climbing to a whole note: the high Do you are about to play.
 */
const props = withDefaults(defineProps<LabLogoProps>(), {
  surface: "ink",
  variant: "full",
  lockup: false,
  size: "160px",
  live: false,
});

// Authored cut tops: each step leans a little differently, like torn card.
const LEANS = [3, -2, 2, -3, 2, -2, 3];

const steps = LAB_SOLFEGE_STEPS.map((step, index) => {
  const x = 7 + index * 14.6;
  const width = 12.4;
  const top = 92 - index * 11;
  const lean = LEANS[index];
  return {
    ...step,
    index,
    points: `${x},114 ${x},${top + lean} ${x + width},${top - lean} ${x + width},114`,
  };
});

const letters = "EMOTITONE".split("");
</script>

<template>
  <div
    class="octave-logo"
    :class="[`octave-logo--on-${props.surface}`, { 'octave-logo--lockup': lockup, 'octave-logo--live': live }]"
    :style="{ '--octave-logo-size': size }"
    role="img"
    aria-label="EmotiTone"
  >
    <svg class="octave-logo__mark" viewBox="0 0 120 120" aria-hidden="true">
      <polygon
        v-for="step in steps"
        :key="step.syllable"
        class="octave-logo__step"
        :style="{ fill: step.color, '--step-index': step.index }"
        :points="step.points"
      />
      <LabMarkGlyph
        v-if="variant === 'full'"
        class="octave-logo__slur"
        name="slur"
        :x="58"
        :y="30"
        :size="62"
        :rotate="-14"
      />
      <LabMarkGlyph class="octave-logo__note" name="whole" :x="104" :y="variant === 'full' ? 16 : 18" :size="variant === 'full' ? 26 : 32" :rotate="-10" />
    </svg>

    <strong v-if="lockup" class="octave-logo__wordmark">
      <span
        v-for="(letter, index) in letters"
        :key="index"
        :style="{ '--letter-step': index }"
      >{{ letter }}</span>
    </strong>
  </div>
</template>

<style scoped>
.octave-logo {
  --octave-logo-fg: var(--ivory);
  display: inline-flex;
  align-items: center;
  gap: calc(var(--octave-logo-size) * .14);
  max-width: 100%;
}

.octave-logo--on-bone { --octave-logo-fg: var(--ink); }

.octave-logo__mark {
  display: block;
  width: var(--octave-logo-size);
  max-width: 100%;
  height: auto;
  overflow: visible;
}

.octave-logo__note,
.octave-logo__slur { fill: var(--octave-logo-fg); }
.octave-logo__slur { opacity: .9; }

/* The wordmark climbs the scale one letter at a time. */
.octave-logo__wordmark {
  display: inline-flex;
  align-items: flex-end;
  padding-top: .36em;
  color: var(--octave-logo-fg);
  font: 700 calc(var(--octave-logo-size) * .42)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  white-space: nowrap;
}

.octave-logo__wordmark span { transform: translateY(calc(var(--letter-step) * -.04em)); }

/* Live: the steps sound one after another, a scale sung upward. */
.octave-logo--live .octave-logo__step {
  transform-box: fill-box;
  transform-origin: 50% 100%;
  animation: octave-logo-sing calc(var(--lab-beat, 577ms) * 8) var(--ease-stab) calc(var(--step-index) * var(--lab-beat, 577ms)) infinite;
}

.octave-logo--live .octave-logo__note {
  transform-box: fill-box;
  transform-origin: center;
  animation: octave-logo-land calc(var(--lab-beat, 577ms) * 8) var(--ease-bounce) calc(var(--lab-beat, 577ms) * 7) infinite;
}

@keyframes octave-logo-sing {
  0% { transform: scaleY(1.1); }
  10%, 100% { transform: scaleY(1); }
}

@keyframes octave-logo-land {
  0% { transform: translateY(-5px) rotate(-8deg); }
  14%, 100% { transform: translateY(0) rotate(0); }
}

@media (prefers-reduced-motion: reduce) {
  .octave-logo--live .octave-logo__step,
  .octave-logo--live .octave-logo__note { animation: none; }
}

@media (forced-colors: active) {
  .octave-logo__step { fill: CanvasText !important; }
  .octave-logo__note,
  .octave-logo__slur { fill: CanvasText; }
}
</style>
