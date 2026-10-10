import {
  musicColorValueToCss,
  tuneMusicColorValue,
} from "@/services/musicColor";
import {
  musicColorLabelTone,
  type MusicColorLabelTone,
  type MusicColorValue,
  type SrgbColor,
} from "@/services/musicColorCore";

export interface KeySurfaceTuning {
  keyBrightness?: number;
  keySaturation?: number;
}

export interface KeySurfaceColor {
  background: string;
  primaryColor: string;
  /** Ink or Ivory, whichever reads better on this surface's fill. */
  labelTone: MusicColorLabelTone;
}

export const FALLBACK_KEY_SURFACE_COLOR = "hsla(0, 0%, 16%, 1)";
const FALLBACK_KEY_SURFACE_SRGB = { r: 0.16, g: 0.16, b: 0.16 };

/** Shared OKLCH-to-CSS projection for live and isolated colored key surfaces. */
export function resolveMusicColorKeySurface(
  value: MusicColorValue | null | undefined,
  tuning: KeySurfaceTuning = {},
): KeySurfaceColor {
  if (!value) {
    return {
      background: FALLBACK_KEY_SURFACE_COLOR,
      primaryColor: FALLBACK_KEY_SURFACE_COLOR,
      labelTone: musicColorLabelTone(FALLBACK_KEY_SURFACE_SRGB),
    };
  }

  const tuned = tuneMusicColorValue(value, {
    lightnessMultiplier: tuning.keyBrightness ?? 1,
    chromaMultiplier: tuning.keySaturation ?? 1,
  });
  const color = musicColorValueToCss(tuned);
  return {
    background: color,
    primaryColor: color,
    labelTone: musicColorLabelTone(tuned.srgb),
  };
}

interface AdjustedHsl {
  css: string;
  srgb: Pick<SrgbColor, "r" | "g" | "b"> | null;
}

function hslToSrgb(
  hue: number,
  saturation: number,
  lightness: number,
): Pick<SrgbColor, "r" | "g" | "b"> {
  const s = saturation / 100;
  const l = lightness / 100;
  const chroma = (1 - Math.abs(2 * l - 1)) * s;
  const channel = (offset: number) => {
    const k = (offset + hue / 30) % 12;
    return l - chroma / 2 * Math.max(-1, Math.min(k - 3, 9 - k, 1));
  };
  return { r: channel(0), g: channel(8), b: channel(4) };
}

function adjustColorHSL(
  color: string,
  brightness = 1,
  saturation = 1,
): AdjustedHsl {
  const match = color.match(
    /hsla?\((\d+),\s*(\d+)%,\s*(\d+)%(?:,\s*([\d.]+))?\)/,
  );
  if (!match) return { css: color, srgb: null };

  const [, hue, sourceSaturation, lightness, alpha = "1"] = match;
  const adjustedSaturation = Math.max(
    0,
    Math.min(100, Number(sourceSaturation) * saturation),
  );
  const adjustedLightness = Math.max(
    0,
    Math.min(100, Number(lightness) * brightness),
  );

  return {
    css: `hsla(${hue}, ${adjustedSaturation}%, ${adjustedLightness}%, ${alpha})`,
    srgb: hslToSrgb(Number(hue), adjustedSaturation, adjustedLightness),
  };
}

function surfaceFromHsl(adjusted: AdjustedHsl): KeySurfaceColor {
  return {
    background: adjusted.css,
    primaryColor: adjusted.css,
    // An unparseable controlled colour has no known lightness; label it as the
    // dark fallback surface it most likely stands in for.
    labelTone: musicColorLabelTone(adjusted.srgb ?? FALLBACK_KEY_SURFACE_SRGB),
  };
}

/** Single natural/accidental monochrome projection for every key surface. */
export function resolveMonochromeKeySurface(
  isAccidental: boolean,
  tuning: KeySurfaceTuning = {},
): KeySurfaceColor {
  return surfaceFromHsl(adjustColorHSL(
    isAccidental ? "hsla(0, 0%, 100%, 1)" : "hsla(0, 0%, 10%, 1)",
    tuning.keyBrightness,
    tuning.keySaturation,
  ));
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
  return surfaceFromHsl(adjustColorHSL(
    primaryColor,
    tuning.keyBrightness,
    tuning.keySaturation,
  ));
}
