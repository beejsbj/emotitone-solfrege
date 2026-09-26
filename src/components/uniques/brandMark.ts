/**
 * Count-In Cluster: the single geometry source for the Brand Logo mark.
 * BrandLogo.vue draws it with design tokens; scripts/generate-brand-icons.mjs
 * exports the same drawing as the static app icons.
 *
 * The five-circle silhouette is the brand's oldest shape (the OG favicon) and
 * keeps its geometry: one big Plum behind, Cobalt left, Mustard right, Tomato
 * and Pine low. The Count-In paste-up ET is pasted onto the Plum, small enough
 * that all five circles still read at 16px. Each scrap sits against a colour
 * other than its own paper (Mustard E over Plum and Cobalt, Tomato T over Plum
 * and Mustard), and an Ink cut-edge separates paper from paper where they meet.
 */

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
export const BRAND_SCRAPS_TRANSFORM = "translate(40 2) scale(.86)";

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
