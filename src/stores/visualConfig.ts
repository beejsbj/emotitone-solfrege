import { defineStore } from "pinia";
import { computed, ref, reactive, watch, onScopeDispose } from "vue";
import { DEFAULT_CONFIG } from "@/data/visual-config-metadata";
import { BUILT_IN_STAGE_LOOKS } from "@/data/visual-config-presets";
import {
  applyStageLook,
  createSeededStageVariation,
  diffStageLook,
  patchStageControl,
  preserveStageLookPreferences,
  preserveStageVariationPreferences,
  readStageControls,
  resolveStageConfig,
  sanitizeStageLookPatch,
  stageLookFromConfig,
  type StageControlId,
  type StageLookPatch,
  type TransientStageLook,
  STAGE_LOOK_BODY_TIMING_FIELDS,
} from "@/services/stageAppearance";
import {
  readDeckControls,
  readGlobalControls,
  updateDeckControl as applyDeckControl,
  updateGlobalControl as applyGlobalControl,
  type DeckControlId,
  type GlobalControlId,
} from "@/services/configPublicSurface";
import { persistentStorage, type SaveFailureKind } from "@/services/safeStorage";
import type {
  VisualEffectsConfig,
} from "@/types/visual";

import { createPersistedBinding } from "@/services/persistenceCodec";
import { cloneDefaultConfig, isRecord, isPerformanceField, migrateVisualConfig, visualConfigCodec } from "@/services/visualConfigPersistence";
import { useTempoStore, useOctaveStore, useDrawerRowsStore } from "@/stores/performanceSettings";
import { pinEditionLook } from "@/composables/useEditionFamily";
const SAVED_CONFIGS_KEY = "emotitone-saved-configs";
const SAVED_STAGE_LOOKS_KEY = "emotitone-saved-stage-looks";

export interface SavedConfig {
  id: string;
  name: string;
  config: VisualEffectsConfig;
  createdAt: string;
  updatedAt: string;
}

export interface SavedStageLook {
  id: string;
  name: string;
  patch: StageLookPatch;
  createdAt: string;
  updatedAt: string;
}

function migrateSavedConfig(rawSavedConfig: unknown): SavedConfig | null {
  if (!isRecord(rawSavedConfig)) {
    return null;
  }

  const migrated = {
    ...(rawSavedConfig as Omit<SavedConfig, "config">),
    config: migrateVisualConfig((rawSavedConfig as { config?: unknown }).config),
  } as SavedConfig;
  delete (migrated as SavedConfig & { stagePreferences?: unknown }).stagePreferences;
  return migrated;
}

