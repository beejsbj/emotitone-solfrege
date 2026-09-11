<template>
  <AnatomyDisplay
    title="Bar Tape &middot; Musical Event Timeline"
    :features="features"
    caption="Bar Tape compresses the ordered notes of a pattern into one duration-proportional color strip. The source owns timeline layout and minimum segment visibility; Music Color supplies the fills. The specimen uses real built-in pattern data."
  >
    <template #hero>
      <div class="hero-panel">
        <div class="hero-head">
          <span class="title">{{ patterns[0].name }}</span>
          <span class="meta">{{ patterns[0].notes.length }} events &middot; duration weighted</span>
        </div>
        <BarTape :segments="timelines[0]" />
      </div>
    </template>

    <VariantGrid title="Real pattern sequences">
      <VariantCell caption="Twinkle &middot; repeated notes and held ending" stage="ink3">
        <BarTape :segments="timelines[0]" />
      </VariantCell>
      <VariantCell caption="Mary &middot; varied pitch order" stage="ink3">
        <BarTape :segments="timelines[1]" />
      </VariantCell>
      <VariantCell caption="Hot Cross Buns &middot; short pulses and long notes" stage="ink3">
        <BarTape :segments="timelines[2]" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import BarTape from "../../components/primatives/BarTape.vue";
import type { BarTapeSegment } from "../../components/primatives/BarTape.vue";
import { useMusicColor } from "../../composables/useMusicColor";
import { defaultPatterns } from "../../data/patterns";
import type { Pattern } from "../../types/patterns";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const { getStaticPrimaryColorByScaleIndex } = useMusicColor();
const patterns = defaultPatterns.slice(0, 3);

const toTimeline = (pattern: Pattern): BarTapeSegment[] =>
  pattern.notes.map((note) => ({
    color: getStaticPrimaryColorByScaleIndex(
      note.scaleIndex,
      pattern.mode,
      pattern.key,
      note.octave,
    ),
    durationMs: note.duration,
  }));

const timelines = patterns.map(toTimeline);

const features = [
  { label: "Meaning", value: "the pattern's musical events in chronological order" },
  { label: "Density", value: "1px compressed timeline" },
  { label: "Segments", value: "one span per performed note; repeated notes remain ordered events" },
  { label: "Width", value: "proportional to duration with a 50ms minimum for visibility" },
  { label: "Color", value: "static primary fill from the shared Music Color resolver" },
  { label: "Surface", value: "borderless and flush; the consuming card owns clipping and framing" },
  { label: "Interaction", value: "none; Bar Tape is compact musical feedback" },
  { label: "Production", value: "every PatternStrip top edge, including Current" },
];
</script>

<style scoped>
.hero-panel {
  width: 100%;
  overflow: hidden;
  border: 1px solid var(--ink-5);
  background: var(--ink-3);
}

.hero-head {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 14px;
  padding: 12px 14px 10px;
}

.hero-head .title {
  overflow: hidden;
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: 14px;
  font-weight: 700;
  letter-spacing: .04em;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.hero-head .meta {
  flex: 0 0 auto;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

@media (max-width: 560px) {
  .hero-head {
    align-items: start;
    flex-direction: column;
  }
}
</style>
