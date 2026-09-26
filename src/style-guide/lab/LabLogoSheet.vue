<script setup lang="ts">
import type { Component } from "vue";

/** One logo as a mark system: large, app icons, lockup, on Ink and on Bone. */
defineProps<{
  logo: Component;
  name: string;
}>();
</script>

<template>
  <div class="lab-logo-sheet" :aria-label="`${name} logo sheet`">
    <figure class="lab-logo-sheet__cell lab-logo-sheet__cell--hero">
      <div class="lab-logo-sheet__well">
        <component :is="logo" size="min(240px, 56vw)" surface="ink" />
      </div>
      <figcaption>Mark · large · Ink</figcaption>
    </figure>

    <figure class="lab-logo-sheet__cell lab-logo-sheet__cell--hero">
      <div class="lab-logo-sheet__well lab-logo-sheet__well--bone">
        <component :is="logo" size="min(240px, 56vw)" surface="bone" />
      </div>
      <figcaption>Mark · large · Bone</figcaption>
    </figure>

    <figure class="lab-logo-sheet__cell">
      <div class="lab-logo-sheet__well lab-logo-sheet__icons">
        <span class="lab-logo-sheet__icon lab-logo-sheet__icon--64">
          <component :is="logo" size="48px" variant="icon" surface="ink" />
        </span>
        <span class="lab-logo-sheet__icon lab-logo-sheet__icon--48">
          <component :is="logo" size="36px" variant="icon" surface="ink" />
        </span>
        <span class="lab-logo-sheet__icon lab-logo-sheet__icon--64 lab-logo-sheet__icon--bone">
          <component :is="logo" size="48px" variant="icon" surface="bone" />
        </span>
        <span class="lab-logo-sheet__icon lab-logo-sheet__icon--48 lab-logo-sheet__icon--bone">
          <component :is="logo" size="36px" variant="icon" surface="bone" />
        </span>
        <span class="lab-logo-sheet__icon lab-logo-sheet__icon--tab">
          <component :is="logo" size="16px" variant="icon" surface="ink" />
        </span>
      </div>
      <figcaption>App icon · 64 · 48 · Ink and Bone · 16 tab</figcaption>
    </figure>

    <figure class="lab-logo-sheet__cell">
      <div class="lab-logo-sheet__well lab-logo-sheet__lockups">
        <component :is="logo" size="clamp(44px, 12vw, 64px)" lockup surface="ink" />
      </div>
      <div class="lab-logo-sheet__well lab-logo-sheet__well--bone lab-logo-sheet__lockups">
        <component :is="logo" size="clamp(44px, 12vw, 64px)" lockup surface="bone" />
      </div>
      <figcaption>Wordmark lockup · Ink · Bone</figcaption>
    </figure>
  </div>
</template>

<style scoped>
.lab-logo-sheet {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 300px), 1fr));
  gap: var(--s-6);
}

.lab-logo-sheet__cell {
  display: grid;
  gap: var(--s-3);
  min-width: 0;
  margin: 0;
  align-content: start;
}

.lab-logo-sheet__cell figcaption {
  color: var(--ivory-3);
  font: var(--t-caption);
}

.lab-logo-sheet__well {
  display: grid;
  min-width: 0;
  min-height: 150px;
  padding: var(--s-8) var(--s-6);
  place-items: center;
  overflow: hidden;
  background: var(--ink);
}

.lab-logo-sheet__cell--hero .lab-logo-sheet__well { min-height: 300px; }
.lab-logo-sheet__well--bone { background: var(--bone); }

.lab-logo-sheet__icons {
  display: flex;
  flex-wrap: wrap;
  align-items: end;
  justify-content: center;
  gap: var(--s-6);
  background: var(--ink-3);
}

/* Icons sit on a masked tile, as a launcher would crop them. */
.lab-logo-sheet__icon {
  display: grid;
  place-items: center;
  overflow: hidden;
  background: var(--ink);
  border-radius: 22%;
}

.lab-logo-sheet__icon--64 { width: 64px; height: 64px; }
.lab-logo-sheet__icon--48 { width: 48px; height: 48px; }
.lab-logo-sheet__icon--tab { width: 16px; height: 16px; border-radius: 3px; }
.lab-logo-sheet__icon--bone { background: var(--bone); }

.lab-logo-sheet__lockups { min-height: 120px; }
</style>
