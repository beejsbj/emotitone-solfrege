/**
 * Glassmorphism Effects
 * Focused module for glass-like visual effects
 */

import { withAlpha } from "./useColorGeneration";

/**
 * Create glassmorphism background effect
 */
export function createGlassmorphBackground(
  color: string,
  opacity: number = 0.4
): string {
  const color1 = withAlpha(color, opacity * 1.425);
  const color2 = withAlpha(color, opacity * 0.15);
  return `radial-gradient(84.35% 70.19% at 50% 38.11%, ${color1}, ${color2})`;
}

/**
 * Create glassmorphism box shadow effect
 */
export function createGlassmorphShadow(color: string): string {
  const shadowColor = withAlpha(color, 0.09);
  return `hsla(0, 0%, 100%, 0.1) 0px 1px 0px 0px inset, hsla(0, 0%, 0%, 0.4) 0px 30px 50px 0px, ${shadowColor} 0px 4px 24px 0px, hsla(0, 0%, 100%, 0.06) 0px 0px 0px 1px inset`;
}

/**
 * Create chord-specific glassmorphism background using gradient of multiple colors
 */
export function createChordGlassmorphBackground(
  colors: string[],
  opacity: number = 0.4
): string {
  if (colors.length === 0) return "rgba(255, 255, 255, 0.1)";

  if (colors.length === 1) {
    return createGlassmorphBackground(colors[0], opacity);
  }

  const gradientColors = colors.map((color) => withAlpha(color, opacity));
  const gradientColorsLight = colors.map((color) =>
    withAlpha(color, opacity * 0.15)
  );

  return `linear-gradient(135deg, 
    ${gradientColors.join(", ")}, 
    ${gradientColorsLight.join(", ")})`;
}

/**
 * Create chord-specific glassmorphism shadow
 */
export function createChordGlassmorphShadow(colors: string[]): string {
  if (colors.length === 0) return createGlassmorphShadow("#ffffff");
  return createGlassmorphShadow(colors[0]);
}

/**
 * Create conical glassmorphism background effect
 */
export function createConicGlassmorphBackground(
  color: string,
  opacity: number = 0.4,
  startAngle: string = "0deg"
): string {
  const color1 = withAlpha(color, opacity * 1.425);
  const color2 = withAlpha(color, opacity * 0.15);
  const color3 = withAlpha(color, opacity * 0.8);
  return `conic-gradient(from ${startAngle}, ${color1}, ${color2}, ${color3}, ${color1})`;
}

/**
 * Create interval-specific glassmorphism background
 */
export function createIntervalGlassmorphBackground(
  fromColor: string,
  toColor: string,
  opacity: number = 0.4
): string {
  const fromColorAlpha = withAlpha(fromColor, opacity);
  const toColorAlpha = withAlpha(toColor, opacity);
  return `linear-gradient(90deg, ${fromColorAlpha}, ${toColorAlpha})`;
}