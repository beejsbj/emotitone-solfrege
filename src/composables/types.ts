// TypeScript interfaces for visual effects and animations

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

export interface FontWeightElement {
  /** Reactive font weight value */
  weight: Ref<number>;
  /** Configuration for this element's oscillation */
  config: OscillationConfig;
}

export interface FrequencyMapping {
  /** Minimum frequency for mapping */
  minFreq: number;
  /** Maximum frequency for mapping */
  maxFreq: number;
  /** Minimum output value */
  minValue: number;
  /** Maximum output value */
  maxValue: number;
}

export interface VibratingStringConfig {
  /** X position of the string */
  x: number;
  /** Base Y position of the string */
  baseY: number;
  /** Current amplitude of vibration */
  amplitude: number;
  /** Vibration frequency */
  frequency: number;
  /** Phase offset for the vibration */
  phase: number;
  /** Color of the string */
  color: string;
  /** Opacity of the string */
  opacity: number;
  /** Whether the string is currently active */
  isActive: boolean;
  /** Index of the associated note */
  noteIndex: number;
}

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

// Re-export Ref type from Vue for convenience
import type { Ref } from 'vue';
