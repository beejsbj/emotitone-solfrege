/**
 * Count-In Cluster: the single geometry source for the Brand Logo mark.
 * BrandLogo.vue draws it with design tokens; scripts/generate-brand-icons.mjs
 * exports the same drawing as the static app icons.
 *
 * The five-circle silhouette is the brand's oldest shape (the OG favicon) and
 * keeps its geometry: one big Plum behind, Cobalt left, Mustard right, Tomato
 * and Pine low. The Count-In paste-up ET is pasted onto the Plum, sized so all
 * five circles still read at 16px. The scraps are Ink/Ivory paper, each the
 * opposite of its letter (an Ink E on an Ivory scrap, an Ivory T on an Ink
 * scrap), so the colour belongs to the cluster and the ET reads on any blob.
 * An Ink cut-edge separates paper from paper where they meet.
 */
import type { MarkName } from "@/components/primatives/marks";

export type BrandTone = "cobalt" | "mustard" | "pine" | "plum" | "tomato";

export interface BrandBlob {
  x: number;
  y: number;
  r: number;
  tone: BrandTone;
}

export interface BrandScrap {
  id: "e" | "t";
  paper: string;
  glyphs: string[];
}

/** Artboard that tightly bounds the cluster (the Plum crown rises above y = 0). */
export const BRAND_MARK_VIEWBOX = { x: 0, y: -28, width: 180, height: 184 } as const;

export const BRAND_BLOBS: BrandBlob[] = [
  { x: 90, y: 45, r: 73, tone: "plum" },
  { x: 43, y: 82, r: 43, tone: "cobalt" },
  { x: 137, y: 63, r: 43, tone: "mustard" },
  { x: 59, y: 120, r: 33, tone: "tomato" },
  { x: 116, y: 122, r: 34, tone: "pine" },
];

/** Four count-in beats riding the Plum crown; the first is the Tomato downbeat. */
export const BRAND_BEATS = { y: -6, xs: [66, 79, 92, 105], r: 3.6, downbeatR: 4.5 } as const;

/** Places the Count-In scraps (authored on a 120 × 124 board) onto the Plum. */
export const BRAND_SCRAPS_TRANSFORM = "translate(33 -3) scale(.98)";

/** Cut-edge width in scrap units. */
export const BRAND_CUT_WIDTH = 4.5;

export const BRAND_SCRAPS: BrandScrap[] = [
  {
    id: "e",
    paper: "6,20 66,14 70,102 10,108",
    glyphs: [
      "16,28 29,27 31,97 18,98",
      "29,27 51,25 51,38 29,39",
      "29,55 47,54 47,66 30,67",
      "30,84 51,82 52,95 31,97",
    ],
  },
  {
    id: "t",
    paper: "54,34 116,28 113,118 57,121",
    glyphs: ["61,41 109,37 109,52 61,55", "78,52 93,51 91,112 77,113"],
  },
];

/** Below this rendered mark width the beats are noise and drop out. */
export const BRAND_BEATS_MIN_WIDTH = 72;

export type BrandSprinkleTone = BrandTone | "ivory";

export interface BrandSprinkle {
  name: MarkName;
  /** Centre in mark units. */
  x: number;
  y: number;
  /** Rendered width in mark units. */
  size: number;
  rotate: number;
  tone: BrandSprinkleTone;
}

/**
 * Real Marks scattered around the cluster. Ivory only ever sits on a blob, so
 * every sprinkle reads on both Ink and Bone. They drop out with the beats
 * below BRAND_BEATS_MIN_WIDTH.
 */
export const BRAND_SPRINKLES: BrandSprinkle[] = [
  { name: "diamond", x: 9, y: 62, size: 13, rotate: -16, tone: "tomato" },
  { name: "triangle", x: 26, y: 38, size: 12, rotate: 16, tone: "mustard" },
  { name: "star", x: 158, y: 20, size: 14, rotate: 9, tone: "cobalt" },
  { name: "grace", x: 170, y: 106, size: 17, rotate: 12, tone: "mustard" },
  { name: "eighth", x: 16, y: 128, size: 16, rotate: -8, tone: "plum" },
  { name: "sharp", x: 88, y: 150, size: 13, rotate: -5, tone: "mustard" },
  { name: "wave", x: 128, y: 138, size: 17, rotate: -5, tone: "ivory" },
];

/**
 * Places a Mark's own drawing (its viewBox from marks.ts) at a sprinkle's
 * centre, size and tilt. The viewBox is passed in so this module stays free
 * of runtime imports for the icon script.
 */
export function brandSprinkleTransform(sprinkle: BrandSprinkle, viewBox: readonly [number, number, number, number]): string {
  const [, , width, height] = viewBox;
  const scale = sprinkle.size / width;
  return `translate(${sprinkle.x} ${sprinkle.y}) rotate(${sprinkle.rotate}) scale(${scale}) translate(${-width / 2} ${-height / 2})`;
}
