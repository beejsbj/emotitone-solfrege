/**
 * CSS Variable Resolution Utilities
 * Provides functions to resolve CSS custom properties to their computed values
 */

/**
 * Resolves a CSS variable to its computed value using a temporary DOM element
 * @param cssValue - CSS value that may contain variables (e.g., "var(--color-primary)")
 * @param property - CSS property to test against (default: "color")
 * @returns The resolved CSS value or fallback
 */
export function resolveCSSVariable(
  cssValue: string,
  property: string = "color"
): string {
  if (!cssValue.startsWith("var(")) {
    return cssValue;
  }

  // Create a temporary element to resolve the CSS variable
  const tempElement = document.createElement("div");
  tempElement.style.setProperty(property, cssValue);
  document.body.appendChild(tempElement);
  const computedStyle = window.getComputedStyle(tempElement);
  const resolvedValue = computedStyle.getPropertyValue(property);
  document.body.removeChild(tempElement);

  // Return the resolved value or fallback
  return resolvedValue && resolvedValue !== cssValue
    ? resolvedValue.trim()
    : "#ffffff";
}

/**
 * Converts any color format to RGBA with specified alpha
 * @param color - Color value (CSS var, hex, rgb, hsl, etc.)
 * @param alpha - Alpha value (0-1)
 * @returns RGBA color string
 */
export function toRgbaWithAlpha(color: string, alpha: number): string {
  // First resolve CSS variables if present
  const resolvedColor = resolveCSSVariable(color);

  // If it's a hex color, convert it
  if (resolvedColor.startsWith("#")) {
    const r = parseInt(resolvedColor.slice(1, 3), 16);
    const g = parseInt(resolvedColor.slice(3, 5), 16);
    const b = parseInt(resolvedColor.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  // If it's already an rgba/rgb color, modify the alpha
  if (resolvedColor.startsWith("rgb")) {
    const rgbMatch = resolvedColor.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
      const values = rgbMatch[1].split(",").map((v) => v.trim());
      const r = parseInt(values[0]);
      const g = parseInt(values[1]);
      const b = parseInt(values[2]);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  // For other formats (hsl, named colors, etc.), use canvas to convert
  // This is more reliable than trying to parse all possible formats
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.fillStyle = resolvedColor;
    const computedColor = ctx.fillStyle;

    // Parse the computed color (should be in rgb format)
    const rgbMatch = computedColor.match(/rgba?\(([^)]+)\)/);
    if (rgbMatch) {
      const values = rgbMatch[1].split(",").map((v) => v.trim());
      const r = parseInt(values[0]);
      const g = parseInt(values[1]);
      const b = parseInt(values[2]);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
  }

  // Fallback
  return `rgba(100, 100, 100, ${alpha})`;
}

/**
 * Extracts a base color from a CSS gradient string (including CSS variables)
 * @param gradient - CSS gradient string that may contain variables
 * @returns A hex or rgb color string
 */
export function extractColorFromGradient(gradient: string): string {
  // First resolve CSS variables (gradients use background property)
  const resolvedGradient = resolveCSSVariable(gradient, "background");

  // Try to extract the first hex color from the gradient
  const hexMatch = resolvedGradient.match(/#[0-9a-fA-F]{6}/);
  if (hexMatch) {
    return hexMatch[0];
  }

  // Try to extract rgb color
  const rgbMatch = resolvedGradient.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  if (rgbMatch) {
    const [, r, g, b] = rgbMatch;
    return `rgb(${r}, ${g}, ${b})`;
  }

  // Fallback color
  return "#ffffff";
}

/**
 * Resolves multiple CSS variables at once
 * @param cssValues - Array of CSS values that may contain variables
 * @returns Array of resolved CSS values
 */
export function resolveCSSVariables(cssValues: string[]): string[] {
  return cssValues.map((value) => resolveCSSVariable(value));
}

/**
 * Checks if a string is a CSS variable
 * @param value - String to check
 * @returns True if the string is a CSS variable
 */
export function isCSSVariable(value: string): boolean {
  return value.startsWith("var(") && value.endsWith(")");
}

/**
 * Extracts the CSS variable name from a CSS variable string
 * @param cssVar - CSS variable string (e.g., "var(--color-primary)")
 * @returns The variable name (e.g., "--color-primary") or null if not a variable
 */
export function extractVariableName(cssVar: string): string | null {
  if (!isCSSVariable(cssVar)) {
    return null;
  }

  const match = cssVar.match(/var\(([^,)]+)/);
  return match ? match[1].trim() : null;
}
