<script setup lang="ts">
import type { LabNoteProps } from "@/types/primitivesLab";
import "./lab-note.css";
import { LAB_NOTE_DEFAULTS, useLabNote } from "./useLabNote";

/*
 * Direction C · Stencil. An Ink card with the syllable die-cut through it and
 * the pitch's light behind: at rest only the letters and a lit lip carry Music
 * Color. Holding the note switches the light on — the whole card floods with
 * its colour and the letters flip to the piano-key contrast.
 */
const props = withDefaults(defineProps<LabNoteProps>(), LAB_NOTE_DEFAULTS);
const { color, primaryText, auxiliary, ariaLabel, labelMain, labelSoft, isAccidental } = useLabNote(props);
</script>

<template>
  <span
    class="lab-note stencil"
    :class="[`lab-note--${proportion}`, { 'stencil--sounding': sounding, 'stencil--accidental': isAccidental }]"
    :style="{ '--surface': color.background, '--pitch': color.primaryColor, '--label': labelMain, '--label-soft': labelSoft }"
    :aria-label="ariaLabel"
    :data-sounding="sounding || undefined"
  >
    <span class="stencil__card" aria-hidden="true">
      <span class="stencil__light" />
      <span class="stencil__primary">{{ primaryText }}</span>
      <span
        v-for="(label, index) in auxiliary"
        :key="label.kind"
        class="stencil__aux"
        :class="index === 0 ? 'stencil__aux--top' : 'stencil__aux--bottom'"
      >{{ label.text }}</span>
    </span>
  </span>
</template>

<style scoped>
.stencil__card {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--ink-2);
  clip-path: var(--clip-tile);
  box-shadow: inset 0 -3px 0 var(--pitch), var(--shadow-key);
  transition: background-color var(--dur-ui) var(--ease-brush);
}

.stencil__light {
  position: absolute;
  inset: 0;
  background: radial-gradient(circle at 50% 52%, color-mix(in oklch, var(--pitch) 34%, transparent), transparent 64%);
  transition: opacity var(--dur-ui) var(--ease-brush);
}

.stencil__primary {
  position: absolute;
  top: 50%;
  left: 50%;
  translate: -50% -50%;
  color: var(--pitch);
  font: 700 var(--primary)/1 var(--font-display);
  letter-spacing: .04em;
  white-space: nowrap;
  transition: color var(--dur-ui) var(--ease-brush);
}

.stencil__aux {
  position: absolute;
  color: var(--ivory-3);
  font: 700 var(--aux)/1 var(--font-display);
  letter-spacing: .14em;
  transition: color var(--dur-ui) var(--ease-brush);
}

.stencil__aux--top { top: 8px; left: 7px; }
.stencil__aux--bottom { right: 7px; bottom: 9px; }
.lab-note--glyph .stencil__aux { display: none; }

/* Light on: attack is instant, release fades like the note. */
.stencil--sounding .stencil__card {
  background: var(--surface);
  box-shadow: inset 0 0 0 2px rgb(255 255 255 / 72%), 0 0 16px color-mix(in oklch, var(--pitch) 55%, transparent);
  transition-duration: var(--dur-tap);
  transition-timing-function: var(--ease-stab);
}

.stencil--sounding .stencil__light { opacity: 0; }
.stencil--sounding .stencil__primary { color: var(--label); transition-duration: var(--dur-tap); }
.stencil--sounding .stencil__aux { color: var(--label-soft); transition-duration: var(--dur-tap); }

@media (prefers-reduced-motion: reduce) {
  .stencil__card,
  .stencil__light,
  .stencil__primary,
  .stencil__aux { transition: none; }
}

@media (forced-colors: active) {
  .stencil__card { border: 1px solid CanvasText; }
  .stencil__primary { color: CanvasText; }
}
</style>
