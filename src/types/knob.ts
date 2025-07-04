import type { Component } from "vue";

export interface BaseKnobProps {
  /**
   * Current value of the knob
   */
  modelValue: number | boolean | string;
  /**
   * Whether the knob is disabled
   */
  isDisabled?: boolean;
  /**
   * Custom class names for styling
   */
  className?: string;
  /**
   * Value labels for boolean knobs
   */
  valueLabelTrue?: string | Component;
  valueLabelFalse?: string | Component;
  themeColor?: string;
  label?: string;
}

export interface KnobWrapperProps extends BaseKnobProps {
  /**
   * Label to display above the knob
   */
  label?: string;
  /**
   * @deprecated Use `label` instead. Kept for backwards compatibility.
   */
  paramName?: string;
  type?: KnobType;
  isDisplay?: boolean;
}

export interface RangeKnobProps
  extends Omit<BaseKnobProps, "label" | "paramName"> {
  min?: number;
  max?: number;
  step?: number;
  isDisplay?: boolean;
  showProgress?: boolean;
  formatValue?: (value: number) => string | number;
}

export interface BooleanKnobProps extends BaseKnobProps {
  modelValue: boolean;
  valueLabelTrue?: string | Component;
  valueLabelFalse?: string | Component;
}

// Simplified button props - no onClick needed since we use @click
export interface ButtonKnobProps
  extends Omit<BaseKnobProps, "modelValue" | "label" | "paramName"> {
  buttonText?: string;
  icon?: Component | string;
  isLoading?: boolean;
  isActive?: boolean; // For visual feedback only
  readyColor?: string;
  activeColor?: string;
  loadingColor?: string;
}

export interface KnobOption {
  label: string;
  value: string | number;
  color?: string;
}

export interface OptionsKnobProps
  extends Omit<BaseKnobProps, "label" | "paramName"> {
  modelValue: string | number;
  options: string[] | KnobOption[];
}

export interface KnobEmits {
  "update:modelValue": [value: string | number | boolean];
}

export type KnobType = "range" | "boolean" | "options" | "button";
