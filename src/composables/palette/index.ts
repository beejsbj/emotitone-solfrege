/**
 * Palette Module Index
 * Exports all palette-related composables and types
 */

export { usePalette } from "./usePalette";
export { usePaletteLayout } from "./useLayout";
export { usePaletteAnimation } from "./useAnimation";
export { usePaletteRenderer } from "./useRenderer";
export { usePaletteInteraction } from "./useInteraction";

export type {
  PaletteState,
  ButtonLayout,
  ControlLayout,
  AnimationState,
  OctaveHeights,
  SustainHook,
} from "@/types";

/**
 * Comprehensive Palette Style Configuration
 * Centralized styling constants for easy customization
 * Consolidates all canvas rendering styles in one place
 */
export const PALETTE_STYLES = {
  // Typography (using Ojuju font from style.css)
  fonts: {
    family:
      "'Ojuju', sans-serif, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    systemFamily:
      "'Ojuju', sans-serif, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    tailwindFamily:
      "'Ojuju', sans-serif, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, 'Noto Sans', sans-serif",
    weights: {
      normal: "600",
      semibold: "600",
      bold: "700",
    },
    sizes: {
      xs: 10, // text-xs
      sm: 14, // text-sm
      base: 16, // text-base
      lg: 18, // text-lg
      xl: 20, // text-xl
    },
  },

  // Colors (HSLA format)
  colors: {
    background: {
      palette: "hsla(0, 0%, 100%, 0.1)", // bg-white/10
      controls: "hsla(220, 26%, 17%, 1)", // gray-800
      flickArea: "hsla(215, 19%, 27%, 0.5)", // gray-700/50
    },
    borders: {
      main: "hsla(0, 0%, 100%, 0.2)", // white/20
      button: "hsla(0, 0%, 100%, 0.1)", // white/10
      control: "hsla(0, 0%, 100%, 0.2)", // border-white/20
    },
    text: {
      // Natural keys (white text)
      natural: "white",
      // Sharp/flat keys (black text)
      sharp: "black",
      // Primary text
      primary: "hsla(0, 0%, 0%, 1)", // black
      secondary: "hsla(0, 0%, 0%, 0.75)", // black/75
      // Control text
      control: "hsla(0, 0%, 100%, 0.6)", // white/60
      controlActive: "hsla(217, 91%, 60%, 0.8)", // blue-500/80
      // Octave text
      octave: "hsla(0, 0%, 100%, 0.6)", // text-white/60
    },
    button: {
      overlay: "hsla(0, 0%, 100%, 0.1)", // backdrop blur simulation
      pressed: "hsla(0, 0%, 0%, 0.1)", // pressed state overlay
    },
    shadow: {
      normal: "hsla(0, 0%, 0%, 0.3)", // shadow color
      pressed: "hsla(0, 0%, 0%, 0.5)", // pressed shadow color
    },
  },

  // Canvas rendering properties
  rendering: {
    // Text alignment and baseline
    textAlign: "center" as CanvasTextAlign,
    textBaseline: "middle" as CanvasTextBaseline,

    // Line properties
    lineWidth: {
      border: 1,
      dragHandle: 1,
    },

    // Border radius (for reference, canvas uses rounded rectangles)
    borderRadius: {
      button: 8, // rounded-lg
      control: 4, // rounded
    },

    // Shadow properties
    shadow: {
      blur: 0, // shadow-sm equivalent
      pressedBlur: 0, // pressed shadow
    },

    // Button dimensions
    button: {
      borderWidth: 1,
    },

    // Control dimensions
    control: {
      borderWidth: 1,
    },

    // Gradient configuration for active buttons
    gradient: {
      // Direction for linear gradients (0-360 degrees)
      direction: 225,
      // Gradient parsing regex for extracting HSLA colors
      colorRegex: /hsla?\([^)]+\)/g,
      // Fallback gradient stops if parsing fails
      fallbackStops: [
        { offset: 0, color: "hsla(0, 0%, 100%, 0.2)" },
        { offset: 1, color: "hsla(0, 0%, 100%, 0.1)" },
      ],
      // Transparency suffix for single-color gradients
      transparencySuffix: "80", // 50% transparency
      // Enhanced gradient effects for pressed states
      pressedEffect: {
        // Additional overlay for pressed buttons with gradients
        overlay: "hsla(0, 0%, 0%, 0)", // Darker overlay when pressed
        // Scale factor for gradient intensity when pressed
        intensityScale: 1.2,
      },
    },
  },

  // Dimensions and spacing
  dimensions: {
    controlsHeight: 20, // 5 * 4px = 20px (h-5)
    buttonGap: 1, // 1px gap between buttons
    octaveHeights: {
      main: 80, // 5rem base
      other: 56, // 3.5rem base
    },
    sustainHooksHeight: 24, // Height for sustain hooks row
    sustainHookRadius: 8, // Radius of circular hooks
    minHeight: 152, // 8rem minimum + sustain hooks
    maxHeight: 600, // 25rem maximum + sustain hooks

    // Drag handle dimensions
    dragHandle: {
      lineSpacing: 3, // spacing between drag handle lines
      lineLength: 12, // total length of drag handle lines (6px each side)
    },
  },

  // Animation and transitions
  animations: {
    octaveTransition: {
      duration: 400, // ms - slightly longer for smoother feel
      easing: "ease-out",
    },
    buttonPress: {
      scaleDown: 0.08, // 8% scale down for more weight
      pressDuration: 100, // ms - quick press
      releaseDuration: 100, // ms - slower release for smoothness
      pressEasing: "cubic-bezier(0.68, -0.55, 0.265, 1.55)", // Back easing with overshoot
      releaseEasing: "cubic-bezier(0.23, 1, 0.32, 1)", // Smooth elastic release
    },
  },

  // Visual effects
  effects: {
    backdropBlur: false,
    buttonHover: true,
    smoothScrolling: true,
  },

  // Control symbols and text (now using Lucide icons in renderer)
  symbols: {
    // Legacy symbols kept for compatibility, actual rendering uses Lucide icons
    upCaret: "▲", // Now rendered as chevron-up
    downCaret: "▼", // Now rendered as chevron-right
    resizeHandle: "↕", // Now rendered as move-vertical
    solfegeToggle: "Do'?", // Still text-based
    // Icon sizing for Lucide icons
    iconSize: {
      small: 12,
      medium: 14,
      large: 16,
    },
    iconStroke: 1.5,
  },

  // Lucide icon SVG paths for canvas rendering
  lucideIcons: {
    chevronUp: "M18 15l-6-6-6 6",
    chevronDown: "M6 9l6 6 6-6",
    chevronRight: "M9 18l6-6-6-6",
    moveVertical: "M8 18L12 22L16 18M8 6L12 2L16 6M12 2V22",
    gripHorizontal: "M5 9H19M5 15H19",
  },
} as const;
