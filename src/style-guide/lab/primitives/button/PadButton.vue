<script setup lang="ts">
import { ref } from "vue";
import { useUIBeatScale } from "@/composables/useUIBeat";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import type { LabButtonProps } from "@/types/primitivesLab";

/*
 * Direction B · Pad. A drum-machine pad backlit from under the paper. A lit
 * lip sits under the resting pad; every hit floods the seam with light that
 * decays like a note's release. Loading chases the light around the edge.
 */
const props = withDefaults(defineProps<LabButtonProps>(), {
  size: "md",
  tone: "ink",
  loading: false,
  disabled: false,
  uiBeat: true,
  haptic: false,
  type: "button",
  title: undefined,
});

const emit = defineEmits<{ click: [event: MouseEvent] }>();
const faceRef = ref<HTMLElement | null>(null);
// Alternating classes restart the decay on every hit without timers.
const hitPhase = ref<"a" | "b" | null>(null);

useUIBeatScale(faceRef, () => props.uiBeat && !props.disabled && !props.loading, {
  restScale: 0.8,
  peakScale: 1.1,
});

function strike() {
  if (props.disabled || props.loading) return;
  hitPhase.value = hitPhase.value === "a" ? "b" : "a";
}

function handleClick(event: MouseEvent) {
  if (props.haptic) triggerUIHaptic();
  // Pointer hits already struck on press; keyboard activation strikes here.
  if (event.detail === 0) strike();
  emit("click", event);
}
</script>

<template>
  <button
    :type="type"
    class="pad"
    :class="[
      `pad--${size}`,
      `pad--${tone}`,
      { 'pad--loading': loading, 'pad--hit-a': hitPhase === 'a', 'pad--hit-b': hitPhase === 'b' },
    ]"
    :disabled="disabled"
    :aria-label="accessibleName"
    :aria-busy="loading || undefined"
    :title="title"
    @pointerdown="strike"
    @click="handleClick"
  >
    <span ref="faceRef" class="pad__body" aria-hidden="true">
      <span class="pad__chase" />
      <span class="pad__face"><slot /></span>
    </span>
  </button>
</template>

<style scoped>
.pad {
  --size: 40px;
  --face: var(--ink-3);
  --face-lit: var(--ink-5);
  --icon: var(--ivory);
  --light: var(--ivory);
  --radius: 28%;

  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  inline-size: var(--size);
  block-size: var(--size);
  padding: 0;
  border: 0;
  border-radius: var(--radius);
  background: transparent;
  color: var(--icon);
  cursor: pointer;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.pad--sm { --size: 32px; }
.pad--lg { --size: 48px; }

.pad--ivory { --face: var(--ivory); --face-lit: var(--bone); --icon: var(--ink); --light: var(--ivory); }
.pad--brass { --face: var(--brass-fill); --face-lit: var(--brass-hi); --icon: var(--brass-edge); --light: var(--brass-hi); }

.pad__body,
.pad__chase,
.pad__face {
  position: absolute;
  border-radius: var(--radius);
  pointer-events: none;
}

.pad__body { inset: 0; }

.pad__chase {
  inset: -2px;
  overflow: hidden;
  opacity: 0;
}

.pad__chase::before {
  content: "";
  position: absolute;
  inset: -50%;
  background: conic-gradient(var(--light) 0 22%, transparent 22% 100%);
}

.pad__face {
  inset: 0;
  display: grid;
  place-items: center;
  background: var(--face);
  line-height: 0;
  /* The resting lit lip: light leaking from under the bottom edge. */
  box-shadow: 0 2px 0 color-mix(in srgb, var(--light) 55%, transparent);
  transition: translate var(--dur-tap) var(--ease-stab), scale var(--dur-tap) var(--ease-stab);
}

.pad__face :deep(svg) {
  display: block;
  inline-size: 50%;
  block-size: 50%;
}

.pad:not(:disabled):active .pad__face {
  translate: 0 1px;
  scale: .96;
}

.pad--hit-a .pad__face { animation: pad-decay-a var(--dur-bounce) var(--ease-brush) both; }
.pad--hit-b .pad__face { animation: pad-decay-b var(--dur-bounce) var(--ease-brush) both; }

@keyframes pad-decay-a {
  0% {
    background: var(--face-lit);
    box-shadow: 0 0 0 2px var(--light), 0 0 18px color-mix(in srgb, var(--light) 70%, transparent);
  }
  100% { background: var(--face); box-shadow: 0 2px 0 color-mix(in srgb, var(--light) 55%, transparent); }
}

@keyframes pad-decay-b {
  0% {
    background: var(--face-lit);
    box-shadow: 0 0 0 2px var(--light), 0 0 18px color-mix(in srgb, var(--light) 70%, transparent);
  }
  100% { background: var(--face); box-shadow: 0 2px 0 color-mix(in srgb, var(--light) 55%, transparent); }
}

.pad--loading .pad__face { box-shadow: none; }
.pad--loading .pad__face :deep(svg) { opacity: .3; }
.pad--loading .pad__chase { opacity: 1; }
.pad--loading .pad__chase::before { animation: pad-chase 900ms linear infinite; }

@keyframes pad-chase { to { rotate: 1turn; } }

.pad:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: 4px;
}

.pad:disabled { cursor: not-allowed; opacity: .35; }
.pad:disabled .pad__face { box-shadow: none; }

@media (prefers-reduced-motion: reduce) {
  .pad__face { transition: none; }
  .pad--hit-a .pad__face,
  .pad--hit-b .pad__face { animation: none; }
  .pad--loading .pad__chase::before { animation: none; }
}

@media (forced-colors: active) {
  .pad { color: ButtonText; }
  .pad__face { border: 1px solid ButtonText; background: ButtonFace; box-shadow: none; }
  .pad__chase { display: none; }
}
</style>
