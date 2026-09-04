<template>
  <AnatomyDisplay
    title="CodeStrip Bar &middot; Instrument Compound"
    :features="features"
    caption="One continuous translucent instrument rail: brass Play or Stop, an unframed dense CodeStrip, ink Backspace, and ivory Return. The actions remain icon-only."
  >
    <template #hero>
      <div class="code-strip-bar-specimen">
        <CodeStripBar
          :tokens="tokens"
          :is-playing="isPlaying"
          @toggle-playback="isPlaying = !isPlaying"
          @backspace="lastAction = 'Deleted last event'"
          @return="lastAction = 'Returned to a new line'"
        />
        <output aria-live="polite">{{ lastAction }}</output>
      </div>
    </template>

    <VariantGrid title="Responsive bar">
      <VariantCell caption="320px host &middot; stopped" stage="ink3">
        <div class="code-strip-bar-specimen__narrow">
          <CodeStripBar :tokens="shortTokens" />
        </div>
      </VariantCell>
      <VariantCell caption="Playing &middot; Play becomes Stop" stage="ink3">
        <CodeStripBar :tokens="tokens" is-playing />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { ref } from "vue";
import CodeStripBar from "@/components/compounds/CodeStripBar.vue";
import type { CodeStripToken } from "@/components/uniques/CodeStrip/index.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const isPlaying = ref(false);
const lastAction = ref("Choose an action");

const tokens: CodeStripToken[] = [
  { type: "note", note: "do", text: "Do", duration: "@0.125", progress: 1 },
  { type: "note", note: "mi", text: "Mi", duration: "@0.125", progress: .72 },
  { type: "rest", duration: "@0.0625", progress: .4 },
  { type: "note", note: "sol", text: "Sol", duration: "@0.25", progress: 0 },
];

const shortTokens = tokens.slice(0, 3);

const features = [
  { label: "Order", value: "Play/Stop → flexible CodeStrip → Backspace → Return" },
  { label: "Unity", value: "one shared translucent instrument-bar plane with no outline, outer padding, or exposed gaps" },
  { label: "CodeStrip", value: "dense, zero-inset, unframed, and transparent inside this bar only" },
  { label: "Actions", value: "40px icon-only Button primitives; accessible names remain" },
  { label: "Material", value: "brass Play/Stop; ink Backspace; ivory Return with Ink icon" },
  { label: "Backspace", value: "removes the last recorded event; never presented as editor Undo" },
  { label: "Return", value: "typewriter carriage return for commit-and-clear; never presented as Send" },
  { label: "Boundary", value: "arrangement only; stores, playback, editing, audio, and persistence stay outside" },
];
</script>

<style scoped>
.code-strip-bar-specimen {
  display: grid;
  gap: 10px;
  width: min(100%, 760px);
}

.code-strip-bar-specimen output {
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 9px;
  text-align: center;
}

.code-strip-bar-specimen__narrow {
  width: min(320px, 100%);
}
</style>
