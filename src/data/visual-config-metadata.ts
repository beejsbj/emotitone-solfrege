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
  },

  ambient: {
    _meta: {
      label: "Ambient",
      icon: "🌅",
      description: "Background lighting effects",
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
      label: "Opacity Major",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    opacityMinor: {
      value: 0.4,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Opacity Minor",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    brightnessMajor: {
      value: 0.5,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Brightness Major",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    brightnessMinor: {
      value: 0.3,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Brightness Minor",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    saturationMajor: {
      value: 0.8,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Saturation Major",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    saturationMinor: {
      value: 0.6,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Saturation Minor",
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
    chromaticMapping: {
      value: false,
      label: "Chromatic Mapping (12 notes vs 7 solfège)",
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

  palette: {
    _meta: {
      label: "Palette",
      icon: "🎹",
      description: "Solfège palette visual settings",
    },
    isEnabled: {
      value: true,
      label: "Enable Palette Effects",
    },
    gradientDirection: {
      value: 225,
      min: 0,
      max: 360,
      step: 15,
      label: "Gradient Direction",
      format: (v: number) => `${v}°`,
    },
    useGlassmorphism: {
      value: true,
      label: "Use Glassmorphism",
    },
    glassmorphOpacity: {
      value: 0.4,
      min: 0,
      max: 1,
      step: 0.05,
      label: "Glass Opacity",
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
      min: 0.1,
      max: 1,
      step: 0.05,
      label: "Size Ratio",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    minSize: {
      value: 600,
      min: 500,
      max: 800,
      step: 25,
      label: "Min Size",
      format: (v: number) => `${v}px`,
    },
    maxSize: {
      value: 800,
      min: 600,
      max: 1600,
      step: 50,
      label: "Max Size",
      format: (v: number) => `${v}px`,
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
    history: {
      value: 0.85,
      min: 0,
      max: 0.95,
      step: 0.05,
      label: "Trail Strength",
      format: (v: number) => `${(v * 100).toFixed(0)}%`,
    },
    lineWidth: {
      value: 3,
      min: 1,
      max: 10,
      step: 0.5,
      label: "Line Width",
      format: (v: number) => `${v}px`,
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
