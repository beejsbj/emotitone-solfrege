import { defineStore } from "pinia";
import { ref, reactive, watch } from "vue";
import { DEFAULT_CONFIG } from "@/composables/useVisualConfig";
import type { VisualEffectsConfig } from "@/types/visual";

const STORAGE_KEY = "emotitone-visual-config";
const SAVED_CONFIGS_KEY = "emotitone-saved-configs";

export interface SavedConfig {
  id: string;
  name: string;
  config: VisualEffectsConfig;
  createdAt: string;
  updatedAt: string;
}

export const useVisualConfigStore = defineStore("visualConfig", () => {
  // State
  const config = reactive<VisualEffectsConfig>({ ...DEFAULT_CONFIG });
  const visualsEnabled = ref(true);
  const savedConfigs = ref<SavedConfig[]>([]);
  const isLoading = ref(false);
  const lastSaved = ref<string | null>(null);

  // Load configuration from localStorage on initialization
  const loadFromStorage = () => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsedConfig = JSON.parse(stored);
        Object.assign(config, parsedConfig.config || parsedConfig);
        visualsEnabled.value = parsedConfig.visualsEnabled ?? true;
      }

      const storedSavedConfigs = localStorage.getItem(SAVED_CONFIGS_KEY);
      if (storedSavedConfigs) {
        savedConfigs.value = JSON.parse(storedSavedConfigs);
      }
    } catch (error) {
      console.error("Failed to load visual config from localStorage:", error);
      resetToDefaults();
    }
  };

  // Save configuration to localStorage
  const saveToStorage = () => {
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
    Object.assign(config[section], updates);
  };

  // Update a specific value in a section
  const updateValue = (sectionName: string, key: string, value: any) => {
    if (config[sectionName as keyof VisualEffectsConfig]) {
      (config[sectionName as keyof VisualEffectsConfig] as any)[key] = value;
    }
  };

  // Reset configuration to defaults
  const resetToDefaults = () => {
    Object.assign(config, JSON.parse(JSON.stringify(DEFAULT_CONFIG)));
    visualsEnabled.value = true;
    saveToStorage();
  };

  // Reset a specific section to defaults
  const resetSection = <K extends keyof VisualEffectsConfig>(section: K) => {
    Object.assign(
      config[section],
      JSON.parse(JSON.stringify(DEFAULT_CONFIG[section]))
    );
  };

  // Save current config with a name
  const saveConfigAs = (name: string): SavedConfig => {
    const id = Date.now().toString();
    const now = new Date().toISOString();

    const savedConfig: SavedConfig = {
      id,
      name,
      config: JSON.parse(JSON.stringify(config)),
      createdAt: now,
      updatedAt: now,
    };

    savedConfigs.value.push(savedConfig);

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
      Object.assign(config, JSON.parse(JSON.stringify(savedConfig.config)));
      saveToStorage();
    }
  };

  // Delete a saved config
  const deleteSavedConfig = (configId: string) => {
    const index = savedConfigs.value.findIndex((c) => c.id === configId);
    if (index > -1) {
      savedConfigs.value.splice(index, 1);
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
    return JSON.parse(JSON.stringify(config));
  };

  // Load configuration from a snapshot
  const loadConfigSnapshot = (snapshot: VisualEffectsConfig) => {
    Object.assign(config, JSON.parse(JSON.stringify(snapshot)));
    saveToStorage();
  };

  // Export current config as JSON
  const exportConfig = () => {
    const configData = {
      config: getConfigSnapshot(),
      visualsEnabled: visualsEnabled.value,
      exportedAt: new Date().toISOString(),
      version: "1.0.0",
    };

    return JSON.stringify(configData, null, 2);
  };

  // Import config from JSON
  const importConfig = (jsonData: string) => {
    try {
      const importedData = JSON.parse(jsonData);
      if (importedData.config) {
        Object.assign(config, importedData.config);
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

  // Note: Manual save is no longer needed - auto-save handles all persistence

  // Watch for changes and auto-save (debounced)
  let saveTimeout: number | null = null;
  watch(
    [config, visualsEnabled],
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
    saveToStorage,
    loadFromStorage,
  };
});
