/**
 * Types Index
 * Centralized export of all type definitions for the Emotitone Solfege application
 */

/**
 * Centralized Type Exports
 * Re-exports all types from various modules for easy importing
 */

import type { Ref } from "vue";

// Visual effect types - moved to other domain files
// export * from "./visual"; // DELETED - types moved to domain-specific files

// Audio and music types
export * from "./audio";
export * from "./music";

// UI and interaction types
export * from "./palette";
export * from "./canvas";
export * from "./loading";

// Library and data types
export * from "./instrument";
export * from "./sample-library";

// Configuration system types
export * from "./config";

// Color system types (now integrated with music types)
// export * from "./color"; // Moved to music.ts to avoid duplication

/*
 * ========================================
 * MISCELLANEOUS UTILITY TYPES
 * ========================================
 * General-purpose types that don't belong in specific domain files
 */

/**
 * Font weight oscillation configuration
 * @deprecated Use CONFIG_DEFINITIONS.fontOscillation instead
 */
export interface OscillationConfig {
  /** Base font weight when not oscillating */
  baseWeight: number;
  /** Minimum font weight allowed */
  minWeight: number;
  /** Maximum font weight allowed */
  maxWeight: number;
  /** Amplitude of the oscillation */
  amplitude: number;
  /** Frequency multiplier for visual oscillation */
  frequencyMultiplier: number;
}

/**
 * Font weight element with reactive properties
 */
export interface FontWeightElement {
  /** Reactive font weight value */
  weight: Ref<number>;
  /** Configuration for this element's oscillation */
  config: OscillationConfig;
}

/**
 * Animation lifecycle callback options
 */
export interface AnimationLifecycleOptions {
  /** Callback when animation starts */
  onStart?: () => void;
  /** Callback when animation stops */
  onStop?: () => void;
  /** Callback for each animation frame */
  onFrame?: (timestamp: number, elapsed: number) => void;
  /** Whether to automatically cleanup on component unmount */
  autoCleanup?: boolean;
}

/**
 * Visual effect state configuration
 */
export interface VisualEffectConfig {
  /** Whether the effect is currently active */
  isActive: boolean;
  /** Current note being played */
  currentNote: string | null;
  /** Frequency of the current note */
  frequency: number;
  /** Index of the current solfege note */
  solfegeIndex: number;
}

// Legacy/deprecated types (to be removed)
// TODO: Remove these once all references are updated
export type { VisualEffectsConfig } from "./config";

export default {};
