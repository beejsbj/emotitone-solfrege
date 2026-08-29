<template>
  <button
    :type="type"
    class="paper-button"
    :class="[`paper-button--${size}`, `paper-button--${tone}`, { 'paper-button--loading': loading }]"
    :disabled="disabled"
    :aria-label="ariaLabel"
    :aria-busy="loading || undefined"
    :title="title"
    @click="handleClick"
  >
    <span class="paper-button__content" aria-hidden="true"><slot /></span>
    <span v-if="loading" class="paper-button__loader" aria-hidden="true" />
  </button>
</template>

<script setup lang="ts">
import { triggerUIHaptic } from "@/utils/hapticFeedback";

export type ButtonSize = "sm" | "md" | "lg";
export type ButtonTone = "ink" | "ivory" | "brass";

const props = withDefaults(
  defineProps<{
    size?: ButtonSize;
    tone?: ButtonTone;
    loading?: boolean;
    disabled?: boolean;
    haptic?: boolean;
    type?: "button" | "submit" | "reset";
    ariaLabel?: string;
    title?: string;
  }>(),
  {
    size: "md",
    tone: "ink",
    loading: false,
    disabled: false,
    haptic: false,
    type: "button",
    ariaLabel: undefined,
    title: undefined,
  },
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();

function handleClick(event: MouseEvent) {
  if (props.haptic) triggerUIHaptic();
  emit("click", event);
}
</script>

<style scoped>
.paper-button {
  --button-size: 40px;
  --button-paper-offset: 2px;
  --button-face: var(--ink-3);
  --button-face-hover: var(--ink-4);
  --button-ink: var(--ivory);
  --button-shadow: var(--ink);

  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  inline-size: var(--button-size);
  block-size: var(--button-size);
  box-sizing: border-box;
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: var(--button-face);
  box-shadow: 0 var(--button-paper-offset) 0 var(--button-shadow), var(--ring);
  color: var(--button-ink);
  cursor: pointer;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--dur-tap) var(--ease-stab),
    box-shadow var(--dur-tap) var(--ease-stab),
    transform var(--dur-tap) var(--ease-stab),
    opacity var(--dur-tap) var(--ease-stab);
}

.paper-button:hover { background: var(--button-face-hover); }

.paper-button:active {
  transform: translateY(var(--button-paper-offset)) scale(.96);
  box-shadow: var(--ring);
}

.paper-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}

.paper-button:disabled {
  cursor: not-allowed;
  opacity: .35;
  transform: none;
}

.paper-button--sm { --button-size: 32px; }
.paper-button--md { --button-size: 40px; }
.paper-button--lg { --button-size: 48px; }

.paper-button--ivory {
  --button-face: var(--ivory);
  --button-face-hover: var(--ivory-2);
  --button-ink: var(--ink);
  --button-shadow: var(--ivory-4);
}

.paper-button--brass {
  --button-face: var(--brass);
  --button-face-hover: var(--brass-hi);
  --button-ink: var(--brass-edge);
  --button-shadow: var(--brass-lo);
}

.paper-button__content {
  display: grid;
  place-items: center;
  transition: opacity var(--dur-tap) var(--ease-stab);
}

.paper-button__content :deep(svg) {
  display: block;
  max-inline-size: 52%;
  max-block-size: 52%;
}

.paper-button--loading .paper-button__content { opacity: .22; }

.paper-button__loader {
  position: absolute;
  inset: 4px;
  border: 1.5px solid currentColor;
  border-left-color: transparent;
  border-radius: 50%;
  animation: paper-button-load 720ms linear infinite;
  pointer-events: none;
}

@keyframes paper-button-load { to { transform: rotate(1turn); } }

@media (prefers-reduced-motion: reduce) {
  .paper-button,
  .paper-button__content { transition: none; }
  .paper-button__loader { animation: none; }
}

@media (forced-colors: active) {
  .paper-button {
    border: 1px solid ButtonText;
    background: ButtonFace;
    box-shadow: 0 var(--button-paper-offset) 0 ButtonText;
    color: ButtonText;
    forced-color-adjust: auto;
  }
  .paper-button:active { box-shadow: none; }
}
</style>
