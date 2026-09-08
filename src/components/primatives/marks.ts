export const MARK_NAMES = [
  "triangle", "disk", "zigzag", "blade", "wave", "bar", "diamond", "half-circle", "star",
  "eighth", "beam", "sharp", "flat", "accent", "trill", "slur", "fermata", "staccato", "grace", "clef",
  "quarter", "half", "whole", "natural", "quarter-rest", "repeat", "crescendo", "bass-clef",
] as const;

export type MarkName = (typeof MARK_NAMES)[number];

export interface MarkPath {
  d: string;
  fillRule?: "evenodd";
}

export interface MarkDefinition {
  viewBox: readonly [number, number, number, number];
  paths: readonly MarkPath[];
  /** Compensates for detail and negative space when a Mark is rendered as a tiny particle. */
  particleScale: number;
}

export const MARK_DEFINITIONS: Record<MarkName, MarkDefinition> = {
  triangle: {
    viewBox: [0, 0, 80, 80], particleScale: 1,
    paths: [{ d: "M38 6 L74 70 L48 72 L7 69 L22 38 Z" }],
  },
  disk: {
    viewBox: [0, 0, 80, 80], particleScale: 0.94,
    paths: [{ d: "M72 41 L69 53 L62 62 L51 69 L41 72 L29 71 L18 64 L11 54 L7 42 L9 30 L16 19 L26 11 L37 8 L48 9 L58 13 L66 21 L71 31 Z" }],
  },
  zigzag: {
    viewBox: [0, 0, 120, 80], particleScale: 1.2,
    paths: [{ d: "M3 52 L23 17 L42 49 L61 15 L81 48 L101 14 L118 49 L111 59 L100 37 L81 70 L61 38 L42 71 L23 40 L11 64 Z" }],
  },
  blade: {
    viewBox: [0, 0, 80, 80], particleScale: 1,
    paths: [{ d: "M11 8 L39 10 L68 42 L65 71 L40 69 L10 39 Z" }],
  },
  wave: {
    viewBox: [0, 0, 80, 80], particleScale: 1.16,
    paths: [{ d: "M4 44 C14 15 23 16 34 39 C42 57 47 56 54 36 C60 20 68 19 76 30 L72 43 C66 32 64 34 59 49 C50 72 37 66 27 44 C20 29 16 32 10 54 Z" }],
  },
  bar: {
    viewBox: [0, 0, 96, 80], particleScale: 1.12,
    paths: [{ d: "M5 30 L92 33 L89 49 L4 46 Z" }],
  },
  diamond: {
    viewBox: [0, 0, 80, 80], particleScale: 1,
    paths: [{ d: "M38 5 L65 37 L42 74 L15 42 Z" }],
  },
  "half-circle": {
    viewBox: [0, 0, 80, 80], particleScale: 1,
    paths: [{ d: "M8 62 L9 39 C10 21 22 11 40 12 C59 10 71 24 72 42 L70 63 L39 61 Z" }],
  },
  star: {
    viewBox: [0, 0, 80, 80], particleScale: 1.08,
    paths: [{ d: "M37 5 L49 26 L73 23 L57 43 L65 68 L41 55 L17 70 L22 44 L6 28 L29 27 Z" }],
  },
  eighth: {
    viewBox: [0, 0, 60, 60], particleScale: 1.32,
    paths: [
      { d: "M31 7 L37 6 L36 44 L30 45 Z" },
      { d: "M8 44 C11 37 23 34 31 37 C39 41 35 49 28 52 C17 58 5 54 8 44 Z" },
      { d: "M36 6 C37 14 53 14 51 26 C50 32 46 36 42 38 C48 27 43 23 35 21 Z" },
    ],
  },
  beam: {
    viewBox: [0, 0, 60, 60], particleScale: 1.35,
    paths: [
      { d: "M19 10 L25 9 L24 46 L18 47 Z" }, { d: "M45 5 L51 4 L50 40 L44 42 Z" },
      { d: "M19 10 L51 4 L51 13 L19 19 Z" }, { d: "M20 23 L49 17 L49 23 L20 29 Z" },
      { d: "M5 44 C9 38 19 37 24 41 C29 46 22 52 15 54 C6 57 1 52 5 44 Z" },
      { d: "M31 39 C35 33 45 32 50 36 C55 41 48 47 41 49 C32 52 27 47 31 39 Z" },
    ],
  },
  sharp: {
    viewBox: [0, 0, 60, 60], particleScale: 1.36,
    paths: [
      { d: "M18 8 L24 6 L23 53 L17 54 Z" },
      { d: "M37 5 L43 4 L42 50 L36 52 Z" },
      { d: "M8 22 L52 14 L51 23 L8 31 Z" }, { d: "M8 38 L51 30 L51 39 L7 47 Z" },
    ],
  },
  flat: {
    viewBox: [0, 0, 50, 60], particleScale: 1.4,
    paths: [
      { d: "M12 5 L18 4 L18 29 C28 19 40 23 39 34 C38 43 26 51 13 56 Z M19 35 L19 45 C27 41 33 36 31 32 C29 28 23 31 19 35 Z", fillRule: "evenodd" },
    ],
  },
  accent: {
    viewBox: [0, 0, 60, 60], particleScale: 1.22,
    paths: [{ d: "M7 13 L54 27 L54 33 L8 48 L7 40 L40 30 L7 21 Z" }],
  },
  trill: {
    viewBox: [0, 0, 60, 60], particleScale: 1.38,
    paths: [
      { d: "M5 33 L15 19 L25 29 L35 18 L45 28 L53 18 L56 27 L46 41 L35 31 L25 43 L15 32 L8 43 Z" },
    ],
  },
  slur: {
    viewBox: [0, 0, 60, 60], particleScale: 1.42,
    paths: [{ d: "M5 43 C9 12 45 9 55 41 L51 43 C39 23 21 22 9 45 Z" }],
  },
  fermata: {
    viewBox: [0, 0, 60, 60], particleScale: 1.32,
    paths: [
      { d: "M5 38 C5 5 53 4 55 37 L47 38 C44 15 16 15 13 39 Z" },
      { d: "M24 37 L31 34 L37 39 L35 47 L27 49 L23 43 Z" },
    ],
  },
  staccato: {
    viewBox: [0, 0, 60, 60], particleScale: 1.46,
    paths: [
      { d: "M8 33 L14 30 L20 33 L21 40 L16 44 L9 42 Z" },
      { d: "M25 27 L31 24 L37 27 L38 34 L33 38 L26 36 Z" },
      { d: "M42 21 L48 18 L54 21 L55 28 L50 32 L43 30 Z" },
    ],
  },
  grace: {
    viewBox: [0, 0, 60, 60], particleScale: 1.38,
    paths: [
      { d: "M31 9 L37 7 L36 43 L30 44 Z" },
      { d: "M12 41 C16 35 27 33 33 37 C39 42 31 49 24 51 C14 54 8 48 12 41 Z" },
      { d: "M36 7 C39 14 49 12 50 22 L46 29 C45 22 40 23 35 22 Z" },
      { d: "M15 33 L45 17 L48 22 L18 39 Z" },
    ],
  },
  clef: {
    viewBox: [0, 0, 60, 60], particleScale: 1.4,
    paths: [
      { d: "M32 3 C46 15 34 25 24 32 C12 40 20 48 31 46 C43 44 40 32 31 33 C25 33 23 38 28 41 C17 41 19 28 30 27 C48 24 52 47 33 51 C15 55 5 40 17 29 C27 20 36 16 32 9 C25 15 29 26 31 35 L36 50 C38 59 24 61 21 53 L26 50 C25 56 32 57 32 51 L27 32 C24 20 21 10 32 3 Z" },
    ],
  },
  quarter: {
    viewBox: [0, 0, 60, 60], particleScale: 1.3,
    paths: [
      { d: "M36 6 L42 5 L41 43 L35 44 Z" },
      { d: "M12 44 C16 37 29 33 37 37 C46 41 40 50 31 53 C20 58 8 54 12 44 Z" },
    ],
  },
  half: {
    viewBox: [0, 0, 60, 60], particleScale: 1.34,
    paths: [
      { d: "M36 6 L42 5 L41 43 L35 44 Z" },
      { d: "M12 44 C16 37 29 33 37 37 C46 41 40 50 31 53 C20 58 8 54 12 44 Z M19 46 C17 51 31 48 35 44 C40 38 23 41 19 46 Z", fillRule: "evenodd" },
    ],
  },
  whole: {
    viewBox: [0, 0, 60, 60], particleScale: 1.12,
    paths: [{ d: "M6 29 C7 17 22 15 35 17 C49 18 56 27 53 37 C50 46 32 46 20 43 C10 41 5 37 6 29 Z M24 24 C17 25 23 37 33 38 C42 38 37 25 28 24 Z", fillRule: "evenodd" }],
  },
  natural: {
    viewBox: [0, 0, 60, 60], particleScale: 1.34,
    paths: [{ d: "M15 5 L22 4 L22 20 L43 14 L44 55 L37 56 L37 39 L16 46 Z M22 28 L22 36 L37 32 L37 24 Z", fillRule: "evenodd" }],
  },
  "quarter-rest": {
    viewBox: [0, 0, 60, 60], particleScale: 1.3,
    paths: [{ d: "M25 4 L42 17 L32 29 L44 40 C30 34 20 39 31 53 L24 57 C10 43 18 32 29 34 L18 24 L29 13 Z" }],
  },
  repeat: {
    viewBox: [0, 0, 60, 60], particleScale: 1.24,
    paths: [
      { d: "M37 7 L47 6 L46 54 L36 53 Z" },
      { d: "M26 8 L31 7 L30 53 L25 54 Z" },
      { d: "M11 17 L17 15 L21 20 L19 26 L12 27 L9 22 Z" },
      { d: "M11 35 L17 33 L21 38 L19 44 L12 45 L9 40 Z" },
    ],
  },
  crescendo: {
    viewBox: [0, 0, 80, 60], particleScale: 1.25,
    paths: [{ d: "M72 9 L74 16 L21 30 L74 44 L72 51 L6 33 L6 27 Z" }],
  },
  "bass-clef": {
    viewBox: [0, 0, 60, 60], particleScale: 1.3,
    paths: [
      { d: "M9 22 C2 9 20 4 31 11 C48 23 30 45 10 52 C25 40 36 23 26 17 C22 14 18 15 17 17 C23 22 19 29 13 28 Z" },
      { d: "M44 13 L50 11 L54 16 L52 22 L45 23 L42 18 Z" },
      { d: "M44 30 L50 28 L54 33 L52 39 L45 40 L42 35 Z" },
    ],
  },
};

export function markViewBox(name: MarkName): string {
  return MARK_DEFINITIONS[name].viewBox.join(" ");
}

const canvasPathCache = new Map<string, Path2D>();

export function drawMarkOnCanvas(ctx: CanvasRenderingContext2D, name: MarkName, radius: number): void {
  if (typeof Path2D === "undefined") return;

  const definition = MARK_DEFINITIONS[name];
  const [minX, minY, width, height] = definition.viewBox;
  const renderedDiameter = radius * 2 * definition.particleScale;
  const scale = renderedDiameter / Math.max(width, height);

  ctx.save();
  ctx.scale(scale, scale);
  ctx.translate(-(minX + width / 2), -(minY + height / 2));

  definition.paths.forEach((path) => {
    let canvasPath = canvasPathCache.get(path.d);
    if (!canvasPath) {
      canvasPath = new Path2D(path.d);
      canvasPathCache.set(path.d, canvasPath);
    }
    path.fillRule ? ctx.fill(canvasPath, path.fillRule) : ctx.fill(canvasPath);
  });

  ctx.restore();
}
