import { HISTORICAL_VISUAL_DEFAULTS } from "@/data/visual-config-default-history";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { isEditionLook, SHUFFLE } from "@/composables/useEditionFamily";
import { defineCodec } from "@/services/persistenceCodec";
import type { BlobConnectionMode, HarmonicGeometryMode, VisualEffectsConfig } from "@/types/visual";

export const VISUAL_CONFIG_STORAGE_KEY = "emotitone-visual-config";

type LegacyDynamicColors = Partial<
  Omit<VisualEffectsConfig["dynamicColors"], "musicColorMode">
> & {
  chromaticMapping?: boolean;
  musicColorMode?: VisualEffectsConfig["dynamicColors"]["musicColorMode"] | "movable";
  hueAnimationAmplitude?: number;
  saturation?: number;
  baseLightness?: number;
  lightnessRange?: number;
};

type LegacyKeyboardConfig = Partial<VisualEffectsConfig["keyboard"]> & {
  colorMode?: VisualEffectsConfig["keyboard"]["surfaceStyle"];
};

interface LegacyBeatingShapesConfig {
  isEnabled?: boolean;
}

interface LegacyHarmonicConfig {
  isEnabled?: boolean;
  accumulationWindow?: number;
  hideDelay?: number;
  maxNotes?: number;
  showChord?: boolean;
  showIntervals?: boolean;
  showEmotionalDescription?: boolean;
  geometryMode?: string;
  backdropBlur?: number;
  glassmorphOpacity?: number;
  opacity?: number;
}

type LegacyVisualEffectsConfig = Partial<VisualEffectsConfig> & {
  dynamicColors?: LegacyDynamicColors;
  keyboard?: LegacyKeyboardConfig;
  liveStrip?: Partial<VisualEffectsConfig["codeStrip"]>;
  floatingPopup?: LegacyHarmonicConfig;
  beatingShapes?: LegacyBeatingShapesConfig;
};

const LEGACY_HARMONIC_DEFAULTS = {
  accumulationWindow: 500,
  hideDelay: 2000,
} as const;

export function cloneDefaultConfig(): VisualEffectsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as VisualEffectsConfig;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLegacyGeometryMode(value: unknown): HarmonicGeometryMode {
  if (value === "web" || value === "center-only") {
    return "web";
  }

  return "merge";
}

function isBlobConnectionMode(value: unknown): value is BlobConnectionMode {
  return value === "merge" || value === "web";
}

function clampNumber(value: unknown, fallback: number, min: number, max: number) {
  return typeof value === "number" && Number.isFinite(value)
    ? Math.max(min, Math.min(max, value))
    : fallback;
}

function migrateMusicColorConfig(
  incomingSection: Record<string, unknown>,
  mergedSection: Record<string, unknown>,
) {
  const rawMode = incomingSection.musicColorMode;
  if (rawMode === "fixed" || rawMode === "movable-ordinal" || rawMode === "movable-relative") {
    mergedSection.musicColorMode = rawMode;
  } else if (rawMode === "movable") {
    mergedSection.musicColorMode = "movable-ordinal";
  } else if (typeof incomingSection.chromaticMapping === "boolean") {
    mergedSection.musicColorMode = incomingSection.chromaticMapping
      ? "fixed"
      : "movable-ordinal";
  } else {
    mergedSection.musicColorMode = "movable-ordinal";
  }

  mergedSection.recipeVersion = 1;
  mergedSection.hueMotionEnabled = typeof incomingSection.hueMotionEnabled === "boolean"
    ? incomingSection.hueMotionEnabled
    : typeof incomingSection.hueAnimationAmplitude === "number"
      ? incomingSection.hueAnimationAmplitude > 0
      : true;

  const migratedChromaCandidate = typeof incomingSection.saturation === "number"
    ? 0.18 * incomingSection.saturation / 0.8
    : 0.18;
  const migratedChroma = clampNumber(migratedChromaCandidate, 0.18, 0, 0.3);
  mergedSection.chroma = clampNumber(
    incomingSection.chroma,
    migratedChroma,
    0,
    0.3,
  );

  const migratedCenterCandidate = typeof incomingSection.baseLightness === "number"
    ? 0.575 + incomingSection.baseLightness - 0.5
    : 0.575;
  const migratedCenter = clampNumber(migratedCenterCandidate, 0.575, 0.2, 0.9);
  const center = clampNumber(
    incomingSection.lightnessCenter,
    migratedCenter,
    0.2,
    0.9,
  );
  mergedSection.lightnessCenter = center;

  const migratedSpanCandidate = typeof incomingSection.lightnessRange === "number"
    ? 0.6 * incomingSection.lightnessRange / 0.7
    : 0.6;
  const migratedSpan = clampNumber(migratedSpanCandidate, 0.6, 0, 0.7);
  mergedSection.lightnessSpan = clampNumber(
    incomingSection.lightnessSpan,
    migratedSpan,
    0,
    0.7,
  );

  delete mergedSection.chromaticMapping;
  delete mergedSection.hueAnimationAmplitude;
  delete mergedSection.saturation;
  delete mergedSection.baseLightness;
  delete mergedSection.lightnessRange;
}

