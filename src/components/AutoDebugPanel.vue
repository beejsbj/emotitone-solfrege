<template>
  <!-- Debug Panel - Only shown in development mode -->
  <div v-if="isDevelopment && showPanel" class="debug-panel">
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

        <div class="last-saved">Auto-saving enabled via Pinia persistence</div>
      </div>

      <!-- Auto-generated sections from CONFIG_DEFINITIONS -->
      <div
        v-for="(sectionDef, sectionName) in CONFIG_DEFINITIONS"
        :key="sectionName"
        class="config-section"
        :class="{ disabled: !visualsEnabled }"
      >
        <h4>{{ sectionDef.icon }} {{ sectionDef.label }}</h4>

        <!-- Knobs grid layout -->
        <div class="knobs-grid">
          <div
            v-for="(fieldDef, fieldName) in sectionDef.fields"
            :key="fieldName"
            class="knob-item"
          >
            <!-- Boolean toggle knobs -->
            <Knob
              v-if="typeof fieldDef.value === 'boolean'"
              :value="getCurrentValue(sectionName, fieldName) ? 1 : 0"
              :min="0"
              :max="1"
              :step="1"
              :param-name="fieldDef.label || formatLabel(String(fieldName))"
              :format-value="(val: number) => val === 1 ? 'ON' : 'OFF'"
              :is-disabled="!visualsEnabled"
              @update:value="(newValue: number) => updateValue(sectionName, String(fieldName), newValue === 1)"
              @click="
                () =>
                  updateValue(
                    sectionName,
                    String(fieldName),
                    !getCurrentValue(sectionName, fieldName)
                  )
              "
            />

            <!-- Number knobs -->
            <Knob
              v-else-if="typeof fieldDef.value === 'number'"
              :value="getCurrentValue(sectionName, fieldName)"
              :min="fieldDef.min ?? 0"
              :max="fieldDef.max ?? 100"
              :step="fieldDef.step ?? 0.1"
              :param-name="fieldDef.label || formatLabel(String(fieldName))"
              :format-value="(val: number) => formatFieldValue(fieldDef, val)"
              :is-disabled="!visualsEnabled"
              @update:value="(newValue: number) => updateValue(sectionName, String(fieldName), newValue)"
            />

            <!-- String controls (if needed) -->
            <div
              v-else-if="typeof fieldDef.value === 'string'"
              class="string-control"
            >
              <label>{{
                fieldDef.label || formatLabel(String(fieldName))
              }}</label>
              <input
                type="text"
                :value="getCurrentValue(sectionName, fieldName)"
                :disabled="!visualsEnabled"
                @input="
                  updateValue(
                    sectionName,
                    String(fieldName),
                    ($event.target as HTMLInputElement)?.value ?? ''
                  )
                "
              />
            </div>

            <!-- Complex object fields (skip for now) -->
            <div
              v-else-if="typeof fieldDef.value === 'object'"
              class="object-control"
            >
              <label>{{
                fieldDef.label || formatLabel(String(fieldName))
              }}</label>
              <span class="object-indicator">Complex Object</span>
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

  <!-- Toggle Button - Only shown in development mode -->
  <button v-if="isDevelopment && !showPanel" @click="togglePanel" class="debug-toggle">
    <Settings :size="16" />
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import {
  useVisualConfigStore,
  CONFIG_DEFINITIONS,
} from "@/stores/visualConfig";
import { formatFieldValue, formatLabel } from "@/utils/configHelpers";
import { logger } from "@/utils/logger";
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

// @ts-ignore - Vite provides import.meta.env
const isDevelopment = computed(() => import.meta.env?.DEV || false);

// Store state
const {
  config,
  visualsEnabled,
  savedConfigs,

  updateValue,
  resetToDefaults,
  exportConfig: storeExportConfig,
  setVisualsEnabled,
  saveConfigAs,
  loadSavedConfig,
  deleteSavedConfig,
} = visualConfigStore;

// Helper function to get current value from config
const getCurrentValue = (sectionName: string, fieldName: string): any => {
  return (config as any)[sectionName]?.[fieldName];
};

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
      logger.dev("Visual Effects Configuration:", configJson);
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
</script>

<style scoped>
/* Only include styles if component can render (development check handles visibility) */
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

.string-control,
.object-control {
  display: flex;
  flex-direction: column;
  align-items: center;
  width: 100%;
  min-height: 80px;
  justify-content: center;
}

.string-control label,
.object-control label {
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

.object-indicator {
  font-size: 8px;
  color: #888;
  font-style: italic;
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
  font-size: 10px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 4px;
  transition: all 0.2s ease;
}

.reset-btn:hover {
  background: rgba(255, 193, 7, 0.2);
  border-color: #ffc107;
}

.export-btn:hover {
  background: rgba(0, 123, 255, 0.2);
  border-color: #007bff;
}

.save-as-btn:hover {
  background: rgba(40, 167, 69, 0.2);
  border-color: #28a745;
}

.debug-toggle {
  position: fixed;
  top: 20px;
  right: 20px;
  width: 40px;
  height: 40px;
  background: rgba(0, 0, 0, 0.8);
  border: 1px solid #333;
  border-radius: 50%;
  color: #00ff88;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9998;
  transition: all 0.2s ease;
}

.debug-toggle:hover {
  background: rgba(0, 255, 136, 0.2);
  border-color: #00ff88;
  transform: scale(1.1);
}
</style>
