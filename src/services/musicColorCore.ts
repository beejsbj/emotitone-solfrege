export type MusicColorMode =
  | "fixed"
  | "movable-ordinal"
  | "movable-relative";

export type MusicColorOffScalePolicy = "omit" | "fixed-chromatic";

export interface MusicColorRecipe {
  version: 1;
  chroma: number;
  minOctave: number;
  maxOctave: number;
  lightnessAtOctaveZero: number;
  lightnessPerOctave: number;
}

export const MUSIC_COLOR_RECIPE_V1: Readonly<MusicColorRecipe> = Object.freeze({
  version: 1,
  chroma: 0.18,
  minOctave: 1,
  maxOctave: 9,
  lightnessAtOctaveZero: 0.2,
  lightnessPerOctave: 0.075,
});

export interface MusicColorContext {
  tonicPitchClass: number;
  intervals: readonly number[];
}

export type MusicColorInput =
  | { kind: "pitch"; pitchClass: number; octave: number }
  | { kind: "degree"; degreeIndex: number; tonicOctave: number };

export interface MusicColorIdentity {
  pitchClass: number;
  octave: number;
  relativePitchClass: number;
  degreeIndex: number | null;
}

export interface MusicColorCell {
  start: number;
  center: number;
  end: number;
}

export interface ResolvedMusicColor {
  kind: "color";
  identity: MusicColorIdentity;
  mapping: MusicColorMode | "fixed-chromatic-fallback";
  cell: MusicColorCell;
  lightness: number;
  chroma: number;
}

export interface OffScaleMusicColor {
  kind: "off-scale";
  identity: MusicColorIdentity;
}

export interface InvalidMusicColor {
  kind: "invalid";
  reason: string;
}

export type MusicColorResolution =
  | ResolvedMusicColor
  | OffScaleMusicColor
  | InvalidMusicColor;

export interface OklchColor {
  l: number;
  c: number;
  h: number;
  alpha: number;
}

export interface SrgbColor {
  r: number;
  g: number;
  b: number;
  alpha: number;
}

export interface MusicColorValue {
  oklch: OklchColor;
  srgb: SrgbColor;
}

export interface MusicColorSample {
  primary: MusicColorValue;
  accent: MusicColorValue;
}

function isFiniteInteger(value: number): boolean {
  return Number.isFinite(value) && Number.isInteger(value);
}

function modulo(value: number, base: number): number {
  return ((value % base) + base) % base;
}

function isValidPitchClass(value: number): boolean {
  return isFiniteInteger(value) && value >= 0 && value < 12;
}

function validateContext(context: MusicColorContext): string | null {
  if (!isValidPitchClass(context.tonicPitchClass)) {
    return "Tonic pitch class must be an integer from 0 through 11.";
  }

  if (context.intervals.length === 0) {
    return "A musical context must contain at least one scale interval.";
  }

  if (
    context.intervals.some(
      (interval) => !isFiniteInteger(interval) || interval < 0 || interval >= 12,
    )
  ) {
    return "Scale intervals must be unique integers from 0 through 11.";
  }

  if (new Set(context.intervals).size !== context.intervals.length) {
    return "Scale intervals must be unique integers from 0 through 11.";
  }

  return null;
}

function validateRecipe(recipe: MusicColorRecipe): string | null {
  if (recipe.version !== 1) return "Unsupported Music Color recipe version.";
  if (!Number.isFinite(recipe.chroma) || recipe.chroma < 0) {
    return "Music Color chroma must be a non-negative finite number.";
  }
  if (
    !isFiniteInteger(recipe.minOctave) ||
    !isFiniteInteger(recipe.maxOctave) ||
    recipe.minOctave > recipe.maxOctave
  ) {
    return "Music Color octave bounds must be ordered integers.";
  }
  if (
    !Number.isFinite(recipe.lightnessAtOctaveZero) ||
    !Number.isFinite(recipe.lightnessPerOctave)
  ) {
    return "Music Color lightness values must be finite numbers.";
  }
  return null;
}

function resolveIdentity(
  input: MusicColorInput,
  context: MusicColorContext,
): MusicColorIdentity | InvalidMusicColor {
  if (input.kind === "pitch") {
    if (!isValidPitchClass(input.pitchClass)) {
      return {
        kind: "invalid",
        reason: "Pitch class must be an integer from 0 through 11.",
      };
    }
    if (!isFiniteInteger(input.octave)) {
      return { kind: "invalid", reason: "Pitch octave must be an integer." };
    }

    const relativePitchClass = modulo(
      input.pitchClass - context.tonicPitchClass,
      12,
    );
    const degreeIndex = context.intervals.indexOf(relativePitchClass);
    return {
      pitchClass: input.pitchClass,
      octave: input.octave,
      relativePitchClass,
      degreeIndex: degreeIndex === -1 ? null : degreeIndex,
    };
  }

  if (
    !isFiniteInteger(input.degreeIndex) ||
    input.degreeIndex < 0 ||
    input.degreeIndex >= context.intervals.length
  ) {
    return {
      kind: "invalid",
      reason: "Scale degree must index an interval in the musical context.",
    };
  }
  if (!isFiniteInteger(input.tonicOctave)) {
    return { kind: "invalid", reason: "Tonic octave must be an integer." };
  }

  const interval = context.intervals[input.degreeIndex];
  const absolutePitch = context.tonicPitchClass + interval;
  return {
    pitchClass: modulo(absolutePitch, 12),
    octave: input.tonicOctave + Math.floor(absolutePitch / 12),
    relativePitchClass: interval,
    degreeIndex: input.degreeIndex,
  };
}

