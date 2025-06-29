<template>
  <div v-if="showPanel" class="debug-panel">
    <!-- Sticky Header -->
    <div class="debug-header">
      <h3>
        <Settings :size="16" />
        Config
      </h3>

      <button @click="togglePanel" class="close-btn" title="Close Panel">
        <X :size="18" />
      </button>
    </div>

    <div class="debug-content">
      <!-- Global Controls -->
      <div class="global-controls">
        <div class="config-row global-toggle">
          <label class="toggle-label">
            <input
              type="checkbox"
              :checked="visualsEnabled"
              @change="
                setVisualsEnabled(
                  ($event.target as HTMLInputElement)?.checked ?? false
                )
              "
              class="toggle-checkbox"
            />
            <span class="toggle-slider"></span>
            Enable All Visuals
          </label>
        </div>

        <div v-if="lastSaved" class="last-saved">
          Last saved: {{ formatLastSaved(lastSaved) }}
        </div>
      </div>

      <!-- Auto-generated sections -->
      <div
        v-for="(sectionConfig, sectionName) in configSections"
        :key="sectionName"
        class="config-section"
        :class="{ disabled: !visualsEnabled }"
      >
        <h4>
          {{ getSectionIcon(sectionName) }} {{ getSectionTitle(sectionName) }}
        </h4>

        <!-- Knobs grid layout -->
        <div class="knobs-grid">
          <div
            v-for="(value, key) in sectionConfig"
            :key="key"
            class="knob-item"
          >
            <!-- Boolean toggle knobs -->
            <Knob
              v-if="typeof value === 'boolean'"
              :value="value ? 1 : 0"
              :min="0"
              :max="1"
              :step="1"
              :param-name="formatLabel(String(key))"
              :format-value="(val: number) => val === 1 ? 'ON' : 'OFF'"
              :is-disabled="!visualsEnabled"
              @update:value="(newValue: number) => updateValue(sectionName, String(key), newValue === 1)"
              @click="() => updateValue(sectionName, String(key), !value)"
            />

            <!-- Number knobs -->
            <Knob
              v-else-if="typeof value === 'number'"
              :value="value"
              :min="getNumberMin(sectionName, String(key))"
              :max="getNumberMax(sectionName, String(key))"
              :step="getNumberStep(sectionName, String(key))"
              :param-name="formatLabel(String(key))"
              :format-value="(val: number) => formatValue(sectionName, String(key), val)"
              :is-disabled="!visualsEnabled"
              @update:value="(newValue: number) => updateValue(sectionName, String(key), newValue)"
            />

            <!-- String controls (if needed) -->
            <div v-else-if="typeof value === 'string'" class="string-control">
              <label>{{ formatLabel(String(key)) }}</label>
              <input
                type="text"
                :value="value"
                :disabled="!visualsEnabled"
                @input="
                  updateValue(
                    sectionName,
                    String(key),
                    ($event.target as HTMLInputElement)?.value ?? ''
                  )
                "
              />
            </div>
          </div>
        </div>
      </div>

      <!-- Saved Configurations -->
      <div v-if="savedConfigs.length > 0" class="config-section">
        <h4>💾 Saved Configurations</h4>
        <div class="saved-configs">
          <div
            v-for="savedConfig in savedConfigs"
            :key="savedConfig.id"
            class="saved-config-item"
          >
            <span class="config-name">{{ savedConfig.name }}</span>
            <div class="config-actions">
              <button @click="loadSavedConfig(savedConfig.id)" class="load-btn">
                Load
              </button>
              <button
                @click="deleteSavedConfig(savedConfig.id)"
                class="delete-btn"
              >
                <Trash2 :size="12" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <!-- Actions -->
      <div class="config-actions">
        <button @click="resetToDefaults" class="reset-btn">
          <RotateCcw :size="14" />
          Reset to Defaults
        </button>
        <button @click="exportConfig" class="export-btn">
          <Download :size="14" />
          Export Config
        </button>
        <button @click="promptSaveConfig" class="save-as-btn">
          <Save :size="14" />
          Save As...
        </button>
      </div>
    </div>
  </div>

  <!-- Toggle Button -->
  <button v-if="!showPanel" @click="togglePanel" class="debug-toggle">
    <Settings :size="16" />
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useVisualConfigStore } from "@/stores/visualConfig";
import Knob from "./Knob.vue";
import {
  Settings,
  Save,
  X,
  RotateCcw,
  Download,
  Trash2,
} from "lucide-vue-next";

