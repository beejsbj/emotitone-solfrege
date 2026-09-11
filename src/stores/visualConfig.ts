import { defineStore } from "pinia";
import { ref, reactive, watch } from "vue";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import type {
  BlobConnectionMode,
  HarmonicGeometryMode,
  VisualEffectsConfig,
} from "@/types/visual";

const STORAGE_KEY = "emotitone-visual-config";
const SAVED_CONFIGS_KEY = "emotitone-saved-configs";

export interface SavedConfig {
  id: string;
  name: string;
  config: VisualEffectsConfig;
  createdAt: string;
  updatedAt: string;
}

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
};

const LEGACY_HARMONIC_DEFAULTS = {
  accumulationWindow: 500,
  hideDelay: 2000,
} as const;

function cloneDefaultConfig(): VisualEffectsConfig {
  return JSON.parse(JSON.stringify(DEFAULT_CONFIG)) as VisualEffectsConfig;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function normalizeLegacyGeometryMode(value: unknown): HarmonicGeometryMode {
  if (value === "web" || value === "center-only") {
    return "web";
  }

  return "merge";
}

function isBlobConnectionMode(value: unknown): value is BlobConnectionMode {
  return value === "off" || value === "merge" || value === "web";
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
  if (!isRecord(legacyHarmonic)) {
    if (!isBlobConnectionMode(mergedBlobs.connectionMode)) {
      mergedBlobs.connectionMode = "off";
    }
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
        : "off";
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
    mergedBlobs.connectionMode = "off";
  }
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

}

function migrateVisualConfig(
  rawConfig: unknown
): VisualEffectsConfig {
  const migratedConfig = cloneDefaultConfig();
  const migratedConfigRecord = migratedConfig as unknown as Record<string, unknown>;

  if (!isRecord(rawConfig)) {
    return migratedConfig;
  }

  const legacyConfig = rawConfig as LegacyVisualEffectsConfig;

  for (const sectionName of Object.keys(
    migratedConfig
  ) as Array<keyof VisualEffectsConfig>) {
    const rawIncomingSection = sectionName === "codeStrip"
      ? rawConfig.codeStrip ?? legacyConfig.liveStrip
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

function migrateSavedConfig(rawSavedConfig: unknown): SavedConfig | null {
  if (!isRecord(rawSavedConfig)) {
    return null;
  }

  return {
    ...(rawSavedConfig as Omit<SavedConfig, "config">),
    config: migrateVisualConfig((rawSavedConfig as { config?: unknown }).config),
  } as SavedConfig;
}

export const useVisualConfigStore = defineStore("visualConfig", () => {
  // State
  const config = reactive<VisualEffectsConfig>(cloneDefaultConfig());
  const visualsEnabled = ref(true);
  const savedConfigs = ref<SavedConfig[]>([]);
  const isLoading = ref(false);
  const lastSaved = ref<string | null>(null);
  const persistenceEnabled = ref(true);

  // Load configuration from localStorage on initialization
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        Object.assign(config, migrateVisualConfig(parsedConfig.config || parsedConfig));
        visualsEnabled.value = parsedConfig.visualsEnabled ?? true;
      }

      const storedSavedConfigs = localStorage.getItem(SAVED_CONFIGS_KEY);
      if (storedSavedConfigs) {
        const parsedSavedConfigs = JSON.parse(storedSavedConfigs);
        savedConfigs.value = Array.isArray(parsedSavedConfigs)
          ? parsedSavedConfigs
              .map(migrateSavedConfig)
              .filter((savedConfig): savedConfig is SavedConfig => savedConfig != null)
          : [];
      }
    } catch (error) {
      console.error("Failed to load visual config from localStorage:", error);
      resetToDefaults();
    }
  };

  // Save configuration to localStorage
  const saveToStorage = () => {
    if (!persistenceEnabled.value) return;

    try {
      const dataToStore = {
        config: JSON.parse(JSON.stringify(config)),
        visualsEnabled: visualsEnabled.value,
        lastSaved: new Date().toISOString(),
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToStore));
      lastSaved.value = dataToStore.lastSaved;
    } catch (error) {
      console.error("Failed to save visual config to localStorage:", error);
    }
  };

  // Update a specific configuration section
  const updateConfig = <K extends keyof VisualEffectsConfig>(
    section: K,
    updates: Partial<VisualEffectsConfig[K]>
  ) => {
    if (!config[section]) {
      config[section] = cloneDefaultConfig()[section];
    }
    Object.assign(config[section], updates);
  };

  // Update a specific value in a section
  const updateValue = (sectionName: string, key: string, value: any) => {
    if (config[sectionName as keyof VisualEffectsConfig]) {
      (config[sectionName as keyof VisualEffectsConfig] as any)[key] = value;
    }
  };

  const applyRuntimeConfig = (nextConfig: unknown) => {
    const rowCount = config.keyboard.rowCount;
    Object.assign(config, migrateVisualConfig(nextConfig));
    // Drawer allocation is the runtime authority for row count. Loading or
    // resetting visual presets must not resize the keyboard behind its handle.
    config.keyboard.rowCount = rowCount;
  };

  // Reset configuration to defaults
  const resetToDefaults = () => {
    applyRuntimeConfig(cloneDefaultConfig());
    visualsEnabled.value = true;
    saveToStorage();
  };

  // Reset a specific section to defaults
  const resetSection = <K extends keyof VisualEffectsConfig>(section: K) => {
    if (section === "keyboard") {
      const rowCount = config.keyboard.rowCount;
      Object.assign(config.keyboard, cloneDefaultConfig().keyboard);
      config.keyboard.rowCount = rowCount;
      return;
    }
    Object.assign(
      config[section],
      cloneDefaultConfig()[section]
    );
  };

  // Save current config with a name
  const saveConfigAs = (name: string): SavedConfig => {
    const id = Date.now().toString();
    const now = new Date().toISOString();

    const savedConfig: SavedConfig = {
      id,
      name,
      config: getConfigSnapshot(),
      createdAt: now,
      updatedAt: now,
    };

    savedConfigs.value.push(savedConfig);

    if (!persistenceEnabled.value) return savedConfig;

    try {
      localStorage.setItem(
        SAVED_CONFIGS_KEY,
        JSON.stringify(savedConfigs.value)
      );
    } catch (error) {
      console.error("Failed to save config to localStorage:", error);
    }

    return savedConfig;
  };

  // Load a saved config
  const loadSavedConfig = (configId: string) => {
    const savedConfig = savedConfigs.value.find((c) => c.id === configId);
    if (savedConfig) {
      applyRuntimeConfig(savedConfig.config);
      saveToStorage();
    }
  };

  // Delete a saved config
  const deleteSavedConfig = (configId: string) => {
    const index = savedConfigs.value.findIndex((c) => c.id === configId);
    if (index > -1) {
      savedConfigs.value.splice(index, 1);
      if (!persistenceEnabled.value) return;

      try {
        localStorage.setItem(
          SAVED_CONFIGS_KEY,
          JSON.stringify(savedConfigs.value)
        );
      } catch (error) {
        console.error("Failed to update saved configs in localStorage:", error);
      }
    }
  };

  // Enable/disable all visuals
  const toggleAllVisuals = () => {
    visualsEnabled.value = !visualsEnabled.value;
    saveToStorage();
  };

  const setVisualsEnabled = (enabled: boolean) => {
    visualsEnabled.value = enabled;
    saveToStorage();
  };

  // Get a deep copy of the current configuration
  const getConfigSnapshot = (): VisualEffectsConfig => {
    return migrateVisualConfig(JSON.parse(JSON.stringify(config)));
  };

  // Load configuration from a snapshot
  const loadConfigSnapshot = (snapshot: VisualEffectsConfig) => {
    applyRuntimeConfig(snapshot);
    saveToStorage();
  };

  // Export current config as JSON
  const exportConfig = () => {
    const configData = {
      config: getConfigSnapshot(),
      visualsEnabled: visualsEnabled.value,
      exportedAt: new Date().toISOString(),
      version: "2.0.0",
    };

    return JSON.stringify(configData, null, 2);
  };

  // Import config from JSON
  const importConfig = (jsonData: string) => {
    try {
      const importedData = JSON.parse(jsonData);
      if (importedData.config) {
        applyRuntimeConfig(importedData.config);
        if (typeof importedData.visualsEnabled === "boolean") {
          visualsEnabled.value = importedData.visualsEnabled;
        }
        saveToStorage();
        return true;
      }
    } catch (error) {
      console.error("Failed to import config:", error);
    }
    return false;
  };

  const useEphemeralDefaults = () => {
    persistenceEnabled.value = false;
    applyRuntimeConfig(cloneDefaultConfig());
    visualsEnabled.value = true;
    savedConfigs.value = [];
    lastSaved.value = null;
  };

  // Note: Manual save is no longer needed - auto-save handles all persistence

  // Watch for changes and auto-save (debounced)
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  watch(
    [config, visualsEnabled],
    () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveToStorage, 500); // Debounce saves by 500ms
    },
    { deep: true }
  );

  // Watch specifically for pattern config changes and sync to pattern service
  watch(
    () => config.patterns,
    (newPatternsConfig) => {
      // Pattern config sync removed (pattern service deprecated)
    },
    { deep: true, immediate: true }
  );

  // Initialize on store creation
  loadFromStorage();

  return {
    // State
    config,
    visualsEnabled,
    savedConfigs,
    isLoading,
    lastSaved,

    // Actions
    updateConfig,
    updateValue,
    resetToDefaults,
    resetSection,
    saveConfigAs,
    loadSavedConfig,
    deleteSavedConfig,
    toggleAllVisuals,
    setVisualsEnabled,
    getConfigSnapshot,
    loadConfigSnapshot,
    exportConfig,
    importConfig,
    useEphemeralDefaults,
    saveToStorage,
    loadFromStorage,
  };
});
