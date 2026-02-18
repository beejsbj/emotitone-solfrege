<template>
  <div class="keyboard-settings">
    <!-- Visual Settings Section -->
    <div class="settings-section">
      <h3 class="section-title">Keyboard Appearance</h3>
      
      <div class="controls-grid">
        <!-- Color Mode -->
        <div class="control-group">
          <Knob
            :model-value="keyboardConfig.colorMode"
            type="options"
            :options="[
              { label: 'Colored', value: 'colored' },
              { label: 'Monochrome', value: 'monochrome' },
              { label: 'Glass', value: 'glassmorphism' }
            ]"
            label="Color Mode"
            @update:modelValue="updateConfig('colorMode', $event)"
          />
        </div>

        <!-- Border Radius -->
        <div class="control-group">
          <Knob
            :model-value="keyboardConfig.keyShape"
            type="range"
            label="Roundness"
            :min="0"
            :max="20"
            :step="1"
            :format="(v: number) => `${v}px`"
            @update:modelValue="updateConfig('keyShape', $event)"
          />
        </div>

        <!-- Key Size -->
        <div class="control-group">
          <Knob
            :model-value="keyboardConfig.keySize"
            type="range"
            label="Key Size"
            :min="0.6"
            :max="1.8"
            :step="0.1"
            :format="(v: number) => `${v}x`"
            @update:modelValue="updateConfig('keySize', $event)"
          />
        </div>

        <!-- Key Gaps -->
        <div class="control-group">
          <Knob
            :model-value="keyboardConfig.keyGaps"
            type="options"
            :options="[
              { label: 'None', value: 'none' },
              { label: 'Small', value: 'small' },
              { label: 'Medium', value: 'medium' }
            ]"
            label="Key Gaps"
            @update:modelValue="updateConfig('keyGaps', $event)"
          />
        </div>

        <!-- Show Labels -->
        <div class="control-group">
          <Knob
            :model-value="keyboardConfig.showLabels"
            type="boolean"
            label="Labels"
            @update:modelValue="updateConfig('showLabels', $event)"
          />
        </div>

        <!-- Haptic Feedback -->
        <div class="control-group">
          <Knob
            :model-value="keyboardConfig.hapticFeedback"
            type="boolean"
            label="Haptics"
            @update:modelValue="updateConfig('hapticFeedback', $event)"
          />
        </div>
      </div>
    </div>

    <!-- Color Adjustments Section (for colored/monochrome modes) -->
    <div v-if="keyboardConfig.colorMode !== 'glassmorphism'" class="settings-section">
      <h3 class="section-title">Color Adjustments</h3>
      
      <div class="controls-grid">
        <!-- Key Brightness -->
        <div class="control-group">
          <Knob
            :model-value="keyboardConfig.keyBrightness"
            type="range"
            label="Brightness"
            :min="0.3"
            :max="2.0"
            :step="0.1"
            :format="(v: number) => `${(v * 100).toFixed(0)}%`"
            @update:modelValue="updateConfig('keyBrightness', $event)"
          />
        </div>

        <!-- Key Saturation -->
        <div class="control-group">
          <Knob
            :model-value="keyboardConfig.keySaturation"
            type="range"
            label="Saturation"
            :min="0.0"
            :max="1.5"
            :step="0.1"
            :format="(v: number) => `${(v * 100).toFixed(0)}%`"
            @update:modelValue="updateConfig('keySaturation', $event)"
          />
        </div>
      </div>
    </div>

    <!-- Glassmorphism Settings (for glassmorphism mode) -->
    <div v-if="keyboardConfig.colorMode === 'glassmorphism'" class="settings-section">
      <h3 class="section-title">Glass Effect</h3>
      
      <div class="controls-grid">
        <!-- Glass Opacity -->
        <div class="control-group">
          <Knob
            :model-value="keyboardConfig.glassmorphOpacity"
            type="range"
            label="Opacity"
            :min="0"
            :max="1"
            :step="0.05"
            :format="(v: number) => `${(v * 100).toFixed(0)}%`"
            @update:modelValue="updateConfig('glassmorphOpacity', $event)"
          />
        </div>
      </div>
    </div>

    <!-- Layout Settings Section -->
    <div class="settings-section">
      <h3 class="section-title">Keyboard Layout</h3>
      
      <div class="controls-grid">
        <!-- Main Octave -->
        <div class="control-group">
          <Knob
            :model-value="keyboardConfig.mainOctave"
            type="range"
            label="Octave"
            :min="1"
            :max="8"
            :step="1"
            @update:modelValue="updateConfig('mainOctave', $event)"
          />
        </div>

        <!-- Row Count -->
        <div class="control-group">
          <Knob
            :model-value="keyboardConfig.rowCount"
            type="range"
            label="Rows"
            :min="1"
            :max="8"
            :step="1"
            @update:modelValue="updateConfig('rowCount', $event)"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useKeyboardDrawerStore } from "@/stores/keyboardDrawer";
import { Knob } from "@/components/knobs";

const store = useKeyboardDrawerStore();
const keyboardConfig = computed(() => store.keyboardConfig);

const updateConfig = (key: string, value: any) => {
  store.updateKeyboardConfig({ [key]: value });
};
</script>

<style scoped>
.keyboard-settings {
  @apply space-y-4 p-4;
}

.settings-section {
  @apply bg-black/20 rounded-lg p-3 border border-white/10;
}

.section-title {
  @apply text-sm font-semibold text-white/80 mb-3;
}

.controls-grid {
  @apply grid grid-cols-2 gap-3;
}

@media (min-width: 640px) {
  .controls-grid {
    @apply grid-cols-3;
  }
}

.control-group {
  @apply flex-1 min-w-0;
}

/* High contrast support */
@media (prefers-contrast: high) {
  .settings-section {
    @apply border-white/30;
  }
}
</style>
