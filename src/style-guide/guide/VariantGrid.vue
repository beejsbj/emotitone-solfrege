<template>
  <section class="variant-grid">
    <h3 class="variant-grid__heading">{{ title }}</h3>
    <div class="variant-grid__items">
      <slot />
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  title: string;
}>();
</script>

<style scoped>
.variant-grid {
  margin-top: var(--s-9);
}

.variant-grid__heading {
  display: flex;
  align-items: center;
  gap: var(--s-4);
  margin: 0 0 var(--s-5);
  font: 700 clamp(20px, 3vw, 24px)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
  color: var(--ivory);
}

/* A strip of the layer's tape ahead of each heading. */
.variant-grid__heading::before {
  content: "";
  flex: none;
  width: 22px;
  height: 10px;
  background: var(--guide-paper, var(--brass));
  clip-path: var(--clip-tab);
  transform: rotate(var(--rot-tile-3));
}

.variant-grid__items {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 140px), 1fr));
  gap: var(--s-6) var(--s-5);
}
</style>
