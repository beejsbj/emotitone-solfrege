<template>
  <AnatomyDisplay
    title="Latch Ring &middot; Play, Latched"
    :features="features"
    caption="The Latch Ring shows the Looper's latch on Play while it is held (Burooj, 2026-10-26). A Brass ring in the key's lip channel sweeps once per bar, read from UIBeat, which the transport drives from the heard bar: the audio clock is the truth and the ring owns no timer. The key keeps its pressed look underneath. While the beat dots count the latch's closing bar the ring rests on its dim track, so only one of the two moves. Under Reduced Motion it is a full, still Brass ring and the key's Ink and Ivory invert. No text label. Proposed in BJS-493 (PR #202, absorbing BJS-582), pending Burooj's acceptance."
  >
    <template #hero>
      <div class="latch-ring-specimen__hero">
        <BeatIndicator aria-label="Beat crown above the latched Play">
          <LatchRing v-slot="{ invert }" :active="latched">
            <Button
              size="sm"
              :tone="invert ? 'ink' : 'ivory'"
              :pressed="latched"
              :accessible-name="latched ? 'Play (latched; tap to release the specimen)' : 'Play (tap to latch the specimen)'"
              @click="latched = !latched"
            >
              <Play />
            </Button>
          </LatchRing>
        </BeatIndicator>
        <div class="latch-ring-specimen__label">{{ latched ? "Latched · 120 BPM" : "Not latched" }}</div>
      </div>
    </template>

    <VariantGrid title="States">
      <VariantCell caption="Sweep &middot; once per bar, on the heard bar">
        <BeatIndicator aria-label="Beat crown above a sweeping ring">
          <LatchRing v-slot="{ invert }" active>
            <Button size="sm" :tone="invert ? 'ink' : 'ivory'" pressed accessible-name="Play, latched, sweeping">
              <Play />
            </Button>
          </LatchRing>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="Rest &middot; the dots count the closing bar">
        <BeatIndicator :countdown="2" aria-label="Closing-bar countdown above a resting ring">
          <LatchRing v-slot="{ invert }" active stopped>
            <Button size="sm" :tone="invert ? 'ink' : 'ivory'" pressed accessible-name="Play, latched, closing bar">
              <Play />
            </Button>
          </LatchRing>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="Still &middot; Reduced Motion: full Brass, Ink and Ivory inverted">
        <BeatIndicator static aria-label="Still beat crown above a still ring">
          <LatchRing v-slot="{ invert }" active still>
            <Button size="sm" :tone="invert ? 'ink' : 'ivory'" pressed accessible-name="Play, latched, still">
              <Play />
            </Button>
          </LatchRing>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="Stop &middot; the desk's pattern plays, latched">
        <BeatIndicator aria-label="Beat crown above a latched Stop">
          <LatchRing v-slot="{ invert }" active>
            <Button size="sm" :tone="invert ? 'ivory' : 'ink'" pressed accessible-name="Stop, latched">
              <Square />
            </Button>
          </LatchRing>
        </BeatIndicator>
      </VariantCell>
      <VariantCell caption="Off &middot; not latched: no ring">
        <BeatIndicator aria-label="Beat crown above Play, not latched">
          <LatchRing :active="false">
            <Button size="sm" tone="ivory" accessible-name="Play, not latched">
              <Play />
            </Button>
          </LatchRing>
        </BeatIndicator>
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { Play, Square } from "lucide-vue-next";
import BeatIndicator from "../../components/compounds/BeatIndicator.vue";
import LatchRing from "../../components/compounds/LatchRing.vue";
import Button from "../../components/primatives/Button.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";
import { useUIBeatFixture } from "../guide/useUIBeatFixture";

useUIBeatFixture({
  bpm: ref(120),
  meter: ref({ beatsPerBar: 4, beatUnit: 4 }),
});

const latched = ref(true);

const features = [
  { label: "Class", value: "compound; wraps Play in its slot, props in, no store" },
  { label: "Ring", value: "2px Brass ring in the key's lip channel (4px out), so it clears the beat dots above" },
  { label: "Sweep", value: "fills clockwise from the top across each bar, --brass to a --brass-hi head over an opaque dim track (--brass-lo in Ink) that covers the key's lip; empties on the downbeat" },
  { label: "Clock", value: "UIBeat's bar position (the transport's heard bar); no timer, no CSS animation" },
  { label: "Hand-off", value: "rests (track only) while the beat dots drain the latch's closing bar; sweeps again when the take closes" },
  { label: "Under it", value: "the Button's pressed look, unchanged" },
  { label: "Still", value: "Reduced Motion: full static Brass ring, and the slot's `invert` flips Play's Ivory to Ink (Stop's Ink to Ivory)" },
  { label: "Palette", value: "Ink, Ivory and Brass only; Forced Colors draws it in Highlight on GrayText" },
];
</script>

<style scoped>
.latch-ring-specimen__hero {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 14px;
}

.latch-ring-specimen__label {
  color: var(--ivory-2);
  font: 700 13px/1 var(--font-display);
  letter-spacing: 0.14em;
  text-transform: uppercase;
}
</style>
