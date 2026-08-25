<template>
  <AnatomyDisplay
    title="Keyboard · Playable Compound"
    :features="features"
    caption="Current production reference, not an accepted Keyboard definition. It builds the live octave grid from accepted Keys and Notes while preserving the existing app adapters. Use this specimen as the starting surface for the next Keyboard grilling session."
  >
    <template #hero>
      <div class="keyboard-stage"><Keyboard :rows="baselineRows" /></div>
    </template>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import Keyboard from "@/components/compounds/Keyboard.vue";
import type { KeyboardRowView } from "@/components/compounds/Keyboard.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";

const names = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];
const syllables = ["Do", "Ra", "Re", "Me", "Mi", "Fa", "Fi", "Sol", "Le", "La", "Te", "Ti"];
const degrees = ["I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X", "XI", "XII"];
const baselineRows: KeyboardRowView[] = [5, 4, 3].map((octave) => ({
  octave,
  keys: names.map((name, scaleIndex) => ({
    id: `${scaleIndex}_${octave}`,
    syllable: syllables[scaleIndex],
    degree: degrees[scaleIndex],
    rawPitch: `${name}${octave}`,
    scaleIndex,
    pitchClassIndex: scaleIndex,
    accidental: name.includes("#"),
  })),
}));

const features = [
  { label: "Children", value: "Key → Note across configured octave rows" },
  { label: "Integration", value: "music identity, audio attack/release, haptics, and visual activity" },
  { label: "Routing", value: "one global QWERTY controller; MIDI remains centrally owned" },
  { label: "Configuration", value: "rows, main octave, primary label, gaps, size, surface, and provisional geometry mapping" },
  { label: "Boundary", value: "no drawer chrome, pattern list, live card, or action bar" },
  { label: "Status", value: "production-integrated reference awaiting its own definition interview" },
];
</script>

<style scoped>
.keyboard-stage {
  width: min(100%, 960px);
  padding: 12px;
  background: var(--ink);
}
</style>
