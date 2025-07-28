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
    <template #panel="{ toggle, position }">
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
                    :label="formatLabel(sectionName, String(key))"
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
                    :label="formatLabel(sectionName, String(key))"
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
import { computed } from "vue";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { UNIFIED_CONFIG } from "@/data/visual-config-metadata";
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

// Use the unified config for metadata
const unifiedConfig = UNIFIED_CONFIG;

// Computed sections that use the actual config values
const configSections = computed(() => {
  const sections: Record<string, any> = {};

  Object.keys(config).forEach((sectionName) => {
    const section = config[sectionName as keyof typeof config];
    if (
      typeof section === "object" &&
      section !== null &&
      !Array.isArray(section)
    ) {
      sections[sectionName] = section;
    }
  });

  return sections;
});

// Get metadata from unified config
const getFieldMetadata = (sectionName: string, fieldName: string) => {
  const section = unifiedConfig[sectionName as keyof typeof unifiedConfig];
  if (section && typeof section === 'object' && fieldName in section && fieldName !== '_meta') {
    return (section as any)[fieldName];
  }
  return null;
};

// Helper functions
const getSectionIcon = (sectionName: string): string => {
  const section = unifiedConfig[sectionName as keyof typeof unifiedConfig];
  return (section as any)?._meta?.icon || "⚙️";
};

const getSectionTitle = (sectionName: string): string => {
  const section = unifiedConfig[sectionName as keyof typeof unifiedConfig];
  return (section as any)?._meta?.label || sectionName.charAt(0).toUpperCase() + sectionName.slice(1);
};

const formatLabel = (sectionName: string, key: string): string => {
  const metadata = getFieldMetadata(sectionName, key);
  if (metadata?.label) {
    return metadata.label;
  }
  
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase());
};

const formatValue = (sectionName: string, key: string, value: any): string => {
  const metadata = getFieldMetadata(sectionName, key);
  if (metadata?.format && typeof metadata.format === 'function') {
    try {
      return metadata.format(value);
    } catch (error) {
      console.error(`Error formatting ${sectionName}.${key}:`, error);
      return value.toString();
    }
  }
  return value.toString();
};

const getNumberMin = (sectionName: string, key: string): number => {
  const metadata = getFieldMetadata(sectionName, key);
  return metadata?.min ?? 0;
};

const getNumberMax = (sectionName: string, key: string): number => {
  const metadata = getFieldMetadata(sectionName, key);
  return metadata?.max ?? 100;
};

const getNumberStep = (sectionName: string, key: string): number => {
  const metadata = getFieldMetadata(sectionName, key);
  return metadata?.step ?? 0.1;
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