const visualConfigStore = useVisualConfigStore();
const showPanel = ref(false);

// Store state
const {
  config,
  visualsEnabled,
  savedConfigs,
  lastSaved,
  updateValue,
  resetToDefaults,
  exportConfig: storeExportConfig,
  setVisualsEnabled,
  saveConfigAs,
  loadSavedConfig,
  deleteSavedConfig,
} = visualConfigStore;

// Computed sections that exclude nested objects for now
const configSections = computed(() => {
  const sections: Record<string, any> = {};

  Object.keys(config).forEach((sectionName) => {
    const section = config[sectionName as keyof typeof config];
    if (
      typeof section === "object" &&
      section !== null &&
      !Array.isArray(section)
    ) {
      // Only include primitive values for now
      const primitives: Record<string, any> = {};
      Object.keys(section).forEach((key) => {
        const value = (section as Record<string, any>)[key];
        if (
          typeof value === "boolean" ||
          typeof value === "number" ||
          typeof value === "string"
        ) {
          primitives[key] = value;
        }
      });
      if (Object.keys(primitives).length > 0) {
        sections[sectionName] = primitives;
      }
    }
  });

  return sections;
});

// Configuration metadata for better controls
const configMetadata: Record<
  string,
  Record<string, { min?: number; max?: number; step?: number }>
> = {
  blobs: {
    baseSizeRatio: { min: 0.1, max: 1, step: 0.05 },
    minSize: { min: 50, max: 500, step: 25 },
    maxSize: { min: 200, max: 1200, step: 50 },
    opacity: { min: 0, max: 1, step: 0.05 },
    blurRadius: { min: 0, max: 100, step: 5 },
    oscillationAmplitude: { min: 0, max: 1, step: 0.02 },
    fadeOutDuration: { min: 0.1, max: 5, step: 0.1 },
    driftSpeed: { min: 0, max: 100, step: 2 },
    vibrationFrequencyDivisor: { min: 10, max: 500, step: 5 },
  },
  strings: {
    count: { min: 1, max: 16, step: 1 },
    baseOpacity: { min: 0, max: 1, step: 0.05 },
    activeOpacity: { min: 0, max: 1, step: 0.05 },
    maxAmplitude: { min: 1, max: 100, step: 1 },
    dampingFactor: { min: 0.01, max: 0.5, step: 0.01 },
    interpolationSpeed: { min: 0.01, max: 1, step: 0.01 },
    opacityInterpolationSpeed: { min: 0.01, max: 1, step: 0.01 },
  },
  particles: {
    count: { min: 0, max: 100, step: 5 },
    sizeMin: { min: 1, max: 20, step: 1 },
    sizeMax: { min: 1, max: 20, step: 1 },
    lifetimeMin: { min: 500, max: 10000, step: 250 },
    lifetimeMax: { min: 500, max: 10000, step: 250 },
    speed: { min: 0, max: 20, step: 0.5 },
  },
  ambient: {
    opacityMajor: { min: 0, max: 1, step: 0.05 },
    opacityMinor: { min: 0, max: 1, step: 0.05 },
    brightnessMajor: { min: 0, max: 1, step: 0.05 },
    brightnessMinor: { min: 0, max: 1, step: 0.05 },
    saturationMajor: { min: 0, max: 1, step: 0.05 },
    saturationMinor: { min: 0, max: 1, step: 0.05 },
  },
  animation: {
    visualFrequencyDivisor: { min: 10, max: 1000, step: 10 },
    frameRate: { min: 30, max: 120, step: 15 },
    smoothingFactor: { min: 0.01, max: 1, step: 0.01 },
  },
  frequencyMapping: {
    minFreq: { min: 50, max: 500, step: 10 },
    maxFreq: { min: 200, max: 2000, step: 50 },
    minValue: { min: 100, max: 800, step: 25 },
    maxValue: { min: 200, max: 1000, step: 25 },
  },
  dynamicColors: {
    hueAnimationAmplitude: { min: 5, max: 30, step: 5 },
    animationSpeed: { min: 0.1, max: 3, step: 0.1 },
    saturation: { min: 0.3, max: 1, step: 0.1 },
    baseLightness: { min: 0.3, max: 0.7, step: 0.05 },
    lightnessRange: { min: 0.3, max: 0.8, step: 0.05 },
  },
  palette: {
    gradientDirection: { min: 0, max: 360, step: 15 },
    glassmorphOpacity: { min: 0, max: 1, step: 0.05 },
  },
  floatingPopup: {
    accumulationWindow: { min: 100, max: 2000, step: 50 },
    hideDelay: { min: 500, max: 10000, step: 250 },
    maxNotes: { min: 1, max: 12, step: 1 },
    backdropBlur: { min: 0, max: 50, step: 2 },
    glassmorphOpacity: { min: 0, max: 1, step: 0.05 },
    animationDuration: { min: 100, max: 1000, step: 50 },
  },
};

