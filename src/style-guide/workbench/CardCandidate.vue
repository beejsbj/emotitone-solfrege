<template>
  <component
    :is="as"
    :class="['card-candidate', { 'card-candidate--flush': flush }]"
    :style="{ '--card-candidate-spine': spine }"
  >
    <span class="card-candidate__spine" aria-hidden="true"></span>
    <span v-if="$slots.label" class="card-candidate__label">
      <slot name="label" />
    </span>
    <span v-if="$slots.mark" class="card-candidate__mark">
      <slot name="mark" />
    </span>
    <div class="card-candidate__content">
      <slot />
    </div>
    <div v-if="$slots.footer" class="card-candidate__footer">
      <slot name="footer" />
    </div>
  </component>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    as?: string;
    spine?: string;
    flush?: boolean;
  }>(),
  {
    as: "article",
    spine: "var(--ivory)",
    flush: false,
  },
);
</script>

<style scoped>
.card-candidate {
  --card-candidate-spine: var(--ivory);
  position: relative;
  display: flex;
  box-sizing: border-box;
  min-width: 0;
  flex-direction: column;
  background: var(--ink-3);
  border: 1px solid var(--ink-5);
  color: var(--ivory);
}

.card-candidate__spine {
  position: absolute;
  z-index: 1;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  background: var(--card-candidate-spine);
  pointer-events: none;
}

.card-candidate__label {
  position: absolute;
  z-index: 2;
  top: -10px;
  left: 18px;
  padding: 0 4px;
  background: var(--ink-3);
  color: var(--ivory-3);
  font: var(--t-caption);
  letter-spacing: .22em;
  line-height: 1;
  text-transform: uppercase;
}

.card-candidate__mark {
  position: absolute;
  z-index: 1;
  top: 8px;
  right: 12px;
  color: var(--ivory-4);
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

.card-candidate__content {
  box-sizing: border-box;
  min-width: 0;
  flex: 1;
  padding: 20px 18px 22px 22px;
}

.card-candidate--flush .card-candidate__content {
  padding: 0;
}

.card-candidate__footer {
  position: relative;
  z-index: 2;
}
</style>
