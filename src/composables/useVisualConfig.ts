import { computed } from "vue";
import { useVisualConfigStore } from "@/stores/visualConfig";
import {
  DEFAULT_CONFIG,
  ENHANCED_DEFAULT_CONFIG,
  CONFIG_SECTIONS,
} from "@/data/visual-config-metadata";
import type {
  BlobConfig,
  AmbientConfig,
  ParticleConfig,
  StringConfig,
  AnimationConfig,
  FrequencyMappingConfig,
  DynamicColorConfig,
  KeyboardConfig,
  BlobRelationshipConfig,
  BlobConnectionMode,
  HilbertScopeConfig,
  StageConfig,
  UIBeatConfig,
  PatternConfig,
  CodeStripConfig,
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
  KeyboardConfig,
  BlobRelationshipConfig,
  BlobConnectionMode,
  HilbertScopeConfig,
  StageConfig,
  UIBeatConfig,
  CodeStripConfig,
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
  const stageConfig = computed(() => store.effectiveConfig.stage);
  const blobConfig = computed(() => store.effectiveConfig.blobs);
  const ambientConfig = computed(() => store.effectiveConfig.ambient);
  const particleConfig = computed(() => store.effectiveConfig.particles);
  const stringConfig = computed(() => store.effectiveConfig.strings);
  const animationConfig = computed(() => store.effectiveConfig.animation);
  const frequencyMappingConfig = computed(() => store.effectiveConfig.frequencyMapping);
  const dynamicColorConfig = computed(() => store.config.dynamicColors);
  const hilbertScopeConfig = computed(() => store.effectiveConfig.hilbertScope);
  const uiBeatConfig = computed(() => store.config.uiBeat);
  const patternsConfig = computed(() => store.config.patterns);
  const keyboardConfig = computed(() => store.config.keyboard);
  const codeStripConfig = computed(() => store.config.codeStrip);

  return {
    // Configuration state
    config: store.config,
    effectiveConfig: store.effectiveConfig,
    visualsEnabled: store.visualsEnabled,

    // Individual sections
    stageConfig,
    blobConfig,
    ambientConfig,
    particleConfig,
    stringConfig,
    animationConfig,
    frequencyMappingConfig,
    dynamicColorConfig,
    hilbertScopeConfig,
    uiBeatConfig,
    patternsConfig,
    keyboardConfig,
    codeStripConfig,

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
