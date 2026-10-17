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

/** Reads `#rrggbb` as HSL (hue in degrees, saturation and lightness in %). */
function hexToHsl(hex: string): [number, number, number] | null {
  const match = hex.match(/^#([0-9a-f]{6})$/i);
  if (!match) return null;
  const value = Number.parseInt(match[1], 16);
  const r = ((value >> 16) & 255) / 255;
  const g = ((value >> 8) & 255) / 255;
  const b = (value & 255) / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;
  if (delta === 0) return [0, 0, lightness * 100];
  const saturation = delta / (1 - Math.abs(2 * lightness - 1));
  const hue =
    max === r
      ? ((g - b) / delta + (g < b ? 6 : 0)) * 60
      : max === g
        ? ((b - r) / delta + 2) * 60
        : ((r - g) / delta + 4) * 60;
  return [hue, saturation * 100, lightness * 100];
}

const round = (value: number) => Math.round(value * 1000) / 1000;

/**
 * Applies the brightness and saturation tuning to an `hsl(a)` or `#rrggbb`
 * colour. Untuned colours come back untouched, so a token hex stays exact.
 */
function adjustColorHSL(
  color: string,
  brightness = 1,
  saturation = 1,
): string {
  const hex = hexToHsl(color);
  if (hex && brightness === 1 && saturation === 1) return color;

  const match = hex
    ? null
    : color.match(/hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/);
  if (!hex && !match) return color;

  const [hue, sourceSaturation, lightness, alpha] = hex
    ? [hex[0], hex[1], hex[2], "1"]
    : [Number(match![1]), Number(match![2]), Number(match![3]), match![4] ?? "1"];
  const adjustedSaturation = Math.max(
    0,
    Math.min(100, Number(sourceSaturation) * saturation),
  );
  const adjustedLightness = Math.max(
    0,
    Math.min(100, Number(lightness) * brightness),
  );

  return `hsla(${round(Number(hue))}, ${round(adjustedSaturation)}%, ${round(adjustedLightness)}%, ${alpha})`;
}

/**
 * Monochrome bases are the design-system Ink and Ivory (BJS-561, Burooj
 * 2026-10-17: keys in the playing zone wear only Ink, Ivory or Music Color).
 * The natural is `--ink-3`, the Ink step nearest the near-black the Monochrome
 * setting always had (#1A1A1A); the accidental is `--ivory`. The hex values
 * mirror `src/emotitone-design-system.css`, and a test pins them to it.
 */
export const MONOCHROME_NATURAL_KEY_SURFACE = "#1C1916";
export const MONOCHROME_ACCIDENTAL_KEY_SURFACE = "#F4EFE6";

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
