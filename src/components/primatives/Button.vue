<template>
  <button
    :type="type"
    class="paper-button"
    :class="[
      `paper-button--${size}`,
      `paper-button--${tone}`,
      tone === 'brass' ? `paper-button--brass-${brassFinish}` : undefined,
      {
        'paper-button--loading': loading,
        'paper-button--hit-a': hitPhase === 'a',
        'paper-button--hit-b': hitPhase === 'b',
      },
    ]"
    :disabled="disabled"
    :aria-label="accessibleName"
    :aria-busy="loading || undefined"
    :title="title"
    @pointerdown="strike"
    @click="handleClick"
  >
    <span ref="beatTargetRef" class="paper-button__face" aria-hidden="true">
      <span class="paper-button__lip" />
      <span class="paper-button__switch">
        <span class="paper-button__cap">
          <span class="paper-button__lamp" />
          <span class="paper-button__content"><slot /></span>
        </span>
      </span>
    </span>
  </button>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useUIBeatScale } from "@/composables/useUIBeat";
import { triggerUIHaptic } from "@/utils/hapticFeedback";

/*
 * Lit Keycap. A switch cap on visible side walls with real travel, backlit
 * from inside the switch. A lit lip sits under the cap at rest; every hit
 * bottoms the cap out, opens the lip into a full ring, lights the face, and
 * closes back down into the lip like a note's release. Loading rotates the
 * lip around the cap. The native button keeps an invariant hit box; the face
 * inside carries UIBeat scale, and the cap owns press travel.
 */

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
    uiBeat?: boolean;
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
    uiBeat: true,
    haptic: false,
    type: "button",
    title: undefined,
  },
);

const emit = defineEmits<{ click: [event: MouseEvent] }>();
const beatTargetRef = ref<HTMLElement | null>(null);
// Alternating classes restart the backlight on every hit without timers.
const hitPhase = ref<"a" | "b" | null>(null);

useUIBeatScale(
  beatTargetRef,
  () => props.uiBeat && !props.disabled && !props.loading,
  { restScale: 0.8, peakScale: 1.1 },
);

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

<style>
@property --paper-button-lip-angle {
  syntax: "<angle>";
  inherits: false;
  initial-value: 180deg;
}

@property --paper-button-lip-span {
  syntax: "<angle>";
  inherits: false;
  initial-value: 100deg;
}
</style>

<style scoped>
.paper-button {
  --button-size: 40px;
  --button-travel: 4px;
  --button-radius: 24%;
  --button-cap: var(--ink-4);
  --button-cap-lit: var(--ink-5);
  --button-wall: var(--ink-2);
  --button-rim: rgb(255 255 255 / 10%);
  --button-ink: var(--ivory);
  --button-light: var(--ivory);
  --button-extra-glow: 0 0 0 transparent;

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
  background: transparent;
  color: var(--button-ink);
  cursor: pointer;
  isolation: isolate;
  -webkit-tap-highlight-color: transparent;
  touch-action: manipulation;
  transition: opacity var(--dur-tap) var(--ease-stab);
}

.paper-button--sm { --button-size: 32px; --button-travel: 3px; }
.paper-button--md { --button-size: 40px; }
.paper-button--lg { --button-size: 48px; --button-travel: 5px; }

.paper-button--ivory {
  --button-cap: var(--ivory);
  --button-cap-lit: var(--bone);
  --button-wall: var(--ivory-3);
  --button-rim: rgb(255 255 255 / 70%);
  --button-ink: var(--ink);
  --button-light: var(--ivory);
}

.paper-button--brass {
  --button-cap: var(--brass);
  --button-cap-lit: var(--brass-hi);
  --button-wall: var(--brass-lo);
  --button-rim: rgb(255 255 255 / 45%);
  --button-ink: var(--brass-edge);
  --button-light: var(--brass-hi);
}

.paper-button--brass-sheen,
.paper-button--brass-sheen-glow { --button-cap: var(--brass-fill); }

.paper-button--brass-glow,
.paper-button--brass-sheen-glow { --button-extra-glow: var(--shadow-glow-brass); }

.paper-button__face,
.paper-button__switch {
  position: absolute;
  inset: 0;
  border-radius: var(--button-radius);
  pointer-events: none;
}

/* The switch housing: walls, plus Brass's own glow when its finish has one. */
.paper-button__switch {
  background: var(--button-wall);
  box-shadow: 0 0 0 transparent, var(--button-extra-glow);
}

/*
 * The lip: one arc of light just outside the housing, past a 2px dark seam,
 * so it reads as light leaking from under the key on every material. At rest
 * it sits at the bottom; a hit opens it into a full ring that closes back down;
 * loading rotates it around the key.
 */
.paper-button__lip {
  --paper-button-lip-angle: 180deg;
  --paper-button-lip-span: 100deg;
  --lip: color-mix(in srgb, var(--button-light) 85%, transparent);
  --feather: 14deg;
  position: absolute;
  inset: -4px;
  box-sizing: border-box;
  padding: 2px;
  border-radius: calc(var(--button-radius) + 2px);
  background: conic-gradient(
    from calc(var(--paper-button-lip-angle) - var(--paper-button-lip-span) / 2),
    transparent 0deg,
    var(--lip) var(--feather),
    var(--lip) calc(var(--paper-button-lip-span) - var(--feather)),
    transparent var(--paper-button-lip-span),
    transparent 360deg
  );
  /* Keep only a thin ring: the padding box minus the content box. */
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--button-light) 55%, transparent));
  pointer-events: none;
}

