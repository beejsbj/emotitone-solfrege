<template>
  <AnatomyDisplay
    title="Pattern Reel &middot; Interactive Compound"
    :features="features"
    caption="PatternReel owns the stacked deck choreography: inactive PatternCards sit above one active PatternCard, and clicking a stack card promotes it while demoting the previous active card. The specimen keeps only surrounding documentation copy."
  >
    <template #hero>
      <PatternReel :patterns="patterns" initial-active-id="brass" />
    </template>

    <VariantGrid title="States">
      <VariantCell caption="Default · active bottom" stage="ink3">
        <PatternReel :patterns="patterns" initial-active-id="brass" />
      </VariantCell>
      <VariantCell caption="Promoted Hilbert · active swap" stage="ink3">
        <PatternReel :patterns="patterns" initial-active-id="hilbert" />
      </VariantCell>
      <VariantCell caption="Short stack · two patterns" stage="ink3">
        <PatternReel :patterns="shortPatterns" initial-active-id="tram" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import PatternReel from "../../components/compounds/PatternReel.vue";
import type { PatternReelItem } from "../../components/compounds/PatternReel.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const patterns: PatternReelItem[] = [
  {
    id: "glass",
    num: "2I",
    name: "Glass Bell",
    sub: "F# Dorian / 96 BPM / 8 bars",
    when: "2d ago",
    spine: "var(--tomato)",
    barTape: [
      { note: "re" }, { note: "mi" }, { note: "do" }, { note: "fa" },
      { note: "re" }, { note: "la" }, { note: "mi" }, { note: "ti" },
    ],
    barTapeMode: "equal",
    codeTokens: [
      { type: "note", note: "re", text: "Re", duration: "@0.250" },
      { type: "rest" },
      { type: "note", note: "mi", text: "Mi", duration: "@0.125" },
      { type: "rest" },
      { type: "note", note: "do", text: "Do", lit: true, duration: "@0.375" },
      { type: "rest" },
      { type: "note", note: "fa", text: "Fa" },
    ],
  },
  {
    id: "tram",
    num: "I2",
    name: "Late Night Tram",
    sub: "A minor / 72 BPM / 16 bars",
    when: "5h ago",
    spine: "var(--tomato)",
    barTape: [
      { note: "sol" }, { note: "la" }, { note: "ti" }, { note: "sol" },
      { note: "la" }, { note: "do" }, { note: "re" }, { note: "mi" },
    ],
    barTapeMode: "equal",
    codeTokens: [
      { type: "note", note: "sol", text: "Sol", duration: "@0.167" },
      { type: "rest" },
      { type: "note", note: "la", text: "La", lit: true, duration: "@0.333" },
      { type: "rest" },
      { type: "note", note: "ti", text: "Ti", duration: "@0.090" },
      { type: "rest" },
      { type: "note", note: "do", text: "Do" },
    ],
  },
  {
    id: "hilbert",
    num: "II",
    name: "Hilbert Tape",
    sub: "D# Lydian / 132 BPM / 4 bars",
    when: "just now",
    spine: "var(--plum)",
    barTape: [
      { note: "fa" }, { note: "mi" }, { note: "re" }, { note: "do" },
      { note: "fa" }, { note: "la" }, { note: "ti" },
    ],
    barTapeMode: "major",
    codeTokens: [
      { type: "note", note: "fa", text: "Fa", duration: "@0.0398" },
      { type: "rest" },
      { type: "note", note: "mi", text: "Mi", duration: "@0.09" },
      { type: "rest" },
      { type: "note", note: "re", text: "Re", lit: true, duration: "@0.3289" },
      { type: "rest" },
      { type: "note", note: "do", text: "Do" },
    ],
  },
  {
    id: "brass",
    num: "I0",
    name: "Brass Whistle",
    sub: "E Locrian / 120 BPM / 8 bars / Piano",
    when: "active",
    spine: "var(--tomato)",
    barTape: [
      { note: "mi" }, { note: "sol" }, { note: "la" }, { note: "ti" },
      { note: "do" }, { note: "re" }, { note: "mi" },
    ],
    barTapeMode: "major",
    codeTokens: [
      { type: "note", note: "mi", text: "Mi", duration: "@0.282" },
      { type: "rest" },
      { type: "note", note: "sol", text: "Sol", duration: "@0.128" },
      { type: "rest" },
      { type: "note", note: "la", text: "La", lit: true, duration: "@0.2031" },
      { type: "rest" },
      { type: "note", note: "ti", text: "Ti", duration: "@0.09" },
    ],
  },
];

const shortPatterns = patterns.slice(1, 3);

const features = [
  { label: "Children", value: "PatternCard only; PatternCard composes lower primitives" },
  { label: "State", value: "one active id and ordered stack ids" },
  { label: "Motion", value: "stack depth tilt and active-rise transition" },
  { label: "Interaction", value: "click stacked card to promote; previous active card demotes" },
  { label: "Boundary", value: "reel owns choreography, PatternCard owns card anatomy" },
  { label: "Source", value: "components/compounds/PatternReel.vue" },
];
</script>
