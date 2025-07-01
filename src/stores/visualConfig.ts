import { defineStore } from "pinia";
import { ref, reactive } from "vue";
import type {
  VisualEffectsConfig,
  ConfigFieldDef,
  ConfigSectionDef,
  ConfigDefinitions,
} from "@/types/config";
import { extractConfigValues } from "@/utils/configHelpers";

export interface SavedConfig {
  id: string;
  name: string;
  config: VisualEffectsConfig;
  createdAt: string;
  updatedAt: string;
}

// Single source of truth: config values + metadata combined
export const CONFIG_DEFINITIONS: ConfigDefinitions = {
  blobs: {
    icon: "🫧",
    label: "Blob Effects",
    description: "Animated blob shapes that respond to musical notes",
    fields: {
      isEnabled: { value: true, label: "Enable Blobs" },
      baseSizeRatio: {
        value: 0.4,
        label: "Base Size Ratio",
        min: 0.1,
        max: 1,
        step: 0.05,
        unit: "%",
        description: "Size ratio relative to screen dimensions",
      },
      minSize: {
        value: 300,
        label: "Min Size",
        min: 50,
        max: 500,
        step: 25,
        unit: "px",
      },
      maxSize: {
        value: 800,
        label: "Max Size",
        min: 200,
        max: 1200,
        step: 50,
        unit: "px",
      },
      opacity: {
        value: 0.4,
        label: "Opacity",
        min: 0,
        max: 1,
        step: 0.05,
        unit: "%",
      },
      blurRadius: {
        value: 60,
        label: "Blur Radius",
        min: 0,
        max: 100,
        step: 5,
        unit: "px",
      },
      oscillationAmplitude: {
        value: 1,
        label: "Oscillation",
        min: 0,
        max: 1,
        step: 0.02,
      },
      fadeOutDuration: {
        value: 1.5,
        label: "Fade Out",
        min: 0.1,
        max: 5,
        step: 0.1,
        unit: "s",
      },
      scaleInDuration: {
        value: 0.3,
        label: "Scale In",
        min: 0.1,
        max: 2,
        step: 0.1,
        unit: "s",
      },
      scaleOutDuration: {
        value: 0.4,
        label: "Scale Out",
        min: 0.1,
        max: 2,
        step: 0.1,
        unit: "s",
      },
      driftSpeed: {
        value: 10,
        label: "Drift Speed",
        min: 0,
        max: 100,
        step: 2,
        unit: "px/s",
      },
      vibrationFrequencyDivisor: {
        value: 80,
        label: "Vibration Freq",
        min: 10,
        max: 500,
        step: 5,
      },
      edgeSegments: {
        value: 48,
        label: "Edge Segments",
        min: 16,
        max: 64,
        step: 4,
      },
      vibrationAmplitude: {
        value: 15,
        label: "Vibration",
        min: 0,
        max: 50,
        step: 1,
        unit: "px",
      },
      glowEnabled: { value: true, label: "Enable Glow" },
      glowIntensity: {
        value: 10,
        label: "Glow Intensity",
        min: 0,
        max: 20,
        step: 1,
        unit: "px",
      },
    },
  },

  ambient: {
    icon: "🌅",
    label: "Ambient Effects",
    description: "Background lighting effects based on musical mode",
    fields: {
      isEnabled: { value: true, label: "Enable Ambient" },
      opacityMajor: {
        value: 0.6,
        label: "Major Opacity",
        min: 0,
        max: 1,
        step: 0.05,
        unit: "%",
      },
      opacityMinor: {
        value: 0.4,
        label: "Minor Opacity",
        min: 0,
        max: 1,
        step: 0.05,
        unit: "%",
      },
      brightnessMajor: {
        value: 0.5,
        label: "Major Brightness",
        min: 0,
        max: 1,
        step: 0.05,
        unit: "%",
      },
      brightnessMinor: {
        value: 0.3,
        label: "Minor Brightness",
        min: 0,
        max: 1,
        step: 0.05,
        unit: "%",
      },
      saturationMajor: {
        value: 0.8,
        label: "Major Saturation",
        min: 0,
        max: 1,
        step: 0.05,
        unit: "%",
      },
      saturationMinor: {
        value: 0.6,
        label: "Minor Saturation",
        min: 0,
        max: 1,
        step: 0.05,
        unit: "%",
      },
    },
  },

  particles: {
    icon: "✨",
    label: "Particle System",
    description: "Floating particles that emit from played notes",
    fields: {
      isEnabled: { value: true, label: "Enable Particles" },
      count: { value: 10, label: "Particle Count", min: 0, max: 100, step: 5 },
      sizeMin: {
        value: 2,
        label: "Min Size",
        min: 1,
        max: 20,
        step: 1,
        unit: "px",
      },
      sizeMax: {
        value: 6,
        label: "Max Size",
        min: 1,
        max: 20,
        step: 1,
        unit: "px",
      },
      lifetimeMin: {
        value: 2000,
        label: "Min Lifetime",
        min: 500,
        max: 10000,
        step: 250,
        unit: "ms",
      },
      lifetimeMax: {
        value: 3000,
        label: "Max Lifetime",
        min: 500,
        max: 10000,
        step: 250,
        unit: "ms",
      },
      speed: {
        value: 4,
        label: "Speed",
        min: 0,
        max: 20,
        step: 0.5,
        unit: "px/s",
      },
      gravity: { value: 0, label: "Gravity", min: -5, max: 5, step: 0.1 },
      airResistance: {
        value: 0.99,
        label: "Air Resistance",
        min: 0.9,
        max: 1,
        step: 0.01,
        unit: "%",
      },
    },
  },

  strings: {
    icon: "🎸",
    label: "String Visualization",
    description: "Vibrating string animations across the screen",
    fields: {
      isEnabled: { value: true, label: "Enable Strings" },
      count: { value: 8, label: "String Count", min: 1, max: 16, step: 1 },
      baseOpacity: {
        value: 0.05,
        label: "Base Opacity",
        min: 0,
        max: 1,
        step: 0.05,
        unit: "%",
      },
      activeOpacity: {
        value: 0.9,
        label: "Active Opacity",
        min: 0,
        max: 1,
        step: 0.05,
        unit: "%",
      },
      maxAmplitude: {
        value: 15,
        label: "Max Amplitude",
        min: 1,
        max: 100,
        step: 1,
        unit: "px",
      },
      dampingFactor: {
        value: 0.08,
        label: "Damping",
        min: 0.01,
        max: 0.5,
        step: 0.01,
      },
      interpolationSpeed: {
        value: 0.15,
        label: "Interpolation",
        min: 0.01,
        max: 1,
        step: 0.01,
      },
      opacityInterpolationSpeed: {
        value: 0.1,
        label: "Opacity Fade",
        min: 0.01,
        max: 1,
        step: 0.01,
      },
    },
  },

  fontOscillation: {
    icon: "📝",
    label: "Font Oscillation",
    description: "Dynamic font weight changes based on audio frequency",
    fields: {
      isEnabled: { value: false, label: "Enable Font Oscillation" },
      sm: {
        value: { amplitude: 50, baseWeight: 400 },
        label: "Small Size",
        disabled: true, // Complex object - disable for now
      },
      md: {
        value: { amplitude: 100, baseWeight: 500 },
        label: "Medium Size",
        disabled: true, // Complex object - disable for now
      },
      lg: {
        value: { amplitude: 150, baseWeight: 600 },
        label: "Large Size",
        disabled: true, // Complex object - disable for now
      },
      full: {
        value: { amplitude: 400, baseWeight: 500 },
        label: "Full Range",
        disabled: true, // Complex object - disable for now
      },
    },
  },

  animation: {
    icon: "🎬",
    label: "Animation Settings",
    description: "Global animation timing and performance settings",
    fields: {
      visualFrequencyDivisor: {
        value: 100,
        label: "Freq Divisor",
        min: 10,
        max: 1000,
        step: 10,
      },
      frameRate: {
        value: 60,
        label: "Frame Rate",
        min: 30,
        max: 120,
        step: 15,
        unit: "fps",
      },
      smoothingFactor: {
        value: 0.1,
        label: "Smoothing",
        min: 0.01,
        max: 1,
        step: 0.01,
      },
    },
  },

  frequencyMapping: {
    icon: "🎵",
    label: "Frequency Mapping",
    description: "Audio frequency to visual parameter mapping",
    fields: {
      minFreq: {
        value: 200,
        label: "Min Frequency",
        min: 50,
        max: 500,
        step: 10,
        unit: "Hz",
      },
      maxFreq: {
        value: 600,
        label: "Max Frequency",
        min: 200,
        max: 2000,
        step: 50,
        unit: "Hz",
      },
      minValue: {
        value: 400,
        label: "Min Value",
        min: 100,
        max: 800,
        step: 25,
      },
      maxValue: {
        value: 700,
        label: "Max Value",
        min: 200,
        max: 1000,
        step: 25,
      },
    },
  },

  dynamicColors: {
    icon: "🌈",
    label: "Dynamic Colors",
    description: "Animated color system based on musical intervals",
    fields: {
      isEnabled: { value: true, label: "Enable Dynamic Colors" },
      chromaticMapping: { value: false, label: "Chromatic (12 vs 7 notes)" },
      hueAnimationAmplitude: {
        value: 15,
        label: "Hue Animation",
        min: 5,
        max: 30,
        step: 5,
        unit: "°",
      },
      animationSpeed: {
        value: 1,
        label: "Animation Speed",
        min: 0.1,
        max: 3,
        step: 0.1,
        formatValue: (val: number) => `${val}x`,
      },
      saturation: {
        value: 0.8,
        label: "Saturation",
        min: 0.3,
        max: 1,
        step: 0.1,
        unit: "%",
      },
      baseLightness: {
        value: 0.5,
        label: "Base Lightness",
        min: 0.3,
        max: 0.7,
        step: 0.05,
        unit: "%",
      },
      lightnessRange: {
        value: 0.7,
        label: "Lightness Range",
        min: 0.3,
        max: 0.8,
        step: 0.05,
        unit: "%",
      },
    },
  },

  palette: {
    icon: "🎹",
    label: "Palette Effects",
    description: "Visual effects for the solfege palette interface",
    fields: {
      isEnabled: { value: true, label: "Enable Palette FX" },
      gradientDirection: {
        value: 225,
        label: "Gradient Direction",
        min: 0,
        max: 360,
        step: 15,
        unit: "°",
      },
      useGlassmorphism: { value: true, label: "Glassmorphism" },
      glassmorphOpacity: {
        value: 0.4,
        label: "Glass Opacity",
        min: 0,
        max: 1,
        step: 0.05,
        unit: "%",
      },
    },
  },

  floatingPopup: {
    icon: "💬",
    label: "Floating Popup",
    description: "Information popup for played chords and intervals",
    fields: {
      isEnabled: { value: true, label: "Enable Popup" },
      accumulationWindow: {
        value: 500,
        label: "Accumulation",
        min: 100,
        max: 2000,
        step: 50,
        unit: "ms",
      },
      hideDelay: {
        value: 2000,
        label: "Hide Delay",
        min: 500,
        max: 10000,
        step: 250,
        unit: "ms",
      },
      maxNotes: {
        value: 7,
        label: "Max Notes",
        min: 1,
        max: 12,
        step: 1,
        formatValue: (val: number) => `${val} notes`,
      },
      showChord: { value: true, label: "Show Chords" },
      showIntervals: { value: true, label: "Show Intervals" },
      showEmotionalDescription: { value: true, label: "Show Emotions" },
      backdropBlur: {
        value: 12,
        label: "Backdrop Blur",
        min: 0,
        max: 50,
        step: 2,
        unit: "px",
      },
      glassmorphOpacity: {
        value: 0.4,
        label: "Glass Opacity",
        min: 0,
        max: 1,
        step: 0.05,
        unit: "%",
      },
      animationDuration: {
        value: 300,
        label: "Animation",
        min: 100,
        max: 1000,
        step: 50,
        unit: "ms",
      },
    },
  },
};