.paper-button__cap {
  position: absolute;
  inset: 1px 2px var(--button-travel);
  display: grid;
  place-items: center;
  overflow: hidden;
  border-radius: 22%;
  background: var(--button-cap);
  box-shadow: inset 0 1px 0 var(--button-rim), inset 0 -1px 0 rgb(0 0 0 / 22%);
  transition: transform var(--dur-tap) var(--ease-stab);
}

.paper-button__lamp {
  position: absolute;
  inset: 0;
  background: var(--button-cap-lit);
  opacity: 0;
  pointer-events: none;
}

.paper-button--brass-sheen .paper-button__cap::after,
.paper-button--brass-sheen-glow .paper-button__cap::after {
  content: "";
  position: absolute;
  inset: 0;
  background: var(--brass-sheen);
  background-repeat: no-repeat;
  background-position: -60% 0;
  background-size: 220% 100%;
  mix-blend-mode: screen;
  animation: brass-sheen var(--dur-sheen) var(--ease-sheen) infinite;
  pointer-events: none;
}

.paper-button__content {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  line-height: 0;
  transition: opacity var(--dur-tap) var(--ease-stab);
}

.paper-button__content :deep(svg) {
  display: block;
  inline-size: calc(var(--button-size) * .44);
  block-size: calc(var(--button-size) * .44);
  max-inline-size: none;
  max-block-size: none;
}

/* Press: the cap bottoms out on its travel. */
.paper-button:not(:disabled):active .paper-button__cap {
  transform: translateY(calc(var(--button-travel) - 1px));
}

.paper-button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 5px;
}

/* Each hit opens the lip into a full ring and lights the face; the release
   closes the ring back down to the bottom lip. */
.paper-button--hit-a .paper-button__lip { animation: paper-button-ring-a var(--dur-bounce) var(--ease-brush) both; }
.paper-button--hit-b .paper-button__lip { animation: paper-button-ring-b var(--dur-bounce) var(--ease-brush) both; }
.paper-button--hit-a .paper-button__switch { animation: paper-button-glow-a var(--dur-bounce) var(--ease-brush) both; }
.paper-button--hit-b .paper-button__switch { animation: paper-button-glow-b var(--dur-bounce) var(--ease-brush) both; }
.paper-button--hit-a .paper-button__lamp { animation: paper-button-lamp-a var(--dur-bounce) var(--ease-brush) both; }
.paper-button--hit-b .paper-button__lamp { animation: paper-button-lamp-b var(--dur-bounce) var(--ease-brush) both; }

@keyframes paper-button-ring-a {
  0% { --paper-button-lip-span: 360deg; }
  100% { --paper-button-lip-span: 100deg; }
}
@keyframes paper-button-ring-b {
  0% { --paper-button-lip-span: 360deg; }
  100% { --paper-button-lip-span: 100deg; }
}
@keyframes paper-button-glow-a {
  0% { box-shadow: 0 0 18px color-mix(in srgb, var(--button-light) 70%, transparent), var(--button-extra-glow); }
  100% { box-shadow: 0 0 0 transparent, var(--button-extra-glow); }
}
@keyframes paper-button-glow-b {
  0% { box-shadow: 0 0 18px color-mix(in srgb, var(--button-light) 70%, transparent), var(--button-extra-glow); }
  100% { box-shadow: 0 0 0 transparent, var(--button-extra-glow); }
}
@keyframes paper-button-lamp-a { from { opacity: 1; } to { opacity: 0; } }
@keyframes paper-button-lamp-b { from { opacity: 1; } to { opacity: 0; } }

/* Loading rotates the lip itself around the key. */
.paper-button--loading .paper-button__content { opacity: .3; }
.paper-button--loading .paper-button__lip { animation: paper-button-orbit 900ms linear infinite; }

@keyframes paper-button-orbit {
  from { --paper-button-lip-angle: 180deg; }
  to { --paper-button-lip-angle: 540deg; }
}

.paper-button:disabled {
  cursor: not-allowed;
  opacity: .35;
  transition: none;
}

.paper-button:disabled .paper-button__lip { display: none; }
.paper-button:disabled .paper-button__cap { transition: none; }
.paper-button:disabled .paper-button__cap::after { animation: none; }

@media (prefers-reduced-motion: no-preference) {
  /* Non-brass Buttons share the promoted elastic release with Boolean Knob;
     Brass keeps its direct tap response. */
  .paper-button:not(.paper-button--brass):not(:disabled) .paper-button__cap {
    transition: transform var(--dur-bounce) var(--ease-bounce);
  }

  .paper-button:not(.paper-button--brass):not(:disabled):active .paper-button__cap {
    transition: transform var(--dur-tap) var(--ease-stab);
  }
}

@media (prefers-reduced-motion: reduce) {
  .paper-button,
  .paper-button__cap,
  .paper-button__content { transition: none; }
  .paper-button__lip,
  .paper-button__switch,
  .paper-button__lamp,
  .paper-button__cap::after { animation: none; }
}

@media (forced-colors: active) {
  .paper-button {
    color: ButtonText;
    forced-color-adjust: auto;
  }

  .paper-button__switch { background: ButtonText; box-shadow: none; }
  .paper-button__cap { border: 1px solid ButtonText; background: ButtonFace; box-shadow: none; }
  .paper-button__lip,
  .paper-button__lamp { display: none; }
}
</style>
