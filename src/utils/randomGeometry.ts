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
