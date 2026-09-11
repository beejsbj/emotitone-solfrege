/**
 * Visual Configuration with Metadata
 * Single source of truth for all visual effect configurations including values, metadata, and UI generation
 */

import type {
  ConfigField,
  ExtractConfigValues,
  VisualEffectsConfig,
} from "@/types/visual";

/**
 * Unified configuration with metadata
 * Each section contains its metadata and field definitions in one place
 */
export const UNIFIED_CONFIG = {
  blobs: {
    _meta: {
      label: "Blobs",
      icon: "🫧",
      description: "Blob bodies, motion, relationships, and analysis labels",
    },
    isEnabled: {
      value: true,
      label: "Enable Blobs",
    },
    baseSizeRatio: {
      value: 0.1,
      min: 0.1,
      max: 1,
      step: 0.05,
      label: "Base Size Ratio",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
      group: "Appearance",
    },
    minSize: {
      value: 75,
      min: 50,
      max: 500,
      step: 25,
      label: "Min Size",
      format: (v: number) => `${v}px`,
      group: "Appearance",
    },
    maxSize: {
      value: 400,
      min: 200,
      max: 1200,
      step: 50,
      label: "Max Size",
      format: (v: number) => `${v}px`,
      group: "Appearance",
    },
    opacity: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
      group: "Appearance",
    },
    blurRadius: {
      value: 10,
      min: 0,
      max: 100,
      step: 5,
      label: "Blur Radius",
      format: (v: number) => `${v}px`,
      group: "Appearance",
    },
    glowEnabled: {
      value: true,
      label: "Enable Glow",
      group: "Appearance",
    },
    glowIntensity: {
      value: 5,
      min: 0,
      max: 50,
      step: 5,
      label: "Glow Intensity",
      group: "Appearance",
    },
    oscillationAmplitude: {
      value: 1,
      min: 0,
      max: 1,
      step: 0.02,
      label: "Breathing Amplitude",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
      group: "Motion",
    },
    fadeOutDuration: {
      value: 1.5,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: "Fade Out Duration",
      format: (v: number) => `${v}s`,
      group: "Motion",
    },
    scaleInDuration: {
      value: 0.3,
      min: 0.1,
      max: 2,
      step: 0.1,
      label: "Scale In Duration",
      format: (v: number) => `${v}s`,
      group: "Motion",
    },
    scaleOutDuration: {
      value: 0.4,
      min: 0.1,
      max: 2,
      step: 0.1,
      label: "Scale Out Duration",
      format: (v: number) => `${v}s`,
      group: "Motion",
    },
    driftSpeed: {
      value: 10,
      min: 0,
      max: 100,
      step: 2,
      label: "Drift Speed",
      format: (v: number) => `${v}px/s`,
      group: "Motion",
    },
    vibrationFrequencyDivisor: {
      value: 10,
      min: 10,
      max: 500,
      step: 5,
      label: "Vibration Frequency Divisor",
      group: "Motion",
    },
    edgeSegments: {
      value: 48,
      min: 12,
      max: 96,
      step: 12,
      label: "Edge Segments",
      group: "Motion",
    },
    vibrationAmplitude: {
      value: 10,
      min: 0,
      max: 50,
      step: 1,
      label: "Edge Vibration",
      format: (v: number) => `${v}%`,
      group: "Motion",
    },
    circleTopMargin: {
      value: 30,
      min: 0,
      max: 200,
      step: 10,
      label: "Circle Top Margin",
      format: (v: number) => `${v}px`,
      group: "Motion",
    },
    connectionMode: {
      value: "off",
      options: ["off", "merge", "web"],
      label: "Connections",
      group: "Relationships",
    },
    fieldSoftness: {
      value: 12,
      min: 0,
      max: 50,
      step: 2,
      label: "Field Softness",
      format: (v: number) => `${v}px`,
      group: "Relationships",
    },
    fusionStrength: {
      value: 0.4,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Fusion Strength",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
      group: "Relationships",
    },
    webOpacity: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.1,
      label: "Web Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
      group: "Relationships",
      visibleWhen: {
        field: "connectionMode",
        values: ["web"],
      },
    },
    analysisHoldTime: {
      value: 2500,
      min: 600,
      max: 12000,
      step: 250,
      label: "Analysis Hold Time",
      format: (v: number) => `${v}ms`,
      group: "Analysis",
    },
    analysisNoteLimit: {
      value: 7,
      min: 1,
      max: 12,
      step: 1,
      label: "Analysis Note Limit",
      group: "Analysis",
    },
    showChordLabel: {
      value: false,
      label: "Show Chord Label",
      group: "Labels",
    },
    showIntervalLabels: {
      value: false,
      label: "Show Interval Labels",
      group: "Labels",
    },
    showEmotionLabel: {
      value: false,
      label: "Show Emotion Label",
      group: "Labels",
    },
    labelOpacity: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.1,
      label: "Label Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
      group: "Labels",
    },
  },

  ambient: {
    _meta: {
      label: "Ambient",
      icon: "🌅",
      description: "Scale-aware background lighting effects",
    },
    isEnabled: {
      value: true,
      label: "Enable Ambient",
    },
    opacityMajor: {
      value: 0.6,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Center Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    opacityMinor: {
      value: 0.4,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Accent Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    brightnessMajor: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Tonic Brightness",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    brightnessMinor: {
      value: 0.3,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Accent Brightness",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    saturationMajor: {
      value: 0.8,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Tonic Saturation",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    saturationMinor: {
      value: 0.6,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Accent Saturation",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
  },

  particles: {
    _meta: {
      label: "Particles",
      icon: "✨",
      description: "Particle system for note events",
    },
    isEnabled: {
      value: true,
      label: "Enable Particles",
    },
    count: {
      value: 10,
      min: 0,
      max: 100,
      step: 5,
      label: "Particle Count",
    },
    sizeMin: {
      value: 2,
      min: 1,
      max: 20,
      step: 1,
      label: "Min Size",
      format: (v: number) => `${v}px`,
    },
    sizeMax: {
      value: 6,
      min: 1,
      max: 20,
      step: 1,
      label: "Max Size",
      format: (v: number) => `${v}px`,
    },
    lifetimeMin: {
      value: 2000,
      min: 500,
      max: 10000,
      step: 250,
      label: "Min Lifetime",
      format: (v: number) => `${v}ms`,
    },
    lifetimeMax: {
      value: 3000,
      min: 500,
      max: 10000,
      step: 250,
      label: "Max Lifetime",
      format: (v: number) => `${v}ms`,
    },
    speed: {
      value: 4,
      min: 0,
      max: 20,
      step: 0.5,
      label: "Speed",
    },
    gravity: {
      value: 0,
      min: -2,
      max: 2,
      step: 0.1,
      label: "Gravity",
    },
    airResistance: {
      value: 0.99,
      min: 0.9,
      max: 1,
      step: 0.01,
      label: "Air Resistance",
    },
  },

  strings: {
    _meta: {
      label: "Strings",
      icon: "🎸",
      description: "Vibrating string visualizations",
    },
    isEnabled: {
      value: true,
      label: "Enable Strings",
    },
    count: {
      value: 7,
      min: 1,
      max: 16,
      step: 1,
      label: "String Count",
    },
    baseOpacity: {
      value: 0.05,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Base Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    activeOpacity: {
      value: 0.9,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Active Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    maxAmplitude: {
      value: 15,
      min: 1,
      max: 100,
      step: 1,
      label: "Max Amplitude",
      format: (v: number) => `${v}px`,
    },
    dampingFactor: {
      value: 0.08,
      min: 0.01,
      max: 0.5,
      step: 0.01,
      label: "Damping Factor",
    },
    interpolationSpeed: {
      value: 0.15,
      min: 0.01,
      max: 1,
      step: 0.01,
      label: "Interpolation Speed",
    },
    opacityInterpolationSpeed: {
      value: 0.1,
      min: 0.01,
      max: 1,
      step: 0.01,
      label: "Opacity Interpolation Speed",
    },
    octaveOffset: {
      value: 0,
      min: 0,
      max: 50,
      step: 1,
      label: "Octave Offset",
      format: (v: number) => `${v}px`,
    },
  },

  animation: {
    _meta: {
      label: "Animation",
      icon: "🎬",
      description: "Global animation settings",
    },
    visualFrequencyDivisor: {
      value: 100,
      min: 10,
      max: 1000,
      step: 10,
      label: "Visual Frequency Divisor",
    },
    frameRate: {
      value: 60,
      min: 30,
      max: 120,
      step: 15,
      label: "Frame Rate",
      format: (v: number) => `${v} fps`,
    },
    smoothingFactor: {
      value: 0.1,
      min: 0.01,
      max: 1,
      step: 0.01,
      label: "Smoothing Factor",
    },
  },

  frequencyMapping: {
    _meta: {
      label: "Frequency Mapping",
      icon: "🎵",
      description: "Audio frequency to visual mapping",
    },
    minFreq: {
      value: 200,
      min: 50,
      max: 500,
      step: 10,
      label: "Min Frequency",
      format: (v: number) => `${v} Hz`,
    },
    maxFreq: {
      value: 600,
      min: 200,
      max: 2000,
      step: 50,
      label: "Max Frequency",
      format: (v: number) => `${v} Hz`,
    },
    minValue: {
      value: 400,
      min: 100,
      max: 800,
      step: 25,
      label: "Min Value",
    },
    maxValue: {
      value: 700,
      min: 200,
      max: 1000,
      step: 25,
      label: "Max Value",
    },
  },

  dynamicColors: {
    _meta: {
      label: "Dynamic Colors",
      icon: "🌈",
      description: "Dynamic color generation system",
    },
    isEnabled: {
      value: true,
      label: "Enable Dynamic Colors",
    },
    recipeVersion: {
      value: 1 as const,
      hidden: true,
    },
    musicColorMode: {
      value: "movable-ordinal",
      options: ["fixed", "movable-ordinal", "movable-relative"],
      label: "Music Color Mode",
    },
    hueMotionEnabled: {
      value: true,
      label: "Hue Motion",
    },
    animationSpeed: {
      value: 1,
      min: 0.1,
      max: 3,
      step: 0.1,
      label: "Animation Speed",
      format: (v: number) => `${v}x`,
    },
    chroma: {
      value: 0.18,
      min: 0.05,
      max: 0.3,
      step: 0.01,
      label: "Chroma",
      format: (v: number) => v.toFixed(2),
    },
    lightnessCenter: {
      value: 0.575,
      min: 0.2,
      max: 0.9,
      step: 0.025,
      label: "Middle Lightness",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    lightnessSpan: {
      value: 0.6,
      min: 0,
      max: 0.7,
      step: 0.025,
      label: "Octave Lightness Span",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
  },

  hilbertScope: {
    _meta: {
      label: "Hilbert Scope",
      icon: "🌀",
      description: "Hilbert transform oscilloscope",
    },
    isEnabled: {
      value: true,
      label: "Enable Hilbert Scope",
    },
    sizeRatio: {
      value: 0.6,
      min: 0,
      max: 1.5,
      step: 0.05,
      label: "Size",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    opacity: {
      value: 0.7,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    scaleInDuration: {
      value: 0.5,
      min: 0.1,
      max: 2,
      step: 0.1,
      label: "Scale In Duration",
      format: (v: number) => `${v}s`,
    },
    scaleOutDuration: {
      value: 0.5,
      min: 0.1,
      max: 2,
      step: 0.1,
      label: "Scale Out Duration",
      format: (v: number) => `${v}s`,
    },
    driftSpeed: {
      value: 5,
      min: 0,
      max: 20,
      step: 1,
      label: "Drift Speed",
      format: (v: number) => `${v}px/s`,
    },
    glowEnabled: {
      value: true,
      label: "Enable Glow",
    },
    glowIntensity: {
      value: 10,
      min: 0,
      max: 50,
      step: 5,
      label: "Glow Intensity",
    },
    smear: {
      value: 0,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Smear",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    history: {
      value: 0.2,
      min: 0,
      max: 0.95,
      step: 0.05,
      label: "History",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    thickness: {
      value: 1.5,
      min: 0.01,
      max: 10,
      step: 0.01,
      label: "Thickness",
      format: (v: number) => `${v}px`,
    },
  },

  beatingShapes: {
    _meta: {
      label: "Beating Shapes",
      icon: "💎",
      description: "Geometric shapes that beat with the rhythm",
    },
    isEnabled: {
      value: true,
      label: "Enable Beating Shapes",
    },
    opacity: {
      value: 0.8,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Max Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    scale: {
      value: 1.0,
      min: 0.5,
      max: 2.0,
      step: 0.1,
      label: "Scale",
      format: (v: number) => `${v}x`,
    },
    shapeCount: {
      value: 7,
      min: 3,
      max: 12,
      step: 1,
      label: "Shape Count",
    },
    saturation: {
      value: 100,
      min: 0,
      max: 100,
      step: 5,
      label: "Saturation",
      format: (v: number) => `${v}%`,
    },
    useGlassmorphism: {
      value: false,
      label: "Enable Glassmorphism",
    },
  },

  patterns: {
    _meta: {
      label: "Pattern Recording",
      icon: "🎵",
      description: "Automatic pattern detection and recording settings",
    },
    isEnabled: {
      value: true,
      label: "Enable Pattern Recording",
    },
    silenceThreshold: {
      value: 30000,
      min: 30000,
      max: 60000,
      step: 5000,
      label: "Silence Threshold",
      format: (v: number) => `${(v / 1000).toFixed(0)}s`,
    },
    minPatternLength: {
      value: 3,
      min: 3,
      max: 10,
      step: 1,
      label: "Min Pattern Length",
      format: (v: number) => `${v} notes`,
    },
    maxPatternLength: {
      value: 50,
      min: 10,
      max: 200,
      step: 10,
      label: "Max Pattern Length",
      format: (v: number) => `${v} notes`,
    },
    maxHistorySize: {
      value: 10000,
      min: 1000,
      max: 50000,
      step: 1000,
      label: "Max History Size",
      format: (v: number) => `${v} notes`,
    },
    autoPurgeAge: {
      value: 24,
      min: 1,
      max: 168,
      step: 1,
      label: "Auto-purge Age",
      format: (v: number) => `${v}h`,
    },
    detectOnContextChange: {
      value: true,
      label: "Detect on Context Change",
    },
    autoSaveInterestingPatterns: {
      value: false,
      label: "Auto-save Interesting Patterns",
    },
    autoSaveComplexityThreshold: {
      value: 0.6,
      min: 0.1,
      max: 1.0,
      step: 0.1,
      label: "Auto-save Complexity Threshold",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
  },

  keyboard: {
    _meta: {
      label: "Keyboard",
      icon: "⌨️",
      description: "Keyboard styling and layout options",
    },
    isEnabled: {
      value: true,
      label: "Enable Keyboard",
    },
    primaryLabel: {
      value: "syllable",
      options: ["syllable", "degree", "raw"],
      label: "Primary Label",
    },
    keyGaps: {
      value: "small",
      options: ["none", "small", "medium"],
      label: "Key Gaps",
    },
    surfaceStyle: {
      value: "colored",
      options: ["colored", "monochrome"],
      label: "Surface Style",
    },
    rowCount: {
      value: 3,
      min: 1,
      max: 8,
      step: 1,
      label: "Visible Rows",
      hidden: true,
    },
    mainOctave: {
      value: 4,
      min: 1,
      max: 8,
      step: 1,
      label: "Main Octave",
    },
    hapticFeedback: {
      value: true,
      label: "Haptic Feedback",
    },
    showLabels: {
      value: true,
      label: "Show Note Labels",
    },
    keyBrightness: {
      value: 1.0,
      min: 0.3,
      max: 2.0,
      step: 0.1,
      label: "Key Brightness",
      format: (v: number) => `${v}x`,
    },
    keySaturation: {
      value: 1.0,
      min: 0.0,
      max: 1.5,
      step: 0.1,
      label: "Key Saturation",
      format: (v: number) => `${v}x`,
    },
    gradientDirection: {
      value: 225,
      min: 0,
      max: 360,
      step: 15,
      label: "Gradient Direction",
      format: (v: number) => `${v}°`,
    },

    keyboardPadding: {
      value: false,
      label: "Keyboard Padding",
    },
  },

  codeStrip: {
    _meta: {
      label: "Code Strip",
      icon: "🎼",
      description: "Workspace CodeStrip and editable Strudel-line settings",
    },
    enabled: {
      value: true,
      label: "Enable Code Strip",
    },
    opacity: {
      value: 1,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    bpm: {
      value: 120,
      min: 40,
      max: 220,
      step: 1,
      label: "Tempo",
      format: (v: number) => `${v} bpm`,
    },
    notation: {
      value: "solfege",
      options: ["solfege", "note", "degree"],
      label: "Notation Mode",
    },
    showRests: {
      value: true,
      label: "Show Rests",
    },
  },
};

/**
 * Helper function to extract values from unified config
 */
export function extractConfigValues<T extends Record<string, any>>(
  unifiedConfig: T
): ExtractConfigValues<T> {
  const result: any = {};

  for (const [key, value] of Object.entries(unifiedConfig)) {
    if (key === "_meta") {
      // Skip metadata fields
      continue;
    }

    if (typeof value === "object" && value !== null) {
      if ("value" in value) {
        // It's a ConfigField
        result[key] = value.value;
      } else {
        // It's a nested object, recurse
        result[key] = extractConfigValues(value);
      }
    } else {
      result[key] = value;
    }
  }

  return result;
}

/**
 * Extract the default config values for backward compatibility
 */
export const DEFAULT_CONFIG: VisualEffectsConfig = extractConfigValues(
  UNIFIED_CONFIG
) as VisualEffectsConfig;

/**
 * Extract section metadata
 */
export const CONFIG_SECTIONS = Object.fromEntries(
  Object.entries(UNIFIED_CONFIG).map(([key, section]) => [
    key,
    (section as any)._meta,
  ])
);

/**
 * Export the unified config for backward compatibility
 */
export const ENHANCED_DEFAULT_CONFIG = UNIFIED_CONFIG;
