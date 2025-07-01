/**
 * Configuration Helper Utilities
 * Utilities for working with configuration values and validation
 */

import type {
  VisualEffectsConfig,
  ConfigFieldDef,
  ConfigValidationResult,
  ValueFormatter,
} from "@/types";

/**
 * Configuration Utilities
 * Helper functions for config value formatting, validation, and UI generation
 */

/**
 * Common value formatters for different unit types
 */
export const formatters = {
  /** Format as percentage */
  percentage: (val: number): string => `${Math.round(val * 100)}%`,

  /** Format with degrees symbol */
  degrees: (val: number): string => `${val}°`,

  /** Format with multiplier suffix */
  multiplier: (val: number): string => `${val}x`,

  /** Format milliseconds */
  milliseconds: (val: number): string => `${val}ms`,

  /** Format seconds */
  seconds: (val: number): string => `${val}s`,

  /** Format pixels */
  pixels: (val: number): string => `${val}px`,

  /** Format hertz */
  hertz: (val: number): string => `${val}Hz`,

  /** Format frames per second */
  fps: (val: number): string => `${val}fps`,

  /** Format note count */
  notes: (val: number): string => `${val} note${val !== 1 ? "s" : ""}`,

  /** Format boolean as ON/OFF */
  onOff: (val: boolean): string => (val ? "ON" : "OFF"),

  /** Format boolean as Enabled/Disabled */
  enabledDisabled: (val: boolean): string => (val ? "Enabled" : "Disabled"),

  /** Format boolean as Yes/No */
  yesNo: (val: boolean): string => (val ? "Yes" : "No"),
} satisfies Record<string, ValueFormatter>;

/**
 * Auto-format a value based on field definition
 */
export const formatFieldValue = (
  fieldDef: ConfigFieldDef,
  value: any
): string => {
  // Use custom formatter if available
  if (fieldDef.formatValue) {
    return fieldDef.formatValue(value);
  }

  // Auto-format based on value type and unit
  if (typeof value === "boolean") {
    return formatters.onOff(value);
  }

  if (typeof value === "number") {
    // Use unit-based formatting
    if (fieldDef.unit) {
      switch (fieldDef.unit) {
        case "%":
          return formatters.percentage(value);
        case "°":
          return formatters.degrees(value);
        case "ms":
          return formatters.milliseconds(value);
        case "s":
          return formatters.seconds(value);
        case "px":
          return formatters.pixels(value);
        case "Hz":
          return formatters.hertz(value);
        case "fps":
          return formatters.fps(value);
        default:
          return `${value}${fieldDef.unit}`;
      }
    }

    // Special cases based on field name patterns
    const key = fieldDef.label?.toLowerCase() || "";
    if (
      key.includes("opacity") ||
      key.includes("saturation") ||
      key.includes("lightness")
    ) {
      return formatters.percentage(value);
    }
    if (key.includes("speed") && !fieldDef.unit) {
      return formatters.multiplier(value);
    }
    if (key.includes("notes")) {
      return formatters.notes(value);
    }
  }

  return String(value);
};

/**
 * Convert camelCase to human-readable label
 */
