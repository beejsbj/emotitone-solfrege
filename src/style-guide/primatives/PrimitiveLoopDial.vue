<template>
  <AnatomyDisplay
    title="Loop Dial &middot; Musical Event Timeline"
    :features="features"
    caption="Loop Dial lays a phrase around one clockwise loop from twelve. Arc length reads duration and radius reads pitch, so the 34px Ink well carries the melody's contour and rhythm in Music Color. The source owns geometry, pitch normalization, and minimum event visibility; the specimen uses real built-in pattern data."
  >
    <template #hero>
      <div class="hero-panel">
        <div class="hero-head">
          <span class="title">{{ patterns[0].name }}</span>
          <span class="meta">{{ patterns[0].notes.length }} events &middot; duration &times; pitch</span>
        </div>
        <LoopDial :segments="timelines[0]" />
      </div>
    </template>

    <VariantGrid title="Real pattern sequences">
      <VariantCell caption="Twinkle &middot; repeated notes and held ending" stage="ink3">
        <LoopDial :segments="timelines[0]" />
      </VariantCell>
      <VariantCell caption="Mary &middot; varied pitch order" stage="ink3">
        <LoopDial :segments="timelines[1]" />
      </VariantCell>
      <VariantCell caption="Hot Cross Buns &middot; short pulses and long notes" stage="ink3">
        <LoopDial :segments="timelines[2]" />
      </VariantCell>
      <VariantCell caption="Twinkle opening &middot; one repeated pitch shares the inner radius" stage="ink3">
        <LoopDial :segments="timelines[0].slice(0, 2)" />
      </VariantCell>
      <VariantCell caption="One held event &middot; a complete loop" stage="ink3">
        <LoopDial :segments="timelines[0].slice(0, 1)" />
      </VariantCell>
      <VariantCell caption="Empty take &middot; Ink well and start tick" stage="ink3">
        <LoopDial :segments="[]" aria-label="Empty take note timeline" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import LoopDial from "../../components/primatives/LoopDial.vue";
import type { LoopDialSegment } from "../../components/primatives/LoopDial.vue";
import { useMusicColor } from "../../composables/useMusicColor";
import { chromaticPitchHeight } from "../../services/scalePitch";
import { defaultPatterns } from "../../data/patterns";
import type { Pattern } from "../../types/patterns";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const { getStaticPrimaryColorByScaleIndex } = useMusicColor();
const patterns = defaultPatterns.slice(0, 3);

const toTimeline = (pattern: Pattern): LoopDialSegment[] =>
  pattern.notes.map((note) => ({
    color: getStaticPrimaryColorByScaleIndex(
      note.scaleIndex,
      pattern.mode,
      pattern.key,
      note.octave,
    ),
    durationMs: note.duration,
    height: chromaticPitchHeight(note, pattern),
  }));

const timelines = patterns.map(toTimeline);

const features = [
  { label: "Meaning", value: "the pattern's musical events in chronological order" },
  { label: "Density", value: "34px Ink well; 2.5px butt-capped arcs with small gaps" },
  { label: "Radius", value: "exact chromatic pitch normalized from 7px to 14.5px; a single pitch shares the inner radius" },
  { label: "Segments", value: "one arc per performed note; repeated notes remain ordered events" },
  { label: "Arc length", value: "proportional to duration with a 50ms minimum for visibility" },
  { label: "Color", value: "static primary stroke from the shared Music Color resolver" },
  { label: "Surface", value: "borderless Ink well with an Ivory start tick at twelve" },
  { label: "Interaction", value: "none; Loop Dial is compact musical feedback" },
  { label: "Production", value: "between identity and actions in every PatternStrip, including Current" },
];
</script>

<style scoped>
.hero-panel {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: var(--s-4);
  padding: var(--s-4);
  background: var(--ink);
}

.hero-head {
  display: flex;
  align-items: baseline;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--s-2);
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
