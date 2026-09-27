<script setup lang="ts">
import type { Component } from "vue";
import LabCell from "../LabCell.vue";

/** Sticker outline, fill, marked content, and Badge through one component seam. */
defineProps<{ component: Component }>();
</script>

<template>
  <div class="plab-bench">
    <LabCell caption="Fill · Ivory, Tomato, Mustard, Pine">
      <component :is="component" variant="fill" color="ivory">Piano</component>
      <component :is="component" variant="fill" color="tomato">Live</component>
      <component :is="component" variant="fill" color="mustard">Swing</component>
      <component :is="component" variant="fill" color="pine">Dorian</component>
    </LabCell>
    <LabCell caption="Outline · Ivory, Plum, Brass sheen">
      <component :is="component" variant="outline" color="ivory">Rhodes</component>
      <component :is="component" variant="outline" color="plum">Minor</component>
      <component :is="component" variant="outline" color="brass-sheen">Shape</component>
    </LabCell>
    <LabCell caption="Optional Mark · leading fill, trailing outline">
      <component :is="component" variant="fill" color="tomato" mark="eighth">Live · 04</component>
      <component :is="component" variant="outline" color="ivory" mark="repeat" mark-position="after">Repeat</component>
    </LabCell>
    <LabCell caption="Badge · Brass signal, Ivory latched">
      <component :is="component" variant="badge">Signal</component>
      <component :is="component" variant="badge" color="ivory">Latched</component>
    </LabCell>
    <LabCell caption="In the Instrument Picker · the current choice among Ivory choices" wide>
      <span class="plab-picker">
        <component :is="component" variant="outline" color="ivory">Piano</component>
        <component :is="component" variant="fill" color="ivory">Rhodes</component>
        <component :is="component" variant="outline" color="ivory">Vibes</component>
        <component :is="component" variant="outline" color="ivory">Upright Bass</component>
        <component :is="component" variant="outline" color="ivory">Brushes</component>
      </span>
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
