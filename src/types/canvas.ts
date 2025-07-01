/**
 * Canvas and Animation Types
 * Type definitions for canvas rendering, particles, and animation systems
 */

import type { SolfegeData } from "./music";

/**
 * Active blob state for canvas rendering
 */
export interface ActiveBlob {
  /** X position on canvas */
  x: number;
  /** Y position on canvas */
  y: number;
  /** Associated solfege note data */
  note: SolfegeData;
  /** Audio frequency in Hz */
  frequency: number;
  /** Animation start timestamp */
  startTime: number;
  /** Base radius before oscillation */
  baseRadius: number;
  /** Current opacity (0-1) */
  opacity: number;
  /** Whether the blob is in fade-out phase */
  isFadingOut: boolean;
  /** Timestamp when fade-out started */
  fadeOutStartTime?: number;
  /** Drift velocity in X direction */
  driftVx: number;
  /** Drift velocity in Y direction */
  driftVy: number;
  /** Random phase offset for unique vibration pattern */
  vibrationPhase: number;
  /** Current scale multiplier for grow/shrink animations */
  scale: number;
}

/**
 * Particle object for particle system
 */
export interface Particle {
  /** X position on canvas */
  x: number;
  /** Y position on canvas */
  y: number;
  /** X velocity */
  vx: number;
  /** Y velocity */
  vy: number;
  /** Particle color */
  color: string;
  /** Particle shape identifier */
  shape: string;
  /** Particle size */
  size: number;
  /** Current life remaining */
  life: number;
  /** Maximum lifetime */
  maxLife: number;
  /** Current rotation angle */
  rotation: number;
  /** Rotation speed per frame */
  rotationSpeed: number;
}

/**
 * Canvas dimensions and properties
 */
export interface CanvasProperties {
  /** Canvas width in pixels */
  width: number;
  /** Canvas height in pixels */
  height: number;
  /** Device pixel ratio for high-DPI displays */
  devicePixelRatio: number;
}

/**
 * Animation frame data
 */
export interface AnimationFrame {
  /** Current timestamp */
  timestamp: number;
  /** Time elapsed since last frame */
  deltaTime: number;
  /** Frames per second */
  fps: number;
}

/**
 * Render context for canvas operations
 */
export interface RenderContext {
  /** 2D rendering context */
  ctx: CanvasRenderingContext2D;
  /** Canvas properties */
  canvas: CanvasProperties;
  /** Current animation frame data */
  frame: AnimationFrame;
}

/**
 * Visual effect render state
 */
export interface EffectRenderState {
  /** Whether the effect should render */
  shouldRender: boolean;
  /** Effect opacity multiplier */
  opacity: number;
  /** Effect scale multiplier */
  scale: number;
  /** Custom properties for specific effects */
  properties: Record<string, any>;
}

/**
 * Performance monitoring data
 */
export interface PerformanceMetrics {
  /** Current frames per second */
  fps: number;
  /** Frame render time in milliseconds */
  frameTime: number;
  /** Memory usage estimate */
  memoryUsage: number;
  /** Number of active objects */
  activeObjects: number;
}

/**
 * Canvas event data for note interactions
 */
export interface CanvasNoteEvent {
  /** Event type */
  type: "note-played" | "note-released";
  /** Associated solfege data */
  note: SolfegeData;
  /** Audio frequency */
  frequency: number;
  /** Solfege index */
  solfegeIndex: number;
  /** Whether note is currently playing */
  isPlaying?: boolean;
}

/**
 * Vibrating string configuration for string-like animations
 */
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

/*
 * ========================================
 * CANVAS RENDERING CONFIGURATIONS
 * ========================================
 * These config interfaces define parameters for various canvas effects.
 * Note: These are now managed by CONFIG_DEFINITIONS but kept for backwards compatibility.
 */

/**
 * Blob visual effect configuration
 * Used by useBlobRenderer.ts
 */
export interface BlobConfig {
  /** Whether blob effects are enabled */
  isEnabled: boolean;
  /** Base size ratio relative to screen size */
  baseSizeRatio: number;
  /** Minimum blob size in pixels */
  minSize: number;
  /** Maximum blob size in pixels */
  maxSize: number;
  /** Blob opacity (0-1) */
  opacity: number;
  /** Blur radius in pixels */
  blurRadius: number;
  /** Vibration amplitude (0-1) - now used for edge vibration */
  oscillationAmplitude: number;
  /** Fade-out duration in seconds */
  fadeOutDuration: number;
  /** Scale-in animation duration in seconds */
  scaleInDuration: number;
  /** Scale-out animation duration in seconds */
  scaleOutDuration: number;
  /** Maximum drift speed in pixels per second */
  driftSpeed: number;
  /** Vibration frequency divisor for more fluid movement */
  vibrationFrequencyDivisor: number;
  /** Number of segments for blob edge */
  edgeSegments: number;
  /** Amplitude of edge vibration */
  vibrationAmplitude: number;
  /** Enable glow effect */
  glowEnabled: boolean;
  /** Glow blur intensity */
  glowIntensity: number;
}

/**
 * Ambient lighting effect configuration
 * Used by useAmbientRenderer.ts
 */
export interface AmbientConfig {
  /** Whether ambient effects are enabled */
  isEnabled: boolean;
  /** Opacity for major scale notes */
  opacityMajor: number;
  /** Opacity for minor scale notes */
  opacityMinor: number;
  /** Brightness for major scale notes */
  brightnessMajor: number;
  /** Brightness for minor scale notes */
  brightnessMinor: number;
  /** Saturation for major scale notes */
  saturationMajor: number;
  /** Saturation for minor scale notes */
  saturationMinor: number;
}

/**
 * Particle system configuration
 * Used by useParticleSystem.ts
 */
export interface ParticleConfig {
  /** Whether particle effects are enabled */
  isEnabled: boolean;
  /** Number of particles to generate */
  count: number;
  /** Minimum particle size */
  sizeMin: number;
  /** Maximum particle size */
  sizeMax: number;
  /** Minimum particle lifetime in milliseconds */
  lifetimeMin: number;
  /** Maximum particle lifetime in milliseconds */
  lifetimeMax: number;
  /** Particle movement speed */
  speed: number;
  /** Gravity effect on particles */
  gravity: number;
  /** Air resistance factor (0-1) */
  airResistance: number;
}

/**
 * String visual effect configuration
 * Used by useStringRenderer.ts
 */
export interface StringConfig {
  /** Whether string effects are enabled */
  isEnabled: boolean;
  /** Number of strings to render */
  count: number;
  /** Base opacity when inactive */
  baseOpacity: number;
  /** Opacity when active */
  activeOpacity: number;
  /** Maximum vibration amplitude */
  maxAmplitude: number;
  /** Damping factor for vibration decay */
  dampingFactor: number;
  /** Speed of amplitude interpolation */
  interpolationSpeed: number;
  /** Speed of opacity interpolation */
  opacityInterpolationSpeed: number;
}

/**
 * Animation timing and performance configuration
 * Used by useStringRenderer.ts and other animation systems
 */
export interface AnimationConfig {
  /** Divisor for converting audio frequency to visual frequency */
  visualFrequencyDivisor: number;
  /** Target frame rate for animations */
  frameRate: number;
  /** Smoothing factor for animations (0-1) */
  smoothingFactor: number;
}
