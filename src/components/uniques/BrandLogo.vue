<template>
  <div
    class="brand-logo"
    :class="[`brand-logo--${layout}`, `brand-logo--on-${surface}`]"
    :style="logoStyle"
    role="img"
    :aria-label="accessibleLabel"
  >
    <div class="brand-logo__mark" aria-hidden="true">
      <span
        v-for="blob in backdrops"
        :key="blob.tone"
        class="brand-logo__backdrop"
        :style="backdropStyle(blob)"
      />

      <svg class="brand-logo__monogram" viewBox="0 0 140 120">
        <polygon class="brand-logo__cut brand-logo__cut--e" data-cut="e-stem" points="12,16 31,12 33,104 13,108" />
        <polygon class="brand-logo__cut brand-logo__cut--t" data-cut="t-stem" points="83,34 106,32 101,111 77,114" />
        <polygon class="brand-logo__cut brand-logo__cut--e" data-cut="e-top" points="36,13 78,9 77,31 36,34" />
        <polygon class="brand-logo__cut brand-logo__cut--e" data-cut="e-middle" points="36,45 70,42 71,63 36,66" />
        <polygon class="brand-logo__cut brand-logo__cut--e" data-cut="e-bottom" points="36,80 77,77 80,100 36,103" />
        <polygon class="brand-logo__cut brand-logo__cut--t" data-cut="t-cap" points="62,14 130,8 127,33 61,39" />
      </svg>

      <Mark
        v-for="sprinkle in sprinkles"
        :key="sprinkle.name"
        class="brand-logo__sprinkle"
        :name="sprinkle.name"
        tone="inherit"
        size="100"
        :style="sprinkleStyle(sprinkle)"
      />
    </div>

    <strong v-if="layout !== 'mark'" class="brand-logo__wordmark">EMOTITONE</strong>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import Mark from "../primatives/Mark.vue";
import type { MarkName } from "../primatives/Mark.vue";

export type BrandLogoLayout = "stacked" | "compact" | "mark";
export type BrandLogoSurface = "ink" | "bone";

type LogoTone = "cobalt" | "ink" | "ivory" | "mustard" | "pine" | "plum" | "tomato";
type BrandTone = Exclude<LogoTone, "ink" | "ivory">;

interface BackdropBlob {
  x: number;
  y: number;
  size: number;
  tone: BrandTone;
}

interface Sprinkle {
  name: MarkName;
  x: number;
  y: number;
  size: number;
  rotate: number;
  tone: LogoTone;
}

const props = withDefaults(
  defineProps<{
    layout?: BrandLogoLayout;
    surface?: BrandLogoSurface;
    size?: number | string;
    accessibleLabel?: string;
  }>(),
  {
    layout: "stacked",
    surface: "ink",
    size: undefined,
    accessibleLabel: "EmotiTone",
  },
);

// Approved A · Centered Cluster. The 180 × 160 artboard gives the Marks more air
// while preserving the selected five-circle hierarchy and six-cut ET.
const backdrops: BackdropBlob[] = [
  { x: 90, y: 45, size: 146, tone: "plum" },
  { x: 43, y: 82, size: 86, tone: "cobalt" },
  { x: 137, y: 63, size: 86, tone: "mustard" },
  { x: 59, y: 120, size: 66, tone: "tomato" },
  { x: 116, y: 122, size: 68, tone: "pine" },
];

const sprinkles: Sprinkle[] = [
  { name: "wave", x: 74, y: 75, size: 19, rotate: -5, tone: "ivory" },
  { name: "eighth", x: 111, y: 89, size: 18, rotate: 4, tone: "ink" },
  { name: "staccato", x: 92, y: 9, size: 14, rotate: 0, tone: "ivory" },
  { name: "diamond", x: 9, y: 64, size: 13, rotate: -16, tone: "tomato" },
  { name: "grace", x: 171, y: 75, size: 17, rotate: 12, tone: "mustard" },
  { name: "triangle", x: 48, y: 22, size: 12, rotate: 16, tone: "mustard" },
  { name: "star", x: 140, y: 18, size: 13, rotate: 9, tone: "cobalt" },
  { name: "whole", x: 18, y: 126, size: 14, rotate: -8, tone: "ivory" },
  { name: "sharp", x: 95, y: 151, size: 15, rotate: -5, tone: "ink" },
];

const resolvedSize = computed(() => {
  if (props.size !== undefined) return typeof props.size === "number" ? `${props.size}px` : props.size;
  if (props.layout === "compact") return "64px";
  if (props.layout === "mark") return "160px";
  return "280px";
});

const logoStyle = computed(() => ({ "--brand-logo-mark-width": resolvedSize.value }));

function backdropStyle(blob: BackdropBlob) {
  return {
    left: `${(blob.x / 180) * 100}%`,
    top: `${(blob.y / 160) * 100}%`,
    width: `${(blob.size / 180) * 100}%`,
    background: `var(--${blob.tone})`,
  };
}

function sprinkleStyle(sprinkle: Sprinkle) {
  return {
    left: `${(sprinkle.x / 180) * 100}%`,
    top: `${(sprinkle.y / 160) * 100}%`,
    width: `${(sprinkle.size / 180) * 100}%`,
    color: `var(--${sprinkle.tone})`,
    transform: `translate(-50%, -50%) rotate(${sprinkle.rotate}deg)`,
  };
}
</script>

<style scoped>
.brand-logo {
  --brand-logo-wordmark: var(--ivory);
  display: inline-grid;
  width: fit-content;
  max-width: 100%;
  align-items: center;
}

.brand-logo--on-bone { --brand-logo-wordmark: var(--ink); }

.brand-logo--stacked {
  gap: calc(var(--brand-logo-mark-width) * .04);
  justify-items: center;
}

.brand-logo--compact {
  grid-template-columns: auto auto;
  gap: calc(var(--brand-logo-mark-width) * .16);
}

.brand-logo__mark {
  position: relative;
  isolation: isolate;
  width: var(--brand-logo-mark-width);
  max-width: 100%;
  aspect-ratio: 180 / 160;
}

.brand-logo__backdrop,
.brand-logo__sprinkle,
.brand-logo__monogram {
  position: absolute;
}

.brand-logo__backdrop {
  z-index: 0;
  aspect-ratio: 1;
  border-radius: 50%;
  transform: translate(-50%, -50%);
}

.brand-logo__monogram {
  z-index: 1;
  left: calc(20 / 180 * 100%);
  top: calc(20 / 160 * 100%);
  width: calc(140 / 180 * 100%);
  height: calc(120 / 160 * 100%);
  overflow: visible;
}

.brand-logo__cut--e { fill: var(--ink); }
.brand-logo__cut--t { fill: var(--ivory); }

.brand-logo__sprinkle {
  z-index: 2;
  height: auto;
  pointer-events: none;
}

.brand-logo__wordmark {
  color: var(--brand-logo-wordmark);
  font: 700 calc(var(--brand-logo-mark-width) * .22)/.9 var(--font-display);
  letter-spacing: .01em;
  text-transform: uppercase;
}

.brand-logo--compact .brand-logo__wordmark {
  font-size: calc(var(--brand-logo-mark-width) * .43);
  line-height: 1;
}

@media (forced-colors: active) {
  .brand-logo__backdrop { background: CanvasText !important; }
  .brand-logo__cut--e,
  .brand-logo__cut--t,
  .brand-logo__sprinkle { color: Canvas; fill: Canvas; }
  .brand-logo__wordmark { color: CanvasText; }
}
</style>
