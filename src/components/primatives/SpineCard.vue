<template>
  <article :class="classes">
    <Kicker class="spine-card__kicker" :tone="tone">{{ kicker }}</Kicker>
    <div class="spine-card__stamp">{{ stamp }}</div>
    <p v-if="body" class="spine-card__body">{{ body }}</p>
    <div v-else-if="$slots.default" class="spine-card__body">
      <slot />
    </div>
  </article>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Kicker from "./Kicker.vue";

export type SpineCardTone = "tomato" | "pine" | "plum" | "bone" | "mustard";

const props = withDefaults(
  defineProps<{
    tone?: SpineCardTone;
    kicker: string;
    stamp: string;
    body?: string;
    compact?: boolean;
  }>(),
  {
    tone: "tomato",
    body: undefined,
    compact: false,
  },
);

const classes = computed(() => [
  "spine-card",
  `spine-card--tone-${props.tone}`,
  {
    "spine-card--compact": props.compact,
  },
]);
</script>

<style scoped>
.spine-card {
  --spine-card-color: var(--tomato);
  position: relative;
  display: flex;
  min-height: 168px;
  flex-direction: column;
  gap: 10px;
  box-sizing: border-box;
  padding: 16px 16px 16px 22px;
  background: var(--ink-2);
  border: 1px solid var(--hairline);
  color: var(--ivory);
}

.spine-card::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  background: var(--spine-card-color);
}

.spine-card--compact {
  min-height: 144px;
  gap: 8px;
  padding: 12px 12px 12px 18px;
}

.spine-card--tone-tomato {
  --spine-card-color: var(--tomato);
}

.spine-card--tone-pine {
  --spine-card-color: var(--pine);
}

.spine-card--tone-plum {
  --spine-card-color: var(--plum);
}

.spine-card--tone-mustard {
  --spine-card-color: var(--mustard);
}

.spine-card--tone-bone {
  --spine-card-color: var(--bone);
  background: var(--ink-3);
}

.spine-card--tone-bone .spine-card__stamp {
  color: var(--bone);
}

.spine-card__kicker {
  --kicker-color: var(--spine-card-color);
}

.spine-card__stamp {
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: 32px;
  font-weight: 700;
  line-height: .9;
  letter-spacing: var(--tracking-display);
  text-transform: uppercase;
}

.spine-card--compact .spine-card__stamp {
  font-size: 22px;
}

.spine-card__body {
  margin: auto 0 0;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 11px;
  line-height: 1.55;
}

.spine-card--compact .spine-card__body {
  font-size: 10px;
}
</style>
