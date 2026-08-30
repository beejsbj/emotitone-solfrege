<template>
  <AnatomyDisplay
    title="Chord &middot; Musical Compound"
    :features="features"
    caption="Chord is a noninteractive musical group. Fused keeps one continuous surface while independent member bands expose articulation; clustered composes the accepted Note primitive at zero gap."
  >
    <template #hero>
      <Chord
        :members="heroMembers"
        structure="fused"
        identity="symbol"
        symbol="Cmaj7"
        accessible-name="C major seventh chord, rolled attack"
        proportion="wide"
      />
    </template>

    <VariantGrid title="Structure × identity">
      <VariantCell caption="Fused · symbol · C major seventh" stage="ink3">
        <Chord
          :members="progress(cMajorSeven, [.86, .86, .86, .86])"
          structure="fused"
          identity="symbol"
          symbol="Cmaj7"
          accessible-name="C major seventh chord"
        />
      </VariantCell>
      <VariantCell caption="Fused · members · C major triad" stage="ink3">
        <Chord
          :members="progress(cMajor, [.2, .58, .92])"
          structure="fused"
          identity="members"
          symbol="C"
          accessible-name="C major chord, C E G"
        />
      </VariantCell>
      <VariantCell caption="Clustered · members · D minor triad" stage="ink3">
        <Chord
          :members="progress(dMinor, [.72, .38, .94])"
          structure="clustered"
          identity="members"
          symbol="Dm"
          accessible-name="D minor chord, D F A"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Responsive proportion">
      <VariantCell caption="Compact · G dominant seventh" stage="ink3">
        <Chord
          :members="progress(gDominantSeven, [.76, .76, .76, .76])"
          identity="symbol"
          symbol="G7"
          accessible-name="G dominant seventh chord"
          proportion="compact"
        />
      </VariantCell>
      <VariantCell caption="Balanced · G dominant seventh" stage="ink3">
        <Chord
          :members="progress(gDominantSeven, [.76, .76, .76, .76])"
          identity="symbol"
          symbol="G7"
          accessible-name="G dominant seventh chord"
          proportion="balanced"
        />
      </VariantCell>
      <VariantCell caption="Wide · G dominant seventh" stage="ink3">
        <Chord
          :members="progress(gDominantSeven, [.76, .76, .76, .76])"
          identity="symbol"
          symbol="G7"
          accessible-name="G dominant seventh chord"
          proportion="wide"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Articulation choreography">
      <VariantCell caption="Simultaneous attack · Em triad" stage="ink3">
        <Chord
          :members="progress(eMinor, [.68, .68, .68])"
          identity="members"
          symbol="Em"
          accessible-name="E minor chord, simultaneous attack"
        />
      </VariantCell>
      <VariantCell caption="Rolled attack · Cmaj7" stage="ink3">
        <Chord
          :members="progress(cMajorSeven, [1, .72, .42, .16])"
          identity="members"
          symbol="Cmaj7"
          accessible-name="C major seventh chord, rolled attack"
        />
      </VariantCell>
      <VariantCell caption="Staggered release · Dm" stage="ink3">
        <Chord
          :members="progress(dMinor, [.12, .44, .84])"
          structure="clustered"
          identity="members"
          symbol="Dm"
          accessible-name="D minor chord, staggered release"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Distinct partial progress">
      <VariantCell caption="Fused · 18 / 43 / 71 / 100%" stage="ink3">
        <Chord
          :members="progress(gDominantSeven, [.18, .43, .71, 1])"
          identity="members"
          symbol="G7"
          accessible-name="G dominant seventh chord, distinct partial progress"
          proportion="wide"
        />
      </VariantCell>
      <VariantCell caption="Clustered · 18 / 43 / 71 / 100%" stage="ink3">
        <Chord
          :members="progress(gDominantSeven, [.18, .43, .71, 1])"
          structure="clustered"
          identity="members"
          symbol="G7"
          accessible-name="G dominant seventh chord, distinct partial progress"
          proportion="wide"
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from "vue";
import Chord from "@/components/compounds/Chord.vue";
import type { ChordMember } from "@/components/compounds/Chord.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

type ChordNote = Omit<ChordMember, "progress">;

const cMajor: ChordNote[] = [
  { id: "c4", syllable: "Do", degree: "I", rawPitch: "C4", primary: "raw", scaleIndex: 0, pitchClassIndex: 0, octave: 4 },
  { id: "e4", syllable: "Mi", degree: "III", rawPitch: "E4", primary: "raw", scaleIndex: 2, pitchClassIndex: 4, octave: 4 },
  { id: "g4", syllable: "Sol", degree: "V", rawPitch: "G4", primary: "raw", scaleIndex: 4, pitchClassIndex: 7, octave: 4 },
];