function migrateLegacyBlobRelationships(
  rawConfig: Record<string, unknown>,
  incomingBlobs: Record<string, unknown>,
  mergedBlobs: Record<string, unknown>
) {
  const legacyHarmonic = rawConfig.floatingPopup;
  const retiredOff = incomingBlobs.connectionMode === "off" || (
    !("connectionMode" in incomingBlobs) &&
    isRecord(legacyHarmonic) &&
    legacyHarmonic.isEnabled === false
  );
  const preserveDisconnectedState = () => {
    if (!retiredOff) return;
    mergedBlobs.connectionMode = DEFAULT_CONFIG.blobs.connectionMode;
    mergedBlobs.fusionStrength = 0;
    mergedBlobs.webOpacity = 0;
  };
  if (!isRecord(legacyHarmonic)) {
    if (!isBlobConnectionMode(mergedBlobs.connectionMode)) {
      mergedBlobs.connectionMode = DEFAULT_CONFIG.blobs.connectionMode;
    }
    preserveDisconnectedState();
    return;
  }

  const copyIfMissing = (newKey: string, legacyKey: string) => {
    if (!(newKey in incomingBlobs) && legacyKey in legacyHarmonic) {
      mergedBlobs[newKey] = legacyHarmonic[legacyKey];
    }
  };

  if (!("connectionMode" in incomingBlobs)) {
    mergedBlobs.connectionMode =
      legacyHarmonic.isEnabled === true
        ? normalizeLegacyGeometryMode(legacyHarmonic.geometryMode)
        : DEFAULT_CONFIG.blobs.connectionMode;
  }

  if (!("analysisHoldTime" in incomingBlobs)) {
    const hasLegacyTiming =
      typeof legacyHarmonic.accumulationWindow === "number" ||
      typeof legacyHarmonic.hideDelay === "number";
    if (hasLegacyTiming) {
      mergedBlobs.analysisHoldTime =
        (typeof legacyHarmonic.accumulationWindow === "number"
          ? legacyHarmonic.accumulationWindow
          : LEGACY_HARMONIC_DEFAULTS.accumulationWindow) +
        (typeof legacyHarmonic.hideDelay === "number"
          ? legacyHarmonic.hideDelay
          : LEGACY_HARMONIC_DEFAULTS.hideDelay);
    }
  }

  copyIfMissing("analysisNoteLimit", "maxNotes");
  copyIfMissing("showChordLabel", "showChord");
  copyIfMissing("showIntervalLabels", "showIntervals");
  copyIfMissing("showEmotionLabel", "showEmotionalDescription");
  copyIfMissing("fieldSoftness", "backdropBlur");
  copyIfMissing("fusionStrength", "glassmorphOpacity");

  if (typeof legacyHarmonic.opacity === "number") {
    if (!("webOpacity" in incomingBlobs)) {
      mergedBlobs.webOpacity = legacyHarmonic.opacity;
    }
    if (!("labelOpacity" in incomingBlobs)) {
      mergedBlobs.labelOpacity = legacyHarmonic.opacity;
    }
  }

  if (!isBlobConnectionMode(mergedBlobs.connectionMode)) {
    mergedBlobs.connectionMode = DEFAULT_CONFIG.blobs.connectionMode;
  }
  preserveDisconnectedState();
}

function migrateLegacySectionKeys(
  sectionName: keyof VisualEffectsConfig,
  incomingSection: Record<string, unknown>,
  mergedSection: Record<string, unknown>
) {
  if (sectionName === "dynamicColors") {
    migrateMusicColorConfig(incomingSection, mergedSection);
  }

  if (sectionName === "keyboard") {
    if (
      !("surfaceStyle" in incomingSection) &&
      typeof incomingSection.colorMode === "string"
    ) {
      mergedSection.surfaceStyle = incomingSection.colorMode;
    }
    // Daily geometry owns key shape; legacy glass settings now use colored paper.
    if (mergedSection.surfaceStyle === "glassmorphism") {
      mergedSection.surfaceStyle = "colored";
    }
    delete mergedSection.colorMode;
  }

  if (sectionName === "codeStrip") {
    const durationMode = mergedSection.durationMode;
    if (durationMode !== "stacked" && durationMode !== "bar" && durationMode !== "hidden") {
      mergedSection.durationMode = DEFAULT_CONFIG.codeStrip.durationMode;
    }
  }

}

