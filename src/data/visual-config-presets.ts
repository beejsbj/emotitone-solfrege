import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import {
  applyStageLook,
  stageLookFromConfig,
  type StageLook,
} from "@/services/stageAppearance";

const PREFERENCE_FIELDS = [
  "connectionMode",
  "fieldSoftness",
  "fusionStrength",
  "webOpacity",
  "showChordLabel",
  "showIntervalLabels",
  "showEmotionLabel",
  "labelOpacity",
] as const;

/**
 * A built-in is a complete Stage-appearance recipe, not a partial mutation of
 * whatever Look happened to come before it. Relationship and explanation
 * choices are the exception: those belong to the learner and survive a Look.
 */
function defineBuiltInStageLook(look: StageLook): StageLook {
  const patch = stageLookFromConfig(applyStageLook(DEFAULT_CONFIG, look.patch));

  if (patch.blobs) {
    for (const field of PREFERENCE_FIELDS) delete patch.blobs[field];
  }

  return { ...look, patch };
}

/**
 * Curated Stage-only Looks. The public library is deliberately small: three
 * distinct built-ins plus the separate collection of user-saved Looks.
 */
export const BUILT_IN_STAGE_LOOKS: StageLook[] = [
  defineBuiltInStageLook({
    id: "clear",
    name: "Clear",
    description: "Calm motion and crisp, restrained supporting layers.",
    patch: {
      blobs: {
        isEnabled: true,
        baseSizeRatio: 0.09,
        opacity: 0.3,
        blurRadius: 5,
        glowEnabled: false,
        glowIntensity: 0,
        oscillationAmplitude: 0.15,
        driftSpeed: 2,
        vibrationAmplitude: 3,
      },
      ambient: {
        isEnabled: true,
        opacityMajor: 0.28,
        opacityMinor: 0.2,
      },
      particles: { isEnabled: false, count: 0 },
      strings: {
        isEnabled: true,
        baseOpacity: 0.12,
        activeOpacity: 0.42,
        maxAmplitude: 12,
      },
      hilbertScope: {
        sizeRatio: 0.55,
        opacity: 0.7,
        glowEnabled: true,
        glowIntensity: 6,
        history: 0.12,
        smear: 0,
        thickness: 1.5,
      },
    },
  }),
  defineBuiltInStageLook({
    id: "soft",
    name: "Soft",
    description: "Warm, quiet bodies with a broad atmospheric breath.",
    patch: {
      blobs: {
        isEnabled: true,
        baseSizeRatio: 0.09,
        opacity: 0.34,
        blurRadius: 24,
        glowEnabled: true,
        glowIntensity: 10,
        oscillationAmplitude: 0.35,
        driftSpeed: 6,
        vibrationAmplitude: 7,
      },
      ambient: {
        isEnabled: true,
        opacityMajor: 0.5,
        opacityMinor: 0.35,
        brightnessMajor: 0.42,
        brightnessMinor: 0.26,
        saturationMajor: 0.78,
        saturationMinor: 0.58,
      },
      particles: { isEnabled: true, count: 6, speed: 2, gravity: 0.1 },
      strings: {
        isEnabled: true,
        baseOpacity: 0.08,
        activeOpacity: 0.52,
        maxAmplitude: 14,
      },
      hilbertScope: {
        sizeRatio: 0.6,
        opacity: 0.48,
        glowEnabled: true,
        glowIntensity: 8,
        history: 0.2,
        smear: 0,
        thickness: 1.4,
      },
    },
  }),
  defineBuiltInStageLook({
    id: "luminous",
    name: "Luminous",
    description: "A bright spectral field with the primary Scope pushed forward.",
    patch: {
      blobs: {
        isEnabled: true,
        baseSizeRatio: 0.09,
        opacity: 0.42,
        blurRadius: 12,
        glowEnabled: true,
        glowIntensity: 24,
        oscillationAmplitude: 0.55,
        driftSpeed: 8,
        vibrationAmplitude: 12,
      },
      ambient: {
        isEnabled: true,
        opacityMajor: 0.44,
        opacityMinor: 0.28,
      },
      particles: { isEnabled: true, count: 12, speed: 5 },
      strings: {
        isEnabled: true,
        baseOpacity: 0.05,
        activeOpacity: 0.7,
        maxAmplitude: 22,
      },
      hilbertScope: {
        sizeRatio: 0.72,
        opacity: 0.92,
        glowEnabled: true,
        glowIntensity: 30,
        history: 0.82,
        smear: 0.6,
        thickness: 5,
      },
    },
  }),
];
