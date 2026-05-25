<template>
  <AnatomyDisplay
    title="Keys &middot; Music Primitive"
    :features="features"
    caption="One key face primitive: music color fills the playable face while ink and ivory stay chrome. The source owns the three-label stack, format prominence, shape/cut variants, pressed/disabled states, sheen, and motion. This slice preserves legacy --note-* aliases while correcting the specimen's chromatic note mapping."
  >
    <template #hero>
      <Key shape="hero" note="do" syllable="Do" degree="I" raw="C4" />
    </template>

    <VariantGrid title="Center Format">
      <VariantCell
        v-for="format in formats"
        :key="format.format"
        :caption="format.label"
        stage="ink3"
      >
        <Key
          note="do"
          syllable="Do"
          degree="I"
          raw="C4"
          shape="hero"
          :format="format.format"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Chromatic Aliases">
      <VariantCell
        v-for="key in chromaticKeys"
        :key="key.note"
        :caption="key.syllable"
        stage="ink3"
      >
        <Key
          :note="key.note"
          :syllable="key.syllable"
          :degree="key.degree"
          :raw="key.raw"
          shape="strip"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="States">
      <VariantCell caption="Rest" stage="ink3">
        <Key note="sol" syllable="Sol" degree="V" raw="G4" />
      </VariantCell>
      <VariantCell caption="Pressed" stage="ink3">
        <Key note="mi" syllable="Mi" degree="III" raw="E4" pressed />
      </VariantCell>
      <VariantCell caption="Disabled" stage="ink3">
        <Key note="la" syllable="La" degree="VI" raw="A4" disabled />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Cuts">
      <VariantCell
        v-for="shape in cutShapes"
        :key="shape.shape"
        :caption="shape.label"
        stage="ink3"
      >
        <Key
          :shape="shape.shape"
          :note="shape.note"
          :syllable="shape.syllable"
          :degree="shape.degree"
          :raw="shape.raw"
        />
      </VariantCell>
    </VariantGrid>

    <VariantGrid title="Proportions">
      <VariantCell
        v-for="shape in proportionShapes"
        :key="shape.shape"
        :caption="shape.label"
        stage="ink3"
      >
        <Key
          :shape="shape.shape"
          :note="shape.note"
          :syllable="shape.syllable"
          :degree="shape.degree"
          :raw="shape.raw"
        />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import Key from "../../components/primatives/Key.vue";
import type { KeyFormat, KeyNote, KeyShape } from "../../components/primatives/Key.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

interface KeyExample {
  note: KeyNote;
  syllable: string;
  degree: string;
  raw: string;
}

interface ShapeExample extends KeyExample {
  shape: KeyShape;
  label: string;
}

const formats: Array<{ format: KeyFormat; label: string }> = [
  { format: "syllable", label: "Syllable hero" },
  { format: "degree", label: "Degree hero" },
  { format: "raw", label: "Raw hero" },
];

const chromaticKeys: KeyExample[] = [
  { note: "do", syllable: "Do", degree: "I", raw: "C4" },
  { note: "ra", syllable: "Ra", degree: "bII", raw: "Db4" },
  { note: "re", syllable: "Re", degree: "II", raw: "D4" },
  { note: "me", syllable: "Me", degree: "bIII", raw: "Eb4" },
  { note: "mi", syllable: "Mi", degree: "III", raw: "E4" },
  { note: "fa", syllable: "Fa", degree: "IV", raw: "F4" },
  { note: "fi", syllable: "Fi", degree: "#IV", raw: "F#4" },
  { note: "se", syllable: "Se", degree: "bV", raw: "Gb4" },
  { note: "sol", syllable: "Sol", degree: "V", raw: "G4" },
  { note: "le", syllable: "Le", degree: "bVI", raw: "Ab4" },
  { note: "la", syllable: "La", degree: "VI", raw: "A4" },
  { note: "te", syllable: "Te", degree: "bVII", raw: "Bb4" },
  { note: "ti", syllable: "Ti", degree: "VII", raw: "B4" },
];

const cutShapes: ShapeExample[] = [
  { shape: "strip", note: "ra", syllable: "Ra", degree: "bII", raw: "Db4", label: "Strip / clip-tile" },
  { shape: "tile", note: "fa", syllable: "Fa", degree: "IV", raw: "F4", label: "Tile / clip-tile" },
  { shape: "offcut", note: "ti", syllable: "Ti", degree: "VII", raw: "B4", label: "Offcut" },
  { shape: "tab", note: "fi", syllable: "Fi", degree: "#IV", raw: "F#4", label: "Tab" },
  { shape: "pill", note: "te", syllable: "Te", degree: "bVII", raw: "Bb4", label: "Pill" },
];

const proportionShapes: ShapeExample[] = [
  { shape: "tall", note: "do", syllable: "Do", degree: "I", raw: "C4", label: "Tall" },
  { shape: "squary", note: "mi", syllable: "Mi", degree: "III", raw: "E4", label: "Squary" },
  { shape: "wide", note: "sol", syllable: "Sol", degree: "V", raw: "G4", label: "Wide" },
];

const features = [
  { label: "Face", value: "legacy --note-* fill; one note equals one hue" },
  { label: "Stack", value: "syllable top, degree center, raw pitch bottom" },
  { label: "Format", value: "syllable, degree, or raw can become the hero label" },
  { label: "Chrome", value: "ink/ivory-only shadow, sheen, and label treatment" },
  { label: "Cuts", value: "strip/tile use clip-tile; offcut/tab reuse clip tokens" },
  { label: "Shape", value: "pill, tall, squary, wide are key-specific variants" },
  { label: "State", value: "rest, pressed, and disabled live in source" },
  { label: "Gate", value: ".note computed color migration remains parked" },
];
</script>
