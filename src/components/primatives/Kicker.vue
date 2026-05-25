<template>
  <span :class="classes">
    <span v-if="form !== 'label'" class="kicker__dot" aria-hidden="true"></span>
    <span v-if="form !== 'dot'" class="kicker__label">
      <slot />
    </span>
  </span>
</template>

<script setup lang="ts">
import { computed } from "vue";

export type KickerTone =
  | "tomato"
  | "pine"
  | "plum"
  | "mustard"
  | "bone"
  | "brass"
  | "ivory"
  | "open";
export type KickerDot = "square" | "micro" | "large" | "bar-v" | "bar-h";
export type KickerDensity = "dense" | "default" | "airy";
export type KickerForm = "full" | "dot" | "label";

const props = withDefaults(
  defineProps<{
    tone?: KickerTone;
    dot?: KickerDot;
    density?: KickerDensity;
    form?: KickerForm;
    inverse?: boolean;
  }>(),
  {
    tone: "tomato",
    dot: "square",
    density: "default",
    form: "full",
    inverse: false,
  },
);

const classes = computed(() => [
  "kicker",
  `kicker--tone-${props.tone}`,
  `kicker--dot-${props.dot}`,
  `kicker--density-${props.density}`,
  `kicker--form-${props.form}`,
  {
    "kicker--inverse": props.inverse,
  },
]);
</script>

<style scoped>
.kicker {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ivory-3);
  font-family: var(--font-mono);
  font-size: 9px;
  font-weight: 600;
  letter-spacing: var(--tracking-label);
  text-transform: uppercase;
  white-space: nowrap;
}

.kicker__dot {
  width: var(--kicker-dot-width, 8px);
  height: var(--kicker-dot-height, 8px);
  flex: 0 0 var(--kicker-dot-width, 8px);
  background: var(--kicker-color, var(--tomato));
}

.kicker--tone-tomato {
  --kicker-color: var(--tomato);
}

.kicker--tone-pine {
  --kicker-color: var(--pine);
}

.kicker--tone-plum {
  --kicker-color: var(--plum);
}

.kicker--tone-mustard {
  --kicker-color: var(--mustard);
}

.kicker--tone-bone {
  --kicker-color: var(--bone);
}

.kicker--tone-brass {
  --kicker-color: var(--brass);
}

.kicker--tone-brass .kicker__dot {
  box-shadow: var(--shadow-glow-brass);
}

.kicker--tone-ivory {
  --kicker-color: var(--ivory-3);
}

.kicker--tone-open .kicker__dot {
  background: transparent;
  box-shadow: inset 0 0 0 1.5px var(--ivory-4);
}

.kicker--dot-micro {
  --kicker-dot-width: 5px;
  --kicker-dot-height: 5px;
}

.kicker--dot-large {
  --kicker-dot-width: 12px;
  --kicker-dot-height: 12px;
}

.kicker--dot-bar-v {
  --kicker-dot-width: 4px;
  --kicker-dot-height: 16px;
}

.kicker--dot-bar-h {
  --kicker-dot-width: 16px;
  --kicker-dot-height: 4px;
}

.kicker--density-dense {
  letter-spacing: .04em;
}

.kicker--density-airy {
  letter-spacing: .32em;
}

.kicker--form-label {
  gap: 0;
}

.kicker--inverse {
  color: var(--ink-3);
}
</style>
