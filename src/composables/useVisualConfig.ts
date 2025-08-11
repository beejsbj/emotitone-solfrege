import { computed, reactive } from "vue";
import { useVisualConfigStore } from "@/stores/visualConfig";
import { DEFAULT_CONFIG, ENHANCED_DEFAULT_CONFIG, CONFIG_SECTIONS } from "@/data/visual-config-metadata";
import type {
  BlobConfig,
  AmbientConfig,
  ParticleConfig,
  StringConfig,
  AnimationConfig,
  FrequencyMappingConfig,
  DynamicColorConfig,
  PaletteConfig,
  FloatingPopupConfig,
  HilbertScopeConfig,
  BeatingShapesConfig,
  VisualEffectsConfig,
} from "@/types/visual";

/**
 * Unified Visual Effects Configuration System
 * Centralizes all visual effect parameters for consistent management
 */

// Re-export types for backward compatibility
export type {
  BlobConfig,
  AmbientConfig,
  ParticleConfig,
  StringConfig,
  AnimationConfig,
  FrequencyMappingConfig,
  DynamicColorConfig,
  PaletteConfig,
  FloatingPopupConfig,
  HilbertScopeConfig,
  BeatingShapesConfig,
  VisualEffectsConfig,
};

/**
 * Composable for managing unified visual effects configuration
 * Now uses Pinia store for persistence and centralized state management
 */
export function useVisualConfig() {
  // Use the Pinia store
  const store = useVisualConfigStore();

  // Individual config sections as computed refs for convenience
  const blobConfig = computed(() => store.config.blobs);
  const ambientConfig = computed(() => store.config.ambient);
  const particleConfig = computed(() => store.config.particles);
  const stringConfig = computed(() => store.config.strings);
  const animationConfig = computed(() => store.config.animation);
  const frequencyMappingConfig = computed(() => store.config.frequencyMapping);
  const dynamicColorConfig = computed(() => store.config.dynamicColors);
  const paletteConfig = computed(() => store.config.palette);
  const floatingPopupConfig = computed(() => store.config.floatingPopup);
  const hilbertScopeConfig = computed(() => store.config.hilbertScope);
  const beatingShapesConfig = computed(() => store.config.beatingShapes);

  return {
    // Configuration state
    config: store.config,
    visualsEnabled: store.visualsEnabled,

    // Individual sections
    blobConfig,
    ambientConfig,
    particleConfig,
    stringConfig,
    animationConfig,
    frequencyMappingConfig,
    dynamicColorConfig,
    paletteConfig,
    floatingPopupConfig,
    hilbertScopeConfig,
    beatingShapesConfig,

    // Methods from store
    updateConfig: store.updateConfig,
    resetConfig: store.resetToDefaults,
    resetSection: store.resetSection,
    getConfigSnapshot: store.getConfigSnapshot,
    loadConfigSnapshot: store.loadConfigSnapshot,
  };
}

// Export default configuration for reference
export { DEFAULT_CONFIG, ENHANCED_DEFAULT_CONFIG, CONFIG_SECTIONS };
