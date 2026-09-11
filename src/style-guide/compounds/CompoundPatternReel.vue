<template>
  <AnatomyDisplay
    title="PatternReel &middot; Interactive Compound"
    :features="features"
    caption="The real controlled Wheel Deck keeps Current anchored at the bottom, collapses its predecessors behind it, and unwinds them under direct drag. Selection intent stays outside the visual compound."
  >
    <template #hero>
      <div class="pattern-reel-specimen">
        <PatternReel
          :items="patterns"
          :selected-id="heroSelectedId"
          @commit="heroSelectedId = $event"
          @delete="report('Delete', $event)"
          @copy="report('Copy', $event)"
          @open-strudel="report('Open in Strudel', $event)"
          @rename="rename"
        />
        <output aria-live="polite">{{ lastAction }}</output>
      </div>
    </template>

    <VariantGrid title="States">
      <VariantCell caption="Rest · collapsed deck" stage="ink3">
        <PatternReel
          :items="patterns"
          :selected-id="restSelectedId"
          @commit="restSelectedId = $event"
          @delete="report('Delete', $event)"
          @copy="report('Copy', $event)"
          @open-strudel="report('Open in Strudel', $event)"
          @rename="rename"
        />
      </VariantCell>
      <VariantCell caption="Short collection · cyclic pair" stage="ink3">
        <PatternReel
          :items="shortPatterns"
          :selected-id="shortSelectedId"
          @commit="shortSelectedId = $event"
          @delete="report('Delete', $event)"
          @copy="report('Copy', $event)"
          @open-strudel="report('Open in Strudel', $event)"
          @rename="rename"
        />
      </VariantCell>
      <VariantCell caption="Single pattern · fixed Current" stage="ink3">
        <PatternReel
          :items="singlePattern"
          :selected-id="singlePattern[0].id"
          @delete="report('Delete', $event)"
          @copy="report('Copy', $event)"
          @open-strudel="report('Open in Strudel', $event)"
          @rename="rename"
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { reactive, ref } from "vue";
import PatternReel from "../../components/compounds/PatternReel.vue";
import type { PatternReelItem } from "../../components/compounds/PatternReel.vue";
import { instrumentIconFor } from "../../components/primatives/instrumentIcon";
import { useMusicColor } from "../../composables/useMusicColor";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const {
  getStaticPrimaryColorByScaleIndex,
  getStaticPrimaryColorByPitchClass,
} = useMusicColor();

function timeline(
  events: Array<[scaleIndex: number, durationMs: number]>,
  key: "C" | "D" | "E" | "F#",
  mode: "major" | "minor" | "dorian" | "locrian",
  octave: number,
) {
  return events.map(([scaleIndex, durationMs]) => ({
    color: getStaticPrimaryColorByScaleIndex(scaleIndex, mode, key, octave),
    durationMs,
  }));
}

const patterns = reactive<PatternReelItem[]>([
  {
    id: "glass",
    name: "Glass Bell",
    instrumentIcon: instrumentIconFor("music box"),
    instrumentLabel: "Music Box",
    rootLabel: "F#4",
    spine: getStaticPrimaryColorByPitchClass(6, "dorian", "F#", 4),
    barTape: timeline([[1, 250], [2, 125], [0, 375], [3, 250]], "F#", "dorian", 4),
    canDelete: false,
    canRename: true,
  },
  {
    id: "tram",
    name: "Late Night Tram",
    instrumentIcon: instrumentIconFor("epiano1"),
    instrumentLabel: "Rhodes",
    rootLabel: "D3",
    spine: getStaticPrimaryColorByPitchClass(2, "minor", "D", 3),
    barTape: timeline([[4, 500], [5, 250], [6, 250], [0, 750]], "D", "minor", 3),
    canDelete: true,
    canRename: true,
  },
  {
    id: "whistle",
    name: "Brass Whistle",
    instrumentIcon: instrumentIconFor("trumpet"),
    instrumentLabel: "Trumpet",
    rootLabel: "E4",
    spine: getStaticPrimaryColorByPitchClass(4, "locrian", "E", 4),
    barTape: timeline([[2, 282], [4, 128], [5, 203], [6, 90], [0, 180]], "E", "locrian", 4),
    canDelete: true,
    canRename: true,
  },
  {
    id: "current",
    name: "Current Take",
    instrumentIcon: instrumentIconFor("piano"),
    instrumentLabel: "Piano",
    rootLabel: "C4",
    spine: getStaticPrimaryColorByPitchClass(0, "major", "C", 4),
    barTape: timeline([[0, 460]], "C", "major", 4),
    canDelete: false,
    canRename: false,
    deleteUnavailableLabel: "Edit the current take in CodeStrip",
  },
]);

const shortPatterns = patterns.slice(1, 3);
const singlePattern = patterns.slice(-1);
const heroSelectedId = ref(patterns[patterns.length - 1].id);
const restSelectedId = ref(patterns[patterns.length - 1].id);
const shortSelectedId = ref(shortPatterns[shortPatterns.length - 1].id);
const lastAction = ref("Ready · Current Take selected");

function report(action: string, id: string) {
  const pattern = patterns.find((item) => item.id === id);
  lastAction.value = `${action} · ${pattern?.name ?? id}`;
}

function rename(id: string, name: string) {
  const pattern = patterns.find((item) => item.id === id);
  if (!pattern) return;
  pattern.name = name;
  report("Rename", id);
}

const features = [
  { label: "Children", value: "PatternStrip; PatternStrip composes Bar Tape and Button" },
  { label: "State", value: "controlled selected id; cyclic transient preview" },
  { label: "Motion", value: "direct unwind, 200ms local rebound, 900ms open hold" },
  { label: "Placement", value: "transparent, edge-to-edge over Stage; no panel chrome" },
  { label: "Interaction", value: "drag, wheel, strip tap, title rename, Up/Down/Home/End" },
  { label: "Boundary", value: "reel owns order and choreography; adapters own data and effects" },
  { label: "Source", value: "components/compounds/PatternReel.vue" },
];
</script>

<style scoped>
.pattern-reel-specimen {
  display: grid;
  gap: var(--s-4);
}

.pattern-reel-specimen output {
  padding: var(--s-3) var(--s-4);
  background: var(--ink);
  color: var(--ivory-3);
  font: var(--t-caption);
  text-align: right;
  text-transform: uppercase;
}
</style>
