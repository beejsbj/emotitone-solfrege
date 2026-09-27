<script setup lang="ts">
import Mark from "@/components/primatives/Mark.vue";
import { MARK_NAMES } from "@/components/primatives/marks";

/** The production registry, unchanged: every accepted glyph from its real source. */
const TONES = ["ivory", "brass", "tomato", "mustard", "plum", "pine", "ivory-2"] as const;
</script>

<template>
  <ul class="plab-marks" aria-label="Accepted Marks">
    <li v-for="(name, index) in MARK_NAMES" :key="name" :title="name">
      <Mark :name="name" :tone="TONES[index % TONES.length]" :size="30" />
    </li>
  </ul>
</template>

<style scoped>
.plab-marks {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(44px, 1fr));
  gap: var(--s-4);
  margin: 0;
  padding: var(--s-6);
  background: var(--ink);
  list-style: none;
}

.plab-marks li { display: grid; place-items: center; min-height: 44px; }
</style>
