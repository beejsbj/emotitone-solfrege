<template>
  <div v-if="isDynamicColorsEnabled" class="dynamic-color-preview">
    <h3>🌈 Dynamic Color Preview</h3>
    <div class="color-grid">
      <div
        v-for="notePreview in colorPreview"
        :key="notePreview.name"
        class="color-item"
      >
        <div class="note-name">{{ notePreview.name }}</div>
        <div class="color-swatches">
          <div
            class="color-swatch primary"
            :style="{ backgroundColor: notePreview.colors.primary }"
            :title="`Primary: ${notePreview.colors.primary}`"
          ></div>
          <div
            class="color-swatch accent"
            :style="{ backgroundColor: notePreview.colors.accent }"
            :title="`Accent: ${notePreview.colors.accent}`"
          ></div>
          <div
            class="color-swatch secondary"
            :style="{ backgroundColor: notePreview.colors.secondary }"
            :title="`Secondary: ${notePreview.colors.secondary}`"
          ></div>
          <div
            class="color-swatch tertiary"
            :style="{ backgroundColor: notePreview.colors.tertiary }"
            :title="`Tertiary: ${notePreview.colors.tertiary}`"
          ></div>
        </div>
        <div class="hue-info" v-if="isDynamicColorsEnabled">
          <small>Dynamic Colors Active</small>
        </div>
      </div>
    </div>
    <div class="mapping-info">
      <p>
        <strong>Mapping:</strong>
        {{
          isChromaticMappingEnabled ? "12 Chromatic Notes" : "7 Solfege Notes"
        }}
      </p>
      <p>
        <strong>Hue Distribution:</strong>
        {{ Math.round(360 / (isChromaticMappingEnabled ? 12 : 7)) }}° per note
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useColorSystem } from "@/composables/useColorSystem";
import { useVisualConfig } from "@/composables/useVisualConfig";

const { getColorPreview, isDynamicColorsEnabled } = useColorSystem();
const { dynamicColorConfig } = useVisualConfig();

// Get color preview for middle octave
const colorPreview = computed(() => getColorPreview("major", 3));

// Check if chromatic mapping is enabled
const isChromaticMappingEnabled = computed(
  () => dynamicColorConfig.value.chromaticMapping
);
</script>

<style scoped>
.dynamic-color-preview {
  background: rgba(0, 0, 0, 0.8);
  border-radius: 12px;
  padding: 1rem;
  margin: 1rem 0;
  backdrop-filter: blur(10px);
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dynamic-color-preview h3 {
  margin: 0 0 1rem 0;
  color: white;
  font-size: 1.1rem;
}

.color-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.color-item {
  text-align: center;
}

.note-name {
  color: white;
  font-weight: bold;
  margin-bottom: 0.5rem;
  font-size: 0.9rem;
}

.color-swatches {
  display: flex;
  gap: 2px;
  margin-bottom: 0.25rem;
}

.color-swatch {
  width: 100%;
  height: 20px;
  border-radius: 3px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  cursor: pointer;
  transition: transform 0.2s ease;
}

.color-swatch:hover {
  transform: scale(1.1);
}

.hue-info {
  color: rgba(255, 255, 255, 0.7);
  font-size: 0.7rem;
}

.mapping-info {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 0.75rem;
  color: rgba(255, 255, 255, 0.8);
  font-size: 0.8rem;
}

.mapping-info p {
  margin: 0.25rem 0;
}
</style>