export const formatLabel = (key: string): string => {
  return key
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

/**
 * Validate a config field value against its constraints
 */
export const validateFieldValue = (
  fieldDef: ConfigFieldDef,
  value: any
): ConfigValidationResult => {
  const valueType = typeof value;
  const expectedType = typeof fieldDef.value;

  // Type validation
  if (valueType !== expectedType) {
    return {
      valid: false,
      error: `Expected ${expectedType}, got ${valueType}`,
      correctedValue: fieldDef.value, // Fallback to default
    };
  }

  // Number-specific validation
  if (typeof value === "number") {
    if (typeof fieldDef.min === "number" && value < fieldDef.min) {
      return {
        valid: false,
        error: `Value ${value} is below minimum ${fieldDef.min}`,
        correctedValue: fieldDef.min,
      };
    }

    if (typeof fieldDef.max === "number" && value > fieldDef.max) {
      return {
        valid: false,
        error: `Value ${value} is above maximum ${fieldDef.max}`,
        correctedValue: fieldDef.max,
      };
    }

    // Check for step validation if specified
    if (typeof fieldDef.step === "number" && fieldDef.min !== undefined) {
      const steps = Math.round((value - fieldDef.min) / fieldDef.step);
      const expectedValue = fieldDef.min + steps * fieldDef.step;
      if (Math.abs(value - expectedValue) > 0.0001) {
        // Account for floating point precision
        return {
          valid: false,
          error: `Value ${value} doesn't align with step ${fieldDef.step}`,
          correctedValue: expectedValue,
        };
      }
    }
  }

  return { valid: true };
};

/**
 * Clamp a number value to field constraints
 */
export const clampFieldValue = (
  fieldDef: ConfigFieldDef,
  value: number
): number => {
  if (typeof value !== "number") return value;

  let clamped = value;

  if (typeof fieldDef.min === "number") {
    clamped = Math.max(clamped, fieldDef.min);
  }

  if (typeof fieldDef.max === "number") {
    clamped = Math.min(clamped, fieldDef.max);
  }

  // Snap to step if specified
  if (typeof fieldDef.step === "number" && fieldDef.min !== undefined) {
    const steps = Math.round((clamped - fieldDef.min) / fieldDef.step);
    clamped = fieldDef.min + steps * fieldDef.step;
  }

  return clamped;
};

/**
 * Get the display type for a config field
 */
export const getFieldDisplayType = (
  fieldDef: ConfigFieldDef
): "boolean" | "number" | "string" | "object" => {
  return typeof fieldDef.value as "boolean" | "number" | "string" | "object";
};

/**
 * Check if a field should be displayed in UI
 */
export const isFieldDisplayable = (fieldDef: ConfigFieldDef): boolean => {
  const type = getFieldDisplayType(fieldDef);

  // Skip complex objects for now
  if (type === "object" && fieldDef.value !== null) {
    return false;
  }

  // Skip if explicitly disabled
  if (fieldDef.disabled) {
    return false;
  }

  return ["boolean", "number", "string"].includes(type);
};

/**
 * Generate field constraints for UI components
 */
export const getFieldConstraints = (fieldDef: ConfigFieldDef) => {
  return {
    min: fieldDef.min,
    max: fieldDef.max,
    step: fieldDef.step,
    type: getFieldDisplayType(fieldDef),
    disabled: fieldDef.disabled || false,
  };
};

/**
 * Create a safe field accessor with validation
 */
export const createFieldAccessor = (
  configGetter: () => any,
  configSetter: (path: string, value: any) => void,
  sectionName: string,
  fieldName: string,
  fieldDef: ConfigFieldDef
) => {
  return {
    get: () => configGetter()[sectionName]?.[fieldName] ?? fieldDef.value,

    set: (value: any) => {
      const validation = validateFieldValue(fieldDef, value);
      const finalValue = validation.valid
        ? value
        : validation.correctedValue ?? fieldDef.value;
      configSetter(`${sectionName}.${fieldName}`, finalValue);
    },

    validate: (value: any) => validateFieldValue(fieldDef, value),

    format: (value: any) => formatFieldValue(fieldDef, value),

    getConstraints: () => getFieldConstraints(fieldDef),
  };
};

/**
 * Utility to extract just the values from config definitions
 */
export const extractConfigValues = (
  definitions: Record<string, any>
): Record<string, any> => {
  const result: Record<string, any> = {};

  for (const [sectionName, sectionDef] of Object.entries(definitions)) {
    if (
      sectionDef &&
      typeof sectionDef === "object" &&
      "fields" in sectionDef
    ) {
      result[sectionName] = {};
      for (const [fieldName, fieldDef] of Object.entries(sectionDef.fields)) {
        if (fieldDef && typeof fieldDef === "object" && "value" in fieldDef) {
          result[sectionName][fieldName] = fieldDef.value;
        }
      }
    }
  }

  return result;
};

export default {
  formatters,
  formatFieldValue,
  formatLabel,
  validateFieldValue,
  clampFieldValue,
  getFieldDisplayType,
  isFieldDisplayable,
  getFieldConstraints,
  createFieldAccessor,
  extractConfigValues,
};
