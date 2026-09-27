<script setup lang="ts">
import type { Component } from "vue";
import LabCell from "../LabCell.vue";

/**
 * Sticker serves both zones, so the bench shows them apart: applied paper on
 * the playing-zone hardware wears only Ink, Ivory, and Brass; the brand-zone
 * poster uses the brand papers.
 */
defineProps<{ component: Component }>();
</script>

<template>
  <div class="plab-bench">
    <p class="plab-zone">Playing zone · applied paper · Ink, Ivory, Brass only</p>
    <LabCell caption="Instrument Picker · the current choice among Ivory choices" wide>
      <span class="plab-picker">
        <component :is="component" variant="outline" color="ivory">Piano</component>
        <component :is="component" variant="fill" color="ivory">Rhodes</component>
        <component :is="component" variant="outline" color="ivory">Vibes</component>
        <component :is="component" variant="outline" color="ivory">Upright Bass</component>
        <component :is="component" variant="outline" color="ivory">Brushes</component>
      </span>
    </LabCell>
    <LabCell caption="Drag value · Ivory for everyday Knobs, Brass Badge for masters">
      <component :is="component" variant="fill" color="ivory">64</component>
      <component :is="component" variant="badge">0.35</component>
    </LabCell>
    <LabCell caption="Badge · Brass signal, Ivory latched Joystick">
      <component :is="component" variant="badge">Signal</component>
      <component :is="component" variant="badge" color="ivory">Latched</component>
    </LabCell>
    <LabCell caption="Marked · Ivory with a trailing Mark">
      <component :is="component" variant="outline" color="ivory" mark="repeat" mark-position="after">Repeat</component>
      <component :is="component" variant="fill" color="ink-5" mark="eighth">Take 04</component>
    </LabCell>

    <p class="plab-zone plab-zone--brand">Brand zone · poster · brand papers</p>
    <LabCell caption="Fill · Tomato, Mustard, Pine, Bone">
      <component :is="component" variant="fill" color="tomato" mark="eighth">Live · 04</component>
      <component :is="component" variant="fill" color="mustard">Swing</component>
      <component :is="component" variant="fill" color="pine">Dorian</component>
      <component :is="component" variant="fill" color="bone">Loading</component>
    </LabCell>
    <LabCell caption="Outline · Plum, Mustard">
      <component :is="component" variant="outline" color="plum">Minor</component>
      <component :is="component" variant="outline" color="mustard">Encore</component>
    </LabCell>
  </div>
</template>

<style scoped>
.plab-picker {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: var(--s-5) var(--s-4);
  max-width: 420px;
}
</style>
