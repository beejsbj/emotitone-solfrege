<script setup lang="ts">
import { ref } from "vue";
import { useUIBeatScale } from "@/composables/useUIBeat";
import { triggerUIHaptic } from "@/utils/hapticFeedback";
import type { LabButtonProps } from "@/types/primitivesLab";

/*
 * Direction C · Burst. The gig-poster price burst as a button: a twelve-point
 * star cut from paper. Each press ratchets it forward one point; because the
 * star repeats every 30°, the resting silhouette never changes — only the
 * motion reveals the detent. Loading turns it like a shop-window sign.
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
const POINTS = 12;
const STEP = 360 / POINTS;
const turn = ref(-7);

const burst = Array.from({ length: POINTS * 2 }, (_, index) => {
  const angle = (index / (POINTS * 2)) * Math.PI * 2 - Math.PI / 2;
  const radius = index % 2 === 0 ? 50 : 41;
  return `${(50 + Math.cos(angle) * radius).toFixed(2)}% ${(50 + Math.sin(angle) * radius).toFixed(2)}%`;
}).join(", ");
const clip = `polygon(${burst})`;

useUIBeatScale(faceRef, () => props.uiBeat && !props.disabled && !props.loading, {
  restScale: 0.8,
  peakScale: 1.1,
});

function handleClick(event: MouseEvent) {
  if (props.haptic) triggerUIHaptic();
  turn.value += STEP;
  emit("click", event);
}
</script>

<template>
  <button
    :type="type"
    class="burst"
    :class="[`burst--${size}`, `burst--${tone}`, { 'burst--loading': loading }]"
    :style="{ '--burst-clip': clip, '--burst-turn': `${turn}deg` }"
    :disabled="disabled"
    :aria-label="accessibleName"
    :aria-busy="loading || undefined"
    :title="title"
    @click="handleClick"
  >
    <span ref="faceRef" class="burst__face" aria-hidden="true">
      <span class="burst__star burst__star--edge" />
      <span class="burst__star burst__star--paper" />
      <span class="burst__icon"><slot /></span>
    </span>
  </button>
</template>

<style scoped>
.burst {
  --size: 40px;
  --paper: var(--ink-5);
  --edge: var(--ink-3);
  --icon: var(--ivory);

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

.burst--sm { --size: 32px; }
.burst--lg { --size: 48px; }

.burst--ivory { --paper: var(--ivory); --edge: var(--ivory-4); --icon: var(--ink); }
.burst--brass { --paper: var(--brass-fill); --edge: var(--brass-lo); --icon: var(--brass-edge); }

.burst__face,
.burst__star,
.burst__icon {
  position: absolute;
  inset: 0;
  pointer-events: none;
}

.burst__star {
  clip-path: var(--burst-clip);
  rotate: var(--burst-turn);
  transition: rotate var(--dur-bounce) var(--ease-bounce), scale var(--dur-tap) var(--ease-stab);
}

.burst__star--edge { background: var(--edge); translate: 0 2px; }
.burst__star--paper { background: var(--paper); }

.burst--brass .burst__face { filter: drop-shadow(0 0 7px rgb(224 169 58 / 40%)); }

.burst__icon {
  display: grid;
  place-items: center;
  line-height: 0;
}

.burst__icon :deep(svg) {
  display: block;
  inline-size: 46%;
  block-size: 46%;
}

.burst:not(:disabled):active .burst__star { scale: .9; }
.burst:not(:disabled):active .burst__star--edge { translate: 0 0; }

.burst--loading .burst__icon { opacity: .28; }
.burst--loading .burst__star { animation: burst-sign 1.8s steps(12) infinite; }

@keyframes burst-sign { to { rotate: calc(var(--burst-turn) + 360deg); } }

.burst:focus-visible {
  outline: 2px solid var(--ivory);
  outline-offset: 4px;
}

.burst:disabled { cursor: not-allowed; opacity: .35; }

@media (prefers-reduced-motion: reduce) {
  .burst__star { transition: none; }
  .burst--loading .burst__star { animation: none; }
}

@media (forced-colors: active) {
  .burst { color: ButtonText; border: 1px solid ButtonText; }
  .burst__star { background: ButtonFace; }
  .burst__star--edge { display: none; }
}
</style>
