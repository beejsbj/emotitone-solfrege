<template>
  <AnatomyDisplay
    title="Beat Indicator &middot; Primitive"
    :features="features"
    caption="The chrome metronome is one primitive row: N cells strobe ivory across a loop, with an optional brass downbeat. The specimen keeps stage labels and variant captions local."
  >
    <template #hero>
      <div class="hero-stage">
        <BeatIndicator aria-label="4/4 beat at 120 BPM" />
        <div class="hero-label">4/4 &middot; 120 BPM</div>
      </div>
    </template>

    <VariantGrid title="Variants &mdash; Meter">
      <VariantCell caption="4/4 standard">
        <BeatIndicator :beats="4" aria-label="4 beat indicator" />
      </VariantCell>
      <VariantCell caption="3/4 waltz">
        <BeatIndicator :beats="3" aria-label="3 beat indicator" />
      </VariantCell>
      <VariantCell caption="2/4 march">
        <BeatIndicator :beats="2" aria-label="2 beat indicator" />
      </VariantCell>
      <VariantCell caption="6/8 compound">
        <BeatIndicator :beats="6" aria-label="6 beat indicator" />
      </VariantCell>
      <VariantCell caption="Even &middot; no downbeat">
        <BeatIndicator :beats="4" :downbeat="false" aria-label="Even beat indicator" />
      </VariantCell>
      <VariantCell caption="Static &middot; idle">
        <BeatIndicator :beats="4" static aria-label="Static beat indicator" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Variants &mdash; Size and tempo">
      <VariantCell caption="Small &middot; 12px cell">
        <BeatIndicator size="sm" aria-label="Small beat indicator" />
      </VariantCell>
      <VariantCell caption="Medium &middot; 18px cell">
        <BeatIndicator aria-label="Medium beat indicator" />
      </VariantCell>
      <VariantCell caption="Large &middot; 28px cell">
        <BeatIndicator size="lg" aria-label="Large beat indicator" />
      </VariantCell>
      <VariantCell caption="90 BPM &middot; 2.667s loop">
        <BeatIndicator loop-duration="2.667s" aria-label="90 BPM beat indicator" />
      </VariantCell>
      <VariantCell caption="120 BPM &middot; 2s loop">
        <BeatIndicator loop-duration="2s" aria-label="120 BPM beat indicator" />
      </VariantCell>
      <VariantCell caption="140 BPM &middot; 1.714s loop">
        <BeatIndicator loop-duration="1.714s" aria-label="140 BPM beat indicator" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import BeatIndicator from "../../components/primatives/BeatIndicator.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const features = [
  { label: "Root", value: "inline-flex row · gap changes with size" },
  { label: "Cell", value: "12 / 18 / 28px square · 1px hairline border · transparent rest" },
  { label: "Lit", value: "global beat-cell keyframe · steps(1) · one loop duration" },
  { label: "Downbeat", value: "first cell uses beat-down brass keyframe unless downbeat=false" },
  { label: "Loop", value: "loopDuration prop; default 2s for a 4-beat bar at 120 BPM" },
  { label: "Meter", value: "beats prop creates 1..N cells and divides stagger by count" },
  { label: "Static", value: "no animation; downbeat held brass for idle/loading states" },
  { label: "Reduced", value: "motion removed; downbeat held brass by media query" },
];
</script>

<style scoped>
.hero-stage {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.hero-label {
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 13px;
  letter-spacing: .14em;
  text-transform: uppercase;
  color: var(--ivory-2);
}
</style>
