<script setup lang="ts">
import { ref } from "vue";
import { useUIBeatScale } from "@/composables/useUIBeat";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import type { LabButtonProps } from "@/types/primitivesLab";

/*
 * Direction B · Keycap. A mechanical switch cap bolted to the chassis: a top
 * face on visible side walls, so every press has real travel. The cap bottoms
 * out on press and springs back on release. Loading lights a small status
 * pip in the cap's corner instead of spinning anything.
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
const bodyRef = ref<HTMLElement | null>(null);

useUIBeatScale(bodyRef, () => props.uiBeat && !props.disabled && !props.loading, {
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
    class="keycap"
    :class="[`keycap--${size}`, `keycap--${tone}`, { 'keycap--loading': loading }]"
    :disabled="disabled"
    :aria-label="accessibleName"
    :aria-busy="loading || undefined"
    :title="title"
    @click="handleClick"
  >
    <span ref="bodyRef" class="keycap__body" aria-hidden="true">
      <span class="keycap__top">
        <span class="keycap__legend"><slot /></span>
        <span v-if="loading" class="keycap__pip" />
      </span>
    </span>
  </button>
</template>

<style scoped>
.keycap {
  --size: 40px;
  --travel: 4px;
  --top: var(--ink-4);
  --wall: var(--ink-2);
  --rim: rgb(255 255 255 / 10%);
  --legend: var(--ivory);
  --pip: var(--ivory);

  position: relative;
  display: inline-grid;
  place-items: center;
  flex: 0 0 auto;
  inline-size: var(--size);
  block-size: var(--size);
  padding: 0;
  border: 0;
  border-radius: 24%;
  background: transparent;
  color: var(--legend);
  cursor: pointer;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
}

.keycap--sm { --size: 32px; --travel: 3px; }
.keycap--lg { --size: 48px; --travel: 5px; }

.keycap--ivory { --top: var(--ivory); --wall: var(--ivory-3); --rim: rgb(255 255 255 / 70%); --legend: var(--ink); --pip: var(--ink); }
.keycap--brass { --top: var(--brass-fill); --wall: var(--brass-lo); --rim: rgb(255 255 255 / 45%); --legend: var(--brass-edge); --pip: var(--brass-edge); }

.keycap__body {
  position: absolute;
  inset: 0;
  border-radius: 24%;
  background: var(--wall);
  box-shadow: 0 2px 0 var(--ink);
  pointer-events: none;
}

.keycap--brass .keycap__body { box-shadow: 0 2px 0 var(--ink), var(--shadow-glow-brass); }

/* The top face sits above the walls; the bottom wall is the visible travel. */
.keycap__top {
  position: absolute;
  inset: 1px 2px var(--travel);
  display: grid;
  place-items: center;
  border-radius: 22%;
  background: var(--top);
  box-shadow: inset 0 1px 0 var(--rim), inset 0 -1px 0 rgb(0 0 0 / 22%);
  transition: translate var(--dur-bounce) var(--ease-bounce);
}

.keycap--brass .keycap__top::after {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--brass-sheen);
  background-size: 220% 100%;
  background-repeat: no-repeat;
  mix-blend-mode: screen;
  animation: brass-sheen 6.5s cubic-bezier(.55,.05,.45,.95) infinite;
}

.keycap__legend {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  line-height: 0;
}

.keycap__legend :deep(svg) {
  display: block;
  inline-size: calc(var(--size) * .44);
  block-size: calc(var(--size) * .44);
}

.keycap:not(:disabled):active .keycap__top {
  translate: 0 calc(var(--travel) - 1px);
  transition: translate var(--dur-tap) var(--ease-stab);
}

.keycap__pip {
  position: absolute;
  z-index: 2;
  top: 18%;
  right: 18%;
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: var(--pip);
  box-shadow: 0 0 5px var(--pip);
  animation: keycap-pip 720ms steps(2) infinite;
}

@keyframes keycap-pip { 50% { opacity: .15; } }

.keycap--loading .keycap__legend { opacity: .3; }

.keycap:focus-visible { outline: 2px solid var(--ivory); outline-offset: 4px; }
.keycap:disabled { cursor: not-allowed; opacity: .35; }

@media (prefers-reduced-motion: reduce) {
  .keycap__top,
  .keycap:not(:disabled):active .keycap__top { transition: none; }
  .keycap__pip,
  .keycap--brass .keycap__top::after { animation: none; }
}

@media (forced-colors: active) {
  .keycap { color: ButtonText; }
  .keycap__body { background: ButtonText; box-shadow: none; }
  .keycap__top { background: ButtonFace; box-shadow: none; }
}
</style>