// Helper functions
const getSectionIcon = (sectionName: string): string => {
  const icons: Record<string, string> = {
    blobs: "🫧",
    strings: "🎸",
    particles: "✨",
    ambient: "🌅",
    animation: "🎬",
    frequencyMapping: "🎵",
    fontOscillation: "📝",
    dynamicColors: "🌈",
    palette: "🎹",
    floatingPopup: "💬",
  };
  return icons[sectionName] || "⚙️";
};

const getSectionTitle = (sectionName: string): string => {
  return sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
};

const formatLabel = (key: string): string => {
  // Special labels for dynamic colors
  const specialLabels: Record<string, string> = {
    chromaticMapping: "Chromatic Mapping (12 notes vs 7 solfege)",
    hueAnimationAmplitude: "Hue Animation (±°)",
    animationSpeed: "Animation Speed",
    baseLightness: "Base Lightness",
    lightnessRange: "Lightness Range",
    // Floating popup labels
    accumulationWindow: "Accumulation Window",
    hideDelay: "Hide Delay",
    maxNotes: "Max Notes",
    showChord: "Show Chord",
    showIntervals: "Show Intervals",
    showEmotionalDescription: "Show Emotions",
    backdropBlur: "Backdrop Blur",
    glassmorphOpacity: "Glass Opacity",
    animationDuration: "Animation Duration",
  };

  if (specialLabels[key]) {
    return specialLabels[key];
  }

  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
};

const formatValue = (sectionName: string, key: string, value: any): string => {
  // Format percentage values
  if (
    sectionName === "dynamicColors" &&
    (key === "saturation" ||
      key === "baseLightness" ||
      key === "lightnessRange")
  ) {
    return `${Math.round(value * 100)}%`;
  }

  // Format palette glassmorphism opacity
  if (sectionName === "palette" && key === "glassmorphOpacity") {
    return `${Math.round(value * 100)}%`;
  }

  // Format floating popup values
  if (sectionName === "floatingPopup") {
    if (key === "accumulationWindow" || key === "hideDelay") {
      return `${value}ms`;
    }
    if (key === "backdropBlur") {
      return `${value}px`;
    }
    if (key === "glassmorphOpacity") {
      return `${Math.round(value * 100)}%`;
    }
    if (key === "animationDuration") {
      return `${value}ms`;
    }
    if (key === "maxNotes") {
      return `${value} notes`;
    }
  }

  // Format hue animation amplitude
  if (sectionName === "dynamicColors" && key === "hueAnimationAmplitude") {
    return `${value}°`;
  }

  // Format animation speed
  if (sectionName === "dynamicColors" && key === "animationSpeed") {
    return `${value}x`;
  }

  return value.toString();
};

const getNumberMin = (sectionName: string, key: string): number => {
  return configMetadata[sectionName]?.[key]?.min ?? 0;
};

const getNumberMax = (sectionName: string, key: string): number => {
  return configMetadata[sectionName]?.[key]?.max ?? 100;
};

const getNumberStep = (sectionName: string, key: string): number => {
  return configMetadata[sectionName]?.[key]?.step ?? 0.1;
};

// Note: Knob now works directly with actual values, no conversion needed

const togglePanel = () => {
  showPanel.value = !showPanel.value;
};

const exportConfig = () => {
  const configJson = storeExportConfig();

  navigator.clipboard
    .writeText(configJson)
    .then(() => {
      alert("Configuration copied to clipboard!");
    })
    .catch(() => {
      console.log("Visual Effects Configuration:", configJson);
      alert("Configuration logged to console");
    });
};

