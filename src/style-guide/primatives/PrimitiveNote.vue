<template>
  <AnatomyDisplay
    title="Note &middot; Music Primitive"
    :features="features"
    caption="Note is the controlled, noninteractive musical presentation unit. It owns color, octave value, centered-primary identity, playing-card auxiliary labels, and the combined geometry/proportion surface. Draft activity states remain visible only as capability hooks here, not as accepted final styling."
  >
    <template #hero>
      <Note proportion="hero" syllable="Do" degree="I" raw-pitch="C4" />
    </template>

    <VariantGrid title="Primary identity">
      <VariantCell v-for="label in labels" :key="label" :caption="`${label} primary`" stage="ink3">
        <Note
          proportion="hero"
          :primary="label"
          syllable="Do"
          degree="I"
          raw-pitch="C4"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Chromatic aliases">
      <VariantCell
        v-for="example in chromaticNotes"
        :key="example.rawPitch"
        :caption="example.syllable"
        stage="ink3"
      >
        <Note v-bind="example" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Label subsets">
      <VariantCell caption="Syllable only" stage="ink3">
        <Note syllable="La" raw-pitch="A4" :visible-labels="['syllable']" />
      </VariantCell>
      <VariantCell caption="Raw only" stage="ink3">
        <Note raw-pitch="Db4" primary="raw" :visible-labels="['raw']" :scale-index="1" />
      </VariantCell>
      <VariantCell caption="Degree + raw" stage="ink3">
        <Note degree="bVII" raw-pitch="Bb4" primary="degree" :visible-labels="['degree', 'raw']" :scale-index="10" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Cuts / geometries">
      <VariantCell v-for="geometry in geometries" :key="geometry.name" :caption="geometry.label" stage="ink3">
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
      <VariantCell v-for="proportion in proportions" :key="proportion.name" :caption="proportion.label" stage="ink3">
        <Note
          :proportion="proportion.name"
          :syllable="proportion.syllable"
          :degree="proportion.degree"
          :raw-pitch="proportion.rawPitch"
          :scale-index="proportion.scaleIndex"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Geometry × proportion">
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

    <VariantGrid title="Octave value">
      <VariantCell v-for="octave in [2, 4, 6]" :key="octave" :caption="`C${octave}`" stage="ink3">
        <Note
          :octave="octave"
          :raw-pitch="`C${octave}`"
          primary="raw"
          :visible-labels="['raw']"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Surface treatments">
      <VariantCell v-for="surface in surfaces" :key="surface" :caption="surface" stage="ink3">
        <Note
          :surface-style="surface"
          :raw-pitch="surface === 'monochrome' ? 'F#4' : 'F4'"
          :scale-index="5"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Draft state capability">
      <VariantCell caption="Draft / rest" stage="ink3">
        <Note v-bind="draftStateNote" />
      </VariantCell>
      <VariantCell caption="Draft / sounding" stage="ink3">
        <Note v-bind="draftStateNote" sounding />
      </VariantCell>
      <VariantCell caption="Draft / sustained" stage="ink3">
        <Note v-bind="draftStateNote" sustained />
      </VariantCell>
      <VariantCell caption="Draft / played recently" stage="ink3">
        <Note v-bind="draftStateNote" played-recently />
      </VariantCell>
      <VariantCell caption="Draft / selected" stage="ink3">
        <Note v-bind="draftStateNote" selected />
      </VariantCell>
      <VariantCell caption="Draft / ghosted" stage="ink3">
        <Note v-bind="draftStateNote" ghosted />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
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
  { name: "strip", label: "Strip", syllable: "Ra", degree: "bII", rawPitch: "Db4", scaleIndex: 1 },
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
  { name: "standard", label: "Standard", syllable: "Do", degree: "I", rawPitch: "C4", scaleIndex: 0 },
  { name: "tall", label: "Tall", syllable: "Mi", degree: "III", rawPitch: "E4", scaleIndex: 4 },
  { name: "squary", label: "Squary", syllable: "Fa", degree: "IV", rawPitch: "F4", scaleIndex: 5 },
  { name: "wide", label: "Wide", syllable: "Sol", degree: "V", rawPitch: "G4", scaleIndex: 7 },
  { name: "hero", label: "Hero", syllable: "La", degree: "VI", rawPitch: "A4", scaleIndex: 9 },
];

const geometryProportions: Array<{
  geometry: NoteGeometry;
  proportion: NoteProportion;
  caption: string;
  syllable: string;
  degree: string;
  rawPitch: string;
  scaleIndex: number;
}> = [
  {
    geometry: "offcut",
    proportion: "wide",
    caption: "Offcut × wide",
    syllable: "Sol",
    degree: "V",
    rawPitch: "G4",
    scaleIndex: 7,
  },
  {
    geometry: "tab",
    proportion: "tall",
    caption: "Tab × tall",
    syllable: "Fi",
    degree: "#IV",
    rawPitch: "F#4",
    scaleIndex: 6,
  },
  {
    geometry: "pill",
    proportion: "hero",
    caption: "Pill × hero",
    syllable: "La",
    degree: "VI",
    rawPitch: "A4",
    scaleIndex: 9,
  },
];

const surfaces: NoteSurfaceStyle[] = ["colored", "monochrome", "glassmorphism"];
const draftStateNote = {
  syllable: "Sol",
  degree: "V",
  rawPitch: "G4",
  scaleIndex: 7,
};

const features = [
  { label: "Identity", value: "solfege, scale degree, and spelled pitch with octave" },
  { label: "Hierarchy", value: "selected center primary with fixed playing-card auxiliary corners" },
  { label: "Color", value: "shared runtime music-color resolver with persisted movable/fixed mode" },
  { label: "Surface", value: "colored depth, monochrome inner-border, or glass treatment" },
  { label: "Axes", value: "geometry and proportion are independent and composable" },
  { label: "Text", value: "natural notes read white; accidentals read black" },
  { label: "Boundary", value: "controlled presentation only; no input, store, timer, or audio" },
  { label: "State", value: "draft capability hooks only; final state styling is not accepted yet" },
];
</script>
