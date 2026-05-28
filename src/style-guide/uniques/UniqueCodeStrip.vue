<template>
  <AnatomyDisplay
    title="Code Strip &middot; Notation Unique"
    :features="features"
    caption="CodeStrip is a singular notation artifact that compounds may compose alongside primitives. It owns notation row chrome, note glyph treatments, durations, rests, punctuation, lit state, density, wrapping, and duration bars."
  >
    <template #hero>
      <CodeStrip :tokens="heroTokens" />
    </template>

    <VariantGrid title="Variants &mdash; Display mode">
      <VariantCell caption="Solfège &middot; Do Re Mi" stage="ink3">
        <CodeStrip :tokens="solfegeTokens" />
      </VariantCell>
      <VariantCell caption="Scale degree &middot; Jazz numerals" stage="ink3">
        <CodeStrip :tokens="degreeTokens" />
      </VariantCell>
      <VariantCell caption="Raw notes &middot; pitch letters" stage="ink3">
        <CodeStrip :tokens="rawTokens" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Duration">
      <VariantCell caption="Width bars &middot; proportional" stage="ink3">
        <CodeStrip :tokens="durationBarTokens" />
      </VariantCell>
      <VariantCell caption="Stacked &middot; note over duration" stage="ink3">
        <CodeStrip :tokens="stackedTokens" />
      </VariantCell>
      <VariantCell caption="Sparse &middot; no duration stamps" stage="ink3">
        <CodeStrip density="spaced" :tokens="sparseTokens" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Rhythm and grouping">
      <VariantCell caption="Rest-heavy &middot; syncopated" stage="ink3">
        <CodeStrip :tokens="restHeavyTokens" />
      </VariantCell>
      <VariantCell caption="Chord group &middot; bracket notation" stage="ink3">
        <CodeStrip :tokens="chordTokens" />
      </VariantCell>
      <VariantCell caption="Dense &middot; compact glyph size" stage="ink3">
        <CodeStrip density="dense" :tokens="denseTokens" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import CodeStrip from "../../components/uniques/CodeStrip.vue";
import type { CodeStripToken } from "../../components/uniques/CodeStrip.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const heroTokens: CodeStripToken[] = [
  { type: "note", note: "fa", text: "Fa", duration: "@0.0398" },
  { type: "rest" },
  { type: "note", note: "fa", text: "Fa", duration: "@0.028" },
  { type: "rest" },
  { type: "note", note: "la", text: "La", lit: true, duration: "@0.2031" },
  { type: "rest" },
  { type: "note", note: "sol", text: "Sol", duration: "@0.09" },
];

const solfegeTokens: CodeStripToken[] = [
  { type: "note", note: "do", text: "Do", duration: "@0.282" },
  { type: "rest" },
  { type: "note", note: "re", text: "Re", duration: "@0.128" },
  { type: "rest" },
  { type: "note", note: "mi", text: "Mi", duration: "@0.1225" },
  { type: "rest" },
  { type: "note", note: "fa", text: "Fa" },
  { type: "rest" },
  { type: "note", note: "sol", text: "Sol", duration: "@0.25" },
  { type: "rest" },
  { type: "note", note: "la", text: "La" },
  { type: "rest" },
  { type: "note", note: "ti", text: "Ti", duration: "@0.0675" },
];

const degreeTokens: CodeStripToken[] = [
  { type: "note", note: "do", glyph: "deg", text: "1̂", duration: "@0.282" },
  { type: "rest" },
  { type: "note", note: "re", glyph: "deg", text: "2̂", duration: "@0.128" },
  { type: "rest" },
  { type: "note", note: "mi", glyph: "deg", text: "3̂", duration: "@0.1225" },
  { type: "rest" },
  { type: "note", note: "fa", glyph: "deg", text: "4̂" },
  { type: "rest" },
  { type: "note", note: "sol", glyph: "deg", text: "5̂", duration: "@0.25" },
  { type: "rest" },
  { type: "note", note: "la", glyph: "deg", text: "6̂" },
  { type: "rest" },
  { type: "note", note: "ti", glyph: "deg", text: "7̂", duration: "@0.0675" },
];

const rawTokens: CodeStripToken[] = [
  { type: "note", note: "do", glyph: "raw", text: "C", duration: "@0.282" },
  { type: "rest" },
  { type: "note", note: "re", glyph: "raw", text: "D", duration: "@0.128" },
  { type: "rest" },
  { type: "note", note: "mi", glyph: "raw", text: "E", duration: "@0.1225" },
  { type: "rest" },
  { type: "note", note: "fa", glyph: "raw", text: "F" },
  { type: "rest" },
  { type: "note", note: "sol", glyph: "raw", text: "G", duration: "@0.25" },
  { type: "rest" },
  { type: "note", note: "la", glyph: "raw", text: "A" },
  { type: "rest" },
  { type: "note", note: "ti", glyph: "raw", text: "B", duration: "@0.0675" },
];