const promptSaveConfig = () => {
  const name = prompt("Enter a name for this configuration:");
  if (name?.trim()) {
    saveConfigAs(name.trim());
    alert(`Configuration "${name}" saved!`);
  }
};

const formatLastSaved = (timestamp: string): string => {
  try {
    const date = new Date(timestamp);
    return date.toLocaleString();
  } catch {
    return "Unknown";
  }
};
</script>

<style scoped>
.debug-panel {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 320px;
  max-height: 80vh;
  background: rgba(0, 0, 0, 0.9);
  border: 1px solid #333;
  border-radius: 8px;
  color: white;
  font-family: monospace;
  font-size: 12px;
  z-index: 9999;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.debug-header {
  position: sticky;
  top: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 10px 15px;
  border-bottom: 1px solid #333;
  background: rgba(0, 0, 0, 0.95);
  backdrop-filter: blur(10px);
  z-index: 10;
}

.debug-header h3 {
  margin: 0;
  font-size: 14px;
  color: #00ff88;
  display: flex;
  align-items: center;
  gap: 6px;
}

.close-btn {
  background: none;
  border: none;
  color: #ff6b6b;
  cursor: pointer;
  padding: 2px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 2px;
  transition: background-color 0.2s ease;
}

.close-btn:hover {
  background: rgba(255, 107, 107, 0.2);
}

.debug-content {
  padding: 15px;
  overflow-y: auto;
  flex: 1;
}

.global-controls {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #333;
}

.global-toggle {
  margin-bottom: 10px;
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  font-weight: bold;
  color: #ffd93d;
}

.toggle-checkbox {
  display: none;
}

.toggle-slider {
  width: 40px;
  height: 20px;
  background: #333;
  border-radius: 10px;
  position: relative;
  transition: background-color 0.3s ease;
  border: 1px solid #555;
}

.toggle-slider::before {
  content: "";
  position: absolute;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: white;
  top: 1px;
  left: 1px;
  transition: transform 0.3s ease;
}

.toggle-checkbox:checked + .toggle-slider {
  background: #00ff88;
}

.toggle-checkbox:checked + .toggle-slider::before {
  transform: translateX(20px);
}

.last-saved {
  font-size: 10px;
  color: #888;
  font-style: italic;
}

.config-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #333;
  transition: opacity 0.3s ease;
}

.config-section.disabled {
  opacity: 0.5;
  pointer-events: none;
}

.config-section:last-of-type {
  border-bottom: none;
}

.config-section h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #ffd93d;
}

.knobs-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(80px, 1fr));
  gap: 15px;
  padding: 10px 0;
}

.knob-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.string-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 80px;
  justify-content: center;
}

.string-control label {
  margin-bottom: 5px;
  font-size: 10px;
  color: #ccc;
  text-align: center;
  word-wrap: break-word;
  max-width: 80px;
  line-height: 1.2;
}

.string-control input {
  width: 100%;
  max-width: 80px;
  padding: 3px;
  border: 1px solid #555;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 4px;
  font-size: 10px;
  text-align: center;
}

.saved-configs {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.saved-config-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 6px;
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
  border: 1px solid #444;
}

.config-name {
  font-size: 11px;
  color: #ccc;
  flex: 1;
}

.config-actions {
  display: flex;
  gap: 6px;
}

.load-btn,
.delete-btn {
  padding: 2px 6px;
  border: 1px solid #555;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 3px;
  cursor: pointer;
  font-size: 10px;
  display: flex;
  align-items: center;
  gap: 2px;
}

.load-btn:hover {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
}

.delete-btn:hover {
  background: rgba(255, 107, 107, 0.2);
  border-color: #ff6b6b;
}

.config-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.reset-btn,
.export-btn,
.save-as-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #555;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
}

.reset-btn:hover,
.export-btn:hover,
.save-as-btn:hover {
  background: rgba(255, 255, 255, 0.2);
}

.debug-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid #333;
  border-radius: 4px;
  color: white;
  cursor: pointer;
  font-size: 12px;
  z-index: 9999;
  display: flex;
  align-items: center;
  gap: 6px;
}

.debug-toggle:hover {
  background: rgba(0, 0, 0, 0.9);
}
</style>
