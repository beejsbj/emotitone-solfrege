<script setup lang="ts">
import { ref } from "vue";
import { useUIBeatScale } from "@/composables/useUIBeat";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import type { LabButtonProps } from "@/types/primitivesLab";

/*
 * Direction A · Misprint. A two-plate screenprint pulled slightly out of
 * register: the colour plate sits off the paper and the icon ghosts in the
 * plate colour. Pressing pulls the plates into register; release springs them
 * back out. Loading orbits the plate instead of spinning a ring.
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

useUIBeatScale(faceRef, () => props.uiBeat && !props.disabled && !props.loading, {
  restScale: 0.8,
  peakScale: 1.1,
});

function handleClick(event: MouseEvent) {
  if (props.haptic) triggerUIHaptic();
  emit("click", event);
}
</script>

<template>
  <button
    :type="type"
    class="misprint"
    :class="[`misprint--${size}`, `misprint--${tone}`, { 'misprint--loading': loading }]"
    :disabled="disabled"
    :aria-label="accessibleName"
    :aria-busy="loading || undefined"
    :title="title"
    @click="handleClick"
  >
    <span ref="faceRef" class="misprint__face" aria-hidden="true">
      <span class="misprint__plate" />
      <span class="misprint__paper" />
      <span class="misprint__ghost"><slot /></span>
      <span class="misprint__icon"><slot /></span>
    </span>
  </button>
</template>

<style scoped>
.misprint {
  --size: 40px;
  --paper: var(--ink-3);
  --plate: var(--tomato);
  --icon: var(--ivory);
  --ox: 3px;
  --oy: 2px;

  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  inline-size: var(--size);
  block-size: var(--size);
  padding: 0;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--icon);
  cursor: pointer;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
}

.misprint--sm { --size: 32px; --ox: 2px; --oy: 2px; }
.misprint--lg { --size: 48px; --ox: 4px; --oy: 3px; }

.misprint--ivory { --paper: var(--ivory); --plate: var(--cobalt); --icon: var(--ink); }
.misprint--brass { --paper: var(--brass-fill); --plate: var(--brass-lo); --icon: var(--brass-edge); }

.misprint__face,
.misprint__plate,
.misprint__paper,
.misprint__ghost,
.misprint__icon {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  pointer-events: none;
}

.misprint__plate {
  background: var(--plate);
  translate: var(--ox) var(--oy);
  transition: translate var(--dur-bounce) var(--ease-bounce);
}

.misprint__paper { background: var(--paper); }

.misprint--brass .misprint__paper { box-shadow: var(--shadow-glow-brass); }

.misprint__ghost,
.misprint__icon {
  display: grid;
  place-items: center;
  line-height: 0;
}

.misprint__ghost {
  color: var(--plate);
  translate: calc(var(--ox) * .6) calc(var(--oy) * .6);
  transition: translate var(--dur-bounce) var(--ease-bounce);
}

.misprint--brass .misprint__ghost { color: var(--brass-hi); }

.misprint__ghost :deep(svg),
.misprint__icon :deep(svg) {
  display: block;
  inline-size: 50%;
  block-size: 50%;
}

.misprint:not(:disabled):hover { --ox: 4px; --oy: 3px; }

.misprint:not(:disabled):active .misprint__plate,
.misprint:not(:disabled):active .misprint__ghost {
  translate: 0 0;
  transition-duration: var(--dur-tap);
  transition-timing-function: var(--ease-stab);
}

.misprint:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: 5px;
}

.misprint--loading .misprint__icon,
.misprint--loading .misprint__ghost { opacity: .28; }

.misprint--loading .misprint__plate {
  animation: misprint-orbit 900ms linear infinite;
}

@keyframes misprint-orbit {
  0% { translate: var(--ox) var(--oy); }
  25% { translate: calc(var(--ox) * -1) var(--oy); }
  50% { translate: calc(var(--ox) * -1) calc(var(--oy) * -1); }
  75% { translate: var(--ox) calc(var(--oy) * -1); }
  100% { translate: var(--ox) var(--oy); }
}

.misprint:disabled {
  cursor: not-allowed;
  opacity: .35;
}

.misprint:disabled .misprint__plate,
.misprint:disabled .misprint__ghost { opacity: 0; }

@media (prefers-reduced-motion: reduce) {
  .misprint__plate,
  .misprint__ghost { transition: none; }
  .misprint--loading .misprint__plate { animation: none; translate: 0 0; }
}

@media (forced-colors: active) {
  .misprint__paper { border: 1px solid ButtonText; background: ButtonFace; }
  .misprint__plate,
  .misprint__ghost { display: none; }
  .misprint { color: ButtonText; }
}
</style>
