<template>
  <div v-if="showPanel" class="debug-panel">
    <div class="debug-header">
      <h3>🎨 Auto Visual Effects Config</h3>
      <button @click="togglePanel" class="close-btn">×</button>
    </div>

    <div class="debug-content">
      <!-- Auto-generated sections -->
      <div
        v-for="(sectionConfig, sectionName) in configSections"
        :key="sectionName"
        class="config-section"
      >
        <h4>
          {{ getSectionIcon(sectionName) }} {{ getSectionTitle(sectionName) }}
        </h4>

        <!-- Auto-generated controls for each property -->
        <div
          v-for="(value, key) in sectionConfig"
          :key="key"
          class="config-row"
        >
          <label>{{ formatLabel(key) }}:</label>

          <!-- Boolean controls -->
          <input
            v-if="typeof value === 'boolean'"
            type="checkbox"
            :checked="value"
            @change="updateValue(sectionName, key, $event.target.checked)"
          />

          <!-- Number controls -->
          <template v-else-if="typeof value === 'number'">
            <input
              type="range"
              :min="getNumberMin(sectionName, key)"
              :max="getNumberMax(sectionName, key)"
              :step="getNumberStep(sectionName, key)"
              :value="value"
              @input="
                updateValue(sectionName, key, parseFloat($event.target.value))
              "
            />
            <span>{{ formatValue(sectionName, key, value) }}</span>
          </template>

          <!-- String controls (if needed) -->
          <input
            v-else-if="typeof value === 'string'"
            type="text"
            :value="value"
            @input="updateValue(sectionName, key, $event.target.value)"
          />
        </div>
      </div>

      <!-- Dynamic Color Preview -->
      <DynamicColorPreview />

      <!-- Actions -->
      <div class="config-actions">
        <button @click="resetToDefaults" class="reset-btn">
          Reset to Defaults
        </button>
        <button @click="exportConfig" class="export-btn">Export Config</button>
      </div>
    </div>
  </div>

  <!-- Toggle Button -->
  <button v-if="!showPanel" @click="togglePanel" class="debug-toggle">
    🎨 Auto Debug
  </button>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed } from "vue";
import { useVisualConfig, DEFAULT_CONFIG } from "@/composables/useVisualConfig";
import DynamicColorPreview from "./DynamicColorPreview.vue";

const { config, updateConfig, resetConfig, getConfigSnapshot } =
  useVisualConfig();
const showPanel = ref(false);

// Local reactive copy for immediate UI updates
const localConfig = reactive({ ...config });

// Computed sections that exclude nested objects for now
const configSections = computed(() => {
  const sections: Record<string, any> = {};

  Object.keys(localConfig).forEach((sectionName) => {
    const section = localConfig[sectionName as keyof typeof localConfig];
    if (
      typeof section === "object" &&
      section !== null &&
      !Array.isArray(section)
    ) {
      // Only include primitive values for now
      const primitives: Record<string, any> = {};
      Object.keys(section).forEach((key) => {
        const value = section[key];
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

const updateValue = (sectionName: string, key: string, value: any) => {
  (localConfig[sectionName as keyof typeof localConfig] as any)[key] = value;
};

// Watch for changes and update the main config
watch(
  localConfig,
  (newConfig) => {
    Object.keys(newConfig).forEach((section) => {
      updateConfig(
        section as any,
        newConfig[section as keyof typeof newConfig]
      );
    });
  },
  { deep: true }
);

const togglePanel = () => {
  showPanel.value = !showPanel.value;
};

const resetToDefaults = () => {
  resetConfig();
  Object.assign(localConfig, DEFAULT_CONFIG);
};

const exportConfig = () => {
  const configSnapshot = getConfigSnapshot();
  const configJson = JSON.stringify(configSnapshot, null, 2);

  navigator.clipboard
    .writeText(configJson)
    .then(() => {
      alert("Configuration copied to clipboard!");
    })
    .catch(() => {
      console.log("Visual Effects Configuration:", configSnapshot);
      alert("Configuration logged to console");
    });
};
</script>

<style scoped>
/* Reuse the same styles as the original debug panel */
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
  overflow-y: auto;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #333;
  background: rgba(255, 255, 255, 0.05);
}

.debug-header h3 {
  margin: 0;
  font-size: 14px;
  color: #00ff88;
}

.close-btn {
  background: none;
  border: none;
  color: #ff6b6b;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 20px;
  height: 20px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.debug-content {
  padding: 15px;
}

.config-section {
  margin-bottom: 20px;
  padding-bottom: 15px;
  border-bottom: 1px solid #333;
}

.config-section:last-of-type {
  border-bottom: none;
}

.config-section h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #ffd93d;
}

.config-row {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 8px;
}

.config-row label {
  flex: 1;
  font-size: 11px;
  color: #ccc;
}

.config-row input[type="range"] {
  flex: 2;
  height: 4px;
  background: #333;
  border-radius: 2px;
  outline: none;
}

.config-row input[type="checkbox"] {
  width: 16px;
  height: 16px;
}

.config-row span {
  min-width: 40px;
  text-align: right;
  font-weight: bold;
  color: #00ff88;
}

.config-actions {
  display: flex;
  gap: 10px;
  margin-top: 20px;
}

.reset-btn,
.export-btn {
  flex: 1;
  padding: 8px;
  border: 1px solid #555;
  background: rgba(255, 255, 255, 0.1);
  color: white;
  border-radius: 4px;
  cursor: pointer;
  font-size: 11px;
}

.reset-btn:hover,
.export-btn:hover {
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
}

.debug-toggle:hover {
  background: rgba(0, 0, 0, 0.9);
}
</style>
