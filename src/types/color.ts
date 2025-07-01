/**
 * Color System Types
 * Type definitions for color relationships, palettes, and dynamic color systems
 */

/**
 * Note color relationships for dynamic color system
 * Core color relationships for a note - only the essential colors
 */
export interface NoteColorRelationships {
  /** Primary color (base hue) */
  primary: string;
  /** Accent color (complementary - hue + 180°) */
  accent: string;
  /** Secondary color (first triadic - hue + 120°) */
  secondary: string;
  /** Tertiary color (second triadic - hue + 240°) */
  tertiary: string;
}

/**
 * Static color palette for a solfege note - only stores the core colors
 */
export interface SolfegeColorPalette {
  /** Primary color */
  primary: string;
  /** Secondary color */
  secondary: string;
  /** Accent color */
  accent: string;
  /** Tertiary color */
  tertiary: string;
}

/**
 * Complete color data for both major and minor modes
 */
export interface SolfegeColorData {
  /** Major mode colors */
  major: SolfegeColorPalette;
  /** Minor mode colors */
  minor: SolfegeColorPalette;
}

/**
 * Octave configuration for lightness variations
 */
export interface OctaveConfig {
  /** Octave number (1-5) */
  octave: number;
  /** Lightness value for this octave (0-1) */
  lightness: number;
}

/**
 * Dynamic color system configuration
 * Used by useColorSystem.ts for runtime color generation
 */
export interface DynamicColorConfig {
  /** Whether dynamic colors are enabled (alternative to predefined colors) */
  isEnabled: boolean;
  /** Whether to use chromatic mapping (12 notes) instead of solfege (7 notes) */
  chromaticMapping: boolean;
  /** Hue animation amplitude in degrees (±) */
  hueAnimationAmplitude: number;
  /** Animation speed multiplier for hue changes */
  animationSpeed: number;
  /** Saturation level for dynamic colors (0-1) */
  saturation: number;
  /** Base lightness for middle octave (0-1) */
  baseLightness: number;
  /** Lightness range for octave variations (0-1) */
  lightnessRange: number;
}

/**
 * Color generation utilities return type
 */
export interface GeneratedColorPalette {
  /** Generated colors for this note */
  colors: NoteColorRelationships;
  /** HSL values used for generation */
  hsl: {
    hue: number;
    saturation: number;
    lightness: number;
  };
  /** Animation state for hue shifts */
  animation: {
    currentHue: number;
    targetHue: number;
    animationProgress: number;
  };
}

/**
 * Color theme definition for different visual modes
 */
export interface ColorTheme {
  /** Theme identifier */
  id: string;
  /** Human-readable theme name */
  name: string;
  /** Theme description */
  description?: string;
  /** Base color palette */
  palette: Record<string, string>;
  /** Dynamic color configuration for this theme */
  dynamicConfig?: Partial<DynamicColorConfig>;
  /** Whether this is a built-in theme */
  readonly?: boolean;
}

/**
 * Color accessibility information
 */
export interface ColorAccessibility {
  /** Contrast ratio against white background */
  contrastWhite: number;
  /** Contrast ratio against black background */
  contrastBlack: number;
  /** Whether color meets WCAG AA standards */
  wcagAA: boolean;
  /** Whether color meets WCAG AAA standards */
  wcagAAA: boolean;
  /** Recommended text color for this background */
  recommendedText: "light" | "dark";
}

export default {};
