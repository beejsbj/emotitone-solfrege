<template>
  <AnatomyDisplay
    title="Code Strip &middot; Notation Unique"
    :features="features"
    caption="CodeStrip is LiveStrip's successor notation surface. It composes Note and Chord, owns Rest, duration presentation, density, punctuation, and controlled temporal fill; playback and editing remain outside this workbench."
  >
    <template #hero>
      <CodeStrip :tokens="animatedTokens" />
    </template>

    <VariantGrid id="code-strip-complete-anatomy" title="Anatomy &mdash; Note, Chord, Rest">
      <VariantCell caption="Fused chord symbol" stage="ink3">
        <CodeStrip :tokens="fusedSequence" />
      </VariantCell>
      <VariantCell caption="Clustered chord notes" stage="ink3">
        <CodeStrip :tokens="clusteredSequence" />
      </VariantCell>
      <VariantCell caption="Mixed notation sequence" stage="ink3">
        <CodeStrip :tokens="mixedSequence" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid id="code-strip-duration" title="Duration &mdash; Text, meter marks, or hidden">
      <VariantCell caption="Stacked &middot; textual" stage="ink3">
        <CodeStrip duration-mode="stacked" :tokens="durationSequence" />
      </VariantCell>
      <VariantCell caption="Bar &middot; 4/4 meter marks &middot; Rest included" stage="ink3">
        <CodeStrip duration-mode="bar" time-signature="4/4" :tokens="durationSequence" />
      </VariantCell>
      <VariantCell caption="Bar &middot; 3/4 meter marks &middot; Rest included" stage="ink3">
        <CodeStrip duration-mode="bar" time-signature="3/4" :tokens="durationSequence" />
      </VariantCell>
      <VariantCell caption="Hidden &middot; rhythm unstamped" stage="ink3">
        <CodeStrip duration-mode="hidden" :tokens="durationSequence" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid id="code-strip-rest" title="Rest &mdash; Ink to Ivory, no duration tag">
      <VariantCell caption="Empty &middot; 0%" stage="ink3">
        <CodeStrip :show-chevron="false" :tokens="restTokens(0)" />
      </VariantCell>
      <VariantCell caption="Entering &middot; 28%" stage="ink3">
        <CodeStrip :show-chevron="false" :tokens="restTokens(.28)" />
      </VariantCell>
      <VariantCell caption="Passing &middot; 66%" stage="ink3">
        <CodeStrip :show-chevron="false" :tokens="restTokens(.66)" />
      </VariantCell>
      <VariantCell caption="Complete &middot; 100%" stage="ink3">
        <CodeStrip :show-chevron="false" :tokens="restTokens(1)" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid id="code-strip-density" title="Density &mdash; Same notation">
      <VariantCell caption="Dense" stage="ink3">
        <CodeStrip density="dense" duration-mode="hidden" :tokens="densitySequence" />
      </VariantCell>
      <VariantCell caption="Default" stage="ink3">
        <CodeStrip density="default" duration-mode="hidden" :tokens="densitySequence" />
      </VariantCell>
      <VariantCell caption="Spaced" stage="ink3">
        <CodeStrip density="spaced" duration-mode="hidden" :tokens="densitySequence" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid id="code-strip-glyph-proportions" title="Accepted glyph &mdash; Note owns display">
      <VariantCell caption="Solfège" stage="ink3">
        <CodeStrip duration-mode="hidden" :tokens="solfegeSequence" />
      </VariantCell>
      <VariantCell caption="Scale degree" stage="ink3">
        <CodeStrip duration-mode="hidden" :tokens="degreeSequence" />
      </VariantCell>
      <VariantCell caption="Raw pitch" stage="ink3">
        <CodeStrip duration-mode="hidden" :tokens="rawSequence" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import type { ChordMember } from "../../components/compounds/Chord.vue";
import CodeStrip from "../../components/uniques/CodeStrip.vue";
import type { CodeStripToken } from "../../components/uniques/CodeStrip.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const chordMembers = (progress: number | number[] = 1): ChordMember[] => {
  const values = Array.isArray(progress) ? progress : [progress, progress, progress, progress];
  return [
    { id: "c", syllable: "Do", rawPitch: "C4", scaleIndex: 0, progress: values[0] },
    { id: "e", syllable: "Mi", rawPitch: "E4", scaleIndex: 2, progress: values[1] },
    { id: "g", syllable: "Sol", rawPitch: "G4", scaleIndex: 4, progress: values[2] },
    { id: "b", syllable: "Ti", rawPitch: "B4", scaleIndex: 6, progress: values[3] },
  ];
};

const fusedSequence: CodeStripToken[] = [
  { type: "note", note: "fa", text: "Fa", duration: "@0.125", progress: 1 },
  { type: "rest", duration: "@0.0625", progress: .7 },
  { type: "chord", symbol: "Cmaj7", members: chordMembers([1, .76, .52, .3]), duration: "@0.5" },
  { type: "rest", duration: "@0.125", progress: .15 },
  { type: "note", note: "la", text: "La", duration: "@0.25", progress: 0 },
];

const clusteredSequence: CodeStripToken[] = [
  { type: "note", note: "fa", text: "Fa", duration: "@0.125", progress: 1 },
  { type: "rest", duration: "@0.0625", progress: .7 },
  { type: "chord", symbol: "Cmaj7", display: "notes", members: chordMembers([1, .76, .52, .3]), duration: "@0.5" },
  { type: "rest", duration: "@0.125", progress: .15 },
  { type: "note", note: "la", text: "La", duration: "@0.25", progress: 0 },
];

