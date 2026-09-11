<template>
  <AnatomyDisplay
    title="PatternStrip &middot; Compound"
    :features="features"
    caption="One sleek Ink row owns pattern identity and actions. Every strip carries the same 1px compressed Bar Tape along its top edge, including Current."
  >
    <template #hero>
      <div class="pattern-strip-specimen">
        <PatternStrip
          :item="backgroundPattern"
          @select="lastAction = 'Select Evening Glass'"
          @delete="lastAction = 'Delete Evening Glass'"
          @copy="lastAction = 'Copy Evening Glass'"
          @open-strudel="lastAction = 'Open Evening Glass'"
          @rename="rename(backgroundPattern, $event)"
        />
        <PatternStrip
          :item="currentPattern"
          active
          @select="lastAction = 'Unwind around Current Take'"
          @delete="lastAction = 'Current Take deletion unavailable'"
          @copy="lastAction = 'Copy Current Take'"
          @open-strudel="lastAction = 'Open Current Take'"
          @rename="lastAction = 'Current Take cannot be renamed'"
        />
        <output aria-live="polite">{{ lastAction }}</output>
      </div>
    </template>

    <VariantGrid title="States">
      <VariantCell caption="Background · 1px top Bar Tape" stage="ink3">
        <PatternStrip
          :item="backgroundPattern"
          @select="lastAction = 'Select background state'"
          @delete="lastAction = 'Delete background state'"
          @copy="lastAction = 'Copy background state'"
          @open-strudel="lastAction = 'Open background state'"
          @rename="rename(backgroundPattern, $event)"
        />
      </VariantCell>
      <VariantCell caption="Current · same 1px top Bar Tape" stage="ink3">
        <PatternStrip
          :item="currentPattern"
          active
          @select="lastAction = 'Unwind around current state'"
          @delete="lastAction = 'Current state deletion unavailable'"
          @copy="lastAction = 'Copy current state'"
          @open-strudel="lastAction = 'Open current state'"
          @rename="lastAction = 'Current state cannot be renamed'"
        />
      </VariantCell>
      <VariantCell caption="Delete armed · explicit second tap" stage="ink3">
        <PatternStrip
          :item="armedPattern"
          @select="lastAction = 'Select delete-armed state'"
          @delete="lastAction = 'Confirm delete-armed state'"
          @copy="lastAction = 'Copy delete-armed state'"
          @open-strudel="lastAction = 'Open delete-armed state'"
          @rename="rename(armedPattern, $event)"
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import PatternStrip from "../../components/compounds/PatternStrip.vue";
import type { PatternStripItem } from "../../components/compounds/PatternStrip.vue";
import { instrumentIconFor } from "../../components/primatives/instrumentIcon";
import { useMusicColor } from "../../composables/useMusicColor";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const {
  getStaticPrimaryColorByScaleIndex,
  getStaticPrimaryColorByPitchClass,
} = useMusicColor();

const backgroundPattern = reactive<PatternStripItem>({
  id: "evening-glass",
  name: "Evening Glass",
  instrumentIcon: instrumentIconFor("epiano1"),
  instrumentLabel: "Rhodes",
  rootLabel: "F#4",
  spine: getStaticPrimaryColorByPitchClass(6, "dorian", "F#", 4),
  barTape: [0, 2, 4, 1, 5].map((scaleIndex, index) => ({
    color: getStaticPrimaryColorByScaleIndex(scaleIndex, "dorian", "F#", 4),
    durationMs: [250, 125, 375, 250, 500][index],
  })),
  canDelete: true,
  canRename: true,
});

const currentPattern = reactive<PatternStripItem>({
  id: "current-take",
  name: "Current Take",
  instrumentIcon: instrumentIconFor("piano"),
  instrumentLabel: "Piano",
  rootLabel: "C4",
  spine: getStaticPrimaryColorByPitchClass(0, "major", "C", 4),
  barTape: [{
    color: getStaticPrimaryColorByScaleIndex(0, "major", "C", 4),
    durationMs: 460,
  }],
  canDelete: false,
  canRename: false,
  deleteUnavailableLabel: "Edit the current take in CodeStrip",
});

const armedPattern = reactive<PatternStripItem>({
  ...backgroundPattern,
  id: "evening-glass-armed",
  deleteArmed: true,
});

const lastAction = ref("Ready");

function rename(pattern: PatternStripItem, name: string) {
  pattern.name = name;
  lastAction.value = `Rename · ${name}`;
}

const features = [
  { label: "Children", value: "identity, shared instrument-family icon + label, Bar Tape, three small Buttons" },
  { label: "Surface", value: "51.2px Ink row; no Card shell, notch, metadata, or CodeStrip" },
  { label: "Spine", value: "4px Music Color from root key plus root octave" },
  { label: "Tape", value: "persistent 1px top edge on every strip, including Current" },
  { label: "Rename", value: "double-tap selected title or press F2; inline Enter/blur commit" },
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
