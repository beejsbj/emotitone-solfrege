<template>
  <article :class="classes">
    <span v-if="label" class="card-shell__label">{{ label }}</span>
    <div v-if="$slots.mark" class="card-shell__mark">
      <slot name="mark" />
    </div>
    <h3 class="card-shell__title">{{ title }}</h3>
    <div v-if="$slots.default" class="card-shell__body">
      <slot />
    </div>
    <p v-else-if="body" class="card-shell__body">{{ body }}</p>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    label?: string;
    title: string;
    body?: string;
    compact?: boolean;
    bordered?: boolean;
  }>(),
  {
    label: undefined,
    body: undefined,
    compact: false,
    bordered: true,
  },
);

const classes = computed(() => [
  "card-shell",
  {
    "card-shell--compact": props.compact,
    "card-shell--borderless": !props.bordered,
  },
]);
</script>

<style scoped>
.card-shell {
  position: relative;
  box-sizing: border-box;
  min-height: 190px;
  padding: 20px 18px 22px;
  background: var(--ink-3);
  border: 1px solid var(--ink-5);
  color: var(--ivory);
}

.card-shell--compact {
  min-height: 158px;
  padding: 14px 12px 16px;
}

.card-shell--borderless {
  border: 0;
  padding-top: 22px;
}

.card-shell__label {
  position: absolute;
  top: -10px;
  left: 14px;
  background: var(--ink-3);
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .22em;
  line-height: 1;
  padding: 0 4px;
  text-transform: uppercase;
}

.card-shell--compact .card-shell__label {
  font-size: 8px;
}

.card-shell--borderless .card-shell__label {
  top: 0;
  background: transparent;
}

.card-shell__mark {
  position: absolute;
  top: 8px;
  right: 12px;
  color: var(--ivory-4);
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

.card-shell--compact .card-shell__mark {
  top: 4px;
  right: 8px;
}

.card-shell__title {
  margin: 0 0 10px;
  max-width: 14ch;
  color: var(--ivory);
  font: 400 19px/1.12 var(--font-display);
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.card-shell--compact .card-shell__title {
  max-width: none;
  margin-bottom: 6px;
  padding-right: 38px;
  font-size: 14px;
}

.card-shell__body {
  max-width: 28ch;
  margin: 0;
  color: var(--ivory-3);
  font: var(--t-body-s);
}

.card-shell--compact .card-shell__body {
  max-width: none;
  font-size: 10px;
  line-height: 1.5;
}
</style>
