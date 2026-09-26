<script setup lang="ts">
import { computed } from "vue";
import {
  BRAND_BEATS,
  BRAND_BLOBS,
  BRAND_CUT_WIDTH,
  BRAND_MARK_VIEWBOX,
  BRAND_SCRAPS,
  BRAND_SCRAPS_TRANSFORM,
} from "./brandMark";

export type BrandLogoLayout = "stacked" | "compact" | "mark";
export type BrandLogoSurface = "ink" | "bone";

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

/* Count-In Cluster (2026-09-26): geometry and rationale live in brandMark.ts. */
const viewBox = [BRAND_MARK_VIEWBOX.x, BRAND_MARK_VIEWBOX.y, BRAND_MARK_VIEWBOX.width, BRAND_MARK_VIEWBOX.height].join(" ");

const resolvedSize = computed(() => {
  if (props.size !== undefined) return typeof props.size === "number" ? `${props.size}px` : props.size;
  if (props.layout === "compact") return "64px";
  if (props.layout === "mark") return "160px";
  return "280px";
});

const logoStyle = computed(() => ({ "--brand-logo-mark-width": resolvedSize.value }));
</script>

<template>
  <div
    class="brand-logo"
    :class="[`brand-logo--${layout}`, `brand-logo--on-${surface}`]"
    :style="logoStyle"
    role="img"
    :aria-label="accessibleLabel"
  >
    <div class="brand-logo__mark" aria-hidden="true">
      <svg class="brand-logo__svg" :viewBox="viewBox">
        <circle
          v-for="blob in BRAND_BLOBS"
          :key="blob.tone"
          class="brand-logo__backdrop"
          :data-tone="blob.tone"
          :cx="blob.x"
          :cy="blob.y"
          :r="blob.r"
          :style="{ fill: `var(--${blob.tone})` }"
        />

        <g class="brand-logo__beats">
          <circle
            v-for="(x, index) in BRAND_BEATS.xs"
            :key="x"
            class="brand-logo__beat"
            :class="{ 'brand-logo__beat--downbeat': index === 0 }"
            :cx="x"
            :cy="BRAND_BEATS.y"
            :r="index === 0 ? BRAND_BEATS.downbeatR : BRAND_BEATS.r"
          />
        </g>

        <g class="brand-logo__scraps" :transform="BRAND_SCRAPS_TRANSFORM">
          <g
            v-for="scrap in BRAND_SCRAPS"
            :key="scrap.id"
            class="brand-logo__scrap"
            :class="`brand-logo__scrap--${scrap.id}`"
            :data-scrap="scrap.id"
          >
            <polygon class="brand-logo__paper" :points="scrap.paper" :stroke-width="BRAND_CUT_WIDTH" />
            <polygon v-for="glyph in scrap.glyphs" :key="glyph" class="brand-logo__glyph" :points="glyph" />
          </g>
        </g>
      </svg>
    </div>

    <strong v-if="layout !== 'mark'" class="brand-logo__wordmark">
      <span>EMOTI</span><span class="brand-logo__tab">TONE</span>
    </strong>
  </div>
</template>

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
  gap: calc(var(--brand-logo-mark-width) * .08);
  justify-items: center;
}

.brand-logo--compact {
  grid-template-columns: auto auto;
  gap: calc(var(--brand-logo-mark-width) * .16);
}

.brand-logo__mark {
  width: var(--brand-logo-mark-width);
  max-width: 100%;
  container-type: inline-size;
}

.brand-logo__svg {
  display: block;
  width: 100%;
  height: auto;
  aspect-ratio: 180 / 184;
  overflow: visible;
}

.brand-logo__beat { fill: var(--ivory); }
.brand-logo__beat--downbeat { fill: var(--tomato); }

/* Paper-on-paper: an Ink cut-edge drawn under each scrap's fill. */
.brand-logo__paper {
  stroke: var(--ink);
  stroke-linejoin: round;
  paint-order: stroke;
}

.brand-logo__scrap--e .brand-logo__paper { fill: var(--mustard); }
.brand-logo__scrap--e .brand-logo__glyph { fill: var(--ink); }
.brand-logo__scrap--t .brand-logo__paper { fill: var(--tomato); }
.brand-logo__scrap--t .brand-logo__glyph { fill: var(--ivory); }

/* Below 72px (BRAND_BEATS_MIN_WIDTH) the beats are noise; the cluster and ET carry the mark alone. */
@container (max-width: 72px) {
  .brand-logo__beats { display: none; }
}

.brand-logo__wordmark {
  display: inline-flex;
  align-items: center;
  color: var(--brand-logo-wordmark);
  font: 700 calc(var(--brand-logo-mark-width) * .2)/1 var(--font-display);
  letter-spacing: var(--tracking-display);
  white-space: nowrap;
}

.brand-logo__tab {
  margin-left: .06em;
  padding: .12em .14em .08em;
  line-height: 1;
  background: var(--tomato);
  color: var(--ivory);
  clip-path: var(--clip-tab);
  transform: rotate(var(--rot-sticker));
}

.brand-logo--compact .brand-logo__wordmark {
  font-size: calc(var(--brand-logo-mark-width) * .42);
}

@media (forced-colors: active) {
  .brand-logo__backdrop { fill: CanvasText !important; }
  .brand-logo__beat,
  .brand-logo__scrap .brand-logo__paper { fill: Canvas; stroke: CanvasText; }
  .brand-logo__scrap .brand-logo__glyph { fill: CanvasText; }
  .brand-logo__wordmark { color: CanvasText; }
  .brand-logo__tab { background: Canvas; color: CanvasText; outline: 1px solid CanvasText; }
}
</style>