export function migrateVisualConfig(
  rawConfig: unknown
): VisualEffectsConfig {
  const migratedConfig = cloneDefaultConfig();
  const migratedConfigRecord = migratedConfig as unknown as Record<string, unknown>;

  if (!isRecord(rawConfig)) {
    return migratedConfig;
  }

  const legacyConfig = rawConfig as LegacyVisualEffectsConfig;

  const canonicalUIBeat = isRecord(rawConfig.uiBeat) ? rawConfig.uiBeat : undefined;
  const legacyUIBeat = isRecord(legacyConfig.beatingShapes)
    ? legacyConfig.beatingShapes
    : undefined;
  const migratedUIBeat = canonicalUIBeat
    ? typeof canonicalUIBeat.isEnabled === "boolean"
      ? canonicalUIBeat
      : typeof legacyUIBeat?.isEnabled === "boolean"
        ? { ...canonicalUIBeat, isEnabled: legacyUIBeat.isEnabled }
        : canonicalUIBeat
    : legacyUIBeat;

  for (const sectionName of Object.keys(
    migratedConfig
  ) as Array<keyof VisualEffectsConfig>) {
    const rawIncomingSection = sectionName === "codeStrip"
      ? rawConfig.codeStrip ?? legacyConfig.liveStrip
      : sectionName === "uiBeat"
        ? migratedUIBeat
        : rawConfig[sectionName];
    const incomingSection =
      sectionName === "blobs" &&
      !isRecord(rawIncomingSection) &&
      isRecord(rawConfig.floatingPopup)
        ? {}
        : rawIncomingSection;
    const defaultSection = migratedConfig[sectionName];

    if (!isRecord(incomingSection) || !isRecord(defaultSection)) {
      continue;
    }

    const mergedSection: Record<string, unknown> = {};
    const defaultSectionRecord = defaultSection as Record<string, unknown>;

    for (const key of Object.keys(defaultSectionRecord)) {
      mergedSection[key] =
        key in incomingSection ? incomingSection[key] : defaultSectionRecord[key];
    }

    migrateLegacySectionKeys(sectionName, incomingSection, mergedSection);
    if (sectionName === "blobs") {
      migrateLegacyBlobRelationships(
        rawConfig,
        incomingSection,
        mergedSection
      );
    }
    migratedConfigRecord[sectionName as string] = mergedSection;
  }

  return migratedConfig;
}


// Reconcile before legacy conversions: an old default such as connectionMode
// "off" must not manufacture fusion/web overrides while being migrated.
function reconcileHistoricalDefaults(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  return Object.fromEntries(Object.entries(raw).map(([section, values]) => [
    section,
    isRecord(values) ? Object.fromEntries(Object.entries(values).filter(([field, value]) =>
      isPerformanceField(section, field) || !HISTORICAL_VISUAL_DEFAULTS[section]?.[field]?.includes(value)
    )) : values,
  ]));
}

export function isPerformanceField(section: string, field: string): boolean {
  return (section === "keyboard" && (field === "mainOctave" || field === "rowCount"))
    || (section === "codeStrip" && field === "bpm");
}

export function visualOverrides(config: VisualEffectsConfig, reconcile = false) {
  const overrides: Record<string, Record<string, unknown>> = {};
  for (const section of Object.keys(DEFAULT_CONFIG) as Array<keyof VisualEffectsConfig>) {
    for (const [field, fallback] of Object.entries(DEFAULT_CONFIG[section])) {
      if (isPerformanceField(section, field)) continue;
      const value = (config[section] as unknown as Record<string, unknown>)[field];
      if (value === fallback || (reconcile && HISTORICAL_VISUAL_DEFAULTS[section]?.[field]?.includes(value))) continue;
      (overrides[section] ??= {})[field] = value;
    }
  }
  return overrides;
}

interface VisualState {
  config: VisualEffectsConfig;
  visualsEnabled: boolean;
  laBasedMinor: boolean;
}

export const visualConfigCodec = defineCodec<VisualState>({
  key: VISUAL_CONFIG_STORAGE_KEY,
  version: 1,
  defaults: () => ({ config: cloneDefaultConfig(), visualsEnabled: true, laBasedMinor: false }),
  decode(data) {
    if (!isRecord(data)) throw new Error("Invalid visual config");
    const config = cloneDefaultConfig();
    const incoming = isRecord(data.config) ? data.config : {};
    for (const section of Object.keys(config) as Array<keyof VisualEffectsConfig>) {
      const values = incoming[section];
      if (!isRecord(values)) continue;
      const target = config[section] as unknown as Record<string, unknown>;
      for (const [field, fallback] of Object.entries(target)) {
        const value = values[field];
        if (isPerformanceField(section, field) || typeof value !== typeof fallback) continue;
        if (typeof value === "number" && !Number.isFinite(value)) continue;
        target[field] = value;
      }
    }
    if (!isEditionLook(config.editions.family)) config.editions.family = SHUFFLE;
    return { config, visualsEnabled: data.visualsEnabled !== false, laBasedMinor: data.laBasedMinor === true };
  },
  encode(state) {
    return {
      config: visualOverrides(state.config),
      ...(state.visualsEnabled ? {} : { visualsEnabled: false }),
      ...(state.laBasedMinor ? { laBasedMinor: true } : {}),
    };
  },
  migrations: {
    0(data) {
      if (!isRecord(data)) throw new Error("Invalid legacy visual config");
      return {
        config: visualOverrides(migrateVisualConfig(reconcileHistoricalDefaults(data.config ?? data)), true),
        visualsEnabled: data.visualsEnabled,
        laBasedMinor: data.laBasedMinor,
      };
    },
  },
});
