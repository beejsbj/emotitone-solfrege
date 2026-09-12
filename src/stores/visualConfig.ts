import { defineStore } from "pinia";
import { computed, ref, reactive, watch } from "vue";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { BUILT_IN_STAGE_LOOKS } from "@/data/visual-config-presets";
import {
  applyStageLook,
  createSeededStageLook,
  diffStageLook,
  patchStageControl,
  preserveStageLookPreferences,
  readStageControls,
  resolveStageConfig,
  sanitizeStageLookPatch,
  stageLookFromConfig,
  type StageControlId,
  type StageLookPatch,
  type TransientStageLook,
} from "@/services/stageAppearance";
import {
  readDeckControls,
  readGlobalControls,
  updateDeckControl as applyDeckControl,
  updateGlobalControl as applyGlobalControl,
  type DeckControlId,
  type GlobalControlId,
} from "@/services/configPublicSurface";
import type {
  BlobConnectionMode,
  HarmonicGeometryMode,
  VisualEffectsConfig,
} from "@/types/visual";

const STORAGE_KEY = "emotitone-visual-config";
const SAVED_CONFIGS_KEY = "emotitone-saved-configs";
const SAVED_STAGE_LOOKS_KEY = "emotitone-saved-stage-looks";

export interface SavedConfig {
  id: string;
  name: string;
  config: VisualEffectsConfig;
  stagePreferences?: StagePreferences;
  createdAt: string;
  updatedAt: string;
}

interface StagePreferences {
  newLookOnLaunch: boolean;
}

