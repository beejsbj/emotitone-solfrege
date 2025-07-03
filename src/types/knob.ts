export interface BaseKnobProps {
  modelValue: string | number | boolean;
  /**
   * Human-readable label displayed below/inside the knob.
   * Use this instead of the old deprecated `paramName` prop.
   */
  label?: string;
  /**
   * @deprecated Use `label` instead. Kept for backwards compatibility.
   */
  paramName?: string;
  isDisabled?: boolean;
  themeColor?: string;
}

export interface RangeKnobProps extends BaseKnobProps {
  modelValue: number;
  min?: number;
  max?: number;
  step?: number;
  mode?: "interactive" | "display";
  showProgress?: boolean;
  formatValue?: (value: number) => string | number;
}

export interface BooleanKnobProps extends BaseKnobProps {
  modelValue: boolean;
}

export interface ButtonKnobProps extends BaseKnobProps {
  modelValue: boolean;
  buttonText?: string;
  activeText?: string;
  icon?: any; // Component or string
  isLoading?: boolean;
  readyColor?: string;
  activeColor?: string;
  loadingColor?: string;
}

export interface KnobOption {
  label: string;
  value: string | number;
  color?: string;
}

export interface OptionsKnobProps extends BaseKnobProps {
  modelValue: string | number;
  options: string[] | KnobOption[];
}

export interface KnobEmits {
  "update:modelValue": [value: string | number | boolean];
}

export type KnobType = "range" | "boolean" | "options" | "button";
