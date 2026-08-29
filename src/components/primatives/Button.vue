<template>
  <button
    :type="type"
    class="paper-button"
    :class="[
      `paper-button--${size}`,
      `paper-button--${tone}`,
      tone === 'brass' ? `paper-button--brass-${brassFinish}` : undefined,
      { 'paper-button--loading': loading },
    ]"
    :disabled="disabled"
    :aria-label="accessibleName"
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
export type ButtonBrassFinish = "flat" | "sheen" | "glow" | "sheen-glow";

const props = withDefaults(
  defineProps<{
    size?: ButtonSize;
    tone?: ButtonTone;
    brassFinish?: ButtonBrassFinish;
    loading?: boolean;
    disabled?: boolean;
    haptic?: boolean;
    type?: "button" | "submit" | "reset";
    accessibleName: string;
    title?: string;
  }>(),
  {
    size: "md",
    tone: "ink",
    brassFinish: "sheen-glow",
    loading: false,
    disabled: false,
    haptic: false,
    type: "button",
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
  --button-material-shadow: 0 0 0 transparent;
  --button-rest-shadow: 0 var(--button-paper-offset) 0 var(--button-shadow);
  --button-rest-rotation: 0deg;
  --button-radius: 50%;
  --button-clip: none;

  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  inline-size: var(--button-size);
  block-size: var(--button-size);
  box-sizing: border-box;
  padding: 0;
  border: 0;
  border-radius: var(--button-radius);
  clip-path: var(--button-clip);
  background: var(--button-face);
  box-shadow: var(--button-rest-shadow), var(--button-material-shadow);
  color: var(--button-ink);
  cursor: pointer;
  isolation: isolate;
  overflow: hidden;
  transform: rotate(var(--button-rest-rotation));
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--dur-tap) var(--ease-stab),
    box-shadow var(--dur-tap) var(--ease-stab),
    transform var(--dur-tap) var(--ease-stab),
    opacity var(--dur-tap) var(--ease-stab);
}

.paper-button:not(:disabled):hover { background: var(--button-face-hover); }

.paper-button:not(:disabled):active {
  transform: translateY(var(--button-paper-offset)) scale(.96) rotate(var(--button-rest-rotation));
  box-shadow: var(--button-material-shadow);
}

.paper-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 3px;
}

.paper-button:disabled {
  background: var(--button-face);
  cursor: not-allowed;
  opacity: .35;
  transform: rotate(var(--button-rest-rotation));
  transition: none;
}

.paper-button:disabled .paper-button__content { transition: none; }
.paper-button:disabled .paper-button__loader { animation: none; }

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

.paper-button--brass-sheen,
.paper-button--brass-sheen-glow {
  --button-face: var(--brass-fill);
  --button-face-hover: var(--brass-fill);
}

.paper-button--brass-glow,
.paper-button--brass-sheen-glow {
  --button-material-shadow: var(--shadow-glow-brass);
}

.paper-button::after {
  content: "";
  position: absolute;
  z-index: 1;
  inset: -10% -30%;
  background: var(--brass-sheen);
  background-repeat: no-repeat;
  background-position: -60% 0;
  background-size: 220% 100%;
  mix-blend-mode: screen;
  opacity: 0;
  pointer-events: none;
}

.paper-button--brass-sheen::after,
.paper-button--brass-sheen-glow::after {
  opacity: 1;
  animation: brass-sheen 6.5s cubic-bezier(.55,.05,.45,.95) infinite;
}

.paper-button__content {
  position: relative;
  z-index: 2;
  display: grid;
  place-items: center;
  inline-size: 100%;
  block-size: 100%;
  line-height: 0;
  transition: opacity var(--dur-tap) var(--ease-stab);
}

.paper-button__content :deep(svg) {
  display: block;
  inline-size: 60%;
  block-size: 60%;
  max-inline-size: none;
  max-block-size: none;
}

.paper-button--loading .paper-button__content { opacity: .22; }

.paper-button__loader {
  position: absolute;
  z-index: 3;
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
  .paper-button::after,
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
