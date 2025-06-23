<template>
  <div v-if="showPanel" class="debug-panel">
    <div class="debug-header">
      <h3>🎨 Visual Effects Config</h3>
      <button @click="togglePanel" class="close-btn">×</button>
    </div>

    <div class="debug-content">
      <!-- Blob Configuration -->
      <div class="config-section">
        <h4>🫧 Blobs</h4>
        <div class="config-row">
          <label>Enabled:</label>
          <input type="checkbox" v-model="localConfig.blobs.isEnabled" />
        </div>
        <div class="config-row">
          <label>Size Ratio:</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            v-model.number="localConfig.blobs.baseSizeRatio"
          />
          <span>{{ localConfig.blobs.baseSizeRatio }}</span>
        </div>
        <div class="config-row">
          <label>Opacity:</label>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            v-model.number="localConfig.blobs.opacity"
          />
          <span>{{ localConfig.blobs.opacity }}</span>
        </div>
        <div class="config-row">
          <label>Oscillation:</label>
          <input
            type="range"
            min="0"
            max="0.5"
            step="0.05"
            v-model.number="localConfig.blobs.oscillationAmplitude"
          />
          <span>{{ localConfig.blobs.oscillationAmplitude }}</span>
        </div>
      </div>

      <!-- String Configuration -->
      <div class="config-section">
        <h4>🎸 Strings</h4>
        <div class="config-row">
          <label>Enabled:</label>
          <input type="checkbox" v-model="localConfig.strings.isEnabled" />
        </div>
        <div class="config-row">
          <label>Max Amplitude:</label>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            v-model.number="localConfig.strings.maxAmplitude"
          />
          <span>{{ localConfig.strings.maxAmplitude }}</span>
        </div>
        <div class="config-row">
          <label>Active Opacity:</label>
          <input
            type="range"
            min="0.1"
            max="1"
            step="0.1"
            v-model.number="localConfig.strings.activeOpacity"
          />
          <span>{{ localConfig.strings.activeOpacity }}</span>
        </div>
      </div>

      <!-- Ambient Configuration -->
      <div class="config-section">
        <h4>🌅 Ambient</h4>
        <div class="config-row">
          <label>Enabled:</label>
          <input type="checkbox" v-model="localConfig.ambient.isEnabled" />
        </div>
      </div>

      <!-- Font Oscillation Configuration -->
      <div class="config-section">
        <h4>📝 Font Oscillation</h4>
        <div class="config-row">
          <label>Full Amplitude:</label>
          <input
            type="range"
            min="100"
            max="600"
            step="50"
            v-model.number="localConfig.fontOscillation.full.amplitude"
          />
          <span>{{ localConfig.fontOscillation.full.amplitude }}</span>
        </div>
      </div>

      <!-- Particle Configuration -->
      <div class="config-section">
        <h4>✨ Particles</h4>
        <div class="config-row">
          <label>Enabled:</label>
          <input type="checkbox" v-model="localConfig.particles.isEnabled" />
        </div>
        <div class="config-row">
          <label>Count:</label>
          <input
            type="range"
            min="5"
            max="50"
            step="5"
            v-model.number="localConfig.particles.count"
          />
          <span>{{ localConfig.particles.count }}</span>
        </div>
        <div class="config-row">
          <label>Speed:</label>
          <input
            type="range"
            min="1"
            max="10"
            step="1"
            v-model.number="localConfig.particles.speed"
          />
          <span>{{ localConfig.particles.speed }}</span>
        </div>
      </div>

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
    🎨 Debug
  </button>
</template>

<script setup lang="ts">
import { ref, reactive, watch } from "vue";
import { useVisualConfig, DEFAULT_CONFIG } from "@/composables/useVisualConfig";

const { config, updateConfig, resetConfig, getConfigSnapshot } =
  useVisualConfig();
const showPanel = ref(false);

// Local reactive copy for immediate UI updates
const localConfig = reactive({ ...config });

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

  // Copy to clipboard
  navigator.clipboard
    .writeText(configJson)
    .then(() => {
      alert("Configuration copied to clipboard!");
    })
    .catch(() => {
      // Fallback: show in console
      console.log("Visual Effects Configuration:", configSnapshot);
      alert("Configuration logged to console");
    });
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
  overflow-y: auto;
}

.debug-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 15px;
  border-bottom: 1px solid #333;
  background: rgba(255, 255, 255, 0.1);
}

.debug-header h3 {
  margin: 0;
  font-size: 14px;
}

.close-btn {
  background: none;
  border: none;
  color: white;
  font-size: 18px;
  cursor: pointer;
  padding: 0;
  width: 24px;
  height: 24px;
}

.debug-content {
  padding: 15px;
}

.config-section {
  margin-bottom: 20px;
}

.config-section h4 {
  margin: 0 0 10px 0;
  font-size: 13px;
  color: #ffd700;
}

.config-row {
  display: flex;
  align-items: center;
  margin-bottom: 8px;
  gap: 8px;
}

.config-row label {
  min-width: 80px;
  font-size: 11px;
}

.config-row input[type="range"] {
  flex: 1;
  height: 4px;
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
