<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from "vue";
import { useReducedMotion } from "@/composables/useReducedMotion";
import { useUIBeat, type UIBeatSnapshot } from "@/composables/useUIBeat";

/*
 * Latch Ring: the Looper's latch, shown on the key it latches (Burooj,
 * 2026-10-26). A Brass ring in the wrapped key's lip channel sweeps once per
 * bar while latched, read from UIBeat, which the transport drives from the
 * heard bar: the audio clock is the truth, and this unit owns no timer.
 *
 * - sweep: the transport runs; the arc fills from the top, clockwise, and
 *   empties on each downbeat.
 * - rest: latched, but the beat dots are counting the closing bar (the ring
 *   hands off to them), or no beat is presented yet. Only the dim track shows.
 * - still: Reduced Motion. A full, static Brass ring, and the slot is told to
 *   invert its key's Ink/Ivory, so the latch reads without motion.
 */
const props = withDefaults(
  defineProps<{
    /** The latch is on. */
    active?: boolean;
    /** The beat dots count the closing bar: the ring stops and rests. */
    stopped?: boolean;
    /** Show the still reading whatever the media query says (the guide's Reduced Motion specimen). */
    still?: boolean;
  }>(),
  {
    active: false,
    stopped: false,
    still: false,
  },
);

type RingState = "off" | "sweep" | "rest" | "still";

const rootRef = ref<HTMLElement | null>(null);
const ringRef = ref<HTMLElement | null>(null);
const reducedMotion = useReducedMotion();
const { clock, presentationEnabled } = useUIBeat();
/** A beat is presented now (written per frame, read only when it flips). */
const presenting = ref(false);
let unsubscribe: (() => void) | undefined;

const state = computed<RingState>(() => {
  if (!props.active) return "off";
  if (props.still || reducedMotion.value) return "still";
  if (props.stopped || !presenting.value) return "rest";
  return "sweep";
});

/** Under Reduced Motion the latch also inverts the key's Ink/Ivory. */
const invert = computed(() => state.value === "still");

function applyFrame(snapshot: UIBeatSnapshot) {
  const shown = snapshot.presenting && presentationEnabled() && snapshot.barPosition !== null;
  if (presenting.value !== shown) presenting.value = shown;
  if (!shown || !ringRef.value) return;
  const phase = snapshot.barPosition! - Math.floor(snapshot.barPosition!);
  ringRef.value.style.setProperty("--latch-ring-sweep", `${(phase * 360).toFixed(1)}deg`);
}

function sync() {
  unsubscribe?.();
  unsubscribe = undefined;
  if (!props.active || !rootRef.value) {
    presenting.value = false;
    return;
  }
  unsubscribe = clock.subscribe(applyFrame, rootRef.value);
}

watch([() => props.active, rootRef], sync, { flush: "post", immediate: true });
onBeforeUnmount(() => unsubscribe?.());
</script>

<template>
  <span ref="rootRef" class="latch-ring" :data-latch-ring="state">
    <slot :invert="invert" />
    <span v-if="active" ref="ringRef" class="latch-ring__ring" aria-hidden="true" />
  </span>
</template>

<style scoped>
.latch-ring {
  position: relative;
  display: inline-grid;
  place-items: center;
}

/*
 * The ring sits in the wrapped Button's lip channel (4px out, 2px wide), over
 * the lip, so it clears the beat dots above the key. The radius follows the
 * Button's 24% corner plus the channel.
 */
.latch-ring__ring {
  --latch-ring-sweep: 0deg;
  /* Opaque, so the key's own lip does not show through the channel it shares. */
  --latch-ring-track: color-mix(in srgb, var(--brass-lo) 28%, var(--ink));
  position: absolute;
  inset: -4px;
  z-index: 1;
  box-sizing: border-box;
  padding: 2px;
  border-radius: calc(24% + 2px);
  background: var(--latch-ring-track);
  /* Keep only a thin ring: the padding box minus the content box. */
  -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  -webkit-mask-composite: xor;
  mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
  mask-composite: exclude;
  pointer-events: none;
}

.latch-ring[data-latch-ring="sweep"] .latch-ring__ring {
  background: conic-gradient(
    from 0deg,
    var(--brass) 0deg,
    var(--brass-hi) var(--latch-ring-sweep),
    var(--latch-ring-track) var(--latch-ring-sweep),
    var(--latch-ring-track) 360deg
  );
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--brass) 55%, transparent));
}

.latch-ring[data-latch-ring="still"] .latch-ring__ring {
  background: var(--brass);
  filter: drop-shadow(0 0 3px color-mix(in srgb, var(--brass) 55%, transparent));
}

@media (forced-colors: active) {
  .latch-ring__ring {
    forced-color-adjust: none;
    background: GrayText;
    filter: none;
  }

  .latch-ring[data-latch-ring="sweep"] .latch-ring__ring {
    background: conic-gradient(
      Highlight 0deg,
      Highlight var(--latch-ring-sweep),
      GrayText var(--latch-ring-sweep),
      GrayText 360deg
    );
  }

  .latch-ring[data-latch-ring="still"] .latch-ring__ring { background: Highlight; }
}
</style>
