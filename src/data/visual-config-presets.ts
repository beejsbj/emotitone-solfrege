import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import type { VisualEffectsConfig } from "@/types/visual";

export interface VisualConfigPreset {
  id: string;
  name: string;
  description: string;
  config: VisualEffectsConfig;
}

type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends object ? DeepPartial<T[K]> : T[K];
};

function cloneDefaultConfig(): VisualEffectsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as VisualEffectsConfig;
}

function createPreset(
  id: string,
  name: string,
  description: string,
  overrides: DeepPartial<VisualEffectsConfig>
): VisualConfigPreset {
  const config = cloneDefaultConfig();

  for (const [sectionName, sectionOverrides] of Object.entries(overrides)) {
    const key = sectionName as keyof VisualEffectsConfig;
    Object.assign(config[key], sectionOverrides);
  }

  return {
    id,
    name,
    description,
    config,
  };
}

export const BUILT_IN_VISUAL_PRESETS: VisualConfigPreset[] = [
  createPreset(
    "soft-glass",
    "Soft Glass",
    "Warm glassy motion with a little bloom and less visual chatter.",
    {
      blobs: {
        opacity: 0.34,
        blurRadius: 24,
        glowIntensity: 10,
        driftSpeed: 6,
        fusionStrength: 0.32,
        fieldSoftness: 16,
        webOpacity: 0.9,
        labelOpacity: 0.9,
      },
      ambient: {
        opacityMajor: 0.5,
        opacityMinor: 0.35,
        brightnessMajor: 0.42,
        brightnessMinor: 0.26,
      },
      particles: {
        count: 6,
        speed: 2,
        gravity: 0.1,
      },
      strings: {
        baseOpacity: 0.08,
        activeOpacity: 0.52,
        maxAmplitude: 14,
      },
      dynamicColors: {
        isEnabled: true,
        chroma: 0.1575,
        lightnessCenter: 0.625,
        lightnessSpan: 0.2057,
        hueMotionEnabled: true,
        animationSpeed: 0.5,
      },
      keyboard: {
        surfaceStyle: "colored",
        keyBrightness: 0.85,
        keySaturation: 0.8,
      },
      beatingShapes: {
        opacity: 0.42,
        scale: 0.9,
        useGlassmorphism: true,
      },
      hilbertScope: {
        opacity: 0.38,
        history: 0.2,
      },
    }
  ),
  createPreset(
    "pulse-lab",
    "Pulse Lab",
    "Sharper motion, stronger impact, and enough energy to feel like a patch bay.",
    {
      blobs: {
        opacity: 0.58,
        vibrationAmplitude: 18,
        glowIntensity: 20,
        analysisNoteLimit: 7,
        fusionStrength: 0.2,
      },
      particles: {
        count: 22,
        sizeMax: 8,
        speed: 6,
        gravity: 0.35,
      },
      strings: {
        count: 9,
        activeOpacity: 0.92,
        maxAmplitude: 30,
        interpolationSpeed: 0.18,
      },
      dynamicColors: {
        isEnabled: true,
        musicColorMode: "fixed",
        hueMotionEnabled: true,
        animationSpeed: 1.4,
        chroma: 0.2138,
      },
      hilbertScope: {
        isEnabled: true,
        glowIntensity: 14,
        history: 0.62,
        thickness: 4.5,
      },
      beatingShapes: {
        isEnabled: true,
        opacity: 0.92,
        scale: 1.2,
        shapeCount: 9,
      },
      keyboard: {
        surfaceStyle: "colored",
        keyBrightness: 1.2,
        keySaturation: 1.15,
      },
    }
  ),
  createPreset(
    "ambient-bloom",
    "Ambient Bloom",
    "Slow background haze that lets the harmony hang in the room.",
    {
      blobs: {
        opacity: 0.4,
        blurRadius: 32,
        fadeOutDuration: 2.8,
        driftSpeed: 4,
        analysisHoldTime: 2880,
        fieldSoftness: 18,
      },
      ambient: {
        opacityMajor: 0.72,
        opacityMinor: 0.5,
        brightnessMajor: 0.58,
        brightnessMinor: 0.42,
        saturationMajor: 0.86,
        saturationMinor: 0.68,
      },
      particles: {
        isEnabled: false,
      },
      strings: {
        baseOpacity: 0.05,
        activeOpacity: 0.3,
      },
      dynamicColors: {
        isEnabled: true,
        animationSpeed: 0.35,
        chroma: 0.1395,
        lightnessCenter: 0.655,
        lightnessSpan: 0.1714,
      },
      hilbertScope: {
        opacity: 0.25,
        history: 0.12,
      },
      beatingShapes: {
        opacity: 0.3,
        scale: 0.8,
      },
    }
  ),
  createPreset(
    "classroom",
    "Classroom",
    "Cleaner, calmer defaults that keep the learning cues readable.",
    {
      blobs: {
        opacity: 0.22,
        glowEnabled: false,
        connectionMode: "merge",
        showChordLabel: true,
        showIntervalLabels: true,
        showEmotionLabel: true,
        fusionStrength: 0.16,
      },
      ambient: {
        opacityMajor: 0.28,
        opacityMinor: 0.2,
      },
      particles: {
        isEnabled: false,
      },
      strings: {
        isEnabled: true,
        baseOpacity: 0.12,
        activeOpacity: 0.42,
        maxAmplitude: 12,
      },
      dynamicColors: {
        isEnabled: false,
      },
      hilbertScope: {
        isEnabled: false,
      },
      beatingShapes: {
        isEnabled: false,
      },
      patterns: {
        isEnabled: true,
        autoSaveInterestingPatterns: false,
      },
      keyboard: {
        isEnabled: true,
        surfaceStyle: "monochrome",
        showLabels: true,
        rowCount: 2,
        keyboardPadding: true,
      },
      codeStrip: {
        enabled: true,
        notation: "solfege",
        showRests: true,
      },
    }
  ),
  createPreset(
    "neon-scope",
    "Neon Scope",
    "Bright, spectral, a little dramatic, with the scope leading the show.",
    {
      blobs: {
        opacity: 0.46,
        glowEnabled: true,
        glowIntensity: 28,
        fieldSoftness: 22,
        fusionStrength: 0.28,
        webOpacity: 0.95,
        labelOpacity: 0.95,
      },
      ambient: {
        opacityMajor: 0.44,
        opacityMinor: 0.28,
      },
      particles: {
        count: 12,
        sizeMin: 1,
        sizeMax: 5,
        speed: 5,
      },
      dynamicColors: {
        isEnabled: true,
        musicColorMode: "fixed",
        hueMotionEnabled: true,
        animationSpeed: 1.8,
        chroma: 0.225,
        lightnessCenter: 0.575,
        lightnessSpan: 0.3257,
      },
      hilbertScope: {
        isEnabled: true,
        opacity: 0.92,
        glowEnabled: true,
        glowIntensity: 30,
        history: 0.82,
        thickness: 5,
      },
      beatingShapes: {
        isEnabled: true,
        opacity: 0.84,
        scale: 1.15,
        saturation: 100,
      },
      keyboard: {
        surfaceStyle: "colored",
        keyBrightness: 1.3,
        keySaturation: 1.25,
      },
    }
  ),
  createPreset(
    "hilbert-trace",
    "Hilbert Trace",
    "Thin luminous Hilbert lines with light history, soft glow, and a pushed size.",
    {
      hilbertScope: {
        isEnabled: true,
        thickness: 0.01,
        opacity: 0.3,
        history: 0.1,
        driftSpeed: 4,
        glowEnabled: true,
        glowIntensity: 5,
        smear: 1,
        sizeRatio: 1.5,
      },
    }
  ),
];
