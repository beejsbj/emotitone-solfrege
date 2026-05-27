<template>
  <div :class="classes">
    <Kicker :tone="tone">{{ kicker }}</Kicker>
    <span class="preset-row__name">{{ name }}</span>
    <button
      v-if="actionLabel"
      type="button"
      class="preset-row__button"
      :disabled="disabled"
      @click="emit('action')"
    >
      {{ actionLabel }}
    </button>
    <span v-else-if="meta" class="preset-row__meta">{{ meta }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Kicker from "../primatives/Kicker.vue";
import type { KickerTone } from "../primatives/Kicker.vue";

const props = withDefaults(
  defineProps<{
    tone?: KickerTone;
    kicker: string;
    name: string;
    meta?: string;
    actionLabel?: string;
    disabled?: boolean;
  }>(),
  {
    tone: "tomato",
    meta: undefined,
    actionLabel: undefined,
    disabled: false,
  },
);

const emit = defineEmits<{
  action: [];
}>();

const classes = computed(() => [
  "preset-row",
  `preset-row--tone-${props.tone}`,
  {
    "preset-row--disabled": props.disabled,
  },
]);
</script>

<style scoped>
.preset-row {
  --preset-row-spine: var(--tomato);
  position: relative;
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 12px;
  box-sizing: border-box;
  padding: 10px 12px 10px 16px;
  border: 1px solid var(--hairline);
  background: var(--ink-2);
  color: var(--ivory);
}

.preset-row::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 4px;
  background: var(--preset-row-spine);
}

.preset-row--tone-tomato {
  --preset-row-spine: var(--tomato);
}

.preset-row--tone-pine {
  --preset-row-spine: var(--pine);
}

.preset-row--tone-plum {
  --preset-row-spine: var(--plum);
}

.preset-row--tone-mustard {
  --preset-row-spine: var(--mustard);
}

.preset-row--tone-bone {
  --preset-row-spine: var(--bone);
}

.preset-row--tone-brass {
  --preset-row-spine: var(--brass);
}

.preset-row--tone-ivory {
  --preset-row-spine: var(--ivory-3);
}

.preset-row--tone-open {
  --preset-row-spine: transparent;
}

.preset-row__name {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--ivory);
  font-family: var(--font-display);
  font-size: 16px;
  font-weight: 700;
  letter-spacing: var(--tracking-display);
  line-height: .95;
  text-overflow: ellipsis;
  text-transform: uppercase;
  white-space: nowrap;
}

.preset-row__button {
  flex-shrink: 0;
  padding: 4px 10px;
  border: 1px solid var(--hairline);
  background: transparent;
  color: var(--ivory-3);
  cursor: pointer;
  font: 700 10px var(--font-display);
  letter-spacing: .14em;
  text-transform: uppercase;
  transition:
    color var(--dur-tap) var(--ease-brush),
    border-color var(--dur-tap) var(--ease-brush),
    opacity var(--dur-tap) var(--ease-brush);
}

.preset-row__button:hover,
.preset-row__button:focus-visible {
  border-color: var(--ink-5);
  color: var(--ivory);
  outline: none;
}

.preset-row__button:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.preset-row__meta {
  flex-shrink: 0;
  margin-left: 8px;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 9px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.preset-row--disabled {
  opacity: .62;
}

@media (prefers-reduced-motion: reduce) {
  .preset-row__button {
    transition: none !important;
  }
}
</style>
