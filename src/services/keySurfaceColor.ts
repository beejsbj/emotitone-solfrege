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
  /** Ink or Ivory for the centred label, which sits on the flat fill. */
  labelTone: MusicColorLabelTone;
  /** Ink or Ivory for the corner labels, which sit under the surface sheen. */
  cornerLabelTones: { top: MusicColorLabelTone; bottom: MusicColorLabelTone };
}

export const FALLBACK_KEY_SURFACE_COLOR = "hsla(0, 0%, 16%, 1)";
const FALLBACK_KEY_SURFACE_SRGB = { r: 0.16, g: 0.16, b: 0.16 };

type Rgb = Pick<SrgbColor, "r" | "g" | "b">;
type SurfaceSheen = "colored" | "monochrome";

/**
 * Peak strengths of --paper-surface-sheen and --paper-surface-sheen-monochrome
 * (mix-blend-mode: overlay): a white highlight falling from the top edge and a
 * black shade rising to the bottom edge. The corner labels sit inside those
 * bands, so their tone is chosen against the fill with the peak overlay as well
 * as the flat fill. The contrast-floor test reads these from the token source.
 */
export const NOTE_SURFACE_SHEEN: Readonly<Record<SurfaceSheen, { highlight: number; shade: number }>> = {
  colored: { highlight: 0.18, shade: 0.22 },
  monochrome: { highlight: 0.12, shade: 0.1 },
};

/** CSS overlay blend of a solid white (1) or black (0) layer at an alpha. */
function overlay(backdrop: Rgb, source: 0 | 1, alpha: number): Rgb {
  const channel = (b: number) => {
    const blended = b <= 0.5 ? 2 * b * source : 1 - 2 * (1 - b) * (1 - source);
    return (1 - alpha) * b + alpha * blended;
  };
  return { r: channel(backdrop.r), g: channel(backdrop.g), b: channel(backdrop.b) };
}

/** The backgrounds each label slot sits on: centre on the flat fill, corners under the sheen. */
export function noteLabelBackgrounds(fill: Rgb, sheen: SurfaceSheen) {
  const { highlight, shade } = NOTE_SURFACE_SHEEN[sheen];
  return {
    center: [fill] as [Rgb],
    top: [fill, overlay(fill, 1, highlight)] as [Rgb, Rgb],
    bottom: [fill, overlay(fill, 0, shade)] as [Rgb, Rgb],
  };
}

function labelTones(fill: Rgb, sheen: SurfaceSheen) {
  const backgrounds = noteLabelBackgrounds(fill, sheen);
  return {
    labelTone: musicColorLabelTone(...backgrounds.center),
    cornerLabelTones: {
      top: musicColorLabelTone(...backgrounds.top),
      bottom: musicColorLabelTone(...backgrounds.bottom),
    },
  };
}

/** Shared OKLCH-to-CSS projection for live and isolated colored key surfaces. */
export function resolveMusicColorKeySurface(
  value: MusicColorValue | null | undefined,
  tuning: KeySurfaceTuning = {},
): KeySurfaceColor {
  if (!value) {
    return {
      background: FALLBACK_KEY_SURFACE_COLOR,
      primaryColor: FALLBACK_KEY_SURFACE_COLOR,
      ...labelTones(FALLBACK_KEY_SURFACE_SRGB, "colored"),
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
    ...labelTones(tuned.srgb, "colored"),
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

function surfaceFromHsl(adjusted: AdjustedHsl, sheen: SurfaceSheen): KeySurfaceColor {
  return {
    background: adjusted.css,
    primaryColor: adjusted.css,
    // An unparseable controlled colour has no known lightness; label it as the
    // dark fallback surface it most likely stands in for.
    ...labelTones(adjusted.srgb ?? FALLBACK_KEY_SURFACE_SRGB, sheen),
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
  ), "monochrome");
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
  ), "colored");
}
