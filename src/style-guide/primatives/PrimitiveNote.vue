<template>
  <AnatomyDisplay
    title="Note &middot; Music Primitive"
    :features="features"
    caption="Note is the controlled, noninteractive musical presentation unit. It owns musical identity, music color, octave value, playing-card hierarchy, and its accepted sounding treatment. Key remains responsible for physical input and press behavior."
  >
    <template #hero>
      <Note syllable="Do" degree="I" raw-pitch="C4" />
    </template>

    <VariantGrid title="Primary identity · one typographic rank">
      <VariantCell
        v-for="example in primaryIdentities"
        :key="example.primary"
        :caption="`${example.primary} primary`"
        stage="ink3"
      >
        <Note v-bind="example" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Chromatic aliases">
      <VariantCell
        v-for="example in chromaticNotes"
        :key="`${example.syllable}-${example.rawPitch}`"
        :caption="`${example.syllable} · ${example.rawPitch}`"
        stage="ink3"
      >
        <Note v-bind="example" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Label subsets">
      <VariantCell caption="Syllable only" stage="ink3">
        <Note syllable="La" raw-pitch="A4" :visible-labels="['syllable']" />
      </VariantCell>
      <VariantCell caption="Raw only · accidental + octave" stage="ink3">
        <Note
          raw-pitch="Db4"
          primary="raw"
          :visible-labels="['raw']"
          :scale-index="1"
        />
      </VariantCell>
      <VariantCell caption="Degree + raw" stage="ink3">
        <Note
          degree="bVII"
          raw-pitch="Bb4"
          primary="degree"
          :visible-labels="['degree', 'raw']"
          :scale-index="10"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Piano-key text contrast">
      <VariantCell caption="Natural · white text" stage="ink3">
        <Note syllable="Do" degree="I" raw-pitch="C4" />
      </VariantCell>
      <VariantCell caption="Accidental · black text" stage="ink3">
        <Note syllable="Ra" degree="bII" raw-pitch="Db4" :scale-index="1" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Cuts / geometries">
      <VariantCell
        v-for="geometry in geometries"
        :key="geometry.name"
        :caption="geometry.label"
        stage="ink3"
      >
        <Note
          :geometry="geometry.name"
          :syllable="geometry.syllable"
          :degree="geometry.degree"
          :raw-pitch="geometry.rawPitch"
          :scale-index="geometry.scaleIndex"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Proportions">
      <VariantCell
        v-for="proportion in proportions"
        :key="proportion.name"
        :caption="proportion.label"
        stage="ink3"
      >
        <Note
          :proportion="proportion.name"
          :syllable="proportion.syllable"
          :degree="proportion.degree"
          :raw-pitch="proportion.rawPitch"
          :scale-index="proportion.scaleIndex"
        />
      </VariantCell>
    </VariantGrid>

    <div class="note-specimen__matrix">
      <VariantGrid title="Complete geometry × proportion matrix">
        <VariantCell
          v-for="combo in geometryProportions"
          :key="combo.caption"
          :caption="combo.caption"
          stage="ink3"
        >
          <Note
            :geometry="combo.geometry"
            :proportion="combo.proportion"
            :syllable="combo.syllable"
            :degree="combo.degree"
            :raw-pitch="combo.rawPitch"
            :scale-index="combo.scaleIndex"
          />
        </VariantCell>
      </VariantGrid>
    </div>

    <VariantGrid title="Octave value">
      <VariantCell
        v-for="octave in [2, 4, 6]"
        :key="octave"
        :caption="`C${octave}`"
        stage="ink3"
      >
        <Note
          :octave="octave"
          :raw-pitch="`C${octave}`"
          primary="raw"
          :visible-labels="['raw']"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Surface treatments">
      <VariantCell
        v-for="surface in surfaces"
        :key="surface"
        :caption="surface"
        stage="ink3"
      >
        <Note
          :surface-style="surface"
          :raw-pitch="surface === 'monochrome' ? 'F#4' : 'F4'"
          :scale-index="5"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Musical activity">
      <VariantCell caption="Rest" stage="ink3">
        <Note v-bind="activityNote" />
      </VariantCell>
      <VariantCell :caption="sounding ? 'Sounding · held' : 'Released'" stage="ink3">
        <div class="note-specimen__activity">
          <Note v-bind="activityNote" :sounding="sounding" />
          <div class="note-specimen__controls" aria-label="Sounding state preview controls">
            <button type="button" @click="replaySounding">Replay onset</button>
            <button type="button" @click="releaseSounding">Release</button>
          </div>
        </div>
      </VariantCell>
    </VariantGrid>

    <template #caption>
      Sounding emits one pitch-colored onset ring, holds an ivory inner rim with a
      restrained pitch halo, then releases over <code>--dur-ui</code> with
      <code>--ease-brush</code>. Reduce Motion removes the onset and transition while
      preserving the static held indicator. Replay and Release belong only to this
      inspection specimen; Note owns no timer, input, store, or audio trigger.
    </template>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import { nextTick, ref } from "vue";
import Note from "@/components/primatives/Note.vue";
import type {
  NoteGeometry,
  NoteLabel,
  NoteProportion,
  NoteSurfaceStyle,
} from "@/components/primatives/Note.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const labels: NoteLabel[] = ["syllable", "degree", "raw"];

const primaryIdentities = labels.map((primary) => ({
  primary,
  syllable: "Do",
  degree: "I",
  rawPitch: "C4",
}));

