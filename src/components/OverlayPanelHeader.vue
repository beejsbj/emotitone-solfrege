<script setup lang="ts">
defineProps<{
  title: string;
  context?: string;
  status?: string | number;
}>();
</script>

<template>
  <div class="overlay-panel-header" data-testid="overlay-panel-header">
    <div class="overlay-panel-header__identity">
      <p class="overlay-panel-header__title">{{ title }}</p>
      <span v-if="context" class="overlay-panel-header__context">{{ context }}</span>
    </div>

    <div class="overlay-panel-header__actions">
      <span v-if="status !== undefined" class="overlay-panel-header__status">{{ status }}</span>
      <slot />
    </div>
  </div>
</template>

<style scoped>
.overlay-panel-header {
  display: flex;
  min-inline-size: 0;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--s-3);
}

.overlay-panel-header__identity {
  display: flex;
  min-inline-size: 0;
  min-block-size: 32px;
  align-items: center;
  gap: var(--s-2);
}

.overlay-panel-header__title,
.overlay-panel-header__context,
.overlay-panel-header__status {
  margin: 0;
  font-family: var(--font-mono);
  text-transform: uppercase;
}

.overlay-panel-header__title {
  flex: none;
  color: var(--ivory);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .22em;
}

.overlay-panel-header__context,
.overlay-panel-header__status {
  color: var(--ivory);
  font-size: 8px;
  letter-spacing: .18em;
  opacity: .52;
}

.overlay-panel-header__context {
  min-inline-size: 0;
  overflow: hidden;
  border-inline-start: 1px solid rgb(244 239 230 / .14);
  padding-inline-start: var(--s-2);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.overlay-panel-header__actions {
  display: flex;
  min-inline-size: 0;
  align-items: flex-start;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: var(--s-1);
}

.overlay-panel-header__status {
  display: inline-flex;
  min-block-size: 32px;
  align-items: center;
  padding-inline: var(--s-1);
}
</style>
