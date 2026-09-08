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
import { useColorSystem } from "../../composables/useColorSystem";
import type { BarTapeSegment } from "../../components/primatives/BarTape.vue";
import type { ChromaticNote, MusicalMode } from "../../types";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const { getStaticPrimaryColorByScaleIndex } = useColorSystem();

const timeline = (
  events: Array<[scaleIndex: number, durationMs: number]>,
  mode: MusicalMode,
  key: ChromaticNote,
): BarTapeSegment[] =>
  events.map(([scaleIndex, durationMs]) => ({
    color: getStaticPrimaryColorByScaleIndex(scaleIndex, mode, key, 4),
    durationMs,
  }));

const patterns: PatternReelItem[] = [
  {
    id: "glass",
    num: "2I",
    name: "Glass Bell",
    sub: "F# Dorian / 96 BPM / 8 bars",
    when: "2d ago",
    spine: "var(--tomato)",
    barTape: timeline(
      [[1, 250], [2, 125], [0, 375], [3, 250], [1, 125], [5, 250], [2, 125], [6, 500]],
      "dorian",
      "F#",
    ),
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
    barTape: timeline(
      [[4, 500], [5, 250], [6, 250], [4, 750], [5, 250], [0, 500], [1, 250], [2, 1000]],
      "minor",
      "A",
    ),
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
    barTape: timeline(
      [[3, 100], [2, 225], [1, 100], [0, 450], [3, 100], [5, 225], [6, 675]],
      "lydian",
      "D#",
    ),
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
    barTape: timeline(
      [[2, 282], [4, 128], [5, 203], [6, 90], [0, 180], [1, 180], [2, 360]],
      "locrian",
      "E",
    ),
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