const durationBarTokens: CodeStripToken[] = [
  { type: "note", note: "do", text: "Do", durationBarWidth: 28 },
  { type: "rest" },
  { type: "note", note: "re", text: "Re", durationBarWidth: 14 },
  { type: "rest" },
  { type: "note", note: "mi", text: "Mi", lit: true, durationBarWidth: 22 },
  { type: "rest" },
  { type: "note", note: "fa", text: "Fa", durationBarWidth: 8 },
  { type: "rest" },
  { type: "note", note: "sol", text: "Sol", durationBarWidth: 36 },
];

const stackedTokens: CodeStripToken[] = [
  { type: "note", note: "do", text: "Do", stackedDuration: "@0.25" },
  { type: "rest" },
  { type: "note", note: "re", text: "Re", stackedDuration: "@0.125" },
  { type: "rest" },
  { type: "note", note: "mi", text: "Mi", stackedDuration: "@0.375" },
  { type: "rest" },
  { type: "note", note: "fa", text: "Fa", stackedDuration: "@0.0625" },
  { type: "rest" },
  { type: "note", note: "sol", text: "Sol", stackedDuration: "@0.5" },
];

const sparseTokens: CodeStripToken[] = [
  { type: "note", note: "do", text: "Do" },
  { type: "rest" },
  { type: "note", note: "mi", text: "Mi" },
  { type: "rest" },
  { type: "note", note: "sol", text: "Sol" },
  { type: "rest" },
  { type: "note", note: "mi", text: "Mi" },
  { type: "rest" },
  { type: "note", note: "do", text: "Do" },
];

const restHeavyTokens: CodeStripToken[] = [
  { type: "rest", duration: "@0.0415" },
  { type: "note", note: "fa", text: "Fa", duration: "@0.0398" },
  { type: "rest", duration: "@0.3289" },
  { type: "note", note: "la", text: "La", duration: "@0.2031" },
  { type: "rest", duration: "@0.09" },
  { type: "rest", duration: "@0.0413" },
  { type: "note", note: "la", text: "La", duration: "@0.0813" },
];

const chordTokens: CodeStripToken[] = [
  { type: "bracket", text: "{" },
  { type: "note", note: "do", text: "Do" },
  { type: "separator" },
  { type: "note", note: "mi", text: "Mi", accidental: "♭" },
  { type: "separator" },
  { type: "note", note: "sol", text: "Sol" },
  { type: "bracket", text: "}" },
  { type: "rest" },
  { type: "note", note: "la", text: "La", duration: "@0.5" },
  { type: "rest" },
  { type: "note", note: "ti", text: "Ti" },
];

const denseTokens: CodeStripToken[] = [
  { type: "note", note: "do", text: "Do", duration: "@.28" },
  { type: "rest" },
  { type: "note", note: "re", text: "Re" },
  { type: "rest" },
  { type: "note", note: "mi", text: "Mi", duration: "@.12" },
  { type: "rest" },
  { type: "note", note: "fa", text: "Fa" },
  { type: "rest" },
  { type: "note", note: "sol", text: "Sol", duration: "@.25" },
  { type: "rest" },
  { type: "note", note: "la", text: "La", duration: "@.09" },
  { type: "rest" },
  { type: "note", note: "ti", text: "Ti" },
  { type: "rest" },
  { type: "note", note: "do", text: "Do", duration: "@.14" },
  { type: "rest" },
  { type: "note", note: "re", text: "Re" },
  { type: "rest" },
  { type: "note", note: "mi", text: "Mi" },
];

const features = [
  { label: "Row", value: "ink-2 bg · 1px hairline · 36px min-height" },
  { label: "Chevron", value: "optional leading mono glyph" },
  { label: "Glyphs", value: "solfège, scale degree, or raw note text" },
  { label: "Color", value: "--note-* on note glyphs only; chrome remains ivory" },
  { label: "Duration", value: "mono stamps, proportional bars, or stacked values" },
  { label: "Rest", value: "~ token with optional duration" },
  { label: "Grouping", value: "brackets and separators for chord notation" },
  { label: "State", value: "lit note glow plus 5px square marker" },
  { label: "Density", value: "default, dense, spaced, and wrapped sequence modes" },
  { label: "Source", value: "components/uniques/CodeStrip.vue" },
];
</script>
