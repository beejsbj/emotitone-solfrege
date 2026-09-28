export type RandomGeometryCssVars = Record<`--${string}`, string>;

const cutPaperClipTokens = [
  "var(--clip-offcut)",
  "var(--clip-tab)",
  "var(--clip-tile)",
  "var(--clip-paper-rip)",
];

const cutPaperTransformTokens = [
  "rotate(var(--rot-sticker))",
  "rotate(var(--rot-sticker-lg)) translateY(-3px)",
  "rotate(var(--rot-mark))",
  "rotate(var(--rot-tile-1))",
  "rotate(var(--rot-tile-2))",
  "rotate(var(--rot-tile-3))",
  "rotate(var(--rot-tile-4))",
  "rotate(var(--rot-tile-5))",
];

const geometryShadows = [
  "var(--shadow-cut)",
  "var(--shadow-pressed)",
  "var(--shadow-glow)",
  "var(--shadow-glow-brass)",
];

const randomItem = <T>(items: readonly T[]) => items[Math.floor(Math.random() * items.length)];

export const getRandomGeometry = (cssVarPrefix = "geometry"): RandomGeometryCssVars => ({
  [`--${cssVarPrefix}-clip`]: randomItem(cutPaperClipTokens),
  [`--${cssVarPrefix}-shadow`]: randomItem(geometryShadows),
  [`--${cssVarPrefix}-transform`]: randomItem(cutPaperTransformTokens),
});

/*
 * Applied-paper treatments beyond cut paper. Each mounted Sticker draws one
 * at random (see Sticker.vue), so the instrument is a slightly different
 * pressing on every load — the same aliveness as the cut geometry above.
 */
export const stickerPaperTreatments = ["cut", "tape", "stamp"] as const;
export type StickerPaperTreatment = (typeof stickerPaperTreatments)[number];

export const getRandomStickerPaper = (): StickerPaperTreatment => randomItem(stickerPaperTreatments);

/** Torn masking-tape ends: ragged left and right edges, straight long edges. */
const tapeTearClips = [
  "polygon(0 6%, 5px 24%, 1px 44%, 6px 62%, 0 80%, 4px 100%, calc(100% - 3px) 100%, 100% 82%, calc(100% - 6px) 64%, 100% 46%, calc(100% - 2px) 28%, calc(100% - 5px) 0, 4px 0)",
  "polygon(3px 0, 0 18%, 5px 36%, 0 58%, 6px 78%, 1px 100%, calc(100% - 5px) 100%, 100% 76%, calc(100% - 4px) 52%, 100% 30%, calc(100% - 6px) 12%, 100% 0)",
  "polygon(0 0, 6px 16%, 2px 34%, 5px 52%, 0 70%, 5px 88%, 2px 100%, 100% 100%, calc(100% - 5px) 86%, calc(100% - 1px) 66%, calc(100% - 6px) 44%, 100% 22%, calc(100% - 4px) 0)",
];

/** A rubber stamp is hit hard and a little crooked. */
const stampTilts = ["-7deg", "-4deg", "3deg", "5deg"];

/** Tape and ink sit flat on the hardware: no cast shadow. */
const flatShadow = "0 0 0 transparent";

export const getRandomTapeGeometry = (cssVarPrefix = "geometry"): RandomGeometryCssVars => ({
  [`--${cssVarPrefix}-clip`]: randomItem(tapeTearClips),
  [`--${cssVarPrefix}-shadow`]: flatShadow,
  [`--${cssVarPrefix}-transform`]: `rotate(${(Math.random() * 7 - 3.5).toFixed(1)}deg)`,
});

export const getRandomStampGeometry = (cssVarPrefix = "geometry"): RandomGeometryCssVars => ({
  [`--${cssVarPrefix}-clip`]: "none",
  [`--${cssVarPrefix}-shadow`]: flatShadow,
  [`--${cssVarPrefix}-transform`]: `rotate(${randomItem(stampTilts)})`,
  // Offsets one speckle grid so no two stamps wear through in the same place.
  [`--${cssVarPrefix}-wear`]: `${Math.floor(Math.random() * 9)}px ${Math.floor(Math.random() * 7)}px`,
});

export const getRandomPaperGeometry = (
  paper: StickerPaperTreatment,
  cssVarPrefix = "geometry",
): RandomGeometryCssVars => {
  if (paper === "tape") return getRandomTapeGeometry(cssVarPrefix);
  if (paper === "stamp") return getRandomStampGeometry(cssVarPrefix);
  return getRandomGeometry(cssVarPrefix);
};
