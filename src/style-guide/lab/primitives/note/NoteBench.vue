<script setup lang="ts">
import { ref, type Component } from "vue";
import LabCell from "../LabCell.vue";

/** Note identity, contrast, sounding, and proportion through one component seam. */
defineProps<{ component: Component }>();

const SCALE = [
  { syllable: "Do", degree: "I", rawPitch: "C4", pitchClassIndex: 0 },
  { syllable: "Re", degree: "II", rawPitch: "D4", pitchClassIndex: 2 },
  { syllable: "Mi", degree: "III", rawPitch: "E4", pitchClassIndex: 4 },
  { syllable: "Fa", degree: "IV", rawPitch: "F4", pitchClassIndex: 5 },
  { syllable: "Sol", degree: "V", rawPitch: "G4", pitchClassIndex: 7 },
  { syllable: "La", degree: "VI", rawPitch: "A4", pitchClassIndex: 9 },
  { syllable: "Ti", degree: "VII", rawPitch: "B4", pitchClassIndex: 11 },
];

const BORROWED = [
  { syllable: "Ra", degree: "bII", rawPitch: "Db4", pitchClassIndex: 1 },
  { syllable: "Me", degree: "bIII", rawPitch: "Eb4", pitchClassIndex: 3 },
  { syllable: "Fi", degree: "#IV", rawPitch: "F#4", pitchClassIndex: 6 },
  { syllable: "Le", degree: "bVI", rawPitch: "Ab4", pitchClassIndex: 8 },
  { syllable: "Te", degree: "bVII", rawPitch: "Bb4", pitchClassIndex: 10 },
];

const held = ref<Set<string>>(new Set(["Sol"]));
const toggle = (syllable: string) => {
  const next = new Set(held.value);
  if (next.has(syllable)) next.delete(syllable);
  else next.add(syllable);
  held.value = next;
};
</script>

<template>
  <div class="plab-bench">
    <LabCell caption="C major · Do to Ti, keyboard-row glyphs · tap to hold" wide>
      <span class="plab-row">
        <button
          v-for="note in SCALE"
          :key="note.syllable"
          type="button"
          class="plab-hold"
          :aria-pressed="held.has(note.syllable)"
          :aria-label="`Hold ${note.syllable}`"
          @click="toggle(note.syllable)"
        >
          <component :is="component" v-bind="note" proportion="glyph" :sounding="held.has(note.syllable)" />
        </button>
      </span>
    </LabCell>
    <LabCell caption="Medium · resting and sounding" tall>
      <component :is="component" v-bind="SCALE[0]" />
      <component :is="component" v-bind="SCALE[4]" sounding />
    </LabCell>
    <LabCell caption="Borrowed pitches · accidentals keep black text" tall>
      <component :is="component" v-for="note in BORROWED.slice(0, 3)" :key="note.syllable" v-bind="note" />
    </LabCell>
    <LabCell caption="Primary rank · degree ♭VII and raw C♯2" tall>
      <component :is="component" v-bind="BORROWED[4]" primary="degree" />
      <component :is="component" syllable="Di" degree="#I" raw-pitch="C#2" :pitch-class-index="1" :octave="2" primary="raw" />
    </LabCell>
    <LabCell caption="Octaves · Do in octaves 2, 4, and 6" tall>
      <component :is="component" v-for="octave in [2, 4, 6]" :key="octave" v-bind="SCALE[0]" :raw-pitch="`C${octave}`" :octave="octave" />
    </LabCell>
    <LabCell caption="Proportions · tall, stocky, wide" wide tall>
      <component :is="component" v-bind="SCALE[2]" proportion="tall" />
      <component :is="component" v-bind="SCALE[3]" proportion="stocky" />
      <component :is="component" v-bind="SCALE[4]" proportion="wide" />
    </LabCell>
  </div>
</template>

<style scoped>
.plab-row {
  --note-host-block-size: clamp(44px, 14vw, 64px);
  display: flex;
  gap: 4px;
}

.plab-hold {
  display: block;
  padding: 0;
  border: 0;
  background: none;
  cursor: pointer;
}

.plab-hold:focus-visible { outline: 2px solid var(--ivory); outline-offset: 3px; }
</style>
