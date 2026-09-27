<script setup lang="ts">
import type { LabNoteProps } from "@/types/primitivesLab";
import "./lab-note.css";
import { LAB_NOTE_DEFAULTS, useLabNote } from "./useLabNote";

/*
 * Direction A · Poster Crop. The primary identity is set gig-poster huge and
 * cropped by the paper, bleeding off the bottom and right edge; the other
 * labels ride on a small Ink ticket. Tall Notes turn the word on its side.
 */
const props = withDefaults(defineProps<LabNoteProps>(), LAB_NOTE_DEFAULTS);
const { color, primaryText, auxiliary, ariaLabel, labelMain, labelSoft, isAccidental } = useLabNote(props);
</script>

<template>
  <span
    class="lab-note crop"
    :class="[`lab-note--${proportion}`, { 'crop--sounding': sounding, 'crop--accidental': isAccidental }]"
    :style="{ '--surface': color.background, '--pitch': color.primaryColor, '--label': labelMain, '--label-soft': labelSoft }"
    :aria-label="ariaLabel"
    :data-sounding="sounding || undefined"
  >
    <span class="crop__paper" aria-hidden="true">
      <span class="crop__big">{{ primaryText }}</span>
      <span v-if="auxiliary.length" class="crop__ticket">
        <span v-for="label in auxiliary" :key="label.kind" :class="`crop__aux crop__aux--${label.kind}`">{{ label.text }}</span>
      </span>
    </span>
  </span>
</template>

<style scoped>
.crop { --big: calc(var(--primary) * 1.5); }
.lab-note--wide.crop { --big: calc(var(--h) * .95); }
.lab-note--stocky.crop { --big: calc(var(--primary) * 1.7); }
.lab-note--tall.crop { --big: calc(var(--w) * 1.1); }

.crop__paper {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--surface);
  clip-path: var(--clip-tile);
  box-shadow: var(--shadow-key);
}

.crop__paper::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--paper-surface-sheen);
  mix-blend-mode: overlay;
  pointer-events: none;
}

.crop__big {
  position: absolute;
  left: -.02em;
  bottom: -.08em;
  color: var(--label);
  font: 700 var(--big)/1 var(--font-display);
  /* Trim to cap height and baseline so the crop is exact, not font-metric luck. */
  text-box: trim-both cap alphabetic;
  letter-spacing: -.03em;
  white-space: nowrap;
  transition: translate var(--dur-tap) var(--ease-stab), text-shadow var(--dur-tap) var(--ease-stab);
}

.lab-note--tall .crop__big {
  left: auto;
  right: -.1em;
  bottom: 4px;
  writing-mode: vertical-rl;
  rotate: 180deg;
}

.crop__ticket {
  position: absolute;
  top: 5px;
  left: 5px;
  display: inline-flex;
  gap: 4px;
  padding: 3px 4px 2px;
  background: var(--ink);
  clip-path: var(--clip-tab);
  font: 700 var(--aux)/1 var(--font-display);
  letter-spacing: .1em;
}

.crop__aux--degree { color: var(--ivory); }
.crop__aux--raw,
.crop__aux--syllable { color: var(--ivory-3); }

.lab-note--tall .crop__ticket { flex-direction: column; gap: 2px; }
.lab-note--glyph .crop__ticket { display: none; }

/* Held: the word jumps and casts a hard Ink shadow; an Ivory rim holds it. */
.crop--sounding .crop__big {
  translate: 0 -8%;
  text-shadow: 3px 3px 0 var(--ink);
}

.crop--sounding .crop__paper { box-shadow: inset 0 0 0 2px rgb(255 255 255 / 72%); }

@media (prefers-reduced-motion: reduce) {
  .crop__big { transition: none; }
}

@media (forced-colors: active) {
  .crop__paper { border: 1px solid CanvasText; }
  .crop--sounding .crop__paper { border-width: 3px; }
}
</style>
