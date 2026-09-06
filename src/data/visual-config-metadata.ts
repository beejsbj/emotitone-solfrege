/**
 * Visual Configuration with Metadata
 * Single source of truth for all visual effect configurations including values, metadata, and UI generation
 */

import type {
  BooleanFieldDescription,
  ConfigField,
  ExtractConfigValues,
  LegacyVisualEffectsConfig,
  VisualEffectsConfig,
  VisualConfigFieldDescription,
  VisualConfigFieldMetadata,
  VisualConfigSectionDescription,
  VisualConfigSectionKey,
  VisualConfigSectionMetadata,
  VisualConfigValue,
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
      description: "Organic blob animations that respond to notes",
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
    },
    minSize: {
      value: 75,
      min: 50,
      max: 500,
      step: 25,
      label: "Min Size",
      format: (v: number) => `${v}px`,
    },
    maxSize: {
      value: 400,
      min: 200,
      max: 1200,
      step: 50,
      label: "Max Size",
      format: (v: number) => `${v}px`,
    },
    opacity: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    blurRadius: {
      value: 10,
      min: 0,
      max: 100,
      step: 5,
      label: "Blur Radius",
      format: (v: number) => `${v}px`,
    },
    oscillationAmplitude: {
      value: 1,
      min: 0,
      max: 1,
      step: 0.02,
      label: "Oscillation Amplitude",
    },
    fadeOutDuration: {
      value: 1.5,
      min: 0.1,
      max: 5,
      step: 0.1,
      label: "Fade Out Duration",
      format: (v: number) => `${v}s`,
    },
    scaleInDuration: {
      value: 0.3,
      min: 0.1,
      max: 2,
      step: 0.1,
      label: "Scale In Duration",
      format: (v: number) => `${v}s`,
    },
    scaleOutDuration: {
      value: 0.4,
      min: 0.1,
      max: 2,
      step: 0.1,
      label: "Scale Out Duration",
      format: (v: number) => `${v}s`,
    },
    driftSpeed: {
      value: 10,
      min: 0,
      max: 100,
      step: 2,
      label: "Drift Speed",
      format: (v: number) => `${v}px/s`,
    },
    vibrationFrequencyDivisor: {
      value: 10,
      min: 10,
      max: 500,
      step: 5,
      label: "Vibration Frequency Divisor",
    },
    edgeSegments: {
      value: 48,
      min: 12,
      max: 96,
      step: 12,
      label: "Edge Segments",
    },
    vibrationAmplitude: {
      value: 10,
      min: 0,
      max: 50,
      step: 1,
      label: "Vibration Amplitude",
      format: (v: number) => `${v}px`,
    },
    glowEnabled: {
      value: true,
      label: "Enable Glow",
    },
    glowIntensity: {
      value: 5,
      min: 0,
      max: 50,
      step: 5,
      label: "Glow Intensity",
    },
    circleTopMargin: {
      value: 30,
      min: 0,
      max: 200,
      step: 10,
      label: "Circle Top Margin",
      format: (v: number) => `${v}px`,
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
    musicColorMode: {
      value: "movable",
      options: ["fixed", "movable"],
      label: "Music Color Mode",
    },
    hueAnimationAmplitude: {
      value: 15,
      min: 5,
      max: 30,
      step: 5,
      label: "Hue Animation",
      format: (v: number) => `±${v}°`,
    },
    animationSpeed: {
      value: 1,
      min: 0.1,
      max: 3,
      step: 0.1,
      label: "Animation Speed",
      format: (v: number) => `${v}x`,
    },
    saturation: {
      value: 0.8,
      min: 0.3,
      max: 1,
      step: 0.1,
      label: "Saturation",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    baseLightness: {
      value: 0.5,
      min: 0.3,
      max: 0.7,
      step: 0.05,
      label: "Base Lightness",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    lightnessRange: {
      value: 0.7,
      min: 0.3,
      max: 0.8,
      step: 0.05,
      label: "Lightness Range",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
  },

  floatingPopup: {
    _meta: {
      label: "Floating Popup",
      icon: "💬",
      description: "Note information popup",
    },
    isEnabled: {
      value: false,
      label: "Enable Floating Popup",
    },
    accumulationWindow: {
      value: 500,
      min: 100,
      max: 2000,
      step: 50,
      label: "Accumulation Window",
      format: (v: number) => `${v}ms`,
    },
    hideDelay: {
      value: 2000,
      min: 500,
      max: 10000,
      step: 250,
      label: "Hide Delay",
      format: (v: number) => `${v}ms`,
    },
    maxNotes: {
      value: 7,
      min: 1,
      max: 12,
      step: 1,
      label: "Max Notes",
    },
    showChord: {
      value: true,
      label: "Show Chord",
    },
    showIntervals: {
      value: true,
      label: "Show Intervals",
    },
    showEmotionalDescription: {
      value: true,
      label: "Show Emotions",
    },
    backdropBlur: {
      value: 1,
      min: 0,
      max: 50,
      step: 2,
      label: "Backdrop Blur",
      format: (v: number) => `${v}px`,
    },
    glassmorphOpacity: {
      value: 0.4,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Glass Opacity",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    animationDuration: {
      value: 300,
      min: 100,
      max: 1000,
      step: 50,
      label: "Animation Duration",
      format: (v: number) => `${v}ms`,
    },
    opacity: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.1,
      label: "Popup Opacity",
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cloneDefaultConfig(): VisualEffectsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as VisualEffectsConfig;
}

function getSectionMetadata(
  sectionName: VisualConfigSectionKey
): VisualConfigSectionMetadata {
  return UNIFIED_CONFIG[sectionName] as VisualConfigSectionMetadata;
}

function getFieldMetadata(
  sectionName: VisualConfigSectionKey,
  fieldName: string
): VisualConfigFieldMetadata | null {
  const section = getSectionMetadata(sectionName);
  const field = section[fieldName];

  return fieldName !== "_meta" && isFieldMetadata(field) ? field : null;
}

function isFieldMetadata(value: unknown): value is VisualConfigFieldMetadata {
  return isRecord(value) && "value" in value;
}

function isValidFieldValue(
  metadata: VisualConfigFieldMetadata,
  value: unknown
): boolean {
  if (typeof metadata.value === "number") {
    return typeof value === "number" && Number.isFinite(value);
  }

  if (typeof metadata.value === "boolean") {
    return typeof value === "boolean";
  }

  return (
    typeof value === "string" &&
    (!metadata.options || metadata.options.includes(value))
  );
}

function defaultLabel(key: string): string {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (value) => value.toUpperCase());
}

function describeField(
  key: string,
  metadata: VisualConfigFieldMetadata,
  currentValue: unknown
): VisualConfigFieldDescription {
  const value = isValidFieldValue(metadata, currentValue)
    ? currentValue
    : metadata.value;
  const label = metadata.label ?? defaultLabel(key);

  if (typeof metadata.value === "boolean") {
    return {
      key,
      label,
      control: "boolean",
      value: value as boolean,
      defaultValue: metadata.value,
    };
  }

  if (typeof metadata.value === "number") {
    return {
      key,
      label,
      control: "range",
      value: value as number,
      defaultValue: metadata.value,
      min: metadata.min ?? 0,
      max: metadata.max ?? 100,
      step: metadata.step ?? 0.1,
      formatValue: (nextValue: number) => {
        if (metadata.format) {
          try {
            return metadata.format(nextValue);
          } catch (error) {
            console.error(`Error formatting field ${key}:`, error);
          }
        }

        return nextValue.toString();
      },
    };
  }

  return {
    key,
    label,
    control: "options",
    value: value as string,
    defaultValue: metadata.value,
    options: [...(metadata.options ?? [])],
  };
}

function migrateLegacySection(
  sectionName: VisualConfigSectionKey,
  incomingSection: Record<string, unknown>
): Record<string, unknown> {
  const migratedSection = { ...incomingSection };

  if (sectionName === "dynamicColors") {
    if (
      !("musicColorMode" in incomingSection) &&
      typeof incomingSection.chromaticMapping === "boolean"
    ) {
      migratedSection.musicColorMode = incomingSection.chromaticMapping
        ? "fixed"
        : "movable";
    }
    delete migratedSection.chromaticMapping;
  }

  if (sectionName === "keyboard") {
    if (
      !("surfaceStyle" in incomingSection) &&
      typeof incomingSection.colorMode === "string"
    ) {
      migratedSection.surfaceStyle = incomingSection.colorMode;
    }
    // Daily geometry owns key shape; legacy glass settings now use colored paper.
    if (migratedSection.surfaceStyle === "glassmorphism") {
      migratedSection.surfaceStyle = "colored";
    }
    delete migratedSection.colorMode;
  }

  return migratedSection;
}

/**
 * Resolve untrusted loaded data into a complete configuration. Missing or invalid
 * known fields use their metadata default; unknown fields are deliberately ignored.
 * Numeric min/max values guide controls and are not load-time validity limits.
 */
export function resolveVisualConfig(rawConfig: unknown): VisualEffectsConfig {
  const resolvedConfig = cloneDefaultConfig();

  if (!isRecord(rawConfig)) {
    return resolvedConfig;
  }

  const legacyConfig = rawConfig as LegacyVisualEffectsConfig;

  for (const sectionName of Object.keys(
    DEFAULT_CONFIG
  ) as VisualConfigSectionKey[]) {
    const rawSection =
      sectionName === "codeStrip"
        ? rawConfig.codeStrip ?? legacyConfig.liveStrip
        : rawConfig[sectionName];

    if (!isRecord(rawSection)) {
      continue;
    }

    const incomingSection = migrateLegacySection(sectionName, rawSection);
    const resolvedSection = resolvedConfig[sectionName] as unknown as Record<
      string,
      VisualConfigValue
    >;
    const sectionMetadata = getSectionMetadata(sectionName);

    for (const [fieldName, field] of Object.entries(sectionMetadata)) {
      if (fieldName === "_meta" || !isFieldMetadata(field)) {
        continue;
      }

      const incomingValue = incomingSection[fieldName];
      resolvedSection[fieldName] = isValidFieldValue(field, incomingValue)
        ? (incomingValue as VisualConfigValue)
        : field.value;
    }
  }

  return resolvedConfig;
}

/** Load a complete configuration without replacing existing reactive section objects. */
export function replaceVisualConfig(
  target: VisualEffectsConfig,
  rawConfig: unknown
): void {
  const resolvedConfig = resolveVisualConfig(rawConfig);

  for (const sectionName of Object.keys(
    resolvedConfig
  ) as VisualConfigSectionKey[]) {
    const targetSection = target[sectionName] as unknown;
    const resolvedSection = resolvedConfig[sectionName] as unknown as Record<
      string,
      VisualConfigValue
    >;

    if (!isRecord(targetSection)) {
      (target as unknown as Record<string, unknown>)[sectionName] = resolvedSection;
      continue;
    }

    for (const key of Object.keys(targetSection)) {
      if (!(key in resolvedSection)) {
        delete targetSection[key];
      }
    }
    Object.assign(targetSection, resolvedSection);
  }
}

/** Apply one live edit only when the field exists and the value is valid. */
export function updateVisualConfigValue(
  target: VisualEffectsConfig,
  sectionName: string,
  fieldName: string,
  value: unknown
): boolean {
  if (!(sectionName in DEFAULT_CONFIG)) {
    return false;
  }

  const typedSectionName = sectionName as VisualConfigSectionKey;
  const metadata = getFieldMetadata(typedSectionName, fieldName);
  const targetSection = target[typedSectionName] as unknown;

  if (!metadata || !isRecord(targetSection) || !isValidFieldValue(metadata, value)) {
    return false;
  }

  targetSection[fieldName] = value;
  return true;
}

/** Apply all valid known fields from a live section edit, leaving rejected fields unchanged. */
export function updateVisualConfigSection<K extends VisualConfigSectionKey>(
  target: VisualEffectsConfig,
  sectionName: K,
  updates: Partial<VisualEffectsConfig[K]>
): void {
  if (!isRecord(updates)) {
    return;
  }

  for (const [fieldName, value] of Object.entries(updates)) {
    updateVisualConfigValue(target, sectionName, fieldName, value);
  }
}

/**
 * Describe a section and its current values through the same metadata that owns
 * validity. Control kinds never depend on potentially corrupted runtime values.
 */
export function describeVisualConfigSection(
  config: VisualEffectsConfig,
  sectionName: VisualConfigSectionKey
): VisualConfigSectionDescription {
  const metadata = getSectionMetadata(sectionName);
  const configSection = config[sectionName] as unknown;
  const currentValues = isRecord(configSection) ? configSection : {};
  const describedFields: VisualConfigFieldDescription[] = [];

  for (const [key, field] of Object.entries(metadata)) {
    if (key !== "_meta" && isFieldMetadata(field)) {
      describedFields.push(describeField(key, field, currentValues[key]));
    }
  }
  const enableField = describedFields.find(
    (field): field is BooleanFieldDescription =>
      field.control === "boolean" &&
      (field.key === "isEnabled" || field.key === "enabled")
  ) ?? null;

  return {
    name: sectionName,
    label: metadata._meta.label,
    icon: metadata._meta.icon,
    description: metadata._meta.description,
    enableField,
    fields: describedFields.filter((field) => field !== enableField),
  };
}

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