// Extract default config from definitions for backwards compatibility
const DEFAULT_CONFIG = extractConfigValues(
  CONFIG_DEFINITIONS
) as VisualEffectsConfig;

export const useVisualConfigStore = defineStore(
  "visualConfig",
  () => {
    // State
    const config = reactive<VisualEffectsConfig>({ ...DEFAULT_CONFIG });
    const visualsEnabled = ref(true);
    const savedConfigs = ref<SavedConfig[]>([]);
    const isLoading = ref(false);

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
      return savedConfig;
    };

    // Load a saved config
    const loadSavedConfig = (configId: string) => {
      const savedConfig = savedConfigs.value.find((c) => c.id === configId);
      if (savedConfig) {
        Object.assign(config, JSON.parse(JSON.stringify(savedConfig.config)));
      }
    };

    // Delete a saved config
    const deleteSavedConfig = (configId: string) => {
      const index = savedConfigs.value.findIndex((c) => c.id === configId);
      if (index > -1) {
        savedConfigs.value.splice(index, 1);
      }
    };

    // Enable/disable all visuals
    const toggleAllVisuals = () => {
      visualsEnabled.value = !visualsEnabled.value;
    };

    const setVisualsEnabled = (enabled: boolean) => {
      visualsEnabled.value = enabled;
    };

    // Get a deep copy of the current configuration
    const getConfigSnapshot = (): VisualEffectsConfig => {
      return JSON.parse(JSON.stringify(config));
    };

    // Load configuration from a snapshot
    const loadConfigSnapshot = (snapshot: VisualEffectsConfig) => {
      Object.assign(config, JSON.parse(JSON.stringify(snapshot)));
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
          return true;
        }
      } catch (error) {
        console.error("Failed to import config:", error);
      }
      return false;
    };

    return {
      // State
      config,
      visualsEnabled,
      savedConfigs,
      isLoading,

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
    };
  },
  {
    persist: {
      key: "emotitone-visual-config",
      pick: ["config", "visualsEnabled", "savedConfigs"],
    },
  }
);
