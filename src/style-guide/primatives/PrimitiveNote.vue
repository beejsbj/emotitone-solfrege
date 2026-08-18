<template>
  <AnatomyDisplay
    title="Note · Music Primitive"
    :features="features"
    caption="Note is the noninteractive musical identity and presentation surface. It owns color, octave value, geometry, label hierarchy, and externally controlled musical states; it does not listen for input or make sound."
  >
    <template #hero>
      <Note shape="hero" syllable="Do" degree="I" raw-pitch="C4" />
    </template>

    <VariantGrid title="Primary identity">
      <VariantCell v-for="label in labels" :key="label" :caption="`${label} primary`" stage="ink3">
        <Note shape="hero" :primary="label" syllable="Do" degree="I" raw-pitch="C4" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Musical states">
      <VariantCell caption="Rest" stage="ink3"><Note v-bind="stateNote" /></VariantCell>
      <VariantCell caption="Sounding" stage="ink3"><Note v-bind="stateNote" sounding /></VariantCell>
      <VariantCell caption="Sustained" stage="ink3"><Note v-bind="stateNote" sustained /></VariantCell>
      <VariantCell caption="Played recently" stage="ink3"><Note v-bind="stateNote" played-recently /></VariantCell>
      <VariantCell caption="Selected" stage="ink3"><Note v-bind="stateNote" selected /></VariantCell>
      <VariantCell caption="Ghosted" stage="ink3"><Note v-bind="stateNote" ghosted /></VariantCell>
    </VariantGrid>

    <VariantGrid title="Octave value">
      <VariantCell v-for="octave in [2, 4, 6]" :key="octave" :caption="`C${octave}`" stage="ink3">
        <Note :octave="octave" :raw-pitch="`C${octave}`" :visible-labels="['raw']" primary="raw" />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Geometry">
      <VariantCell v-for="shape in shapes" :key="shape" :caption="shape" stage="ink3">
        <Note :shape="shape" syllable="Fa" degree="IV" raw-pitch="F4" :scale-index="3" />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import Note from "@/components/primatives/Note.vue";
import type { NoteLabel, NoteShape } from "@/components/primatives/Note.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const labels: NoteLabel[] = ["syllable", "degree", "raw"];
const shapes: NoteShape[] = ["strip", "tile", "offcut", "tab", "pill", "tall", "squary", "wide"];
const stateNote = { syllable: "Sol", degree: "V", rawPitch: "G4", scaleIndex: 4 };

const features = [
  { label: "Identity", value: "solfège · scale degree · spelled pitch with octave" },
  { label: "Hierarchy", value: "one selectable primary; any label subset may render" },
  { label: "Color", value: "shared runtime music-color resolver; fixed or movable global mode" },
  { label: "Value", value: "octave changes lightness through the shared color recipe" },
  { label: "Geometry", value: "surface, depth, cuts, proportions, and clipping" },
  { label: "State", value: "sounding · sustained · played recently · selected · ghosted" },
  { label: "Boundary", value: "controlled presentation only; no input, timer, store, or audio ownership" },
];
</script>