const chromaticNotes = [
  { syllable: "Do", degree: "I", rawPitch: "C4", scaleIndex: 0 },
  { syllable: "Ra", degree: "bII", rawPitch: "Db4", scaleIndex: 1 },
  { syllable: "Re", degree: "II", rawPitch: "D4", scaleIndex: 2 },
  { syllable: "Me", degree: "bIII", rawPitch: "Eb4", scaleIndex: 3 },
  { syllable: "Mi", degree: "III", rawPitch: "E4", scaleIndex: 4 },
  { syllable: "Fa", degree: "IV", rawPitch: "F4", scaleIndex: 5 },
  { syllable: "Fi", degree: "#IV", rawPitch: "F#4", scaleIndex: 6 },
  { syllable: "Se", degree: "bV", rawPitch: "Gb4", scaleIndex: 6 },
  { syllable: "Sol", degree: "V", rawPitch: "G4", scaleIndex: 7 },
  { syllable: "Le", degree: "bVI", rawPitch: "Ab4", scaleIndex: 8 },
  { syllable: "La", degree: "VI", rawPitch: "A4", scaleIndex: 9 },
  { syllable: "Te", degree: "bVII", rawPitch: "Bb4", scaleIndex: 10 },
  { syllable: "Ti", degree: "VII", rawPitch: "B4", scaleIndex: 11 },
];

const geometries: Array<{
  name: NoteGeometry;
  label: string;
  syllable: string;
  degree: string;
  rawPitch: string;
  scaleIndex: number;
}> = [
  { name: "standard", label: "Standard", syllable: "Ra", degree: "bII", rawPitch: "Db4", scaleIndex: 1 },
  { name: "tile", label: "Tile", syllable: "Fa", degree: "IV", rawPitch: "F4", scaleIndex: 5 },
  { name: "offcut", label: "Offcut", syllable: "Ti", degree: "VII", rawPitch: "B4", scaleIndex: 11 },
  { name: "tab", label: "Tab", syllable: "Fi", degree: "#IV", rawPitch: "F#4", scaleIndex: 6 },
  { name: "pill", label: "Pill", syllable: "Te", degree: "bVII", rawPitch: "Bb4", scaleIndex: 10 },
];

const proportions: Array<{
  name: NoteProportion;
  label: string;
  syllable: string;
  degree: string;
  rawPitch: string;
  scaleIndex: number;
}> = [
  { name: "tall", label: "Tall · 40 × 116", syllable: "Mi", degree: "III", rawPitch: "E4", scaleIndex: 4 },
  { name: "medium", label: "Medium · 56 × 88", syllable: "Do", degree: "I", rawPitch: "C4", scaleIndex: 0 },
  { name: "stocky", label: "Stocky · 72 × 72", syllable: "Fa", degree: "IV", rawPitch: "F4", scaleIndex: 5 },
  { name: "wide", label: "Wide · 120 × 56", syllable: "Sol", degree: "V", rawPitch: "G4", scaleIndex: 7 },
];

const geometryProportions = geometries.flatMap((geometry, geometryIndex) =>
  proportions.map((proportion, proportionIndex) => {
    const identity = chromaticNotes[(geometryIndex * proportions.length + proportionIndex) % chromaticNotes.length];

    return {
      geometry: geometry.name,
      proportion: proportion.name,
      caption: `${geometry.label} × ${proportion.name}`,
      syllable: identity.syllable,
      degree: identity.degree,
      rawPitch: identity.rawPitch,
      scaleIndex: identity.scaleIndex,
    };
  }),
);

const surfaces: NoteSurfaceStyle[] = ["colored", "monochrome"];
const activityNote = {
  syllable: "Sol",
  degree: "V",
  rawPitch: "G4",
  scaleIndex: 7,
};
const sounding = ref(true);

async function replaySounding() {
  sounding.value = false;
  await nextTick();
  sounding.value = true;
}

function releaseSounding() {
  sounding.value = false;
}

const features = [
  { label: "Identity", value: "solfege, scale degree, and spelled pitch with accidental + octave" },
  { label: "Hierarchy", value: "one selected center primary with playing-card auxiliary corners" },
  { label: "Color", value: "shared runtime music-color resolver with persisted movable/fixed mode" },
  { label: "Text", value: "one display-font rank system; natural white and accidental black" },
  { label: "Geometry", value: "standard, tile, mirrored offcut, tab, or pill" },
  { label: "Proportion", value: "tall, medium, stocky, or wide; medium is default" },
  { label: "Surface", value: "colored or monochrome" },
  { label: "State", value: "externally controlled sounding only" },
  { label: "Boundary", value: "no input, focus, press, store, timer, or audio engine" },
];
</script>

<style scoped>
.note-specimen__matrix :deep(.variant-grid__items) {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.note-specimen__matrix :deep(.variant-cell__stage) {
  min-height: 156px;
}

.note-specimen__activity {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 14px;
}

.note-specimen__controls {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 6px;
}

.note-specimen__controls button {
  min-height: 28px;
  padding: 5px 9px;
  border: 1px solid var(--hairline);
  border-radius: var(--r-xs);
  background: var(--ink-2);
  color: var(--ivory-2);
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: .08em;
  text-transform: uppercase;
  cursor: pointer;
}

.note-specimen__controls button:focus-visible {
  outline: 2px solid var(--brass);
  outline-offset: 2px;
}

code {
  color: var(--ivory-2);
  font-family: var(--font-mono);
}

@media (max-width: 900px) {
  .note-specimen__matrix :deep(.variant-grid__items) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 620px) {
  .note-specimen__matrix :deep(.variant-grid__items) {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
</style>
