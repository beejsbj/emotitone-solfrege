<template>
  <span ref="stickerRef" :class="stickerClasses" :style="stickerStyle">
    <template v-if="resolvedVariant === 'badge'">
      <span class="sticker__badge-edge" aria-hidden="true"></span>
      <span class="sticker__badge-text">
        <slot />
      </span>
    </template>
    <template v-else-if="props.mark">
      <Mark
        v-if="resolvedMarkPosition === 'before'"
        class="sticker__mark"
        :name="props.mark"
        tone="inherit"
        :size="resolvedMarkSize"
      />
      <span class="sticker__marked-text"><slot /></span>
      <Mark
        v-if="resolvedMarkPosition === 'after'"
        class="sticker__mark"
        :name="props.mark"
        tone="inherit"
        :size="resolvedMarkSize"
      />
    </template>
    <slot v-else />
  </span>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import type { CSSProperties } from "vue";
import { useUIBeatScale } from "@/composables/useUIBeat";
import Mark from "./Mark.vue";
import type { MarkName } from "./marks";
import {
  getRandomPaperGeometry,
  getRandomStickerPaper,
  stickerPaperTreatments,
} from "../../utils/randomGeometry";
import type { StickerPaperTreatment } from "../../utils/randomGeometry";

export type StickerPaperVariant = "outline" | "fill";
/** How the paper is applied to the hardware: cut paper, torn tape, or a rubber stamp. */
export type StickerPaper = StickerPaperTreatment;
export type StickerVariant = StickerPaperVariant | "badge";
export type StickerMarkPosition = "before" | "after";
export type StickerPaperColor =
  | "ink"
  | "ink-5"
  | "ivory"
  | "brass"
  | "brass-sheen"
  | "brass-glow"
  | "brass-sheen-glow"
  | "tomato"
  | "cobalt"
  | "pine"
  | "plum"
  | "bone"
  | "mustard";
export type StickerColor = StickerPaperColor;
export type BadgeColor = "brass-sheen" | "ivory";
export type StickerProps =
  | {
      variant?: StickerPaperVariant;
      color?: StickerPaperColor;
      /** Pins the paper treatment. Unpinned Stickers draw one at random per mount. */
      paper?: StickerPaper;
      mark?: MarkName;
      markPosition?: StickerMarkPosition;
      markSize?: number | string;
      uiBeat?: boolean;
    }
  | {
      variant: "badge";
      color?: BadgeColor;
      paper?: never;
      mark?: never;
      markPosition?: never;
      markSize?: never;
      uiBeat?: boolean;
    };

const props = defineProps<StickerProps>();

const stickerRef = ref<HTMLElement>();
// One draw per mount, made lazily so pinned Stickers never consume randomness.
let mountedPaper: StickerPaper | undefined;
const geometryByPaper = new Map<StickerPaper, CSSProperties>();
const geometryFor = (paper: StickerPaper): CSSProperties => {
  let geometry = geometryByPaper.get(paper);
  if (!geometry) {
    geometry = getRandomPaperGeometry(paper, "sticker");
    geometryByPaper.set(paper, geometry);
  }
  return geometry;
};

const resolvedVariant = computed<StickerVariant>(() => props.variant ?? "outline");
const resolvedColor = computed<StickerPaperColor>(() => {
  if (props.variant === "badge") {
    return props.color === "ivory" ? "ivory" : "brass-sheen";
  }
  return props.color ?? "ivory";
});
/** Badge is brass hardware, not applied paper: it never takes a paper treatment. */
const resolvedPaper = computed<StickerPaper | undefined>(() => {
  if (props.variant === "badge") return undefined;
  if (props.paper && stickerPaperTreatments.includes(props.paper)) return props.paper;
  mountedPaper ??= getRandomStickerPaper();
  return mountedPaper;
});
const resolvedMarkPosition = computed<StickerMarkPosition>(() =>
  props.variant === "badge" ? "before" : props.markPosition ?? "before",
);
const resolvedMarkSize = computed<number | string>(() =>
  props.variant === "badge" ? "1em" : props.markSize ?? "1em",
);

useUIBeatScale(stickerRef, () => props.uiBeat, {
  restScale: 0.8,
  peakScale: 1.1,
});

const stickerClasses = computed(() => [
  "sticker",
  `sticker--${resolvedVariant.value}`,
  `sticker--color-${resolvedColor.value}`,
  resolvedPaper.value && `sticker--paper-${resolvedPaper.value}`,
  { "sticker--marked": Boolean(props.mark) && resolvedVariant.value !== "badge" },
]);

