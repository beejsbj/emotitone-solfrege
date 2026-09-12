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

/** Shared opaque Note/Keyboard surface projection for live and controlled color sources. */
export function resolveKeySurfaceColor(
  primaryColor: string,
  surfaceStyle: "colored" | "monochrome",
  isAccidental: boolean,
  tuning: KeySurfaceTuning = {},
): KeySurfaceColor {
  const sourceColor = surfaceStyle === "monochrome"
    ? isAccidental
      ? "hsla(0, 0%, 100%, 1)"
      : "hsla(0, 0%, 10%, 1)"
    : primaryColor;
  const adjustedColor = adjustColorHSL(
    sourceColor,
    tuning.keyBrightness,
    tuning.keySaturation,
  );

  return {
    background: adjustedColor,
    primaryColor: adjustedColor,
  };
}
