<template>
  <AnatomyDisplay
    title="Beat Indicator &middot; Mark Compound"
    :features="features"
    caption="Beat Indicator adds count, selection, timing, and downbeat emphasis around the authoritative Mark primitive. Its specimen drives real Mark sets; it owns no geometry of its own."
  >
    <template #hero>
      <div class="hero-stage">
        <BeatIndicator :marks="['disk', 'eighth', 'wave', 'star']" size="lg" aria-label="Four Mark beat indicator" />
        <div class="hero-label">4 Marks &middot; one pulse</div>
      </div>
    </template>

    <VariantGrid title="Sets &mdash; one family, different rhythms">
      <VariantCell caption="Single Mark repeated">
        <BeatIndicator :marks="['disk']" aria-label="Repeated disk beat indicator" />
      </VariantCell>
      <VariantCell caption="Structural set">
        <BeatIndicator :marks="['triangle', 'disk', 'wave', 'diamond']" aria-label="Structural Mark beat indicator" />
      </VariantCell>
      <VariantCell caption="Notation set">
        <BeatIndicator :marks="['eighth', 'accent', 'flat', 'fermata']" aria-label="Notation Mark beat indicator" />
      </VariantCell>
      <VariantCell caption="3/4">
        <BeatIndicator :beats="3" :marks="['triangle', 'eighth', 'star']" aria-label="Three beat Mark indicator" />
      </VariantCell>
      <VariantCell caption="6/8">
        <BeatIndicator :beats="6" :marks="['disk', 'staccato']" aria-label="Six beat Mark indicator" />
      </VariantCell>
      <VariantCell caption="Even &middot; no downbeat">
        <BeatIndicator :downbeat="false" :marks="['wave', 'bar']" aria-label="Even Mark beat indicator" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="State &mdash; size and tempo">
      <VariantCell caption="Small &middot; 12px">
        <BeatIndicator size="sm" :marks="['disk', 'star']" aria-label="Small Mark beat indicator" />
      </VariantCell>
      <VariantCell caption="Medium &middot; 18px">
        <BeatIndicator :marks="['disk', 'star']" aria-label="Medium Mark beat indicator" />
      </VariantCell>
      <VariantCell caption="Large &middot; 28px">
        <BeatIndicator size="lg" :marks="['disk', 'star']" aria-label="Large Mark beat indicator" />
      </VariantCell>
      <VariantCell caption="90 BPM &middot; 2.667s loop">
        <BeatIndicator loop-duration="2.667s" :marks="['eighth']" aria-label="90 BPM Mark beat indicator" />
      </VariantCell>
      <VariantCell caption="140 BPM &middot; 1.714s loop">
        <BeatIndicator loop-duration="1.714s" :marks="['accent']" aria-label="140 BPM Mark beat indicator" />
      </VariantCell>
      <VariantCell caption="Static &middot; idle">
        <BeatIndicator static :marks="['disk', 'wave', 'star', 'accent']" aria-label="Static Mark beat indicator" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import BeatIndicator from "@/components/compounds/BeatIndicator.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const features = [
  { label: "Class", value: "compound; composes Mark directly" },
  { label: "Set", value: "one or more Mark names cycle across N beats" },
  { label: "Tone", value: "ivory pulse; optional brass downbeat" },
  { label: "Loop", value: "loopDuration prop; transport protocol remains outside this unit" },
  { label: "Meter", value: "beats prop creates 1..N Mark slots" },
  { label: "Static", value: "no animation; downbeat held for idle states" },
  { label: "Reduced", value: "motion removed; downbeat remains legible" },
  { label: "Geometry", value: "none local; every visible glyph comes from Mark" },
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
  color: var(--ivory-2);
  font: 700 13px/1 var(--font-display);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
</style>