const cMajorSeven: ChordNote[] = [
  ...cMajor,
  { id: "b4", syllable: "Ti", degree: "VII", rawPitch: "B4", primary: "raw", scaleIndex: 6, pitchClassIndex: 11, octave: 4 },
];

const dMinor: ChordNote[] = [
  { id: "d4", syllable: "Re", degree: "II", rawPitch: "D4", primary: "raw", scaleIndex: 1, pitchClassIndex: 2, octave: 4 },
  { id: "f4", syllable: "Fa", degree: "IV", rawPitch: "F4", primary: "raw", scaleIndex: 3, pitchClassIndex: 5, octave: 4 },
  { id: "a4", syllable: "La", degree: "VI", rawPitch: "A4", primary: "raw", scaleIndex: 5, pitchClassIndex: 9, octave: 4 },
];

const eMinor: ChordNote[] = [
  { id: "e4-minor", syllable: "Mi", degree: "III", rawPitch: "E4", primary: "raw", scaleIndex: 2, pitchClassIndex: 4, octave: 4 },
  { id: "g4-minor", syllable: "Sol", degree: "V", rawPitch: "G4", primary: "raw", scaleIndex: 4, pitchClassIndex: 7, octave: 4 },
  { id: "b4-minor", syllable: "Ti", degree: "VII", rawPitch: "B4", primary: "raw", scaleIndex: 6, pitchClassIndex: 11, octave: 4 },
];

const gDominantSeven: ChordNote[] = [
  { id: "g3", syllable: "Sol", degree: "V", rawPitch: "G3", primary: "raw", scaleIndex: 4, pitchClassIndex: 7, octave: 3 },
  { id: "b3", syllable: "Ti", degree: "VII", rawPitch: "B3", primary: "raw", scaleIndex: 6, pitchClassIndex: 11, octave: 3 },
  { id: "d4-g7", syllable: "Re", degree: "II", rawPitch: "D4", primary: "raw", scaleIndex: 1, pitchClassIndex: 2, octave: 4 },
  { id: "f4-g7", syllable: "Fa", degree: "IV", rawPitch: "F4", primary: "raw", scaleIndex: 3, pitchClassIndex: 5, octave: 4 },
];

const progress = (members: ChordNote[], values: number[]): ChordMember[] =>
  members.map((member, index) => ({ ...member, progress: values[index] ?? 0 }));

const heroStaticProgress = [1, .78, .52, .24];
const heroMembers = ref(progress(cMajorSeven, heroStaticProgress));
const heroPhaseOffsets = [0, .12, .24, .36];
const heroCycleMs = 2800;
let heroFrameId: number | null = null;
let reducedMotionQuery: MediaQueryList | null = null;

const setStaticHero = () => {
  heroMembers.value = progress(cMajorSeven, heroStaticProgress);
};

const stopHeroLoop = () => {
  if (heroFrameId === null) return;
  window.cancelAnimationFrame(heroFrameId);
  heroFrameId = null;
};

const startHeroLoop = () => {
  stopHeroLoop();
  if (reducedMotionQuery?.matches) {
    setStaticHero();
    return;
  }

  const startedAt = performance.now();
  const animate = (now: number) => {
    const cycle = ((now - startedAt) % heroCycleMs) / heroCycleMs;
    heroMembers.value = progress(
      cMajorSeven,
      heroPhaseOffsets.map((offset) => {
        const phase = (cycle - offset + 1) % 1;
        const triangle = phase < .5 ? phase * 2 : (1 - phase) * 2;
        return (1 - Math.cos(Math.PI * triangle)) / 2;
      }),
    );
    heroFrameId = window.requestAnimationFrame(animate);
  };

  heroFrameId = window.requestAnimationFrame(animate);
};

const handleReducedMotionChange = () => startHeroLoop();

onMounted(() => {
  reducedMotionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
  reducedMotionQuery.addEventListener("change", handleReducedMotionChange);
  startHeroLoop();
});

onBeforeUnmount(() => {
  stopHeroLoop();
  reducedMotionQuery?.removeEventListener("change", handleReducedMotionChange);
});

const features = [
  { label: "Structure", value: "fused continuous bands or zero-gap clustered Notes" },
  { label: "Identity", value: "one chord symbol or the individual member labels" },
  { label: "Color", value: "one runtime music-color band per member note" },
  { label: "Progress", value: "controlled 0–1 per member, bottom to top, 72ms linear" },
  { label: "Scale", value: "compact, balanced, and wide responsive CSS proportions" },
  { label: "Semantics", value: "named group; inert visual descendants; no controls" },
  { label: "Boundary", value: "no store, interaction, audio, haptics, or playback clock" },
];
</script>

<style scoped>
@media (max-width: 620px) {
  :deep(.anatomy-display__card) {
    width: calc(100vw - 32px);
    padding: 18px 14px;
  }

  :deep(.anatomy-display__wrap),
  :deep(.variant-grid__items) {
    grid-template-columns: 1fr;
  }
}
</style>
