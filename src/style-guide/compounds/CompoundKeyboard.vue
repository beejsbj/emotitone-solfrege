<template>
  <AnatomyDisplay
    title="Keyboard · Playable Compound"
    :features="features"
    caption="The production Keyboard builds the visible octave grid from Notes and Keys, adapts current app state to them, and installs global QWERTY routing once. DrawerKeyboard remains the surrounding composition."
  >
    <template #hero>
      <div class="keyboard-stage"><Keyboard /></div>
    </template>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import Keyboard from "@/components/compounds/Keyboard.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";

const features = [
  { label: "Children", value: "Key → Note across configured octave rows" },
  { label: "Integration", value: "music identity, audio attack/release, haptics, and visual activity" },
  { label: "Routing", value: "one global QWERTY controller; MIDI remains centrally owned" },
  { label: "Configuration", value: "rows, main octave, labels, gaps, size, shape, and surface" },
  { label: "Boundary", value: "no drawer chrome, pattern list, live card, or action bar" },
];
</script>

<style scoped>
.keyboard-stage {
  width: min(100%, 960px);
  padding: 12px;
  background: var(--ink);
}
</style>
