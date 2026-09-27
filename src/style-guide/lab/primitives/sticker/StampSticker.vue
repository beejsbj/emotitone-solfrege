<script setup lang="ts">
import { computed, ref } from "vue";
import Mark from "@/components/primatives/Mark.vue";
import { useUIBeatScale } from "@/composables/useUIBeat";
import type { LabStickerProps } from "@/types/primitivesLab";
import { mountRandom, stickerPaint } from "./stickerPaint";

/*
 * Direction C · Stamp. A rubber stamp hit hard and a little crooked: double
 * rule, worn speckled ink, the paper showing through. Fill is a solid inked
 * block with the same wear. Badge becomes an engraved Brass (or Ivory) plate
 * with a fine double rule and no tilt.
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

const random = mountRandom("stamp");
const tilt = [-7, -4, 3, 5][Math.floor(random() * 4)];
const wear = `${Math.floor(random() * 9)}px ${Math.floor(random() * 7)}px`;

const color = computed(() => props.variant === "badge"
  ? (props.color === "ivory" ? "ivory" : "brass-sheen")
  : props.color ?? "ivory");
const paint = computed(() => stickerPaint(color.value));
const style = computed(() => ({
  "--stamp-fill": paint.value.fill,
  "--stamp-fg": paint.value.fg,
  "--stamp-accent": paint.value.accent,
  "--stamp-tilt": props.variant === "badge" ? "0deg" : `${tilt}deg`,
  "--stamp-wear": wear,
}));
</script>

<template>
  <span ref="root" class="stamp" :class="[`stamp--${variant}`, { 'stamp--glow': paint.glow }]" :style="style">
    <Mark v-if="mark && variant !== 'badge' && markPosition === 'before'" class="stamp__mark" :name="mark" tone="inherit" size="1em" />
    <span class="stamp__text"><slot /></span>
    <Mark v-if="mark && variant !== 'badge' && markPosition === 'after'" class="stamp__mark" :name="mark" tone="inherit" size="1em" />
  </span>
</template>

<style scoped>
.stamp {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 5px 10px 3px;
  rotate: var(--stamp-tilt);
  font: 700 14px/1 var(--font-display);
  letter-spacing: .12em;
  text-transform: uppercase;
  white-space: nowrap;
  /* Worn rubber: two offset speckle grids knock tiny holes through the ink. */
  -webkit-mask:
    radial-gradient(circle, transparent 0 .7px, #000 1.2px) var(--stamp-wear) / 9px 7px,
    radial-gradient(circle, transparent 0 .6px, #000 1px) 3px 2px / 13px 11px;
  -webkit-mask-composite: source-in;
  mask:
    radial-gradient(circle, transparent 0 .7px, #000 1.2px) var(--stamp-wear) / 9px 7px,
    radial-gradient(circle, transparent 0 .6px, #000 1px) 3px 2px / 13px 11px;
  mask-composite: intersect;
}

.stamp--outline {
  border: 4px double var(--stamp-accent);
  color: var(--stamp-accent);
}

.stamp--fill {
  padding: 7px 12px 5px;
  background: var(--stamp-fill);
  color: var(--stamp-fg);
  box-shadow: inset 0 0 0 2px var(--stamp-fill), inset 0 0 0 3px var(--stamp-fg);
}

.stamp--badge {
  padding: 6px 12px 5px;
  background: var(--stamp-fill);
  color: var(--stamp-fg);
  box-shadow: inset 0 0 0 2px var(--stamp-fill), inset 0 0 0 3px var(--stamp-fg);
  font: 700 12px/1 var(--font-mono);
  letter-spacing: .08em;
  text-shadow: 0 1px 0 rgb(255 255 255 / 45%);
  -webkit-mask: none;
  mask: none;
}

.stamp--glow { filter: drop-shadow(0 0 7px rgb(224 169 58 / 45%)); }

.stamp__mark { flex: none; }

@media (forced-colors: active) {
  .stamp { -webkit-mask: none; mask: none; border: 3px double CanvasText; color: CanvasText; background: Canvas; box-shadow: none; }
}
</style>
