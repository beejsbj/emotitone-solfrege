<template>
  <AnatomyDisplay
    title="Chord &middot; Musical Compound"
    :features="features"
    caption="Chord has two coherent displays: one paper-cut fused surface for a chord symbol, or a zero-gap cluster of complete Note primitives. Both reveal their unchanged music colors upward from Ink."
  >
    <template #hero>
      <Chord
        :members="heroMembers"
        display="symbol"
        symbol="Cmaj7"
        accessible-name="C major seventh chord, rolled attack"
        proportion="wide"
        geometry="offcut"
      />
    </template>

    <VariantGrid title="Display">
      <VariantCell caption="Symbol · fused paper surface" stage="ink3">
        <Chord
          :members="progress(cMajorSeven, [.86, .86, .86, .86])"
          display="symbol"
          symbol="Cmaj7"
          accessible-name="C major seventh chord"
        />
      </VariantCell>
      <VariantCell caption="Notes · zero-gap cluster" stage="ink3">
        <Chord
          :members="progress(dMinor, [.72, .38, .94])"
          display="notes"
          symbol="Dm"
          accessible-name="D minor chord, D F A"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Whole-surface geometry">
      <VariantCell caption="Tile · shared geometry token" stage="ink3">
        <Chord
          :members="progress(cMajorSeven, [.76, .76, .76, .76])"
          symbol="Cmaj7"
          geometry="tile"
        />
      </VariantCell>
      <VariantCell caption="Offcut · default paper chord" stage="ink3">
        <Chord
          :members="progress(gDominantSeven, [.76, .76, .76, .76])"
          symbol="G7"
          geometry="offcut"
        />
      </VariantCell>
      <VariantCell caption="Tab · directional cut" stage="ink3">
        <Chord
          :members="progress(dMinor, [.76, .76, .76])"
          symbol="Dm"
          geometry="tab"
        />
      </VariantCell>
      <VariantCell caption="Pill · rounded Note-family edge" stage="ink3">
        <Chord
          :members="progress(eMinor, [.76, .76, .76])"
          symbol="Em"
          geometry="pill"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Responsive proportion">
      <VariantCell caption="Compact · G dominant seventh" stage="ink3">
        <Chord
          :members="progress(gDominantSeven, [.76, .76, .76, .76])"
          symbol="G7"
          accessible-name="G dominant seventh chord"
          proportion="compact"
        />
      </VariantCell>
      <VariantCell caption="Balanced · G dominant seventh" stage="ink3">
        <Chord
          :members="progress(gDominantSeven, [.76, .76, .76, .76])"
          symbol="G7"
          accessible-name="G dominant seventh chord"
          proportion="balanced"
        />
      </VariantCell>
      <VariantCell caption="Wide · G dominant seventh" stage="ink3">
        <Chord
          :members="progress(gDominantSeven, [.76, .76, .76, .76])"
          symbol="G7"
          accessible-name="G dominant seventh chord"
          proportion="wide"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Articulation choreography">
      <VariantCell caption="Simultaneous attack · fused Em" stage="ink3">
        <Chord
          :members="progress(eMinor, [.68, .68, .68])"
          symbol="Em"
          accessible-name="E minor chord, simultaneous attack"
        />
      </VariantCell>
      <VariantCell caption="Rolled attack · fused Cmaj7" stage="ink3">
        <Chord
          :members="progress(cMajorSeven, [1, .72, .42, .16])"
          symbol="Cmaj7"
          accessible-name="C major seventh chord, rolled attack"
        />
      </VariantCell>
      <VariantCell caption="Staggered release · clustered Dm" stage="ink3">
        <Chord
          :members="progress(dMinor, [.12, .44, .84])"
          display="notes"
          symbol="Dm"
          accessible-name="D minor chord, staggered release"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Order &mdash; Voicing and press chronology">
      <VariantCell caption="Fused · bands remain low-to-high voicing" stage="ink3">
        <Chord
          :members="orderedCmaj7"
          display="symbol"
          symbol="Cmaj7"
          accessible-name="C major seventh chord, voicing order"
        />
      </VariantCell>
      <VariantCell caption="Clustered · Notes follow press order" stage="ink3">
        <Chord
          :members="orderedCmaj7"
          display="notes"
          symbol="Cmaj7"
          accessible-name="C major seventh chord, press order"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Ink → music-color progress">
      <VariantCell caption="Fused symbol · 18 / 43 / 71 / 100%" stage="ink3">
        <Chord
          :members="progress(gDominantSeven, [.18, .43, .71, 1])"
          symbol="G7"
          accessible-name="G dominant seventh chord, distinct partial progress"
          proportion="wide"
        />
      </VariantCell>
      <VariantCell caption="Clustered Notes · 18 / 43 / 71 / 100%" stage="ink3">
        <Chord
          :members="progress(gDominantSeven, [.18, .43, .71, 1])"
          display="notes"
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

const orderedCmaj7: ChordMember[] = cMajorSeven.map((member, voicingOrder) => ({
  ...member,
  voicingOrder,
  pressOrder: [2, 0, 3, 1][voicingOrder],
  progress: [.42, 1, .18, .74][voicingOrder],
}));

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
  { label: "Display", value: "symbol means one fused surface; notes means a zero-gap Note cluster" },
  { label: "Material", value: "shared Note paper sheen, cut geometry, and key-depth shadow" },
  { label: "Geometry", value: "standard, tile, offcut, tab, or pill on the whole chord family" },
  { label: "Color", value: "runtime music color remains unchanged for octave meaning" },
  { label: "Progress", value: "Ink reveals music color bottom-to-top, controlled 0–1 per member" },
  { label: "Order", value: "fused bands use voicing order; clustered Notes use press order" },
  { label: "Motion", value: "72ms linear transform response; Reduced Motion freezes the guide loop" },
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