export interface SavedStageLook {
  id: string;
  name: string;
  patch: StageLookPatch;
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

function migrateSavedConfig(rawSavedConfig: unknown): SavedConfig | null {
  if (!isRecord(rawSavedConfig)) {
    return null;
  }

  return {
    ...(rawSavedConfig as Omit<SavedConfig, "config">),
    config: migrateVisualConfig((rawSavedConfig as { config?: unknown }).config),
    stagePreferences: readStagePreferences(rawSavedConfig.stagePreferences),
  } as SavedConfig;
}

function readStagePreferences(rawPreferences: unknown): StagePreferences | undefined {
  if (
    !isRecord(rawPreferences)
    || typeof rawPreferences.newLookOnLaunch !== "boolean"
  ) {
    return undefined;
  }
  return { newLookOnLaunch: rawPreferences.newLookOnLaunch };
}

function migrateSavedStageLook(rawLook: unknown): SavedStageLook | null {
  if (!isRecord(rawLook) || typeof rawLook.name !== "string") {
    return null;
  }

  const now = new Date().toISOString();
  return {
    id: typeof rawLook.id === "string" ? rawLook.id : now,
    name: rawLook.name,
    patch: sanitizeStageLookPatch(rawLook.patch),
    createdAt: typeof rawLook.createdAt === "string" ? rawLook.createdAt : now,
    updatedAt: typeof rawLook.updatedAt === "string" ? rawLook.updatedAt : now,
  };
}

function createStageLookSeed() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export const useVisualConfigStore = defineStore("visualConfig", () => {
  // State
  const config = reactive<VisualEffectsConfig>(cloneDefaultConfig());
  const visualsEnabled = ref(true);
  const savedConfigs = ref<SavedConfig[]>([]);
  const savedStageLooks = ref<SavedStageLook[]>([]);
  const newLookOnLaunch = ref(false);
  const transientStageLook = ref<TransientStageLook | null>(null);
  const isLoading = ref(false);
  const lastSaved = ref<string | null>(null);
  const persistenceEnabled = ref(true);
  const effectiveConfig = computed(() =>
    resolveStageConfig(config, transientStageLook.value?.patch)
  );
  const stageControls = computed(() => readStageControls(effectiveConfig.value));
  const globalControls = computed(() => readGlobalControls(config));
  const deckControls = computed(() => readDeckControls(config));

  // Load configuration from localStorage on initialization
  const loadFromStorage = () => {
    let isFreshInstall = false;

    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      isFreshInstall = stored === null;
      newLookOnLaunch.value = isFreshInstall;
      transientStageLook.value = null;
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        Object.assign(config, migrateVisualConfig(parsedConfig.config || parsedConfig));
        visualsEnabled.value = parsedConfig.visualsEnabled ?? true;
        newLookOnLaunch.value = typeof parsedConfig.stagePreferences?.newLookOnLaunch === "boolean"
          ? parsedConfig.stagePreferences.newLookOnLaunch
          : false;
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

      const storedStageLooks = localStorage.getItem(SAVED_STAGE_LOOKS_KEY);
      if (storedStageLooks) {
        const parsedStageLooks = JSON.parse(storedStageLooks);
        savedStageLooks.value = Array.isArray(parsedStageLooks)
          ? parsedStageLooks
              .map(migrateSavedStageLook)
              .filter((look): look is SavedStageLook => look != null)
          : [];
      }

      if (newLookOnLaunch.value) {
        transientStageLook.value = createSeededStageLook(
          createStageLookSeed(),
          BUILT_IN_STAGE_LOOKS,
        );
      }
    } catch (error) {
      console.error("Failed to load visual config from localStorage:", error);
      Object.assign(config, cloneDefaultConfig());
      visualsEnabled.value = true;
      newLookOnLaunch.value = false;
      transientStageLook.value = null;
      savedConfigs.value = [];
      savedStageLooks.value = [];
    }

    return isFreshInstall;
  };

  // Save configuration to localStorage
  const saveToStorage = () => {
    if (!persistenceEnabled.value || typeof localStorage === "undefined") return;

    try {
      const dataToStore = {
        config: JSON.parse(JSON.stringify(config)),
        visualsEnabled: visualsEnabled.value,
        stagePreferences: {
          newLookOnLaunch: newLookOnLaunch.value,
        },
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

  const assignStageLookToBacking = (patch: StageLookPatch) => {
    const sanitized = sanitizeStageLookPatch(patch);
    for (const section of Object.keys(sanitized) as Array<keyof StageLookPatch>) {
      Object.assign(config[section], sanitized[section]);
    }
  };

  const updateStageControl = (
    control: StageControlId,
    value: string | number | boolean,
  ) => {
    if (control === "stageEnabled") {
      const next = patchStageControl(config, control, value);
      config.stage.isEnabled = next.stage.isEnabled;
      return;
    }

    if (transientStageLook.value) {
      const nextEffective = patchStageControl(effectiveConfig.value, control, value);
      transientStageLook.value = {
        ...transientStageLook.value,
        name: transientStageLook.value.name.endsWith(" · Edited")
          ? transientStageLook.value.name
          : `${transientStageLook.value.name} · Edited`,
        patch: diffStageLook(config, nextEffective),
      };
      return;
    }

    const next = patchStageControl(config, control, value);
    assignStageLookToBacking(diffStageLook(config, next));
  };

  const previewStageLook = (name: string, patch: StageLookPatch, seed = name) => {
    transientStageLook.value = {
      seed,
      name,
      patch: sanitizeStageLookPatch(patch),
    };
  };

  const applyBuiltInStageLook = (lookId: string) => {
    const look = BUILT_IN_STAGE_LOOKS.find((candidate) => candidate.id === lookId);
    if (!look) return false;
    previewStageLook(
      look.name,
      preserveStageLookPreferences(look.patch, effectiveConfig.value),
      `look-${look.id}`,
    );
    return true;
  };

  const shuffleStageLook = (seed = createStageLookSeed()) => {
    const nextLook = createSeededStageLook(seed, BUILT_IN_STAGE_LOOKS);
    nextLook.patch = preserveStageLookPreferences(
      nextLook.patch,
      effectiveConfig.value,
    );
    transientStageLook.value = nextLook;
    return transientStageLook.value;
  };

  const keepStageLook = () => {
    if (!transientStageLook.value) return false;
    assignStageLookToBacking(transientStageLook.value.patch);
    transientStageLook.value = null;
    saveToStorage();
    return true;
  };

  const clearStageLook = () => {
    transientStageLook.value = null;
  };

  const resetStage = () => {
    const defaults = cloneDefaultConfig();
    transientStageLook.value = null;
    Object.assign(config.stage, defaults.stage);
    Object.assign(config.blobs, defaults.blobs);
    Object.assign(config.ambient, defaults.ambient);
    Object.assign(config.particles, defaults.particles);
    Object.assign(config.strings, defaults.strings);
    Object.assign(config.animation, defaults.animation);
    Object.assign(config.frequencyMapping, defaults.frequencyMapping);
    Object.assign(config.hilbertScope, defaults.hilbertScope);
  };

  const updateGlobalControl = (
    control: GlobalControlId,
    value: string | boolean,
  ) => {
    applyGlobalControl(config, control, value);
  };

  const resetGlobal = () => {
    const defaults = cloneDefaultConfig();
    Object.assign(config.dynamicColors, defaults.dynamicColors);
    Object.assign(config.uiBeat, defaults.uiBeat);
  };

  const updateDeckControl = (
    control: DeckControlId,
    value: string | boolean,
  ) => {
    applyDeckControl(config, control, value);
  };

  const resetDeck = () => {
    const defaults = cloneDefaultConfig();
    const { mainOctave, rowCount } = config.keyboard;
    const { bpm } = config.codeStrip;

    Object.assign(config.keyboard, defaults.keyboard, { mainOctave, rowCount });
    Object.assign(config.codeStrip, defaults.codeStrip, { bpm });
  };

  const persistSavedStageLooks = () => {
    if (!persistenceEnabled.value || typeof localStorage === "undefined") return;
    try {
      localStorage.setItem(SAVED_STAGE_LOOKS_KEY, JSON.stringify(savedStageLooks.value));
    } catch (error) {
      console.error("Failed to save Stage Looks to localStorage:", error);
    }
  };

  const saveStageLookAs = (name: string): SavedStageLook => {
    const now = new Date().toISOString();
    // Save the composed appearance before the Stage master applies its
    // temporary runtime suppression to supporting layers.
    const composedAppearance = applyStageLook(
      config,
      transientStageLook.value?.patch,
    );
    const savedLook: SavedStageLook = {
      id: Date.now().toString(),
      name,
      patch: stageLookFromConfig(composedAppearance),
      createdAt: now,
      updatedAt: now,
    };
    savedStageLooks.value.push(savedLook);
    persistSavedStageLooks();
    return savedLook;
  };

  const loadSavedStageLook = (lookId: string) => {
    const look = savedStageLooks.value.find((candidate) => candidate.id === lookId);
    if (!look) return false;
    previewStageLook(look.name, look.patch, `saved-${look.id}`);
    return true;
  };

  const deleteSavedStageLook = (lookId: string) => {
    const index = savedStageLooks.value.findIndex((candidate) => candidate.id === lookId);
    if (index < 0) return false;
    savedStageLooks.value.splice(index, 1);
    persistSavedStageLooks();
    return true;
  };

  const setNewLookOnLaunch = (enabled: boolean) => {
    newLookOnLaunch.value = enabled;
    saveToStorage();
  };

  const applyRuntimeConfig = (nextConfig: unknown) => {
    const rowCount = config.keyboard.rowCount;
    transientStageLook.value = null;
    Object.assign(config, migrateVisualConfig(nextConfig));
    // Drawer allocation is the runtime authority for row count. Loading or
    // resetting visual presets must not resize the keyboard behind its handle.
    config.keyboard.rowCount = rowCount;
  };

  // Reset configuration to defaults
  const resetToDefaults = () => {
    applyRuntimeConfig(cloneDefaultConfig());
    visualsEnabled.value = true;
    newLookOnLaunch.value = false;
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
      stagePreferences: {
        newLookOnLaunch: newLookOnLaunch.value,
      },
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
      newLookOnLaunch.value = savedConfig.stagePreferences?.newLookOnLaunch ?? false;
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
      stagePreferences: {
        newLookOnLaunch: newLookOnLaunch.value,
      },
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
        const importedStagePreferences = readStagePreferences(
          importedData.stagePreferences,
        );
        newLookOnLaunch.value = importedStagePreferences?.newLookOnLaunch ?? false;
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
    savedStageLooks.value = [];
    newLookOnLaunch.value = false;
    transientStageLook.value = null;
    lastSaved.value = null;
  };

  // Note: Manual save is no longer needed - auto-save handles all persistence

  // Watch for changes and auto-save (debounced)
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  watch(
    [config, visualsEnabled, newLookOnLaunch],
    () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveToStorage, 500); // Debounce saves by 500ms
    },
    { deep: true }
  );

  // Initialize on store creation
  loadFromStorage();

  return {
    // State
    config,
    effectiveConfig,
    stageControls,
    globalControls,
    deckControls,
    visualsEnabled,
    savedConfigs,
    savedStageLooks,
    newLookOnLaunch,
    transientStageLook,
    isLoading,
    lastSaved,

    // Actions
    updateConfig,
    updateValue,
    updateStageControl,
    applyBuiltInStageLook,
    shuffleStageLook,
    keepStageLook,
    clearStageLook,
    resetStage,
    updateGlobalControl,
    resetGlobal,
    updateDeckControl,
    resetDeck,
    saveStageLookAs,
    loadSavedStageLook,
    deleteSavedStageLook,
    setNewLookOnLaunch,
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