function migrateSavedStageLook(rawLook: unknown): SavedStageLook | null {
  if (!isRecord(rawLook) || typeof rawLook.name !== "string") {
    return null;
  }

  const now = new Date().toISOString();
  const patch = sanitizeStageLookPatch(rawLook.patch);
  // Looks saved before body timing joined the allowlist never stored it, and
  // only a Look can change it now. Like a built-in, an omitted field resolves
  // from the canonical defaults rather than whatever Look was kept before.
  if (patch.blobs) {
    const blobs = patch.blobs as Record<string, unknown>;
    for (const field of STAGE_LOOK_BODY_TIMING_FIELDS) {
      if (typeof blobs[field] !== "number") blobs[field] = DEFAULT_CONFIG.blobs[field];
    }
  }
  return {
    id: typeof rawLook.id === "string" ? rawLook.id : now,
    name: rawLook.name,
    patch,
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
  const tempo = useTempoStore();
  const octave = useOctaveStore();
  const drawerRows = useDrawerRowsStore();
  const persistence = createPersistedBinding(visualConfigCodec);
  // Compatibility accessors keep existing consumers working; the small stores
  // own these values and their persistence. Appearance never saves them.
  const initial = cloneDefaultConfig();
  Object.defineProperty(initial.codeStrip, "bpm", {
    enumerable: true,
    get: () => tempo.value,
    set: (value: number) => { tempo.value = value; },
  });
  Object.defineProperty(initial.keyboard, "mainOctave", {
    enumerable: true,
    get: () => octave.value,
    set: (value: number) => { octave.value = value; },
  });
  Object.defineProperty(initial.keyboard, "rowCount", {
    enumerable: true,
    get: () => drawerRows.value,
    set: (value: number) => { drawerRows.value = value; },
  });
  const assignAppearance = (next: VisualEffectsConfig) => {
    for (const section of Object.keys(next) as Array<keyof VisualEffectsConfig>) {
      for (const [field, value] of Object.entries(next[section])) {
        if (!isPerformanceField(section, field)) {
          (config[section] as unknown as Record<string, unknown>)[field] = value;
        }
      }
    }
  };
  // State
  const config = reactive<VisualEffectsConfig>(initial);
  const visualsEnabled = ref(true);
  // Learn preference: do-based minor is the default, including older saves
  // without this field. La-based covers natural/harmonic/melodic minor,
  // minor pentatonic and minor blues; appearance presets do not change it.
  const laBasedMinor = ref(false);
  const savedConfigs = ref<SavedConfig[]>([]);
  const savedStageLooks = ref<SavedStageLook[]>([]);
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
      const loaded = persistence.load();
      isFreshInstall = persistence.outcome === "empty";
      transientStageLook.value = null;
      assignAppearance(loaded.config);
      visualsEnabled.value = loaded.visualsEnabled;
      laBasedMinor.value = loaded.laBasedMinor;

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

    } catch (error) {
      console.error("Failed to load visual config from localStorage:", error);
      laBasedMinor.value = false;
      assignAppearance(cloneDefaultConfig());
      visualsEnabled.value = true;
      transientStageLook.value = null;
      savedConfigs.value = [];
      savedStageLooks.value = [];
    }

    return isFreshInstall;
  };

  // Save configuration to localStorage
  const saveToStorage = () => {
    if (!persistenceEnabled.value) return;

    try {
      if (persistence.save({ config, visualsEnabled: visualsEnabled.value, laBasedMinor: laBasedMinor.value })) {
        lastSaved.value = new Date().toISOString();
      }
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
    const existingRoot = transientStageLook.value?.variationRoot;
    const rootName = existingRoot?.name ?? transientStageLook.value?.name ?? "Current";
    const rootPatch = existingRoot?.patch ?? stageLookFromConfig(effectiveConfig.value);
    const currentEffective = effectiveConfig.value;
    let rootConfig = applyStageLook(
      config,
      preserveStageVariationPreferences(rootPatch, currentEffective),
    );
    rootConfig = patchStageControl(
      rootConfig,
      "bodiesVisible",
      currentEffective.blobs.isEnabled,
    );

    // Numeric appearance keeps orbiting the same Look instead of random-walking,
    // but an explicit layer off/on edit becomes part of that root.
    if (rootConfig.ambient.isEnabled !== currentEffective.ambient.isEnabled) {
      rootConfig = patchStageControl(
        rootConfig,
        "atmosphereStrength",
        readStageControls(currentEffective).atmosphereStrength,
      );
    }

    if (rootConfig.looper.isEnabled !== currentEffective.looper.isEnabled) {
      rootConfig = patchStageControl(
        rootConfig,
        "looperStrength",
        readStageControls(currentEffective).looperStrength,
      );
    }

    const nextLook = createSeededStageVariation(seed, rootConfig, rootName);
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
    Object.assign(config.strings, defaults.strings);
    Object.assign(config.animation, defaults.animation);
    Object.assign(config.frequencyMapping, defaults.frequencyMapping);
    Object.assign(config.hilbertScope, defaults.hilbertScope);
    Object.assign(config.looper, defaults.looper);
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
    Object.assign(config.editions, defaults.editions);
  };

  const updateDeckControl = (
    control: DeckControlId,
    value: string | boolean,
  ) => {
    applyDeckControl(config, control, value);
  };

  const resetDeck = () => {
    laBasedMinor.value = false;
    resetSection("keyboard");
    resetSection("codeStrip");
  };

  // Explicit saves report back why they failed (null: stored, or persistence
  // is off for an isolated specimen) so the panel can say so at the point of
  // action instead of claiming "saved".
  const persistExplicit = (key: string, value: unknown): SaveFailureKind | null => {
    if (!persistenceEnabled.value) return null;
    let serialized: string;
    try {
      serialized = JSON.stringify(value);
    } catch (error) {
      console.error(`Failed to serialize "${key}":`, error);
      return "unknown";
    }
    return persistentStorage.attempt(key, serialized, { oneOff: true });
  };

  const persistSavedStageLooks = () =>
    persistExplicit(SAVED_STAGE_LOOKS_KEY, savedStageLooks.value);

  const saveStageLookAs = (
    name: string,
  ): { look: SavedStageLook; failure: SaveFailureKind | null } => {
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
    return { look: savedLook, failure: persistSavedStageLooks() };
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

  const applyRuntimeConfig = (nextConfig: unknown) => {
    transientStageLook.value = null;
    // Appearance presets leave the separately owned performance settings alone.
    const migrated = migrateVisualConfig(nextConfig);
    assignAppearance(migrated);
    return migrated;
  };

  // Reset configuration to defaults
  const resetToDefaults = () => {
    applyRuntimeConfig(cloneDefaultConfig());
    visualsEnabled.value = true;
    saveToStorage();
  };

  // Reset a specific section to defaults
  const resetSection = <K extends keyof VisualEffectsConfig>(section: K) => {
    const defaults = cloneDefaultConfig()[section];
    for (const [field, value] of Object.entries(defaults)) {
      if (!isPerformanceField(section, field)) {
        (config[section] as unknown as Record<string, unknown>)[field] = value;
      }
    }
  };

  // Save current config with a name
  const saveConfigAs = (
    name: string,
  ): { savedConfig: SavedConfig; failure: SaveFailureKind | null } => {
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

    return { savedConfig, failure: persistExplicit(SAVED_CONFIGS_KEY, savedConfigs.value) };
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
      persistExplicit(SAVED_CONFIGS_KEY, savedConfigs.value);
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
      laBasedMinor: laBasedMinor.value,
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
        const imported = applyRuntimeConfig(importedData.config);
        tempo.value = imported.codeStrip.bpm;
        octave.value = imported.keyboard.mainOctave;
        drawerRows.value = imported.keyboard.rowCount;
        laBasedMinor.value = importedData.laBasedMinor === true;
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
    persistence.unregister();
    tempo.useEphemeralDefaults();
    octave.useEphemeralDefaults();
    drawerRows.useEphemeralDefaults();
    laBasedMinor.value = false;
    applyRuntimeConfig(cloneDefaultConfig());
    visualsEnabled.value = true;
    savedConfigs.value = [];
    savedStageLooks.value = [];
    transientStageLook.value = null;
    lastSaved.value = null;
  };

  // Note: Manual save is no longer needed - auto-save handles all persistence

  // Watch for changes and auto-save (debounced)
  let saveTimeout: ReturnType<typeof setTimeout> | null = null;
  watch(
    () => persistence.encode({ config, visualsEnabled: visualsEnabled.value, laBasedMinor: laBasedMinor.value }),
    () => {
      if (saveTimeout) clearTimeout(saveTimeout);
      saveTimeout = setTimeout(saveToStorage, 500); // Debounce saves by 500ms
    }
  );

  onScopeDispose(() => {
    persistence.unregister();
    if (saveTimeout) clearTimeout(saveTimeout);
  });

  // Initialize on store creation
  loadFromStorage();

  // The pinned edition family is a visual setting; the edition helper owns
  // how it combines with this load's Shuffle and any review pin.
  watch(() => config.editions.family, pinEditionLook, { immediate: true });

  return {
    // State
    config,
    effectiveConfig,
    stageControls,
    globalControls,
    deckControls,
    visualsEnabled,
    laBasedMinor,
    savedConfigs,
    savedStageLooks,
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
