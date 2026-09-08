<template>
  <AnatomyDisplay
    title="Pattern Card &middot; Compound"
    :features="features"
    caption="One real controlled PatternCard source owns both states. Collapsed shows metadata and Bar Tape; expanded replaces Bar Tape with CodeStrip and the two-tap Delete, Copy, and right-most Open in Strudel actions. The specimen records intent only."
  >
    <template #hero>
      <div class="hero-stack">
        <PatternCard v-bind="collapsedPattern" @select="lastAction = 'Select pattern'" />
        <PatternCard
          v-bind="expandedPattern"
          :delete-armed="deleteArmed"
          @delete="handleDelete"
          @open-strudel="lastAction = 'Open in Strudel'"
          @copy="lastAction = 'Copy Strudel code'"
        />
        <p class="action-readout" aria-live="polite">{{ lastAction }}</p>
      </div>
    </template>

    <VariantGrid title="States">
      <VariantCell caption="Collapsed · metadata + Bar Tape" stage="ink3">
        <PatternCard v-bind="collapsedPattern" />
      </VariantCell>
      <VariantCell caption="Expanded / active · CodeStrip + actions" stage="ink3">
        <PatternCard v-bind="expandedPattern" />
      </VariantCell>
      <VariantCell caption="Expanded library pattern · delete unavailable" stage="ink3">
        <PatternCard v-bind="libraryPattern" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { ref } from "vue";
import PatternCard from "../../components/compounds/PatternCard.vue";
import type { BarTapeSegment } from "../../components/primatives/BarTape.vue";
import { buildRecordedCodeStripTokens } from "../../components/uniques/CodeStrip/recordingTokens";
import type { CodeStripToken } from "../../components/uniques/CodeStrip/index.vue";
import { useColorSystem } from "../../composables/useColorSystem";
import { defaultPatterns } from "../../data/patterns";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

interface PatternCardExample {
  state?: "collapsed" | "expanded";
  label: string;
  ordinal: string;
  name: string;
  metadata: string;
  barTape?: BarTapeSegment[];
  codeTokens?: CodeStripToken[];
  codeSource?: string;
  canDelete?: boolean;
  deleteArmed?: boolean;
}

const pattern = defaultPatterns[0];
const sourceBpm = 120;
const { getStaticPrimaryColorByScaleIndex } = useColorSystem();
const lastAction = ref("Actions are inert in this guide specimen");
const deleteArmed = ref(false);

function handleDelete() {
  if (!deleteArmed.value) {
    deleteArmed.value = true;
    lastAction.value = "Delete armed · tap again to confirm";
    return;
  }
  deleteArmed.value = false;
  lastAction.value = "Delete pattern";
}

const barTape: BarTapeSegment[] = pattern.notes.map((note) => ({
  color: getStaticPrimaryColorByScaleIndex(
    note.scaleIndex,
    pattern.mode,
    pattern.key,
    note.octave,
  ),
  durationMs: note.duration,
}));

const codeTokens = buildRecordedCodeStripTokens({
  notes: pattern.notes,
  mode: pattern.mode,
  musicKey: pattern.key,
  notation: "solfege",
  barMs: (60000 / sourceBpm) * 4,
  sourceBpm,
  surfaceStyle: "colored",
  keyBrightness: 50,
  keySaturation: 72,
});

const basePattern: PatternCardExample = {
  label: "Pattern 01 — Piano / C Major",
  ordinal: "01",
  name: pattern.name ?? "Untitled pattern",
  metadata: "14 notes",
};

const collapsedPattern: PatternCardExample = {
  ...basePattern,
  barTape,
};

const expandedPattern: PatternCardExample = {
  ...basePattern,
  state: "expanded",
  codeTokens,
  codeSource: "note(\"<0 0 4 4 5 5 4 3 3 2 2 1 1 0>\").scale(\"C:major\").s(\"piano\")",
};

const libraryPattern: PatternCardExample = {
  ...expandedPattern,
  ordinal: "02",
  label: "Pattern 02 — Piano / C Major",
  canDelete: false,
};

const features = [
  { label: "Foundation", value: "accepted Card shell · Ivory spine · notched identity label · right ordinal" },
  { label: "Collapsed", value: "pattern name + musical metadata + duration-weighted Bar Tape" },
  { label: "Expanded", value: "same identity · CodeStrip replaces Bar Tape · three Button actions" },
  { label: "Actions", value: "two-tap Delete · Copy Strudel code · Open in Strudel" },
  { label: "State owner", value: "controlled by Pattern List; PatternCard emits intent only" },
  { label: "Source", value: "components/compounds/PatternCard.vue" },
];
</script>

<style scoped>
.hero-stack {
  display: flex;
  width: 100%;
  flex-direction: column;
  gap: 20px;
}

.action-readout {
  margin: -4px 0 0;
  color: var(--ivory-3);
  font: var(--t-body-s-mono);
  text-align: right;
}
</style>
