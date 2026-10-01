<script setup lang="ts">
import { computed, ref } from "vue";
import { useBeatFace } from "./useBeatFace";

/**
 * Chad Lip (Burooj's combination of Lip Counter and Step Chads). Guide-only
 * face mounted inside the real BeatIndicator root, whose ring the skin hides.
 * A row of hand-cut LED chads in the Knob Analog Ring collar's grammar (unlit
 * Ink 5, lit Ivory with its own glow, a small fixed per-chad tilt), one per
 * beat, read left to right. `below` puts the row where the keycap's lip sits,
 * standing in for the lip while the transport runs; `above` crowns the key.
 * The downbeat chad is the shared `.brass` material and stays lit, as the
 * ring's does; the current chad lights and kicks on the UIBeat swell.
 */
const props = withDefaults(
  defineProps<{ beats: number; keySize: number; still?: boolean; placement?: "below" | "above" }>(),
  { still: false, placement: "below" },
);

const root = ref<HTMLElement | null>(null);
const { state, active, swell } = useBeatFace(root, { still: () => props.still });

const PEAK_SCALE = 1.22;
const DOWNBEAT_PEAK_SCALE = 1.32;

const geometry = computed(() => {
  const key = props.keySize;
  const chad = Math.max(4, Math.round(key * 0.16));
  const count = Math.max(1, Math.floor(props.beats));
  // Span the key's width at four beats; fewer beats keep the same pitch.
  const pitch = Math.min((key - chad) / 3, chad * 1.9);
  // The lip sits just under the cap; the crown the same distance above it.
  const gap = Math.max(3, Math.round(key * 0.1));
  const y = (key / 2 + gap + chad / 2) * (props.placement === "above" ? -1 : 1);
  return {
    chad,
    chads: Array.from({ length: count }, (_, index) => ({
      index,
      // Knob collar's hand-cut tilt, without the collar's radial angle.
      tilt: ((index * 37) % 11) - 5,
      x: (index - (count - 1) / 2) * pitch,
      y,
    })),
  };
});

const chadStyle = (index: number, tilt: number, x: number, y: number) => {
  const lit = state.value === "running" && active.value === index;
  const peak = index === 0 ? DOWNBEAT_PEAK_SCALE : PEAK_SCALE;
  const scale = lit ? 1 + (peak - 1) * swell.value : 1;
  return { transform: `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px) rotate(${tilt}deg) scale(${scale.toFixed(3)})` };
};
</script>

<template>
  <span
    ref="root"
    class="beatlab-chads"
    :class="`beatlab-chads--${state}`"
    :style="{ '--beatlab-chad': `${geometry.chad}px` }"
    aria-hidden="true"
  >
    <span
      v-for="chad in geometry.chads"
      :key="chad.index"
      class="beatlab-chads__chad"
      :class="{
        'beatlab-chads__chad--downbeat brass': chad.index === 0,
        'beatlab-chads__chad--lit': state === 'running' && active === chad.index,
      }"
      :style="chadStyle(chad.index, chad.tilt, chad.x, chad.y)"
    />
  </span>
</template>

<style scoped>
.beatlab-chads {
  forced-color-adjust: none;
  position: absolute;
  inset-block-start: 50%;
  inset-inline-start: 50%;
  inline-size: 0;
  block-size: 0;
  pointer-events: none;
  transition: opacity var(--dur-ui) var(--ease-brush);
}

.beatlab-chads--hidden { opacity: 0; }

.beatlab-chads__chad {
  position: absolute;
  inset-inline-start: calc(var(--beatlab-chad) / -2);
  inset-block-start: calc(var(--beatlab-chad) / -2);
  inline-size: var(--beatlab-chad);
  block-size: var(--beatlab-chad);
  border-radius: 0.6px;
  background: var(--ink-5);
  transition: background-color var(--dur-tap) var(--ease-stab), box-shadow var(--dur-tap) var(--ease-stab);
}

.beatlab-chads__chad--lit {
  background: var(--ivory);
  box-shadow: 0 0 5px color-mix(in srgb, var(--ivory) 60%, transparent);
  transition: none;
}

/* `.brass` supplies the fill, bevel and sheen; the chad keeps its own size. */
.beatlab-chads__chad--downbeat {
  position: absolute;
  background: var(--brass-fill);
  box-shadow:
    inset 0 0.5px 0 rgb(255 255 255 / 55%),
    inset 0 -0.5px 0 rgb(0 0 0 / 45%),
    0 0 5px color-mix(in srgb, var(--brass) 55%, transparent);
}

.beatlab-chads__chad--downbeat.beatlab-chads__chad--lit {
  box-shadow:
    inset 0 0.5px 0 rgb(255 255 255 / 55%),
    inset 0 -0.5px 0 rgb(0 0 0 / 45%),
    0 0 8px color-mix(in srgb, var(--brass) 85%, transparent);
}

.beatlab-chads:not(.beatlab-chads--running) .beatlab-chads__chad--downbeat::after { animation: none; }

@media (prefers-reduced-motion: reduce) {
  .beatlab-chads,
  .beatlab-chads__chad { transition: none; }
  .beatlab-chads__chad--downbeat::after { animation: none; }
}

@media (forced-colors: active) {
  .beatlab-chads__chad { background: GrayText; box-shadow: none; }
  .beatlab-chads__chad--lit { background: CanvasText; }
  .beatlab-chads__chad--downbeat { background: Highlight; }
}
</style>
