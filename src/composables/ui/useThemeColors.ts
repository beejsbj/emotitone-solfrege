/**
 * Theme Color Utilities
 * Centralized HSLA color manipulation utilities for UI components
 */

export function useThemeColors() {
  /**
   * Adjust alpha value in HSLA color string
   */
  const adjustAlpha = (hslaColor: string, alpha: number): string => {
    // Handle various HSLA formats
    if (!hslaColor || typeof hslaColor !== 'string') {
      return `hsla(220, 13%, 50%, ${alpha})`;
    }
    
    // More robust regex to handle different HSLA formats
    const hslaMatch = hslaColor.match(/hsla?\(\s*([^,]+),\s*([^,]+),\s*([^,]+)(?:,\s*[^)]+)?\)/i);
    
    if (hslaMatch) {
      const [, h, s, l] = hslaMatch;
      return `hsla(${h}, ${s}, ${l}, ${alpha})`;
    }
    
    // Fallback if format doesn't match
    return `hsla(220, 13%, 50%, ${alpha})`;
  };

  /**
   * Create state colors (active, pressed, hover, disabled) from base color
   */
  const createStateColors = (baseColor: string) => ({
    active: adjustAlpha(baseColor, 1),
    pressed: adjustAlpha(baseColor, 0.8),
    hover: adjustAlpha(baseColor, 0.6),
    disabled: adjustAlpha(baseColor, 0.2),
  });

  /**
   * Get color intensity based on value within a range
   */
  const getColorIntensity = (
    baseColor: string,
    value: number,
    range: [number, number]
  ) => {
    const [min, max] = range;
    const intensity = Math.max(0, Math.min(1, (value - min) / (max - min)));
    return adjustAlpha(baseColor, Math.max(0.1, intensity));
  };

  /**
   * Create CSS gradient between two colors
   */
  const createGradient = (color1: string, color2: string, direction = '135deg') => {
    return `linear-gradient(${direction}, ${color1}, ${color2})`;
  };

  /**
   * Lighten/darken HSLA color by adjusting lightness
   */
  const adjustLightness = (hslaColor: string, adjustment: number): string => {
    const hslaMatch = hslaColor.match(/hsla?\(\s*([^,]+),\s*([^,]+),\s*([^,]+%?)(?:,\s*([^)]+))?\)/i);
    
    if (hslaMatch) {
      const [, h, s, l, a] = hslaMatch;
      const lightness = parseFloat(l.replace('%', ''));
      const newLightness = Math.max(0, Math.min(100, lightness + adjustment));
      const alpha = a ? a : '1';
      return `hsla(${h}, ${s}, ${newLightness}%, ${alpha})`;
    }
    
    return hslaColor;
  };

  /**
   * Adjust saturation in HSLA color
   */
  const adjustSaturation = (hslaColor: string, adjustment: number): string => {
    const hslaMatch = hslaColor.match(/hsla?\(\s*([^,]+),\s*([^,]+%?)(?:,\s*([^,]+)(?:,\s*([^)]+)))?\)/i);
    
    if (hslaMatch) {
      const [, h, s, l, a] = hslaMatch;
      const saturation = parseFloat(s.replace('%', ''));
      const newSaturation = Math.max(0, Math.min(100, saturation + adjustment));
      const alpha = a ? a : '1';
      return `hsla(${h}, ${newSaturation}%, ${l}, ${alpha})`;
    }
    
    return hslaColor;
  };

  return {
    adjustAlpha,
    createStateColors,
    getColorIntensity,
    createGradient,
    adjustLightness,
    adjustSaturation,
  };
}