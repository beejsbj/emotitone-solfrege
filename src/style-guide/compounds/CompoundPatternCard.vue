<template>
  <AnatomyDisplay
    title="Pattern Card &middot; Compound"
    :features="features"
    caption="PatternCard owns the two pattern shapes: sleek stacked rows and expanded active cards. It composes BarTape, IconButton, and CodeStrip instead of carrying their internals. Specimen-only staging keeps the two shapes visible together."
  >
    <template #hero>
      <div class="hero-stack">
        <PatternCard v-bind="glassBellCard" />
        <PatternCard v-bind="brassWhistleCard" />
      </div>
    </template>

    <VariantGrid title="Shapes">
      <VariantCell caption="Sleek &middot; inactive stack row" stage="ink3">
        <PatternCard v-bind="lateNightCard" />
      </VariantCell>
      <VariantCell caption="Expanded &middot; active performer" stage="ink3">
        <PatternCard v-bind="hilbertCard" />
      </VariantCell>
      <VariantCell caption="No controls &middot; read-only active" stage="ink3">
        <PatternCard v-bind="readonlyCard" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import PatternCard from "../../components/compounds/PatternCard.vue";
import type { PatternCardShape } from "../../components/compounds/PatternCard.vue";
import type { BarTapeMode, BarTapeSegment } from "../../components/primatives/BarTape.vue";
import type { CodeStripToken } from "../../components/primatives/CodeStrip.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

interface PatternCardExample {
  shape?: PatternCardShape;
  num: string;
  name: string;
  sub: string;
  spine?: string;
  when?: string;
  barTape?: BarTapeSegment[];
  barTapeMode?: BarTapeMode;
  codeTokens?: CodeStripToken[];
  footerText?: string;
  statusText?: string;
  showActions?: boolean;
}

const glassBellTape: BarTapeSegment[] = [
  { note: "re" },
  { note: "mi" },
  { note: "do" },
  { note: "fa" },
  { note: "re" },
  { note: "la" },
  { note: "mi" },
  { note: "ti" },
];

const lateNightTape: BarTapeSegment[] = [
  { note: "sol" },
  { note: "la" },
  { note: "ti" },
  { note: "sol" },
  { note: "la" },
  { note: "do" },
  { note: "re" },
  { note: "mi" },
];

const brassWhistleCode: CodeStripToken[] = [
  { type: "note", note: "mi", text: "Mi", duration: "@0.282" },
  { type: "rest" },
  { type: "note", note: "sol", text: "Sol", duration: "@0.128" },
  { type: "rest" },
  { type: "note", note: "la", text: "La", lit: true, duration: "@0.2031" },
  { type: "rest" },
  { type: "note", note: "ti", text: "Ti", duration: "@0.09" },
];

const hilbertTapeCode: CodeStripToken[] = [
  { type: "note", note: "fa", text: "Fa", duration: "@0.0398" },
  { type: "rest" },
  { type: "note", note: "mi", text: "Mi", duration: "@0.09" },
  { type: "rest" },
  { type: "note", note: "re", text: "Re", lit: true, duration: "@0.3289" },
  { type: "rest" },
  { type: "note", note: "do", text: "Do" },
];

const glassBellCard: PatternCardExample = {
  num: "2I",
  name: "Glass Bell",
  sub: "F# Dorian · 96 BPM · 8 bars",
  when: "2d ago",
  spine: "var(--tomato)",
  barTape: glassBellTape,
  barTapeMode: "equal",
};

const lateNightCard: PatternCardExample = {
  num: "I2",
  name: "Late Night Tram",
  sub: "A minor · 72 BPM · 16 bars",
  when: "5h ago",
  spine: "var(--tomato)",
  barTape: lateNightTape,
  barTapeMode: "equal",
};

const brassWhistleCard: PatternCardExample = {
  shape: "active",
  num: "I0",
  name: "Brass Whistle",
  sub: "E Locrian · 120 BPM · 8 bars · Piano",
  spine: "var(--tomato)",
  codeTokens: brassWhistleCode,
  footerText: "Bar 03 / 08 · Steps 16/16",
  statusText: "Rec armed",
};

const hilbertCard: PatternCardExample = {
  shape: "active",
  num: "II",
  name: "Hilbert Tape",
  sub: "D# Lydian · 132 BPM · 4 bars",
  spine: "var(--tomato)",
  codeTokens: hilbertTapeCode,
  footerText: "Bar 01 / 04 · Steps 16/16",
  statusText: "Rec armed",
};

const readonlyCard: PatternCardExample = {
  ...brassWhistleCard,
  num: "V",
  name: "Silent Brass",
  showActions: false,
  statusText: "Saved take",
};

const features = [
  { label: "Shape", value: "sleek stack row · expanded active performer" },
  { label: "Children", value: "BarTape in sleek footer · CodeStrip in active body · IconButton rail" },
  { label: "Spine", value: "4px brand-color vertical accent" },
  { label: "Header", value: "ordinal badge, pattern name, mode/BPM metadata" },
  { label: "Footer", value: "active transport status and optional brass status tag" },
  { label: "States", value: "sleek hover/focus lift · active card rise handled by reel when animated" },
  { label: "Source", value: "components/compounds/PatternCard.vue" },
];
</script>

<style scoped>
.hero-stack {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 8px;
}
</style>
