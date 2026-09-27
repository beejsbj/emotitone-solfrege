<script setup lang="ts">
import { computed } from "vue";
import type { LabNoteProps } from "@/types/primitivesLab";
import "./lab-note.css";
import { LAB_NOTE_DEFAULTS, useLabNote } from "./useLabNote";

/*
 * Direction B · Pitch Tear. Music Color paper is torn off at the pitch's height
 * inside the octave, over an Ink card: Do sits low, Ti reaches high, so a row
 * of Notes draws the scale's staircase. Holding a note fills the card to the
 * top like a meter; release drains it back to its pitch.
 */
const props = withDefaults(defineProps<LabNoteProps>(), LAB_NOTE_DEFAULTS);
const { color, primaryText, auxiliary, ariaLabel, labelMain, heightInOctave, isAccidental } = useLabNote(props);

const TEARS = [
  "polygon(0 5px, 14% 0, 29% 6px, 43% 2px, 58% 7px, 72% 1px, 86% 5px, 100% 0, 100% 100%, 0 100%)",
  "polygon(0 1px, 16% 6px, 31% 0, 47% 5px, 62% 1px, 78% 7px, 90% 2px, 100% 5px, 100% 100%, 0 100%)",
  "polygon(0 6px, 12% 2px, 27% 7px, 41% 0, 55% 4px, 70% 0, 84% 6px, 100% 2px, 100% 100%, 0 100%)",
];

const level = computed(() => (props.sounding ? 1.08 : .44 + (heightInOctave.value / 11) * .5));
const tear = computed(() => TEARS[props.pitchClassIndex % TEARS.length]);
</script>

<template>
  <span
    class="lab-note tear"
    :class="[`lab-note--${proportion}`, { 'tear--sounding': sounding, 'tear--accidental': isAccidental }]"
    :style="{ '--surface': color.background, '--label': labelMain, '--level': level, '--tear': tear }"
    :aria-label="ariaLabel"
    :data-sounding="sounding || undefined"
  >
    <span class="tear__card" aria-hidden="true">
      <span class="tear__paper" />
      <span class="tear__primary">{{ primaryText }}</span>
      <span
        v-for="(label, index) in auxiliary"
        :key="label.kind"
        class="tear__aux"
        :class="index === 0 ? 'tear__aux--left' : 'tear__aux--right'"
      >{{ label.text }}</span>
    </span>
  </span>
</template>

<style scoped>
.tear { --primary-tear: calc(var(--primary) * .82); }
.lab-note--wide.tear { --primary-tear: calc(var(--primary) * .78); }

.tear__card {
  position: absolute;
  inset: 0;
  overflow: hidden;
  background: var(--ink-3);
  clip-path: var(--clip-tile);
  box-shadow: var(--shadow-key);
}

.tear__paper {
  position: absolute;
  inset: auto 0 0;
  height: calc(var(--level) * 100%);
  background: var(--surface);
  clip-path: var(--tear);
  transition: height var(--dur-panel) var(--ease-brush);
}

.tear--sounding .tear__paper { transition: height var(--dur-ui) var(--ease-stab); }

.tear__primary {
  position: absolute;
  left: 50%;
  bottom: 7%;
  translate: -50% 0;
  color: var(--label);
  font: 700 var(--primary-tear)/1 var(--font-display);
  letter-spacing: .02em;
  white-space: nowrap;
}

.tear__aux {
  position: absolute;
  top: 6px;
  color: var(--ivory-2);
  font: 700 var(--aux)/1 var(--font-display);
  letter-spacing: .12em;
}

.tear__aux--left { left: 6px; }
.tear__aux--right { right: 6px; color: var(--ivory-3); }
.lab-note--tall .tear__aux--right { top: auto; bottom: 36%; }
.lab-note--glyph .tear__aux { display: none; }

.tear--sounding .tear__card { box-shadow: var(--shadow-key), inset 0 0 0 2px rgb(255 255 255 / 72%); }

@media (prefers-reduced-motion: reduce) {
  .tear__paper,
  .tear--sounding .tear__paper { transition: none; }
}

@media (forced-colors: active) {
  .tear__card { border: 1px solid CanvasText; }
  .tear__paper { background: Highlight; }
}
</style>