const mixedSequence: CodeStripToken[] = [
  { type: "note", note: "do", text: "Do", duration: "@0.125", progress: 1 },
  { type: "note", note: "re", text: "Re", duration: "@0.125", progress: .9 },
  { type: "rest", duration: "@0.0625", progress: .64 },
  { type: "chord", symbol: "Em", members: chordMembers([.56, .38, .2, .08]).slice(1), duration: "@0.25" },
  { type: "separator", text: "/" },
  { type: "note", note: "sol", text: "Sol", duration: "@0.5", progress: 0 },
];

const durationSequence: CodeStripToken[] = [
  { type: "note", note: "do", text: "Do", duration: "@0.125", progress: 1 },
  { type: "rest", duration: "@0.0625", progress: .72 },
  { type: "chord", symbol: "Cmaj7", members: chordMembers(.48), duration: "@0.5" },
  { type: "note", note: "la", text: "La", duration: "@0.25", progress: 0 },
];

const restTokens = (progress: number): CodeStripToken[] => [
  { type: "rest", duration: "@0.5", progress },
];

const densitySequence: CodeStripToken[] = [
  { type: "note", note: "do", text: "Do", progress: 1 },
  { type: "note", note: "re", text: "Re", progress: 1 },
  { type: "rest", progress: .7 },
  { type: "chord", symbol: "Em", members: chordMembers(.45).slice(1) },
  { type: "note", note: "fa", text: "Fa", progress: 0 },
  { type: "rest", progress: 0 },
  { type: "note", note: "sol", text: "Sol", progress: 0 },
];

const displaySequence = (glyph: "syl" | "deg" | "raw"): CodeStripToken[] => [
  { type: "note", note: "fa", glyph, text: glyph === "syl" ? "Fa" : glyph === "deg" ? "4" : "F4", progress: 1 },
  { type: "rest", progress: .55 },
  { type: "note", note: "la", glyph, text: glyph === "syl" ? "La" : glyph === "deg" ? "6" : "A4", progress: .3 },
  { type: "rest", progress: 0 },
  { type: "note", note: "sol", glyph, text: glyph === "syl" ? "Sol" : glyph === "deg" ? "5" : "G4", progress: 0 },
];

const solfegeSequence = displaySequence("syl");
const degreeSequence = displaySequence("deg");
const rawSequence = displaySequence("raw");

const phase = ref(.46);
let animationFrame: number | null = null;
let animationStart = 0;
let reduceMotion: MediaQueryList | null = null;

const eventProgress = (position: number) => Math.min(1, Math.max(0, (phase.value - position) * 5));

const animatedTokens = computed<CodeStripToken[]>(() => [
  { type: "note", note: "fa", text: "Fa", duration: "@0.125", progress: eventProgress(0) },
  { type: "rest", duration: "@0.0625", progress: eventProgress(.2) },
  {
    type: "chord",
    symbol: "Cmaj7",
    duration: "@0.5",
    members: chordMembers([
      eventProgress(.38),
      eventProgress(.43),
      eventProgress(.48),
      eventProgress(.53),
    ]),
  },
  { type: "rest", duration: "@0.125", progress: eventProgress(.72) },
  { type: "note", note: "la", text: "La", duration: "@0.25", progress: eventProgress(.86) },
]);

const tick = (time: number) => {
  if (!animationStart) animationStart = time;
  phase.value = ((time - animationStart) % 5200) / 5200;
  animationFrame = requestAnimationFrame(tick);
};

onMounted(() => {
  reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (!reduceMotion.matches) animationFrame = requestAnimationFrame(tick);
});

onBeforeUnmount(() => {
  if (animationFrame != null) cancelAnimationFrame(animationFrame);
});

const features = [
  { label: "Composition", value: "Note primitive + accepted Chord compound + CodeStrip-local Rest" },
  { label: "Glyph", value: "3:4 Note proportion · 27.2–33.6px host scale" },
  { label: "Chord", value: "symbol → fused · notes → clustered" },
  { label: "Rest", value: "Ink paper surface · Ivory bottom-to-top fill · no duration tag" },
  { label: "Progress", value: "Ink reveals unchanged music color · controlled 0–1 · 72ms linear response" },
  { label: "Duration", value: "stacked text, time-signature marks, or hidden" },
  { label: "Density", value: "dense, default, or spaced" },
  { label: "Boundary", value: "no clock, editing, audio, store, follow-scroll, or Strudel ownership" },
  { label: "Source", value: "components/uniques/CodeStrip.vue" },
];
</script>

<style scoped>
#code-strip-complete-anatomy,
#code-strip-duration,
#code-strip-rest,
#code-strip-density,
#code-strip-glyph-proportions {
  scroll-margin-top: 16px;
}

#code-strip-complete-anatomy :deep(.variant-grid__items),
#code-strip-duration :deep(.variant-grid__items),
#code-strip-density :deep(.variant-grid__items),
#code-strip-glyph-proportions :deep(.variant-grid__items) {
  grid-template-columns: 1fr;
}

#code-strip-rest :deep(.variant-grid__items) {
  grid-template-columns: repeat(4, 1fr);
}

@media (max-width: 560px) {
  #code-strip-rest :deep(.variant-grid__items) {
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
