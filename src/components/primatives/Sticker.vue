<template>
  <span :class="stickerClasses" :style="stickerStyle">
    <template v-if="variant === 'badge'">
      <span class="sticker__badge-edge" aria-hidden="true"></span>
      <span class="sticker__badge-text">
        <slot />
      </span>
    </template>
    <slot v-else />
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { CSSProperties } from "vue";
import { getRandomGeometry } from "../../utils/randomGeometry";

type StickerVariant = "outline" | "fill" | "badge";
type StickerColor =
  | "ink"
  | "ink-5"
  | "ivory"
  | "brass"
  | "brass-sheen"
  | "brass-glow"
  | "brass-sheen-glow"
  | "tomato"
  | "pine"
  | "plum"
  | "bone"
  | "mustard";

const props = withDefaults(
  defineProps<{
    variant?: StickerVariant;
    color?: StickerColor;
  }>(),
  {
    variant: "outline",
    color: "ivory",
  },
);

const geometryStyle = ref<CSSProperties>(getRandomGeometry("sticker"));

const stickerClasses = computed(() => [
  "sticker",
  `sticker--${props.variant}`,
  props.variant !== "badge" ? `sticker--color-${props.color}` : null,
]);

const stickerStyle = computed<CSSProperties>(() =>
  props.variant === "badge" ? {} : geometryStyle.value,
);
</script>

<style scoped>
.sticker {
  --sticker-accent: var(--ivory);
  --sticker-fill: var(--ivory);
  --sticker-fill-fg: var(--ink);
  --sticker-glow: 0 0 0 transparent;
  --sticker-clip: none;
  --sticker-shadow: var(--shadow-cut);
  --sticker-transform: rotate(-2.2deg);

  display: inline-flex;
  align-items: baseline;
  justify-content: center;
  font-family: var(--font-display);
  font-weight: 700;
  font-size: 14px;
  line-height: 1;
  letter-spacing: .04em;
  text-transform: uppercase;
  color: var(--ivory);
  border-radius: 0;
  clip-path: var(--sticker-clip);
  transform: var(--sticker-transform);
  box-shadow: var(--sticker-shadow), var(--sticker-glow);
  white-space: nowrap;
}

.sticker--outline {
  background: transparent;
  border: 1px solid var(--sticker-accent);
  padding: 5px 10px 4px;
}

.sticker--fill {
  background: var(--sticker-fill);
  border: 0;
  color: var(--sticker-fill-fg);
  padding: 6px 11px 5px;
}

.sticker--color-ink {
  --sticker-accent: var(--ink);
  --sticker-fill: var(--ink);
  --sticker-fill-fg: var(--ivory);
}

.sticker--color-ink-5 {
  --sticker-accent: var(--ink-5);
  --sticker-fill: var(--ink-5);
  --sticker-fill-fg: var(--ivory);
}

.sticker--color-ivory {
  --sticker-accent: var(--ivory);
  --sticker-fill: var(--ivory);
  --sticker-fill-fg: var(--ink);
}

.sticker--color-brass {
  --sticker-accent: var(--brass);
  --sticker-fill: var(--brass);
  --sticker-fill-fg: var(--brass-edge);
}

.sticker--color-brass-sheen {
  --sticker-accent: var(--brass);
  --sticker-fill: var(--brass-fill);
  --sticker-fill-fg: var(--brass-edge);
}

.sticker--color-brass-glow {
  --sticker-accent: var(--brass);
  --sticker-fill: var(--brass);
  --sticker-fill-fg: var(--brass-edge);
  --sticker-glow: var(--shadow-glow-brass);
}

.sticker--color-brass-sheen-glow {
  --sticker-accent: var(--brass);
  --sticker-fill: var(--brass-fill);
  --sticker-fill-fg: var(--brass-edge);
  --sticker-glow: var(--shadow-glow-brass);
}

.sticker--color-tomato {
  --sticker-accent: var(--tomato);
  --sticker-fill: var(--tomato);
  --sticker-fill-fg: var(--ivory);
}

.sticker--color-pine {
  --sticker-accent: var(--pine);
  --sticker-fill: var(--pine);
  --sticker-fill-fg: var(--ivory);
}

.sticker--color-plum {
  --sticker-accent: var(--plum);
  --sticker-fill: var(--plum);
  --sticker-fill-fg: var(--ivory);
}

.sticker--color-bone {
  --sticker-accent: var(--bone);
  --sticker-fill: var(--bone);
  --sticker-fill-fg: var(--ink);
}

.sticker--color-mustard {
  --sticker-accent: var(--mustard);
  --sticker-fill: var(--mustard);
  --sticker-fill-fg: var(--ink);
}

.sticker--outline.sticker--color-brass-sheen,
.sticker--outline.sticker--color-brass-sheen-glow {
  border-color: transparent;
  border-image: var(--brass-fill) 1;
}

.sticker--fill.sticker--color-brass-sheen,
.sticker--fill.sticker--color-brass-sheen-glow {
  background:
    var(--brass-sheen),
    var(--brass-fill);
  background-size: 220% 100%;
  background-repeat: no-repeat;
  animation: brass-sheen 6.5s cubic-bezier(.55,.05,.45,.95) infinite;
}

.sticker--badge {
  align-items: stretch;
  flex-direction: column;
  overflow: hidden;
  position: relative;
  padding: 0;
  border: 0;
  background: var(--ink-2);
  color: transparent;
  box-shadow: none;
  clip-path: none;
  transform: none;
  font-family: var(--font-mono);
  font-size: 12px;
  letter-spacing: .08em;
}

.sticker__badge-edge {
  display: block;
  height: 2px;
  width: 100%;
  background: var(--brass-fill);
  animation: brass-sheen 3.6s linear infinite;
  background-size: 200% 100%;
}

.sticker__badge-text {
  display: block;
  padding: 7px 12px 6px;
  background: var(--brass-fill);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: brass-sheen 3.6s linear infinite;
  background-size: 200% 100%;
}

@media (prefers-reduced-motion: reduce) {
  .sticker--fill.sticker--color-brass-sheen,
  .sticker--fill.sticker--color-brass-sheen-glow,
  .sticker__badge-edge,
  .sticker__badge-text {
    animation: none;
  }
}
</style>
