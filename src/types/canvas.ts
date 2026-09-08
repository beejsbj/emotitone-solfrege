/**
 * Canvas and Animation Types
 * Type definitions for canvas rendering, particles, and animation systems
 */

import type { MarkName } from "@/components/primatives/marks";
import type {
  ActiveNote,
  ChromaticNote,
  HarmonicIntervalEdge,
  MusicalMode,
  SolfegeData,
} from "./music";

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
  /** Last rendered scale, exposed to dependent canvas effects */
  renderScale?: number;
  /** Last rendered opacity, exposed to dependent canvas effects */
  renderOpacity?: number;
  /** Harmonic context snapshot used for stable color rendering */
  mode: MusicalMode;
  /** Key snapshot used for stable color rendering */
  key: ChromaticNote;
  /** Octave snapshot used for scale-relative lightness */
  octave: number;
}

/** The exact blob body prepared for one animation frame. */
export interface PreparedBlobFrame {
  /** Stable key used by the polyphonic blob lifecycle. */
  key: string;
  /** Source state retained for harmonic analysis and lifecycle checks. */
  blob: ActiveBlob;
  /** The vibrating production contour, in canvas coordinates. */
  contour: Array<{ x: number; y: number }>;
  /** Resolved music color for this frame. */
  primaryColor: string;
  /** Current body radius after scale animation. */
  scaledRadius: number;
  /** Current body opacity after fade animation. */
  opacity: number;
  /** Current glow amount used by the ordinary body renderer. */
  glowIntensity: number;
  /** Seconds elapsed since this body appeared. */
  elapsed: number;
}

export interface HarmonicGeometryPoint {
  note: ActiveNote;
  blob: ActiveBlob;
  x: number;
  y: number;
  angle: number;
}

export interface HarmonicGeometryLabel {
  x: number;
  y: number;
  lines: string[];
  size: "sm" | "md" | "lg";
}

export interface HarmonicGeometryScene {
  points: HarmonicGeometryPoint[];
  orderedPoints: HarmonicGeometryPoint[];
  centroid: { x: number; y: number };
  radius: number;
  boundaryEdges: HarmonicIntervalEdge[];
  interiorEdges: HarmonicIntervalEdge[];
  primaryLabel: HarmonicGeometryLabel | null;
  auxiliaryLabels: HarmonicGeometryLabel[];
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
  /** Mark rendered by this particle */
  mark: MarkName;
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
  /** Harmonic mode snapshot */
  mode?: MusicalMode;
  /** Key snapshot */
  key?: ChromaticNote;
  /** Whether note is currently playing */
  isPlaying?: boolean;
}
