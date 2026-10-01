<template>
  <AnatomyDisplay
    title="Loop Dial &middot; Musical Event Timeline"
    :features="features"
    caption="Loop Dial is a phrase as one loop on a record. Notes sit at their onsets, laid counter-clockwise from twelve, so rests read as gaps; radius reads pitch. While its phrase sounds, the disc spins clockwise under a fixed Ivory masthead at twelve, so each note arrives under the line as it plays. The hero spins on the guide's isolated UIBeat clock; production follows the sounding bar position. Reduced Motion holds it still."
  >
    <template #hero>
      <div class="hero-panel">
        <div class="hero-head">
          <span class="title">{{ patterns[0].name }}</span>
          <span class="meta">{{ patterns[0].notes.length }} events &middot; live at 120 BPM</span>
        </div>
        <LoopDial class="hero-dial" :segments="loops[0].segments" :length-ms="loops[0].lengthMs" :bar-ms="BAR_MS" live />
      </div>
    </template>

    <VariantGrid title="Real pattern sequences">
      <VariantCell caption="Twinkle &middot; at rest, loop start under the masthead" stage="ink3">
        <LoopDial :segments="loops[0].segments" :length-ms="loops[0].lengthMs" />
      </VariantCell>
      <VariantCell caption="Twinkle &middot; untimed segments laid end to end" stage="ink3">
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
import { ref } from "vue";
import LoopDial from "../../components/primatives/LoopDial.vue";
import type { LoopDialSegment } from "../../components/primatives/LoopDial.vue";
import { useMusicColor } from "../../composables/useMusicColor";
import { chromaticPitchHeight } from "../../services/scalePitch";
import { defaultPatterns } from "../../data/patterns";
import type { Pattern } from "../../types/patterns";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";
import { useUIBeatFixture } from "../guide/useUIBeatFixture";

// The guide's isolated clock: the hero spins without production playback.
useUIBeatFixture({ bpm: ref(120), meter: ref({ beatsPerBar: 4, beatUnit: 4 }) });
const BAR_MS = 2000;

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

/** The real loop: notes at their onsets, one beat of tail, as the generated code plays it. */
const loops = patterns.map((pattern, index) => {
  const origin = Math.min(...pattern.notes.map((note) => note.pressTime));
  const segments = timelines[index].map((segment, noteIndex) => ({
    ...segment,
    startMs: pattern.notes[noteIndex].pressTime - origin,
  }));
  const lastEnd = Math.max(...segments.map((segment) => segment.startMs + segment.durationMs));
  return { segments, lengthMs: lastEnd + BAR_MS / 4 };
});

const features = [
  { label: "Meaning", value: "the phrase as one loop: each note at its onset, rests as gaps" },
  { label: "Motion", value: "the live phrase's disc spins clockwise with the sounding bar position under a fixed masthead; others rest with loop start at twelve; Reduced Motion and Visuals off hold still" },
  { label: "Density", value: "34px Ink well; 2.5px butt-capped arcs with small gaps" },
  { label: "Radius", value: "exact chromatic pitch normalized from 7px to 14.5px; a single pitch shares the inner radius" },
  { label: "Segments", value: "one arc per performed note; repeated notes remain ordered events" },
  { label: "Arc length", value: "the note's share of the loop, with a 50ms minimum for visibility" },
  { label: "Color", value: "static primary stroke from the shared Music Color resolver" },
  { label: "Surface", value: "borderless Ink well under a fixed Ivory masthead at twelve" },
  { label: "Interaction", value: "none; Loop Dial is compact musical feedback" },
  { label: "Production", value: "between identity and actions in every PatternStrip, including Current" },
];
</script>

<style scoped>
/* Shown three times its 34px production size so the spin can be read. */
.hero-dial {
  width: 102px;
  height: 102px;
}

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
