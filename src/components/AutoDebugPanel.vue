<template>
  <FloatingDropdown position="top-right" max-height="80vh">
    <!-- Trigger Button -->
    <template #trigger="{ toggle }">
      <button
        @click="toggle"
        class="flex items-center gap-1.5 px-3 py-2 text-xs text-white bg-black/80 border border-neutral-700 rounded backdrop-blur-lg transition-all hover:bg-black/90"
      >
        <Settings :size="16" />
      </button>
    </template>

    <!-- Dropdown Panel -->
    <template #panel="{ close, toggle, position }">
      <div class="flex flex-col w-full min-h-0 flex-1">
        <!-- Sticky Header -->
        <div
          class="sticky top-0 flex items-center justify-between px-4 py-2.5 border-b border-neutral-700 bg-black/95 backdrop-blur-lg z-10"
          :class="{ 'flex-row-reverse': position === 'top-left' }"
        >
          <div>
            <h3 class="flex items-center gap-1.5 m-0 text-sm text-[#00ff88]">
              <Settings :size="16" />
              Config
            </h3>
            <p v-if="lastSaved" class="text-[10px] text-neutral-400 italic">
              Last saved: {{ formatLastSaved(lastSaved) }}
            </p>
          </div>

          <button
            @click="toggle"
            class="flex items-center justify-center p-0.5 text-[#ff6b6b] rounded hover:bg-[#ff6b6b]/20 transition-colors"
          >
            <X :size="18" />
          </button>
        </div>

        <div class="p-4 overflow-y-auto flex-1">
          <!-- Global Controls -->
          <div class="mb-5 pb-4 border-b border-neutral-700">
            <div class="mb-2.5">
              <label
                class="flex items-center gap-2 cursor-pointer font-bold text-[#ffd93d]"
              >
                <input
                  type="checkbox"
                  :checked="visualsEnabled"
                  @change="
                    setVisualsEnabled(
                      ($event.target as HTMLInputElement)?.checked ?? false
                    )
                  "
                  class="hidden"
                />
                <span
                  class="relative w-10 h-5 bg-neutral-700 rounded-full border border-neutral-600 transition-colors before:content-[''] before:absolute before:w-4 before:h-4 before:bg-white before:rounded-full before:top-0.5 before:left-0.5 before:transition-transform peer-checked:bg-[#00ff88] peer-checked:before:translate-x-5"
                ></span>
                Enable All Visuals
              </label>
            </div>

            <!-- Category Toggles Section -->
            <div
              class="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-4 gap-y-16"
            >
              <template
                v-for="(sectionConfig, sectionName) in configSections"
                :key="sectionName"
              >
                <div v-if="sectionConfig.isEnabled !== undefined">
                  <Knob
                    :model-value="sectionConfig.isEnabled"
                    type="boolean"
                    :label="getSectionTitle(sectionName)"
                    :is-disabled="!visualsEnabled"
                    @update:modelValue="
                      (newValue) =>
                        updateValue(sectionName, 'isEnabled', newValue)
                    "
                  />
                </div>
              </template>
            </div>
          </div>

          <!-- Auto-generated sections -->
          <ul class="grid gap-[50px]">
            <li
              v-for="(sectionConfig, sectionName) in configSections"
              :key="sectionName"
              class="pb-12 border-b border-neutral-700 last:border-b-0 transition-opacity"
              :class="{
                'opacity-50 pointer-events-none':
                  !visualsEnabled || !sectionConfig.isEnabled,
              }"
            >
              <h4 class="m-0 mb-2.5 text-xs text-[#ffd93d]">
                {{ getSectionIcon(sectionName) }}
                {{ getSectionTitle(sectionName) }}
              </h4>

              <!-- Knobs grid layout -->
              <div
                class="grid grid-cols-[repeat(auto-fill,minmax(70px,1fr))] gap-4 gap-y-16"
              >
                <template v-for="(value, key) in sectionConfig" :key="key">
                  <!-- Boolean toggle knobs -->
                  <Knob
                    v-if="
                      typeof value === 'boolean' && String(key) !== 'isEnabled'
                    "
                    :model-value="value"
                    type="boolean"
                    :label="formatLabel(String(key))"
                    :is-disabled="!visualsEnabled || !sectionConfig.isEnabled"
                    @update:modelValue="
                      (newValue) =>
                        updateValue(sectionName, String(key), newValue)
                    "
                  />

                  <!-- Number knobs -->
                  <Knob
                    v-else-if="typeof value === 'number'"
                    :model-value="value"
                    type="range"
                    :min="getNumberMin(sectionName, String(key))"
                    :max="getNumberMax(sectionName, String(key))"
                    :step="getNumberStep(sectionName, String(key))"
                    :label="formatLabel(String(key))"
                    :format-value="(val: number) => formatValue(sectionName, String(key), val)"
                    :is-disabled="!visualsEnabled || !sectionConfig.isEnabled"
                    @update:modelValue="
                      (newValue) =>
                        updateValue(sectionName, String(key), newValue)
                    "
                  />

                </template>
              </div>
            </li>
          </ul>
        </div>

        <!-- Saved Configurations -->
        <div
          v-if="savedConfigs.length > 0"
          class="mb-5 pb-4 border-b border-neutral-700"
        >
          <h4 class="m-0 mb-2.5 text-xs text-[#ffd93d]">
            💾 Saved Configurations
          </h4>
          <div class="flex flex-col gap-2">
            <div
              v-for="savedConfig in savedConfigs"
              :key="savedConfig.id"
              class="flex items-center justify-between p-1.5 bg-white/5 rounded border border-neutral-700"
            >
              <span class="text-xs text-neutral-300 flex-1">{{
                savedConfig.name
              }}</span>
              <div class="flex gap-1.5">
                <button
                  @click="loadSavedConfig(savedConfig.id)"
                  class="px-1.5 py-0.5 text-[10px] text-white bg-white/10 border border-neutral-600 rounded hover:bg-[#00ff88]/20 hover:border-[#00ff88] transition-colors flex items-center gap-0.5"
                >
                  Load
                </button>
                <button
                  @click="deleteSavedConfig(savedConfig.id)"
                  class="px-1.5 py-0.5 text-[10px] text-white bg-white/10 border border-neutral-600 rounded hover:bg-[#ff6b6b]/20 hover:border-[#ff6b6b] transition-colors flex items-center gap-0.5"
                >
                  <Trash2 :size="12" />
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Actions -->
        <div class="flex gap-2.5 mt-5">
          <button
            @click="resetToDefaults"
            class="flex-1 px-2 py-2 text-xs text-white bg-white/10 border border-neutral-600 rounded flex items-center justify-center gap-1 hover:bg-white/20 transition-colors"
          >
            <RotateCcw :size="14" />
            Reset to Defaults
          </button>
          <button
            @click="exportConfig"
            class="flex-1 px-2 py-2 text-xs text-white bg-white/10 border border-neutral-600 rounded flex items-center justify-center gap-1 hover:bg-white/20 transition-colors"
          >
            <Download :size="14" />
            Export Config
          </button>
          <button
            @click="promptSaveConfig"
            class="flex-1 px-2 py-2 text-xs text-white bg-white/10 border border-neutral-600 rounded flex items-center justify-center gap-1 hover:bg-white/20 transition-colors"
          >
            <Save :size="14" />
            Save As...
          </button>
        </div>
      </div>
    </template>
  </FloatingDropdown>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { Knob } from "./knobs";
import FloatingDropdown from "./FloatingDropdown.vue";
import {
  Settings,
  Save,
  X,
  RotateCcw,
  Download,
  Trash2,
} from "lucide-vue-next";

const visualConfigStore = useVisualConfigStore();

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
  hilbertScope: {
    sizeRatio: { min: 0.1, max: 1, step: 0.05 },
    minSize: { min: 500, max: 800, step: 25 },
    maxSize: { min: 1200, max: 1600, step: 50 },
    opacity: { min: 0, max: 1, step: 0.05 },
    scaleInDuration: { min: 0.1, max: 2, step: 0.1 },
    scaleOutDuration: { min: 0.1, max: 2, step: 0.1 },
    driftSpeed: { min: 0, max: 20, step: 1 },
    glowIntensity: { min: 0, max: 50, step: 5 },
    history: { min: 0, max: 0.95, step: 0.05 },
    lineWidth: { min: 1, max: 10, step: 0.5 },
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
    hilbertScope: "🌀",
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
