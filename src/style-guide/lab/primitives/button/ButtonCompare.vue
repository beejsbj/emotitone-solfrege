<script setup lang="ts">
import type { Component } from "vue";
import { CornerDownLeft, Play, Undo2 } from "lucide-vue-next";

/** Tappable columns so each Button direction can be felt beside the others. */
defineProps<{ columns: { name: string; component: Component }[] }>();
</script>

<template>
  <div class="plab-compare">
    <figure v-for="column in columns" :key="column.name" class="plab-compare__col">
      <figcaption>{{ column.name }}</figcaption>
      <div class="plab-compare__row">
        <component :is="column.component" size="lg" tone="ink" :accessible-name="`${column.name} play`"><Play /></component>
        <component :is="column.component" size="lg" tone="ivory" :accessible-name="`${column.name} undo`"><Undo2 /></component>
        <component :is="column.component" size="lg" tone="brass" :accessible-name="`${column.name} send`"><CornerDownLeft /></component>
      </div>
      <div class="plab-compare__row">
        <component :is="column.component" size="sm" tone="ivory" :accessible-name="`${column.name} small play`"><Play /></component>
        <component :is="column.component" size="sm" tone="ink" :accessible-name="`${column.name} small undo`"><Undo2 /></component>
        <component :is="column.component" size="sm" tone="ivory" :accessible-name="`${column.name} small send`"><CornerDownLeft /></component>
      </div>
    </figure>
  </div>
</template>

<style scoped>
.plab-compare {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(210px, 1fr));
  gap: var(--s-5);
}

.plab-compare__col {
  display: grid;
  gap: var(--s-6);
  justify-items: center;
  margin: 0;
  padding: var(--s-7) var(--s-4) var(--s-8);
  background: var(--ink);
}

.plab-compare__col figcaption {
  color: var(--ivory);
  font: 700 18px/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.plab-compare__row {
  display: flex;
  gap: var(--s-5);
  align-items: center;
}
</style>
