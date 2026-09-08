<template>
  <MarkSticker
    class="kicker-compat"
    :class="`kicker-compat--${density}`"
    :mark="markForDot"
    :variant="tone === 'open' ? 'outline' : 'fill'"
    :color="stickerColor"
    :show-mark="form !== 'label'"
    :mark-size="markSize"
    aria-label="Section marker"
  >
    <slot v-if="form !== 'dot'" />
  </MarkSticker>
</template>

<script setup lang="ts">
/** Temporary source-compatibility adapter for SpineCard's separately owned rework. */
import { computed } from "vue";
import MarkSticker from "@/components/compounds/MarkSticker.vue";
import type { MarkName } from "./marks";
import type { StickerColor } from "./Sticker.vue";

export type KickerTone =
  | "tomato"
  | "pine"
  | "plum"
  | "mustard"
  | "bone"
  | "brass"
  | "ivory"
  | "open";
export type KickerDot = "square" | "micro" | "large" | "bar-v" | "bar-h";
export type KickerDensity = "dense" | "default" | "airy";
export type KickerForm = "full" | "dot" | "label";

const props = withDefaults(
  defineProps<{
    tone?: KickerTone;
    dot?: KickerDot;
    density?: KickerDensity;
    form?: KickerForm;
    inverse?: boolean;
  }>(),
  {
    tone: "tomato",
    dot: "square",
    density: "default",
    form: "full",
    inverse: false,
  },
);

const markByDot: Record<KickerDot, MarkName> = {
  square: "diamond",
  micro: "staccato",
  large: "disk",
  "bar-v": "blade",
  "bar-h": "bar",
};

const markForDot = computed(() => markByDot[props.dot]);
const stickerColor = computed<StickerColor>(() => {
  if (props.inverse || props.tone === "open") return "ivory";
  return props.tone;
});
const markSize = computed(() => props.dot === "micro" ? 10 : props.dot === "large" ? 18 : 13);
</script>

<style scoped>
.kicker-compat { font-family: var(--font-mono); font-size: 9px; }
.kicker-compat--dense { letter-spacing: .04em; }
.kicker-compat--airy { letter-spacing: .24em; }
</style>
