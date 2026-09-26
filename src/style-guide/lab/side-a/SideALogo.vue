<script setup lang="ts">
import type { LabLogoProps } from "@/types/styleGuide";
import LabMarkGlyph from "../LabMarkGlyph.vue";

/**
 * Direction C · Side A. A Cobalt record sleeve with an Ivory cut ET, the disc
 * half out of it: the record-player instrument, before the needle drops.
 */
const props = withDefaults(defineProps<LabLogoProps>(), {
  surface: "ink",
  variant: "full",
  lockup: false,
  size: "160px",
  live: false,
});
</script>

<template>
  <div
    class="side-logo"
    :class="[`side-logo--on-${props.surface}`, { 'side-logo--lockup': lockup, 'side-logo--live': live }]"
    :style="{ '--side-logo-size': size }"
    role="img"
    aria-label="EmotiTone"
  >
    <svg class="side-logo__mark" viewBox="0 0 124 112" aria-hidden="true">
      <g class="side-logo__disc">
        <circle class="side-logo__vinyl" cx="84" cy="56" r="38" />
        <circle v-if="variant === 'full'" class="side-logo__groove" cx="84" cy="56" r="32" />
        <circle class="side-logo__groove" cx="84" cy="56" r="26" />
        <g class="side-logo__label">
          <path class="side-logo__label-a" d="M84 40 A16 16 0 0 1 84 72 Z" />
          <path class="side-logo__label-b" d="M84 72 A16 16 0 0 1 84 40 Z" />
          <circle class="side-logo__spindle" cx="84" cy="56" r="2.6" />
        </g>
      </g>

      <g class="side-logo__sleeve">
        <polygon class="side-logo__paper" points="4,16 70,13 72,99 6,101" />
        <polygon class="side-logo__glyph" points="14,30 25,29 26,86 15,87" />
        <polygon class="side-logo__glyph" points="23,29 38,28 38,39 23,40" />
        <polygon class="side-logo__glyph" points="23,52 35,51 35,61 23,62" />
        <polygon class="side-logo__glyph" points="23,75 39,74 39,85 23,86" />
        <polygon class="side-logo__glyph" points="43,30 65,28 65,41 43,42" />
        <polygon class="side-logo__glyph" points="48,41 60,40 59,89 48,90" />
      </g>

      <template v-if="variant === 'full'">
        <LabMarkGlyph class="side-logo__sprinkle side-logo__sprinkle--star" name="star" :x="8" :y="12" :size="17" :rotate="-12" />
        <LabMarkGlyph class="side-logo__sprinkle side-logo__sprinkle--eighth" name="eighth" :x="116" :y="14" :size="20" :rotate="10" />
      </template>
    </svg>

    <span v-if="lockup" class="side-logo__lockup">
      <strong class="side-logo__wordmark">EMOTITONE</strong>
      <small class="side-logo__side">SIDE A · 33⅓</small>
    </span>
  </div>
</template>

<style scoped>
.side-logo {
  --side-logo-fg: var(--ivory);
  --side-logo-rim: var(--ivory-4);
  display: inline-flex;
  align-items: center;
  gap: calc(var(--side-logo-size) * .12);
  max-width: 100%;
}

.side-logo--on-bone {
  --side-logo-fg: var(--ink);
  --side-logo-rim: var(--ink);
}

.side-logo__mark {
  display: block;
  width: var(--side-logo-size);
  max-width: 100%;
  height: auto;
  overflow: visible;
}

.side-logo__vinyl {
  fill: var(--ink-2);
  stroke: var(--side-logo-rim);
  stroke-width: 1.4;
}

.side-logo__groove {
  fill: none;
  stroke: var(--ink-5);
  stroke-width: 1.2;
}

.side-logo__label-a { fill: var(--tomato); }
.side-logo__label-b { fill: var(--mustard); }
.side-logo__spindle { fill: var(--ink); }
.side-logo__paper { fill: var(--cobalt); }
.side-logo__glyph { fill: var(--ivory); }
.side-logo__sprinkle--star { fill: var(--mustard); }
.side-logo__sprinkle--eighth { fill: var(--side-logo-fg); }

.side-logo__lockup {
  display: grid;
  gap: calc(var(--side-logo-size) * .1);
}

.side-logo__wordmark {
  color: var(--side-logo-fg);
  font: 700 calc(var(--side-logo-size) * .42)/1.1 var(--font-display);
  letter-spacing: var(--tracking-display);
  white-space: nowrap;
}

.side-logo__side {
  color: var(--side-logo-fg);
  font: 700 max(9px, calc(var(--side-logo-size) * .1))/1 var(--font-mono);
  letter-spacing: var(--tracking-label);
  opacity: .72;
}

/* Live: the label turns a quarter per beat, like a platter finding speed. */
.side-logo--live .side-logo__label {
  transform-box: view-box;
  transform-origin: 84px 56px;
  animation: side-logo-turn calc(var(--lab-beat, 577ms) * 4) steps(4, end) infinite;
}

@keyframes side-logo-turn {
  to { transform: rotate(360deg); }
}

@media (prefers-reduced-motion: reduce) {
  .side-logo--live .side-logo__label { animation: none; }
}

@media (forced-colors: active) {
  .side-logo__paper,
  .side-logo__vinyl { fill: CanvasText; }
  .side-logo__glyph,
  .side-logo__label-a,
  .side-logo__label-b { fill: Canvas; }
}
</style>
