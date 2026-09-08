<template>
  <component
    :is="as"
    :class="['system-card', { 'system-card--flush': flush }]"
    :style="{ '--card-spine': spine }"
  >
    <span class="system-card__spine" aria-hidden="true"></span>
    <span class="system-card__label">{{ label }}</span>
    <span v-if="$slots.mark" class="system-card__mark">
      <slot name="mark" />
    </span>
    <div class="system-card__content">
      <slot />
    </div>
    <div v-if="$slots.footer" class="system-card__footer">
      <slot name="footer" />
    </div>
  </component>
</template>

<script setup lang="ts">
withDefaults(
  defineProps<{
    label: string;
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
.system-card {
  --card-spine: var(--ivory);
  position: relative;
  display: flex;
  box-sizing: border-box;
  min-width: 0;
  flex-direction: column;
  background: var(--ink-3);
  border: 1px solid var(--ink-5);
  color: var(--ivory);
}

button.system-card {
  appearance: none;
  margin: 0;
  padding: 0;
  border-radius: 0;
  font: inherit;
  text-align: left;
}

.system-card__spine {
  position: absolute;
  z-index: 3;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  background: var(--card-spine);
  pointer-events: none;
}

.system-card__label {
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

.system-card__mark {
  position: absolute;
  z-index: 1;
  top: 8px;
  right: 12px;
  color: var(--ivory-4);
  line-height: 1;
  pointer-events: none;
  user-select: none;
}

.system-card__content {
  box-sizing: border-box;
  min-width: 0;
  flex: 1;
  padding: 20px 18px 22px 22px;
}

.system-card--flush .system-card__content {
  padding: 0;
}

.system-card__footer {
  position: relative;
  z-index: 2;
}
</style>
