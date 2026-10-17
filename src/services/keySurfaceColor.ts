import {
  musicColorValueToCss,
  tuneMusicColorValue,
} from "@/services/musicColor";
import type { MusicColorValue } from "@/services/musicColorCore";

export interface KeySurfaceTuning {
  keyBrightness?: number;
  keySaturation?: number;
}

export interface KeySurfaceColor {
  background: string;
  primaryColor: string;
}

export const FALLBACK_KEY_SURFACE_COLOR = "hsla(0, 0%, 16%, 1)";

/** Shared OKLCH-to-CSS projection for live and isolated colored key surfaces. */
export function resolveMusicColorKeySurface(
  value: MusicColorValue | null | undefined,
  tuning: KeySurfaceTuning = {},
): KeySurfaceColor {
  const color = value
    ? musicColorValueToCss(tuneMusicColorValue(value, {
        lightnessMultiplier: tuning.keyBrightness ?? 1,
        chromaMultiplier: tuning.keySaturation ?? 1,
      }))
    : FALLBACK_KEY_SURFACE_COLOR;

  return { background: color, primaryColor: color };
}

function adjustColorHSL(
  color: string,
  brightness = 1,
  saturation = 1,
): string {
  const match = color.match(
    /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/,
  );
  if (!match) return color;

  const [, hue, sourceSaturation, lightness, alpha = "1"] = match;
  const adjustedSaturation = Math.max(
    0,
    Math.min(100, Number(sourceSaturation) * saturation),
  );
  const adjustedLightness = Math.max(
    0,
    Math.min(100, Number(lightness) * brightness),
  );

  return `hsla(${hue}, ${adjustedSaturation}%, ${adjustedLightness}%, ${alpha})`;
}

/**
 * Monochrome bases. The natural is graphite rather than near-black so every
 * key face reads at 3:1 against the Ink keyboard surface (BJS-561: monochrome
 * edition families must meet the floor); the accidental stays white.
 */
export const MONOCHROME_NATURAL_KEY_SURFACE = "hsla(0, 0%, 44%, 1)";
export const MONOCHROME_ACCIDENTAL_KEY_SURFACE = "hsla(0, 0%, 100%, 1)";

/** Single natural/accidental monochrome projection for every key surface. */
export function resolveMonochromeKeySurface(
  isAccidental: boolean,
  tuning: KeySurfaceTuning = {},
): KeySurfaceColor {
  const color = adjustColorHSL(
    isAccidental ? MONOCHROME_ACCIDENTAL_KEY_SURFACE : MONOCHROME_NATURAL_KEY_SURFACE,
    tuning.keyBrightness,
    tuning.keySaturation,
  );

  return { background: color, primaryColor: color };
}

/** Opaque HSL projection for controlled Note/Keyboard color sources. */
export function resolveKeySurfaceColor(
  primaryColor: string,
  surfaceStyle: "colored" | "monochrome",
  isAccidental: boolean,
  tuning: KeySurfaceTuning = {},
): KeySurfaceColor {
  if (surfaceStyle === "monochrome") {
    return resolveMonochromeKeySurface(isAccidental, tuning);
  }
  const adjustedColor = adjustColorHSL(
    primaryColor,
    tuning.keyBrightness,
    tuning.keySaturation,
  );

  return {
    background: adjustedColor,
    primaryColor: adjustedColor,
  };
}
