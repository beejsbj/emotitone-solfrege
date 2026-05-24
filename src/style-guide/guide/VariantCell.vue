<template>
  <div class="variant-cell">
    <div :class="stageClasses">
      <slot />
    </div>
    <div class="variant-cell__caption">{{ caption }}</div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    caption: string;
    stage?: "ink" | "ink2" | "ink3" | "bone";
  }>(),
  {
    stage: "ink",
  },
);

const stageClasses = computed(() => [
  "variant-cell__stage",
  `variant-cell__stage--${props.stage}`,
]);
</script>

<style scoped>
.variant-cell {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
}

.variant-cell__stage {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px 12px;
  border: 1px solid var(--hairline);
  background: var(--ink);
  min-height: 80px;
  box-sizing: border-box;
}

.variant-cell__stage--ink2 {
  background: var(--ink-2);
}

.variant-cell__stage--ink3,
.variant-cell__stage--bone {
  background: var(--ink-3);
}

.variant-cell__stage--bone {
  border-color: var(--ink-5);
}

.variant-cell__caption {
  font-family: var(--font-mono);
  font-size: 8px;
  letter-spacing: .18em;
  text-transform: uppercase;
  color: var(--ivory-4);
  text-align: center;
}
</style>
