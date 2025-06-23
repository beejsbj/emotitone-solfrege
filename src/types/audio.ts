/**
 * Audio System Types
 * Type definitions for audio processing, synthesis, and effects
 */

/**
 * Audio synthesis parameters
 */
export interface SynthConfig {
  /** Oscillator type */
  oscillatorType: 'sine' | 'square' | 'sawtooth' | 'triangle';
  /** ADSR envelope settings */
  envelope: {
    /** Attack time in seconds */
    attack: number;
    /** Decay time in seconds */
    decay: number;
    /** Sustain level (0-1) */
    sustain: number;
    /** Release time in seconds */
    release: number;
  };
  /** Filter settings */
  filter?: {
    /** Filter type */
    type: 'lowpass' | 'highpass' | 'bandpass';
    /** Cutoff frequency in Hz */
    frequency: number;
    /** Filter resonance */
    Q: number;
  };
}

/**
 * Audio playback options
 */
export interface PlaybackOptions {
  /** Note duration (Tone.js notation) */
  duration?: string;
  /** Playback velocity (0-1) */
  velocity?: number;
  /** Delay before playback in seconds */
  delay?: number;
}

/**
 * Audio sequence configuration
 */
export interface SequenceConfig {
  /** Array of note names or frequencies */
  notes: (string | number)[];
  /** Tempo in BPM */
  tempo: number;
  /** Note duration for each step */
  stepDuration: string;
  /** Whether to loop the sequence */
  loop: boolean;
}

/**
 * Audio context state
 */
export interface AudioContextState {
  /** Whether audio context is initialized */
  isInitialized: boolean;
  /** Current audio context state */
  state: 'suspended' | 'running' | 'closed';
  /** Sample rate in Hz */
  sampleRate: number;
  /** Current time in audio context */
  currentTime: number;
}

/**
 * Audio analysis data
 */
export interface AudioAnalysis {
  /** Frequency domain data */
  frequencyData: Float32Array;
  /** Time domain data */
  timeData: Float32Array;
  /** RMS (root mean square) level */
  rmsLevel: number;
  /** Peak frequency */
  peakFrequency: number;
}

/**
 * Audio effect parameters
 */
export interface AudioEffect {
  /** Effect type identifier */
  type: string;
  /** Whether effect is enabled */
  enabled: boolean;
  /** Effect-specific parameters */
  parameters: Record<string, number>;
}

/**
 * Audio routing configuration
 */
export interface AudioRouting {
  /** Input source */
  input: string;
  /** Output destination */
  output: string;
  /** Effects chain */
  effects: AudioEffect[];
  /** Gain level (0-1) */
  gain: number;
}
