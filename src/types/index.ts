/**
 * Types Index
 * Centralized export of all type definitions for the Emotitone Solfege application
 */

// Music Theory Types
export type {
  SolfegeData,
  Scale,
  Note,
  MusicalMode,
  ChromaticNote,
  ActiveNote,
} from "./music";

// Visual Effects Types
export type {
  FrequencyMapping,
  VibratingStringConfig,
  AnimationLifecycleOptions,
  VisualEffectConfig,
  BlobConfig,
  AmbientConfig,
  ParticleConfig,
  StringConfig,
  AnimationConfig,
  FrequencyMappingConfig,
  VisualEffectsConfig,
  NoteColorRelationships,
  DynamicColorConfig,
  FloatingPopupConfig,
} from "./visual";

// Canvas and Animation Types
export type {
  ActiveBlob,
  Particle,
  CanvasProperties,
  AnimationFrame,
  RenderContext,
  EffectRenderState,
  PerformanceMetrics,
  CanvasNoteEvent,
} from "./canvas";

// Audio System Types
export type {
  SynthConfig,
  PlaybackOptions,
  SequenceConfig,
  AudioContextState,
  AudioAnalysis,
  AudioEffect,
  AudioRouting,
} from "./audio";

// Instrument System Types
export type {
  InstrumentStoreState,
  InstrumentInitOptions,
  AudioEnvelope,
  CompressorConfig,
  VoiceConfig,
  SamplerConfig,
  OscillatorConfig,
  InstrumentEvent,
  AudioContextInfo,
} from "./instrument";

// App Loading and Initialization Types
export type {
  LoadingPhase,
  LoadingState,
  InitializationProgress,
  SplashConfig,
  AppLoadingState,
} from "./loading";

// Pattern Logging Types
export type { LogNote, PatternsStoreState, PatternConfig } from "./patterns";

// Re-export commonly used Vue types for convenience
export type { Ref, ComputedRef, WritableComputedRef } from "vue";
