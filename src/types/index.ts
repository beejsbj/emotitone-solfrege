/**
 * Types Index
 * Centralized export of all type definitions for the Emotitone Solfege application
 */

// Music Theory Types
export type {
  SolfegeData,
  Scale,
  MelodicPattern,
  Note,
  MusicalMode,
  ChromaticNote,
  ActiveNote,
} from "./music";

// Visual Effects Types
export type {
  OscillationConfig,
  FontWeightElement,
  FrequencyMapping,
  VibratingStringConfig,
  AnimationLifecycleOptions,
  VisualEffectConfig,
  BlobConfig,
  AmbientConfig,
  ParticleConfig,
  StringConfig,
  FontOscillationConfig,
  AnimationConfig,
  FrequencyMappingConfig,
  VisualEffectsConfig,
  NoteColorRelationships,
  DynamicColorConfig,
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
  InstrumentConfig,
  InstrumentCategory,
  InstrumentName,
  InstrumentStoreState,
  InstrumentInitOptions,
  AudioEnvelope,
  CompressorConfig,
  VoiceConfig,
  SamplerConfig,
  OscillatorConfig,
  CompleteInstrumentConfig,
  InstrumentEvent,
  AudioContextInfo,
} from "./instrument";

// Palette System Types
export type {
  PaletteState,
  ButtonLayout,
  ControlLayout,
  AnimationState,
  OctaveHeights,
  SustainHook,
} from "./palette";

// Re-export commonly used Vue types for convenience
export type { Ref, ComputedRef, WritableComputedRef } from "vue";
