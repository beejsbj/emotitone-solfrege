<template>
  <AnatomyDisplay
    title="PatternStrip &middot; Compound"
    :features="features"
    caption="One sleek Ink row owns pattern identity and actions. Background strips carry the compressed Bar Tape on top; Current omits it because the adjacent CodeStrip presents the active pattern."
  >
    <template #hero>
      <div class="pattern-strip-specimen">
        <PatternStrip
          :item="backgroundPattern"
          @select="lastAction = 'Select Evening Glass'"
          @delete="lastAction = 'Delete Evening Glass'"
          @copy="lastAction = 'Copy Evening Glass'"
          @open-strudel="lastAction = 'Open Evening Glass'"
        />
        <PatternStrip
          :item="currentPattern"
          active
          @select="lastAction = 'Unwind around Current Take'"
        />
        <output aria-live="polite">{{ lastAction }}</output>
      </div>
    </template>

    <VariantGrid title="States">
      <VariantCell caption="Background · top Bar Tape" stage="ink3">
        <PatternStrip :item="backgroundPattern" />
      </VariantCell>
      <VariantCell caption="Current · tape transferred to CodeStrip" stage="ink3">
        <PatternStrip :item="currentPattern" active />
      </VariantCell>
      <VariantCell caption="Delete armed · explicit second tap" stage="ink3">
        <PatternStrip :item="armedPattern" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { ref } from "vue";
import PatternStrip from "../../components/compounds/PatternStrip.vue";
import type { PatternStripItem } from "../../components/compounds/PatternStrip.vue";
import { useColorSystem } from "../../composables/useColorSystem";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const {
  getStaticPrimaryColorByScaleIndex,
  getStaticPrimaryColorByPitchClass,
} = useColorSystem();

const backgroundPattern: PatternStripItem = {
  id: "evening-glass",
  name: "Evening Glass",
  rootLabel: "F#4",
  spine: getStaticPrimaryColorByPitchClass(6, "dorian", "F#", 4),
  barTape: [0, 2, 4, 1, 5].map((scaleIndex, index) => ({
    color: getStaticPrimaryColorByScaleIndex(scaleIndex, "dorian", "F#", 4),
    durationMs: [250, 125, 375, 250, 500][index],
  })),
  canDelete: true,
};

const currentPattern: PatternStripItem = {
  id: "current-take",
  name: "Current Take",
  rootLabel: "C4",
  spine: getStaticPrimaryColorByPitchClass(0, "major", "C", 4),
  barTape: [{
    color: getStaticPrimaryColorByScaleIndex(0, "major", "C", 4),
    durationMs: 460,
  }],
  canDelete: false,
  deleteUnavailableLabel: "Edit the current take in CodeStrip",
};

const armedPattern: PatternStripItem = {
  ...backgroundPattern,
  id: "evening-glass-armed",
  deleteArmed: true,
};

const lastAction = ref("Ready");

const features = [
  { label: "Children", value: "Bar Tape plus three small Buttons" },
  { label: "Surface", value: "64px Ink row; no Card shell, notch, metadata, or CodeStrip" },
  { label: "Spine", value: "4px Music Color from root key plus root octave" },
  { label: "Tape", value: "top edge on background only; Current transfers presentation" },
  { label: "Actions", value: "two-tap Delete, Copy feedback, Open in Strudel" },
  { label: "Source", value: "components/compounds/PatternStrip.vue" },
];
</script>

<style scoped>
.pattern-strip-specimen {
  display: grid;
  gap: var(--s-4);
}

.pattern-strip-specimen output {
  color: var(--ivory-3);
  font: var(--t-caption);
  text-align: right;
  text-transform: uppercase;
}
</style>