const stickerStyle = computed<CSSProperties>(() =>
  resolvedPaper.value ? geometryFor(resolvedPaper.value) : {},
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

.sticker--marked {
  align-items: center;
  gap: 7px;
}

.sticker__mark {
  flex: none;
}

.sticker__marked-text {
  display: block;
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

.sticker--color-cobalt {
  --sticker-accent: var(--cobalt);
  --sticker-fill: var(--cobalt);
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
  animation: brass-sheen var(--dur-sheen) var(--ease-sheen) infinite;
}

/*
 * Paper treatments. Cut paper is the base above; Tape and Stamp re-apply the
 * same color vocabulary as torn masking tape or a worn rubber stamp. Geometry
 * (tear, tilt, wear) arrives per mount through inline custom properties.
 */

/* Tape: a strip of torn masking tape with fibre grain and ragged ends. */
.sticker--paper-tape.sticker--outline {
  /* An Ink strip that carries its color only along the two long edges. */
  background: var(--ink-2);
  border: 0;
  border-block: 2px solid var(--sticker-accent);
  color: var(--sticker-accent);
  padding: 5px 14px 3px;
}

.sticker--paper-tape.sticker--fill {
  background:
    repeating-linear-gradient(96deg, transparent 0 3px, color-mix(in srgb, var(--sticker-fill-fg) 7%, transparent) 3px 4px),
    var(--sticker-fill);
  padding: 7px 14px 5px;
}

/* Stamp: a crooked rubber-stamp impression with worn, speckled ink. */
.sticker--paper-stamp {
  letter-spacing: .12em;
  --sticker-wear-mask:
    radial-gradient(circle, transparent 0 .7px, #000 1.2px) var(--sticker-wear, 0 0) / 9px 7px,
    radial-gradient(circle, transparent 0 .6px, #000 1px) 3px 2px / 13px 11px;
  -webkit-mask: var(--sticker-wear-mask);
  -webkit-mask-composite: source-in;
  mask: var(--sticker-wear-mask);
  mask-composite: intersect;
}

.sticker--paper-stamp.sticker--outline {
  /* A stamp is one ink: the double rule and the lettering share the color. */
  border: 4px double var(--sticker-accent);
  border-image: none;
  color: var(--sticker-accent);
  padding: 5px 10px 3px;
}

.sticker--paper-stamp.sticker--fill {
  /* A solid inked block with an inner rule. */
  outline: 1px solid var(--sticker-fill-fg);
  outline-offset: -3px;
  padding: 7px 12px 5px;
}

/* Brass-sheen fills keep the sheen sweeping over one full-size metal layer. */
.sticker--paper-tape.sticker--fill.sticker--color-brass-sheen,
.sticker--paper-tape.sticker--fill.sticker--color-brass-sheen-glow {
  background:
    var(--brass-sheen),
    repeating-linear-gradient(96deg, transparent 0 3px, color-mix(in srgb, var(--sticker-fill-fg) 7%, transparent) 3px 4px),
    var(--brass-fill);
  background-size: 220% 100%, auto, 100% 100%;
  background-repeat: no-repeat, repeat, no-repeat;
}

.sticker--paper-stamp.sticker--fill.sticker--color-brass-sheen,
.sticker--paper-stamp.sticker--fill.sticker--color-brass-sheen-glow {
  background:
    var(--brass-sheen),
    var(--brass-fill);
  background-size: 220% 100%, 100% 100%;
  background-repeat: no-repeat;
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
  background: var(--sticker-fill);
  animation: brass-sheen var(--dur-sheen) var(--ease-sheen) infinite;
  background-size: 200% 100%;
}

.sticker__badge-text {
  display: block;
  padding: 7px 12px 6px;
  background: var(--sticker-fill);
  background-clip: text;
  -webkit-background-clip: text;
  color: transparent;
  animation: brass-sheen var(--dur-sheen) var(--ease-sheen) infinite;
  background-size: 200% 100%;
}

/* A committed Joystick latch turns the whole Badge into Ivory paper. */
.sticker--badge.sticker--color-ivory {
  background: var(--sticker-fill);
}

.sticker--badge.sticker--color-ivory .sticker__badge-edge,
.sticker--badge.sticker--color-ivory .sticker__badge-text {
  background: var(--sticker-fill-fg);
  animation: none;
}

.sticker--badge.sticker--color-ivory .sticker__badge-text {
  background-clip: text;
  -webkit-background-clip: text;
}

@media (prefers-reduced-motion: reduce) {
  .sticker--fill.sticker--color-brass-sheen,
  .sticker--fill.sticker--color-brass-sheen-glow,
  .sticker__badge-edge,
  .sticker__badge-text {
    animation: none;
  }
}

/* Forced Colors: tape and stamp become plain bordered text; no tear or wear. */
@media (forced-colors: active) {
  .sticker--paper-tape,
  .sticker--paper-stamp {
    border: 1px solid CanvasText;
    border-image: none;
    outline: none;
    clip-path: none;
    -webkit-mask: none;
    mask: none;
    color: CanvasText;
    background: Canvas;
  }
}
</style>
