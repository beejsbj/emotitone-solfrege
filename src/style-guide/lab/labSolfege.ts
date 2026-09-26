import { getScaleForMode } from "@/data";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { musicColorValueToCss, resolveMusicColorSampleByScaleIndex } from "@/services/musicColor";
import type { SrgbColor } from "@/services/musicColorCore";
import type { DynamicColorConfig } from "@/types";

/**
 * The Octave direction borrows the solfège identity. Every colour comes from
 * the real Music Color resolver (fixed recipe, C major, octave 4) — no palette.
 */

const fixedColorConfig: DynamicColorConfig = {
  ...DEFAULT_CONFIG.dynamicColors,
  musicColorMode: "fixed",
};

function luminance(color: SrgbColor) {
  const [r, g, b] = [color.r, color.g, color.b].map((value) => (
    value <= .04045 ? value / 12.92 : ((value + .055) / 1.055) ** 2.4
  ));
  return .2126 * r + .7152 * g + .0722 * b;
}

// Ink #0A0908 and Ivory #F4EFE6 luminances, matching the design tokens.
const INK_L = luminance({ r: 10 / 255, g: 9 / 255, b: 8 / 255, alpha: 1 });
const IVORY_L = luminance({ r: 244 / 255, g: 239 / 255, b: 230 / 255, alpha: 1 });

const contrast = (a: number, b: number) => (Math.max(a, b) + .05) / (Math.min(a, b) + .05);

export interface LabSolfegeStep {
  syllable: string;
  color: string;
  /** Ink or Ivory, whichever reads better on the resolved colour. */
  foreground: string;
}

const major = getScaleForMode("major");

export const LAB_SOLFEGE_STEPS: LabSolfegeStep[] = Array.from({ length: 7 }, (_, index) => {
  const resolved = resolveMusicColorSampleByScaleIndex(index, "major", "C", 4, fixedColorConfig);
  const value = resolved?.sample.primary;
  const lum = value ? luminance(value.srgb) : INK_L;
  return {
    syllable: major.solfege[index]?.name ?? "",
    color: value ? musicColorValueToCss(value) : "var(--ink-5)",
    foreground: contrast(lum, INK_L) >= contrast(lum, IVORY_L) ? "var(--ink)" : "var(--ivory)",
  };
});
