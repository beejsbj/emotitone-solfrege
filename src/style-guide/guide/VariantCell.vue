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
  gap: var(--s-3);
  min-width: 0;
}

/* A filled Ink well: the product's own background, no frame. */
.variant-cell__stage {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 110px;
  padding: var(--s-7) var(--s-5);
  background: var(--ink);
  box-sizing: border-box;
}

/* Legacy stage names from the old card frame all resolve to the product's
   Ink; only Bone is a deliberately different paper. */
.variant-cell__stage--bone { background: var(--bone); }

.variant-cell__caption {
  font: var(--t-caption);
  color: var(--ivory-3);
}
</style>