function lightnessForOctave(
  octave: number,
  recipe: MusicColorRecipe,
): number {
  const boundedOctave = Math.min(
    recipe.maxOctave,
    Math.max(recipe.minOctave, octave),
  );
  return Math.min(
    1,
    Math.max(
      0,
      recipe.lightnessAtOctaveZero +
        recipe.lightnessPerOctave * boundedOctave,
    ),
  );
}

function cellForIdentity(
  identity: MusicColorIdentity,
  mode: MusicColorMode,
  degreeCount: number,
): MusicColorCell {
  const width = mode === "movable-ordinal" ? 360 / degreeCount : 30;
  const index = mode === "fixed"
    ? identity.pitchClass
    : mode === "movable-relative"
      ? identity.relativePitchClass
      : identity.degreeIndex ?? 0;
  const start = index * width;
  return { start, center: start + width / 2, end: start + width };
}

export function resolveMusicColor(
  input: MusicColorInput,
  context: MusicColorContext,
  mode: MusicColorMode,
  recipe: MusicColorRecipe = MUSIC_COLOR_RECIPE_V1,
  offScalePolicy: MusicColorOffScalePolicy = "omit",
): MusicColorResolution {
  const contextError = validateContext(context);
  if (contextError) return { kind: "invalid", reason: contextError };

  const recipeError = validateRecipe(recipe);
  if (recipeError) return { kind: "invalid", reason: recipeError };

  if (
    mode !== "fixed" &&
    mode !== "movable-ordinal" &&
    mode !== "movable-relative"
  ) {
    return { kind: "invalid", reason: "Unknown Music Color mapping." };
  }

  const identity = resolveIdentity(input, context);
  if ("kind" in identity) return identity;

  const isOffScale = identity.degreeIndex === null;
  if (mode !== "fixed" && isOffScale && offScalePolicy === "omit") {
    return { kind: "off-scale", identity };
  }

  const mapping = mode !== "fixed" && isOffScale
    ? "fixed-chromatic-fallback"
    : mode;
  const cell = mapping === "fixed-chromatic-fallback"
    ? cellForIdentity(identity, "fixed", context.intervals.length)
    : cellForIdentity(identity, mode, context.intervals.length);

  return {
    kind: "color",
    identity,
    mapping,
    cell,
    lightness: lightnessForOctave(identity.octave, recipe),
    chroma: recipe.chroma,
  };
}

function normalizeHue(hue: number): number {
  return modulo(hue, 360);
}

function linearChannelToSrgb(channel: number): number {
  return channel <= 0.0031308
    ? 12.92 * channel
    : 1.055 * channel ** (1 / 2.4) - 0.055;
}

function oklchToLinearSrgb(color: OklchColor): Omit<SrgbColor, "alpha"> {
  const hueRadians = color.h * Math.PI / 180;
  const a = color.c * Math.cos(hueRadians);
  const b = color.c * Math.sin(hueRadians);

  const lRoot = color.l + 0.3963377774 * a + 0.2158037573 * b;
  const mRoot = color.l - 0.1055613458 * a - 0.0638541728 * b;
  const sRoot = color.l - 0.0894841775 * a - 1.291485548 * b;
  const l = lRoot ** 3;
  const m = mRoot ** 3;
  const s = sRoot ** 3;

  return {
    r: 4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    g: -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    b: -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  };
}

function isInSrgbGamut(color: Omit<SrgbColor, "alpha">): boolean {
  return color.r >= 0 && color.r <= 1 &&
    color.g >= 0 && color.g <= 1 &&
    color.b >= 0 && color.b <= 1;
}

export function mapOklchToSrgb(color: OklchColor): SrgbColor {
  const normalized: OklchColor = {
    l: Math.min(1, Math.max(0, color.l)),
    c: Math.max(0, color.c),
    h: normalizeHue(color.h),
    alpha: Math.min(1, Math.max(0, color.alpha)),
  };

  let mapped = normalized;
  let linear = oklchToLinearSrgb(mapped);
  if (!isInSrgbGamut(linear)) {
    let low = 0;
    let high = normalized.c;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const candidateChroma = (low + high) / 2;
      const candidate = { ...normalized, c: candidateChroma };
      const candidateLinear = oklchToLinearSrgb(candidate);
      if (isInSrgbGamut(candidateLinear)) {
        low = candidateChroma;
        mapped = candidate;
        linear = candidateLinear;
      } else {
        high = candidateChroma;
      }
    }
  }

  return {
    r: Math.min(1, Math.max(0, linearChannelToSrgb(linear.r))),
    g: Math.min(1, Math.max(0, linearChannelToSrgb(linear.g))),
    b: Math.min(1, Math.max(0, linearChannelToSrgb(linear.b))),
    alpha: mapped.alpha,
  };
}

function valueForOklch(oklch: OklchColor): MusicColorValue {
  return { oklch, srgb: mapOklchToSrgb(oklch) };
}

export function sampleMusicColor(
  resolved: ResolvedMusicColor,
  phaseCycles: number | null = null,
): MusicColorSample {
  const width = resolved.cell.end - resolved.cell.start;
  const hue = phaseCycles === null
    ? resolved.cell.center
    : resolved.cell.center +
      width / 2 * Math.sin(2 * Math.PI * phaseCycles);
  const primary: OklchColor = {
    l: resolved.lightness,
    c: resolved.chroma,
    h: normalizeHue(hue),
    alpha: 1,
  };
  const accent: OklchColor = {
    ...primary,
    h: normalizeHue(primary.h + 180),
  };

  return {
    primary: valueForOklch(primary),
    accent: valueForOklch(accent),
  };
}
