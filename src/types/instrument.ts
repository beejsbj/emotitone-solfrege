/**
 * Instrument System Types
 * Type definitions for instrument management, configuration, and audio synthesis
 */

/**
 * Instrument configuration interface
 */
export interface InstrumentConfig {
  /** Unique instrument identifier */
  name: string;
  /** Human-readable display name */
  displayName: string;
  /** Description of the instrument */
  description: string;
  /** Category classification */
  category:
    | "keyboards"
    | "synth"
    | "strings"
    | "brass"
    | "woodwinds"
    | "percussion";
  /** Optional icon identifier */
  icon?: string;
  /** Whether to minify samples for this instrument (for sample-based instruments) */
  minify?: boolean;
  /** Optional envelope override for this specific instrument */
  envelope?: AudioEnvelope;
}

/**
 * Instrument category type
 */
export type InstrumentCategory =
  | "keyboards"
  | "synth"
  | "strings"
  | "brass"
  | "woodwinds"
  | "percussion";

/**
 * Available instrument names
 */
export type InstrumentName =
  | "synth"
  | "amSynth"
  | "fmSynth"
  | "membraneSynth"
  | "metalSynth"
  | "piano"
  | "sample-piano"
  | "bass-electric"
  | "bassoon"
  | "cello"
  | "clarinet"
  | "contrabass"
  | "flute"
  | "french-horn"
  | "guitar-acoustic"
  | "guitar-electric"
  | "guitar-nylon"
  | "harmonium"
  | "harp"
  | "organ"
  | "saxophone"
  | "trombone"
  | "trumpet"
  | "tuba"
  | "violin"
  | "xylophone";

/**
 * Instrument store state interface
 */
export interface InstrumentStoreState {
  /** Currently selected instrument */
  currentInstrument: string;
  /** Loading state for instrument initialization */
  isLoading: boolean;
  /** Map of initialized instruments */
  instruments: Map<string, any>;
}

/**
 * Instrument initialization options
 */
export interface InstrumentInitOptions {
  /** Whether to initialize all instruments at once */
  initializeAll?: boolean;
  /** Specific instruments to initialize */
  instruments?: InstrumentName[];
  /** Audio context options */
  audioContext?: {
    sampleRate?: number;
    latencyHint?: "interactive" | "balanced" | "playback";
  };
}

/**
 * Audio envelope configuration
 */
export interface AudioEnvelope {
  /** Attack time in seconds */
  attack: number;
  /** Decay time in seconds */
  decay: number;
  /** Sustain level (0-1) */
  sustain: number;
  /** Release time in seconds */
  release: number;
}

/**
 * Compressor configuration for audio processing
 */
export interface CompressorConfig {
  /** Threshold in dB */
  threshold: number;
  /** Compression ratio */
  ratio: number;
  /** Attack time in seconds */
  attack: number;
  /** Release time in seconds */
  release: number;
}

/**
 * Instrument voice configuration
 */
export interface VoiceConfig {
  /** Maximum number of simultaneous voices */
  maxPolyphony: number;
  /** Voice allocation strategy */
  allocation?: "oldest" | "newest" | "quietest";
  /** Voice stealing enabled */
  voiceStealing?: boolean;
}

/**
 * Sampler instrument configuration
 */
export interface SamplerConfig {
  /** Sample URLs mapped by note names */
  urls: Record<string, string>;
  /** Base URL for sample loading */
  baseUrl?: string;
  /** Release time for samples */
  release?: number;
  /** Attack time for samples */
  attack?: number;
  /** Sample playback options */
  playback?: {
    /** Playback rate */
    playbackRate?: number;
    /** Loop configuration */
    loop?: boolean;
    /** Fade in/out times */
    fadeIn?: number;
    fadeOut?: number;
  };
}

/**
 * Synthesizer oscillator configuration
 */
export interface OscillatorConfig {
  /** Oscillator waveform type */
  type: "sine" | "square" | "sawtooth" | "triangle";
  /** Frequency modulation settings */
  modulation?: {
    /** Modulation type */
    type: "sine" | "square" | "sawtooth" | "triangle";
    /** Modulation frequency */
    frequency?: number;
    /** Modulation depth */
    depth?: number;
  };
}

/**
 * Complete instrument configuration
 */
export interface CompleteInstrumentConfig extends InstrumentConfig {
  /** Audio envelope settings */
  envelope: AudioEnvelope;
  /** Voice configuration */
  voice: VoiceConfig;
  /** Compressor settings */
  compressor: CompressorConfig;
  /** Oscillator settings (for synths) */
  oscillator?: OscillatorConfig;
  /** Sampler settings (for samplers) */
  sampler?: SamplerConfig;
  /** Additional instrument-specific parameters */
  parameters?: Record<string, any>;
}

/**
 * Instrument event data
 */
export interface InstrumentEvent {
  /** Event type */
  type: "instrument-changed" | "instrument-loaded" | "instrument-error";
  /** Instrument name */
  instrument: string;
  /** Event timestamp */
  timestamp: number;
  /** Additional event data */
  data?: any;
}

/**
 * Audio context information
 */
export interface AudioContextInfo {
  /** Whether audio context is initialized */
  isInitialized: boolean;
  /** Current audio context state */
  state: "suspended" | "running" | "closed";
  /** Sample rate in Hz */
  sampleRate: number;
  /** Current time in audio context */
  currentTime: number;
  /** Base latency in seconds */
  baseLatency: number;
}
