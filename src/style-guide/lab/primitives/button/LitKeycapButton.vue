<script setup lang="ts">
import { ref } from "vue";
import { useUIBeatScale } from "@/composables/useUIBeat";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import type { LabButtonProps } from "@/types/primitivesLab";

/*
 * Direction A · Lit Keycap. Keycap and Pad combined: a switch cap on visible
 * side walls with real travel, backlit from inside the switch. Light leaks
 * from under the cap at rest; every hit bottoms the cap out and floods the
 * seam with light that decays like a note's release. Loading orbits the lit lip
 * itself around the cap.
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
// Alternating classes restart the decay on every hit without timers.
const hitPhase = ref<"a" | "b" | null>(null);

useUIBeatScale(bodyRef, () => props.uiBeat && !props.disabled && !props.loading, {
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
    class="litcap"
    :class="[
      `litcap--${size}`,
      `litcap--${tone}`,
      { 'litcap--loading': loading, 'litcap--hit-a': hitPhase === 'a', 'litcap--hit-b': hitPhase === 'b' },
    ]"
    :disabled="disabled"
    :aria-label="accessibleName"
    :aria-busy="loading || undefined"
    :title="title"
    @pointerdown="strike"
    @click="handleClick"
  >
    <span ref="bodyRef" class="litcap__body" aria-hidden="true">
      <span class="litcap__switch">
        <span class="litcap__top">
          <span class="litcap__lamp" />
          <slot />
        </span>
      </span>
    </span>
  </button>
</template>

<style scoped>
.litcap {
  --size: 40px;
  --travel: 4px;
  --top: var(--ink-4);
  --top-lit: var(--ink-5);
  --wall: var(--ink-2);
  --rim: rgb(255 255 255 / 10%);
  --legend: var(--ivory);
  --light: var(--ivory);
  --radius: 24%;

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
  color: var(--legend);
  cursor: pointer;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
}

.litcap--sm { --size: 32px; --travel: 3px; }
.litcap--lg { --size: 48px; --travel: 5px; }

.litcap--ivory { --top: var(--ivory); --top-lit: var(--bone); --wall: var(--ivory-3); --rim: rgb(255 255 255 / 70%); --legend: var(--ink); --light: var(--ivory); }
.litcap--brass { --top: var(--brass-fill); --top-lit: var(--brass-hi); --wall: var(--brass-lo); --rim: rgb(255 255 255 / 45%); --legend: var(--brass-edge); --light: var(--brass-hi); }

.litcap__body,
.litcap__switch {
  position: absolute;
  border-radius: var(--radius);
  pointer-events: none;
}

.litcap__body { inset: 0; }

.litcap__lamp {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: var(--top-lit);
  opacity: 0;
  pointer-events: none;
}

/* The switch housing. Its light is Pad's: a lit lip under the key at rest.
   Lists keep equal length so the lip, ring, and glow interpolate smoothly. */
.litcap__switch {
  --lip: color-mix(in srgb, var(--light) 55%, transparent);
  --glow: color-mix(in srgb, var(--light) 70%, transparent);
  --extra-glow: 0 0 0 transparent;
  --rest-light: 0 2px 0 var(--lip), 0 0 0 transparent, var(--extra-glow);
  inset: 0;
  background: var(--wall);
  box-shadow: var(--rest-light);
}

.litcap--brass .litcap__switch { --extra-glow: var(--shadow-glow-brass); }

.litcap__top {
  position: absolute;
  inset: 1px 2px var(--travel);
  display: grid;
  place-items: center;
  border-radius: 22%;
  background: var(--top);
  box-shadow: inset 0 1px 0 var(--rim), inset 0 -1px 0 rgb(0 0 0 / 22%);
  line-height: 0;
  transition: translate var(--dur-bounce) var(--ease-bounce);
}

.litcap__top :deep(svg) {
  position: relative;
  z-index: 1;
  display: block;
  inline-size: calc(var(--size) * .44);
  block-size: calc(var(--size) * .44);
}

.litcap--brass .litcap__top::after {
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

.litcap:not(:disabled):active .litcap__top {
  translate: 0 calc(var(--travel) - 1px);
  transition: translate var(--dur-tap) var(--ease-stab);
}

/* Each hit grows the lip into a ring and lights the face; the release drains
   the light back down into the lip, like the original Pad. */
.litcap--hit-a .litcap__switch { animation: litcap-ring-a var(--dur-bounce) var(--ease-brush) both; }
.litcap--hit-b .litcap__switch { animation: litcap-ring-b var(--dur-bounce) var(--ease-brush) both; }
.litcap--hit-a .litcap__lamp { animation: litcap-lamp-a var(--dur-bounce) var(--ease-brush) both; }
.litcap--hit-b .litcap__lamp { animation: litcap-lamp-b var(--dur-bounce) var(--ease-brush) both; }

@keyframes litcap-ring-a {
  0% { box-shadow: 0 0 0 2px var(--light), 0 0 18px var(--glow), var(--extra-glow); }
  100% { box-shadow: var(--rest-light); }
}
@keyframes litcap-ring-b {
  0% { box-shadow: 0 0 0 2px var(--light), 0 0 18px var(--glow), var(--extra-glow); }
  100% { box-shadow: var(--rest-light); }
}
@keyframes litcap-lamp-a { from { opacity: 1; } to { opacity: 0; } }
@keyframes litcap-lamp-b { from { opacity: 1; } to { opacity: 0; } }

.litcap--loading .litcap__top :deep(svg) { opacity: .3; }

/* Loading moves the lip itself: the light leaking from under the cap
   circles the switch — bottom, right, top, left — instead of adding a ring. */
.litcap--loading .litcap__switch { animation: litcap-orbit 900ms linear infinite; }

@keyframes litcap-orbit {
  0%, 100% { box-shadow: 0 2px 0 var(--lip), 0 0 0 transparent, var(--extra-glow); }
  25% { box-shadow: 2px 0 0 var(--lip), 0 0 0 transparent, var(--extra-glow); }
  50% { box-shadow: 0 -2px 0 var(--lip), 0 0 0 transparent, var(--extra-glow); }
  75% { box-shadow: -2px 0 0 var(--lip), 0 0 0 transparent, var(--extra-glow); }
}

.litcap:focus-visible { outline: 2px solid var(--ivory); outline-offset: 4px; }
.litcap:disabled { cursor: not-allowed; opacity: .35; }
.litcap:disabled .litcap__switch { box-shadow: none; }

@media (prefers-reduced-motion: reduce) {
  .litcap__top,
  .litcap:not(:disabled):active .litcap__top { transition: none; }
  .litcap--hit-a .litcap__switch,
  .litcap--hit-b .litcap__switch,
  .litcap--hit-a .litcap__lamp,
  .litcap--hit-b .litcap__lamp,
  .litcap--loading .litcap__switch,
  .litcap--brass .litcap__top::after { animation: none; }
}

@media (forced-colors: active) {
  .litcap { color: ButtonText; }
  .litcap__switch { background: ButtonText; box-shadow: none; }
  .litcap__top { background: ButtonFace; box-shadow: none; }
  .litcap__lamp { display: none; }
}
</style>
