<script setup lang="ts">
/** One specimen well: plain Ink stage with a mono caption. Guide scaffold only. */
withDefaults(defineProps<{ caption: string; wide?: boolean; tall?: boolean }>(), { wide: false, tall: false });
</script>

<template>
  <figure class="plab-cell" :class="{ 'plab-cell--wide': wide, 'plab-cell--tall': tall }">
    <div class="plab-cell__stage"><slot /></div>
    <figcaption class="plab-cell__caption">{{ caption }}</figcaption>
  </figure>
</template>

<style scoped>
.plab-cell {
  display: grid;
  gap: var(--s-3);
  align-content: start;
  min-width: 0;
  margin: 0;
}

.plab-cell--wide { grid-column: 1 / -1; }

.plab-cell__stage {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: center;
  gap: var(--s-5);
  min-width: 0;
  min-height: 104px;
  padding: var(--s-6) var(--s-5);
  background: var(--ink);
}

.plab-cell--tall .plab-cell__stage { min-height: 150px; }

.plab-cell__caption {
  color: var(--ivory-3);
  font: var(--t-caption);
}
</style>
