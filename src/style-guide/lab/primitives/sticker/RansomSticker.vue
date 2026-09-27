<script setup lang="ts">
import { computed, ref, useSlots } from "vue";
import Mark from "@/components/primatives/Mark.vue";
import { useUIBeatScale } from "@/composables/useUIBeat";
import type { LabStickerProps } from "@/types/primitivesLab";
import { mountRandom, slotText, stickerPaint } from "./stickerPaint";

/*
 * Direction B · Ransom. The guide's cut-letter headline shrunk to label size:
 * every letter is its own scrap, alternating the Sticker's colour with Ink and
 * Ivory and a tilt of its own. Outline keeps the scraps dark and the letters
 * coloured. Badge becomes a row of straight Brass or Ivory type sorts.
 */
const props = withDefaults(defineProps<LabStickerProps>(), {
  variant: "outline",
  color: undefined,
  mark: undefined,
  markPosition: "before",
  uiBeat: false,
});

const root = ref<HTMLElement | null>(null);
useUIBeatScale(root, () => props.uiBeat, { restScale: 0.8, peakScale: 1.1 });

const slots = useSlots();
const random = mountRandom("ransom");
// Enough per-mount jitter for long labels; stable across re-renders.
const jitter = Array.from({ length: 48 }, () => ({
  tilt: random() * 12 - 6,
  lift: random() * 3 - 1.5,
  mono: random() > .72,
  size: random() > .5 ? 1 : .86,
}));

const color = computed(() => props.variant === "badge"
  ? (props.color === "ivory" ? "ivory" : "brass-sheen")
  : props.color ?? "ivory");
const paint = computed(() => stickerPaint(color.value));
const text = computed(() => slotText(slots.default?.()));

type Scrap = { char: string; paper: string; ink: string; tilt: number; lift: number; mono: boolean; size: number; space: boolean };

const scraps = computed<Scrap[]>(() => {
  const { fill, fg, accent } = paint.value;
  const papers = props.variant === "fill"
    ? [
      { paper: fill, ink: fg },
      { paper: color.value === "ink" ? "var(--ink-5)" : "var(--ink)", ink: "var(--ivory)" },
      { paper: "var(--ivory)", ink: "var(--ink)" },
    ]
    : props.variant === "outline"
      ? [
        { paper: "var(--ink-3)", ink: accent },
        { paper: "var(--ink)", ink: accent },
        { paper: "var(--ink-4)", ink: "var(--ivory)" },
      ]
      : [{ paper: fill, ink: fg }];
  const badge = props.variant === "badge";
  return [...text.value].map((char, index) => {
    const shake = jitter[index % jitter.length];
    return {
      char,
      space: char === " ",
      ...papers[index % papers.length],
      tilt: badge ? 0 : shake.tilt,
      lift: badge ? 0 : shake.lift,
      mono: badge || shake.mono,
      size: badge ? 1 : shake.size,
    };
  });
});
</script>

<template>
  <span
    ref="root"
    class="ransom"
    :class="[`ransom--${variant}`, { 'ransom--glow': paint.glow, 'ransom--sheen': paint.sheen }]"
  >
    <span class="ransom__name"><slot /></span>
    <span class="ransom__scraps" aria-hidden="true">
      <span
        v-if="mark && variant !== 'badge' && markPosition === 'before'"
        class="ransom__scrap ransom__scrap--mark"
        :style="{ '--scrap-paper': paint.fill, '--scrap-ink': paint.fg }"
      ><Mark :name="mark" tone="inherit" size=".9em" /></span>
      <span
        v-for="(scrap, index) in scraps"
        :key="index"
        class="ransom__scrap"
        :class="{ 'ransom__scrap--space': scrap.space, 'ransom__scrap--mono': scrap.mono }"
        :style="{
          '--scrap-paper': scrap.paper,
          '--scrap-ink': scrap.ink,
          '--tilt': `${scrap.tilt}deg`,
          '--lift': `${scrap.lift}px`,
          '--scale': scrap.size,
        }"
      >{{ scrap.char }}</span>
      <span
        v-if="mark && variant !== 'badge' && markPosition === 'after'"
        class="ransom__scrap ransom__scrap--mark"
        :style="{ '--scrap-paper': paint.fill, '--scrap-ink': paint.fg }"
      ><Mark :name="mark" tone="inherit" size=".9em" /></span>
    </span>
  </span>
</template>

<style scoped>
.ransom {
  position: relative;
  display: inline-flex;
  font: 700 14px/1 var(--font-display);
  text-transform: uppercase;
  white-space: nowrap;
}

/* Screen readers get the word once; the scraps are decoration. */
.ransom__name {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
}

.ransom__scraps {
  display: inline-flex;
  align-items: center;
  gap: 1px;
}

.ransom__scrap {
  display: inline-grid;
  place-items: center;
  min-inline-size: .78em;
  padding: 4px 3px 3px;
  background: var(--scrap-paper);
  color: var(--scrap-ink);
  clip-path: var(--clip-tile);
  font-size: calc(1em * var(--scale, 1));
  rotate: var(--tilt, 0deg);
  translate: 0 var(--lift, 0px);
}

.ransom__scrap--mono { font-family: var(--font-mono); font-size: calc(.86em * var(--scale, 1)); }
.ransom__scrap--space { min-inline-size: .3em; padding: 0; background: transparent; }
.ransom__scrap--mark { padding-inline: 4px; }

.ransom--badge .ransom__scraps { gap: 2px; }
.ransom--badge .ransom__scrap {
  min-inline-size: 1.05em;
  padding: 5px 2px 4px;
  clip-path: none;
  font: 700 12px/1 var(--font-mono);
  box-shadow: inset 0 1px 0 rgb(255 255 255 / 35%), inset 0 -1px 0 rgb(0 0 0 / 35%);
}

.ransom--sheen .ransom__scrap:not(.ransom__scrap--space) {
  background: var(--brass-sheen), var(--scrap-paper);
  background-size: 400% 100%, 100% 100%;
  background-repeat: no-repeat;
  animation: brass-sheen 6.5s cubic-bezier(.55,.05,.45,.95) infinite;
}

.ransom--glow { filter: drop-shadow(0 0 7px rgb(224 169 58 / 45%)); }

@media (prefers-reduced-motion: reduce) {
  .ransom--sheen .ransom__scrap:not(.ransom__scrap--space) { animation: none; }
}

@media (forced-colors: active) {
  .ransom__scrap { background: Canvas; color: CanvasText; }
}
</style>
