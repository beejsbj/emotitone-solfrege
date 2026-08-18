<template>
  <AnatomyDisplay
    title="Key · Interactive Compound"
    :features="features"
    caption="Key composes Note inside a physical button surface. Press the live specimen: local pointer, touch, focus, lock, and press feedback belong here, while musical sounding remains separately controlled."
  >
    <template #hero>
      <Key shape="hero" syllable="Do" degree="I" raw-pitch="C4" />
    </template>

    <VariantGrid title="Interaction and musical state">
      <VariantCell caption="Interactive" stage="ink3">
        <Key syllable="Re" degree="II" raw-pitch="D4" :scale-index="1" />
      </VariantCell>
      <VariantCell caption="Externally sounding" stage="ink3">
        <Key syllable="Mi" degree="III" raw-pitch="E4" :scale-index="2" sounding />
      </VariantCell>
      <VariantCell caption="Pressed feedback" stage="ink3">
        <Key syllable="Fa" degree="IV" raw-pitch="F4" :scale-index="3" pressed />
      </VariantCell>
      <VariantCell caption="Input locked" stage="ink3">
        <Key syllable="Sol" degree="V" raw-pitch="G4" :scale-index="4" input-locked />
      </VariantCell>
    </VariantGrid>
  </AnatomyDisplay>
</template>

<script setup lang="ts">
import Key from "@/components/compounds/Key.vue";
import AnatomyDisplay from "../guide/AnatomyDisplay.vue";
import VariantCell from "../guide/VariantCell.vue";
import VariantGrid from "../guide/VariantGrid.vue";

const features = [
  { label: "Child", value: "Note owns all musical identity and presentation" },
  { label: "Semantics", value: "native button with focus and pressed accessibility state" },
  { label: "Local input", value: "mouse and touch begin/end events with leave/blur cleanup" },
  { label: "Feedback", value: "hover/focus/physical press/input-lock treatment" },
  { label: "Boundary", value: "emits semantic local input; does not synthesize or route global keys" },
];
</script>
