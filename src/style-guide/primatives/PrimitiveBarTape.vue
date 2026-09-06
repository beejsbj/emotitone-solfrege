<template>
  <AnatomyDisplay
    title="Bar Tape &middot; Music Feedback Primitive"
    :features="features"
    caption="Seven diatonic seats map music feedback onto a flush strip. The source component owns segment color, major/equal proportions, height, dim state, downbeat, playhead, and boxed/flush framing. The specimen keeps panel staging and captions local."
  >
    <template #hero>
      <div class="hero-panel">
        <div class="hero-head">
          <span class="title">Piano</span>
          <span class="meta">C Major &middot; 4/4 &middot; Live</span>
        </div>
        <BarTape mode="major" :playhead-percent="18" />
        <div class="hero-ticks">
          <span></span><span></span><span></span><span></span>
          <span></span><span></span><span></span><span></span>
        </div>
      </div>
    </template>

    <VariantGrid title="Variants &mdash; Segment model">
      <VariantCell caption="Major ratio &middot; 2-2-1-2-2-2-1" stage="ink3">
        <BarTape mode="major" />
      </VariantCell>
      <VariantCell caption="Equal segments &middot; grid mode" stage="ink3">
        <BarTape mode="equal" />
      </VariantCell>
      <VariantCell caption="Live playhead &middot; current position" stage="ink3">
        <BarTape mode="equal" :playhead-percent="34" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; States">
      <VariantCell caption="Played lit &middot; unplayed dim" stage="ink3">
        <BarTape mode="equal" :segments="sparseSegments" />
      </VariantCell>
      <VariantCell caption="Do downbeat &middot; one brass signal" stage="ink3">
        <BarTape :segments="downbeatSegments" />
      </VariantCell>
      <VariantCell caption="Fa spotlight &middot; scale-degree focus" stage="ink3">
        <BarTape mode="equal" :segments="focusSegments" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Size and frame">
      <VariantCell caption="Tall &middot; 16px section anchor" stage="ink3">
        <BarTape size="tall" />
      </VariantCell>
      <VariantCell caption="Thin &middot; 4px meta row" stage="ink3">
        <BarTape size="thin" />
      </VariantCell>
      <VariantCell caption="Flush frame &middot; card footer use" stage="ink3">
        <div class="mini-panel">
          <span>Synth</span>
          <BarTape frame="flush" :playhead-percent="52" />
        </div>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import BarTape from "../../components/primatives/BarTape.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";
import type { BarTapeSegment } from "../../components/primatives/BarTape.vue";

const sparseSegments: BarTapeSegment[] = [
  { note: "do" },
  { note: "re", dim: true },
  { note: "mi" },
  { note: "fa", dim: true },
  { note: "sol" },
  { note: "la", dim: true },
  { note: "ti", dim: true },
];

const downbeatSegments: BarTapeSegment[] = [
  { note: "do", downbeat: true },
  { note: "re", dim: true },
  { note: "mi", dim: true },
  { note: "fa", dim: true },
  { note: "sol", dim: true },
  { note: "la", dim: true },
  { note: "ti", dim: true },
];

const focusSegments: BarTapeSegment[] = [
  { note: "do", dim: true },
  { note: "re", dim: true },
  { note: "mi", dim: true },
  { note: "fa" },
  { note: "sol", dim: true },
  { note: "la", dim: true },
  { note: "ti", dim: true },
];

const features = [
  { label: "Panel", value: "ink bg · 1px hairline · optional flush frame" },
  { label: "Height", value: "8px default · 4px thin · 16px tall" },
  { label: "Segments", value: "7 spans · one per diatonic seat" },
  { label: "Color", value: "--note-do through --note-ti per seat" },
  { label: "Major", value: "2-2-1-2-2-2-1 flex ratio; mi and ti are narrow" },
  { label: "Equal", value: "uniform flex: 1 per segment" },
  { label: "Playhead", value: "2px ivory · glow 6px · clamped 0-100%" },
  { label: "Downbeat", value: "--brass + --shadow-glow-brass on one segment" },
  { label: "Dim", value: "opacity .18 on unplayed segments" },
  { label: "Tilt", value: "none; strip sits flush, no rotation" },
];
</script>

<style scoped>
.hero-panel {
  width: 100%;
  background: var(--ink-3);
  border: 1px solid var(--ink-5);
}

.hero-head {
  display: flex;
  align-items: baseline;
  gap: 14px;
  padding: 12px 14px 10px;
}

.hero-head .title {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--ivory);
  border: 1px solid var(--ink-5);
  padding: 4px 9px 3px;
}

.hero-head .meta {
  font-family: var(--font-mono);
  font-size: 10px;
  letter-spacing: .14em;
  color: var(--ivory-3);
  text-transform: uppercase;
}

.hero-ticks {
  display: flex;
  height: 6px;
  align-items: stretch;
  border: 1px solid var(--hairline);
  border-top: 0;
}

.hero-ticks span {
  flex: 1;
  border-right: 1px solid var(--hairline);
}

.hero-ticks span:last-child {
  border-right: 0;
}

.mini-panel {
  width: 100%;
  border: 1px solid var(--ink-5);
  background: var(--ink-3);
}

.mini-panel span {
  display: block;
  padding: 8px 10px 6px;
  font: var(--t-label);
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  color: var(--ivory);
}
</style>
