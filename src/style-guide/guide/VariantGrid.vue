<template>
  <section class="variant-grid">
    <div class="variant-grid__heading">{{ title }}</div>
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
.variant-grid__heading {
  font-family: var(--font-mono);
  font-weight: 600;
  font-size: 9px;
  letter-spacing: .22em;
  text-transform: uppercase;
  color: var(--ivory-4);
  margin: 24px 0 10px;
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ink-5);
}

.variant-grid__items {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}
</style>
