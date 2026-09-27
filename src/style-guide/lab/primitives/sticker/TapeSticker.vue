<script setup lang="ts">
import { computed, ref } from "vue";
import Mark from "@/components/primatives/Mark.vue";
import { useUIBeatScale } from "@/composables/useUIBeat";
import type { LabStickerProps } from "@/types/primitivesLab";
import { mountRandom, stickerPaint } from "./stickerPaint";

/*
 * Direction A · Tape. Every label is a strip of torn masking tape: ragged
 * ends, fibre grain, slapped on at an angle. Outline becomes an Ink strip
 * that carries its colour only along the two long tape edges. Badge becomes
 * a thin foil tape, Brass or Ivory, laid dead straight.
 */
const props = withDefaults(defineProps<LabStickerProps>(), {
  variant: "outline",
  color: undefined,
  mark: undefined,
  markPosition: "before",
  uiBeat: false,
});

const root = ref<HTMLElement | null>(null);
useUIBeatScale(root, () => props.uiBeat, { restScale: 0.8, peakScale: 1.1 });

const TEARS = [
  "polygon(0 6%, 5px 24%, 1px 44%, 6px 62%, 0 80%, 4px 100%, calc(100% - 3px) 100%, 100% 82%, calc(100% - 6px) 64%, 100% 46%, calc(100% - 2px) 28%, calc(100% - 5px) 0, 4px 0)",
  "polygon(3px 0, 0 18%, 5px 36%, 0 58%, 6px 78%, 1px 100%, calc(100% - 5px) 100%, 100% 76%, calc(100% - 4px) 52%, 100% 30%, calc(100% - 6px) 12%, 100% 0)",
  "polygon(0 0, 6px 16%, 2px 34%, 5px 52%, 0 70%, 5px 88%, 2px 100%, 100% 100%, calc(100% - 5px) 86%, calc(100% - 1px) 66%, calc(100% - 6px) 44%, 100% 22%, calc(100% - 4px) 0)",
];

const random = mountRandom("tape");
const tear = TEARS[Math.floor(random() * TEARS.length)];
const tilt = `${(random() * 7 - 3.5).toFixed(1)}deg`;

const color = computed(() => props.variant === "badge"
  ? (props.color === "ivory" ? "ivory" : "brass-sheen")
  : props.color ?? "ivory");
const paint = computed(() => stickerPaint(color.value));
const style = computed(() => ({
  "--tape-fill": paint.value.fill,
  "--tape-fg": paint.value.fg,
  "--tape-accent": paint.value.accent,
  "--tape-clip": tear,
  "--tape-tilt": props.variant === "badge" ? "0deg" : tilt,
}));
</script>

<template>
  <span
    ref="root"
    class="tape"
    :class="[`tape--${variant}`, { 'tape--glow': paint.glow, 'tape--sheen': paint.sheen && variant !== 'outline' }]"
    :style="style"
  >
    <Mark v-if="mark && variant !== 'badge' && markPosition === 'before'" class="tape__mark" :name="mark" tone="inherit" size="1em" />
    <span class="tape__text"><slot /></span>
    <Mark v-if="mark && variant !== 'badge' && markPosition === 'after'" class="tape__mark" :name="mark" tone="inherit" size="1em" />
  </span>
</template>

<style scoped>
.tape {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 7px 14px 5px;
  clip-path: var(--tape-clip);
  rotate: var(--tape-tilt);
  font: 700 14px/1 var(--font-display);
  letter-spacing: .04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.tape--fill {
  background:
    repeating-linear-gradient(96deg, transparent 0 3px, color-mix(in srgb, var(--tape-fg) 7%, transparent) 3px 4px),
    var(--tape-fill);
  color: var(--tape-fg);
}

/* Outline: the colour lives only on the two long tape edges. */
.tape--outline {
  background: var(--ink-2);
  color: var(--tape-accent);
  box-shadow: inset 0 2px 0 var(--tape-accent), inset 0 -2px 0 var(--tape-accent);
}

.tape--badge {
  padding: 6px 12px 5px;
  background: var(--tape-fill);
  color: var(--tape-fg);
  clip-path: polygon(0 0, 100% 0, calc(100% - 4px) 50%, 100% 100%, 0 100%, 4px 50%);
  font: 700 12px/1 var(--font-mono);
  letter-spacing: .08em;
}

.tape--sheen {
  background: var(--brass-sheen), var(--tape-fill);
  background-size: 220% 100%, 100% 100%;
  background-repeat: no-repeat;
  animation: brass-sheen 6.5s cubic-bezier(.55,.05,.45,.95) infinite;
}

.tape--glow { filter: drop-shadow(0 0 7px rgb(224 169 58 / 45%)); }

.tape__mark { flex: none; }

@media (prefers-reduced-motion: reduce) {
  .tape--sheen { animation: none; }
}

@media (forced-colors: active) {
  .tape { border: 1px solid CanvasText; color: CanvasText; background: Canvas; }
}
</style>
