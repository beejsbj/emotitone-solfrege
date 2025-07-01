/**
 * Configuration System Types
 * Type definitions for the unified config system with inline metadata
 */

import type {
  BlobConfig,
  AmbientConfig,
  ParticleConfig,
  StringConfig,
  AnimationConfig,
} from "./canvas";
import type { DynamicColorConfig } from "./color";
import type { FrequencyMappingConfig } from "./audio";
import type {
  PaletteConfig,
  FloatingPopupConfig,
  FontOscillationConfig,
} from "./palette";

/**
 * Value formatter function type
 */
export type ValueFormatter<T = any> = (value: T) => string;

/**
 * Configuration field definition with value and UI metadata
 */
export interface ConfigFieldDef<T = any> {
  /** The actual default value */
  value: T;
  /** Human-readable label for UI */
  label?: string;
  /** Icon/emoji for the field */
  icon?: string;
  /** Minimum value (for numbers) */
  min?: number;
  /** Maximum value (for numbers) */
  max?: number;
  /** Step size (for numbers) */
  step?: number;
  /** Unit suffix (e.g., "px", "ms", "%") */
  unit?: string;
  /** Custom value formatter function */
  formatValue?: ValueFormatter<T>;
  /** Help text or description */
  description?: string;
  /** Whether field is disabled/readonly */
  disabled?: boolean;
}

/**
 * Configuration section definition with metadata
 */
export interface ConfigSectionDef {
  /** Section icon/emoji */
  icon: string;
  /** Human-readable section label */
  label: string;
  /** Description of what this section controls */
  description?: string;
  /** Map of field names to their definitions */
  fields: Record<string, ConfigFieldDef>;
}

/**
 * Complete configuration definitions structure
 */
export type ConfigDefinitions = Record<string, ConfigSectionDef>;

/**
 * Type for extracting the value type from a ConfigFieldDef
 */
export type ConfigFieldValue<T extends ConfigFieldDef> = T["value"];

/**
 * Type for extracting all values from a section definition
 */
export type ConfigSectionValues<T extends ConfigSectionDef> = {
  [K in keyof T["fields"]]: ConfigFieldValue<T["fields"][K]>;
};

/**
 * Type for extracting the complete config from definitions
 */
export type ConfigFromDefinitions<T extends ConfigDefinitions> = {
  [K in keyof T]: ConfigSectionValues<T[K]>;
};

/**
 * Main visual effects configuration interface
 *
 * This is the root configuration object that combines all visual effect settings.
 * The actual configuration is now managed by CONFIG_DEFINITIONS in the store,
 * but this interface maintains backwards compatibility and type safety.
 */
export interface VisualEffectsConfig {
  /** Blob effect configuration */
  blobs: BlobConfig;
  /** Ambient lighting configuration */
  ambient: AmbientConfig;
  /** Particle system configuration */
  particles: ParticleConfig;
  /** String effect configuration */
  strings: StringConfig;
  /** Font oscillation configuration */
  fontOscillation: FontOscillationConfig;
  /** Animation configuration */
  animation: AnimationConfig;
  /** Frequency mapping configuration */
  frequencyMapping: FrequencyMappingConfig;
  /** Dynamic color system configuration */
  dynamicColors: DynamicColorConfig;
  /** Palette visual configuration */
  palette: PaletteConfig;
  /** Floating popup configuration */
  floatingPopup: FloatingPopupConfig;
}

/**
 * Validation result for config values
 */
export interface ConfigValidationResult {
  /** Whether validation passed */
  valid: boolean;
  /** Error message if validation failed */
  error?: string;
  /** Corrected value if applicable */
  correctedValue?: any;
}

/**
 * Config field metadata for UI generation
 */
export interface ConfigFieldMetadata {
  /** Field type inferred from value */
  type: "boolean" | "number" | "string" | "object";
  /** Whether this field should be displayed in UI */
  displayable: boolean;
  /** Validation constraints */
  constraints?: {
    min?: number;
    max?: number;
    step?: number;
    required?: boolean;
    pattern?: RegExp;
  };
}

/**
 * Extended field definition with computed metadata
 */
export interface EnhancedConfigFieldDef<T = any> extends ConfigFieldDef<T> {
  /** Computed metadata */
  metadata: ConfigFieldMetadata;
}

/**
 * Configuration change event
 */
export interface ConfigChangeEvent {
  /** Section that changed */
  section: string;
  /** Field that changed */
  field: string;
  /** Old value */
  oldValue: any;
  /** New value */
  newValue: any;
  /** Timestamp of change */
  timestamp: number;
}

/**
 * Configuration preset/snapshot
 */
export interface ConfigPreset {
  /** Unique preset ID */
  id: string;
  /** Preset name */
  name: string;
  /** Preset description */
  description?: string;
  /** The configuration values */
  config: VisualEffectsConfig;
  /** Creation timestamp */
  createdAt: string;
  /** Last update timestamp */
  updatedAt: string;
  /** Preset tags for categorization */
  tags?: string[];
  /** Whether this is a built-in preset */
  readonly?: boolean;
}

/**
 * Configuration export/import data structure
 */
export interface ConfigExportData {
  /** Configuration values */
  config: VisualEffectsConfig;
  /** Whether visuals are enabled */
  visualsEnabled: boolean;
  /** Export timestamp */
  exportedAt: string;
  /** Version of the config format */
  version: string;
  /** Optional metadata */
  metadata?: {
    appVersion?: string;
    userAgent?: string;
    [key: string]: any;
  };
}

/**
 * Type guards for config field types
 */
export const isConfigFieldDef = (value: any): value is ConfigFieldDef => {
  return typeof value === "object" && value !== null && "value" in value;
};

export const isConfigSectionDef = (value: any): value is ConfigSectionDef => {
  return (
    typeof value === "object" &&
    value !== null &&
    "icon" in value &&
    "label" in value &&
    "fields" in value
  );
};

/**
 * Utility type for getting field type from path
 */
export type ConfigFieldPath = `${string}.${string}`;

/**
 * Type for config field getter/setter
 */
export interface ConfigFieldAccessor<T = any> {
  get(): T;
  set(value: T): void;
  validate(value: T): ConfigValidationResult;
  format(value: T): string;
  getMetadata(): ConfigFieldMetadata;
}

export default {};
