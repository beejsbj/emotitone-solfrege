import { frameBlend, sizeStageCanvas, stageCanvasSize, stagePixelRatio } from "./stageCanvas";
/**
 * Hilbert Scope Rendering System
 * Creates a circular, oscillating visualization that responds to audio amplitude and timbre
 * Uses Hilbert transform for creating organic, fluid animations
 */

import type { ActiveNote } from "@/types/music";
import type { HilbertScopeConfig } from "@/types/visual";
import { useMusicColor } from "../useMusicColor";
import { useMusicStore } from "@/stores/music";
import type { StageAudioFrame, StageComposition } from "./stageRuntime";

// Math utility functions needed for Hilbert transform
const mathScale = (value: number, inMin: number, inMax: number, outMin: number, outMax: number): number => {
  return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
};

const mathClamp = (value: number, min: number, max: number): number => {
  return Math.max(min, Math.min(max, value));
};

// Sigmoid factory for smooth value mapping
const sigmoidFactory = (k: number) => {
  const base = (t: number) => 1 / (1 + Math.exp(-k * t)) - 0.5;
  const correction = 0.5 / base(1);
  
  return (t: number) => {
    t = mathClamp(t, 0, 1);
    return correction * base(2 * t - 1) + 0.5;
  };
};

const DEFAULT_SCOPE_COLOR = "hsl(48, 96%, 78%)";
// The additive mix rounds two 8-bit contributions independently. Below half
// an alpha level neither copy can leave a visible pixel after rasterization.
const TRAIL_VISIBILITY = 0.5 / 255;

// Hilbert transform processor using Web Audio API
class HilbertProcessor {
  private audioContext: AudioContext | null = null;
  private sourceNode: AudioNode | null = null;
  private delayNode: DelayNode | null = null;
  private hilbertNode: ConvolverNode | null = null;
  private analyserTime: AnalyserNode | null = null;
  private analyserQuad: AnalyserNode | null = null;
  private timeData: Float32Array;
  private quadData: Float32Array;
  private connected = false;
  private readonly bufferLength = 1024;

  constructor() {
    this.timeData = new Float32Array(this.bufferLength);
    this.quadData = new Float32Array(this.bufferLength);
  }

  async connect(audioContext: AudioContext, sourceNode: AudioNode) {
    if (this.connected) return;
    
    this.audioContext = audioContext;

    // Create analysers for time and quadrature data
    this.analyserTime = audioContext.createAnalyser();
    this.analyserQuad = audioContext.createAnalyser();

    this.analyserTime.fftSize = this.bufferLength * 2;
    this.analyserQuad.fftSize = this.bufferLength * 2;

    // Create Hilbert transform filter
    const [delay, hilbert] = this.createFilters(audioContext);
    this.sourceNode = sourceNode;
    this.delayNode = delay;
    this.hilbertNode = hilbert;

    // Connect the audio graph
    sourceNode.connect(hilbert);
    sourceNode.connect(delay);

    hilbert.connect(this.analyserTime);
    delay.connect(this.analyserQuad);

    this.connected = true;
  }

  private createFilters(audioContext: AudioContext): [DelayNode, ConvolverNode] {
    let filterLength = 768;
    if (filterLength % 2 === 0) {
      filterLength -= 1;
    }

    const impulse = new Float32Array(filterLength);
    const mid = ((filterLength - 1) / 2) | 0;

    for (let i = 0; i <= mid; i++) {
      // Hamming window
      const k = 0.53836 + 0.46164 * Math.cos((i * Math.PI) / (mid + 1));
      if (i % 2 === 1) {
        const im = 2 / Math.PI / i;
        impulse[mid + i] = k * im;
        impulse[mid - i] = k * -im;
      }
    }

    // Create convolver for Hilbert transform
    const impulseBuffer = audioContext.createBuffer(1, filterLength, audioContext.sampleRate);
    impulseBuffer.copyToChannel(impulse, 0);
    const hilbert = audioContext.createConvolver();
    hilbert.normalize = false;
    hilbert.buffer = impulseBuffer;

    // Create delay to compensate for Hilbert transform delay
    const delayTime = mid / audioContext.sampleRate;
    const delay = audioContext.createDelay(delayTime);
    delay.delayTime.value = delayTime;

    return [delay, hilbert];
  }

  getValues(): [Float32Array, Float32Array] {
    if (this.analyserTime && this.analyserQuad) {
      this.analyserTime.getFloatTimeDomainData(this.timeData);
      this.analyserQuad.getFloatTimeDomainData(this.quadData);
    }
    return [this.timeData, this.quadData];
  }

  disconnect() {
    if (this.sourceNode && this.hilbertNode) {
      safeDisconnectEdge(this.sourceNode, this.hilbertNode);
    }
    if (this.sourceNode && this.delayNode) {
      safeDisconnectEdge(this.sourceNode, this.delayNode);
    }
    safeDisconnect(this.hilbertNode);
    safeDisconnect(this.delayNode);
    if (this.analyserTime) {
      this.analyserTime.disconnect();
      this.analyserTime = null;
    }
    if (this.analyserQuad) {
      this.analyserQuad.disconnect();
      this.analyserQuad = null;
    }
    this.sourceNode = null;
    this.delayNode = null;
    this.hilbertNode = null;
    this.audioContext = null;
    this.connected = false;
  }
}

// State management for the Hilbert Scope
interface HilbertScopeState {
  isInitialized: boolean;
  historyCanvas: HTMLCanvasElement | null;
  historyContext: CanvasRenderingContext2D | null;
  swapCanvas: HTMLCanvasElement | null;
  swapContext: CanvasRenderingContext2D | null;
  x: number;
  y: number;
  currentRadius: number;
  targetRadius: number;
  fadeInProgress: number;
  fadeOutProgress: number;
  isActive: boolean;
  lastResolvedColor: string | null;
  layoutCenterX: number | null;
  layoutCenterY: number | null;
}

export function useHilbertScopeRenderer(animationActive?: () => boolean) {
  let lifetime = 0;
  let trailStrength = 0;
  // While releasing, swap holds an unfaded snapshot. Repainting from it avoids
  // 8-bit alpha rounding accumulating (or stalling) once the trail gets faint.
  let releaseSeconds: number | null = null;
  let fadeOutDuration: number | null = null;
  const emptyWaveform = new Float32Array(0);
  // Core processors
  const hilbertProcessor = new HilbertProcessor();
  const sigmoid = sigmoidFactory(7);
  
  // Color system and music store
  const musicColor = useMusicColor({ animated: true, animationActive });
  const musicStore = useMusicStore();

  // State
  const state: HilbertScopeState = {
    isInitialized: false,
    historyCanvas: null,
    historyContext: null,
    swapCanvas: null,
    swapContext: null,
    x: 0,
    y: 0,
    currentRadius: 0,
    targetRadius: 0,
    fadeInProgress: 0,
    fadeOutProgress: 0,
    isActive: false,
    lastResolvedColor: null,
    layoutCenterX: null,
    layoutCenterY: null,
  };

  /**
   * Initialize the Hilbert Scope with audio context
   */
  const initializeHilbertScope = async (
    canvasWidth: number,
    canvasHeight: number,
    config: HilbertScopeConfig,
    waveformSource?: AudioNode | null,
  ) => {
    if (state.isInitialized) return;
    const initializingLifetime = lifetime;

    if (waveformSource) {
      await hilbertProcessor.connect(
        waveformSource.context as AudioContext,
        waveformSource,
      );
    }

    if (initializingLifetime !== lifetime) return;

    // Initialize position (center, top half)
    state.x = canvasWidth / 2;
    state.y = canvasHeight / 2;

    // Create dedicated history and swap canvases so the scope can preserve
    // its own colored trail even though the main canvas is cleared every frame.
    state.historyCanvas = document.createElement("canvas");
    state.historyContext = state.historyCanvas.getContext("2d");

    state.swapCanvas = document.createElement("canvas");
    state.swapContext = state.swapCanvas.getContext("2d");

    sizeStageCanvas(state.historyCanvas, state.historyContext, canvasWidth, canvasHeight);
    sizeStageCanvas(state.swapCanvas, state.swapContext, canvasWidth, canvasHeight);

    // Calculate initial radius
    state.targetRadius = Math.min(canvasWidth, canvasHeight) * config.sizeRatio / 2;

    state.isInitialized = true;
    state.isActive = true;
    state.fadeInProgress = 0;
    state.fadeOutProgress = 0;
    state.lastResolvedColor = null;
    state.layoutCenterX = state.x;
    state.layoutCenterY = state.y;
  };

  /**
   * Scale value using sigmoid for smooth transitions
   */
  const scaleValue = (val: number): number => {
    const scaledVal = mathScale(val, -3, 3, 0, 1);
    return mathScale(sigmoid(scaledVal), 0, 1, -1, 1);
  };

  /** Clear renderer-owned persistence without discarding musical state. */
  const clearHistory = () => {
    trailStrength = 0;
    releaseSeconds = null;
    if (state.historyCanvas && state.historyContext) {
      state.historyContext.clearRect(
        0,
        0,
        state.historyCanvas.width,
        state.historyCanvas.height,
      );
    }
    if (state.swapCanvas && state.swapContext) {
      state.swapContext.clearRect(
        0,
        0,
        state.swapCanvas.width,
        state.swapCanvas.height,
      );
    }
  };

  /**
   * Render the Hilbert Scope
   */
  const renderHilbertScope = (
    ctx: CanvasRenderingContext2D,
    elapsed: number,
    config: HilbertScopeConfig,
    canvasWidth: number,
    canvasHeight: number,
    composition?: StageComposition,
    audioFrame: StageAudioFrame = { envelope: 0, hasSignal: false },
    reducedMotion = false,
    activeNotes: readonly ActiveNote[] = musicStore.getActiveNotes(),
    deltaSeconds = 1 / 60,
  ) => {
    if (!state.isInitialized || !state.isActive || !config.isEnabled) return;
    if (
      !state.historyCanvas ||
      !state.historyContext ||
      !state.swapCanvas ||
      !state.swapContext
    ) {
      return;
    }

    // Get audio data
    const [xVals, yVals] = reducedMotion
      ? [emptyWaveform, emptyWaveform]
      : hilbertProcessor.getValues();
    const amplitude = reducedMotion ? 0 : audioFrame.envelope;
    const drawingWaveform = amplitude > 0.01 || activeNotes.length > 0;
    // Handle fade animations
    if (reducedMotion) {
      state.fadeInProgress = 1;
    } else if (state.fadeInProgress < 1) {
      state.fadeInProgress = Math.min(1, state.fadeInProgress + deltaSeconds / Math.max(0.001, config.scaleInDuration));
    }

    if (fadeOutDuration !== null) {
      state.fadeOutProgress = Math.min(1, state.fadeOutProgress + deltaSeconds / fadeOutDuration);
      if (state.fadeOutProgress >= 1) {
        state.isActive = false;
        clearHistory();
        return;
      }
    }

    const targetX = composition?.centerX ?? canvasWidth / 2;
    const targetY = composition?.centerY ?? canvasHeight / 2;
    const shiftX = targetX - (state.layoutCenterX ?? targetX);
    const shiftY = targetY - (state.layoutCenterY ?? targetY);
    if (!reducedMotion && (shiftX || shiftY) && state.historyCanvas) {
      // Move the retained release snapshot too, without baking its current fade
      // into it. The other surface remains available as translation scratch.
      const source = releaseSeconds === null ? state.historyCanvas : state.swapCanvas;
      const scratch = releaseSeconds === null ? state.swapCanvas : state.historyCanvas;
      const sourceContext = releaseSeconds === null ? state.historyContext : state.swapContext;
      const scratchContext = releaseSeconds === null ? state.swapContext : state.historyContext;
      scratchContext.clearRect(0, 0, canvasWidth, canvasHeight);
      scratchContext.drawImage(source, shiftX, shiftY, canvasWidth, canvasHeight);
      sourceContext.clearRect(0, 0, canvasWidth, canvasHeight);
      sourceContext.drawImage(scratch, 0, 0, canvasWidth, canvasHeight);
    }
    state.layoutCenterX = targetX;
    state.layoutCenterY = targetY;
    state.x = targetX;
    state.y = targetY;
    state.targetRadius = composition?.hilbertRadius
      ?? Math.min(canvasWidth, canvasHeight) * config.sizeRatio / 2;

    // Smooth radius transitions, including live Size control changes.
    state.currentRadius = reducedMotion
      ? state.targetRadius
      : state.currentRadius + (state.targetRadius - state.currentRadius) * frameBlend(0.1, deltaSeconds);

    if (reducedMotion) {
      // Reduced Motion is a fully still presentation, not a frozen waveform.
      // Clear both trail buffers so enabling it cannot preserve an earlier frame.
      clearHistory();
    } else {
      if (!drawingWaveform && trailStrength > 0) {
        if (releaseSeconds === null) {
          state.swapContext.clearRect(0, 0, canvasWidth, canvasHeight);
          state.swapContext.drawImage(state.historyCanvas, 0, 0, canvasWidth, canvasHeight);
          releaseSeconds = 0;
        }
        releaseSeconds += Math.max(0, deltaSeconds);
        trailStrength = Math.pow(mathClamp(config.history, 0, 0.99), releaseSeconds * 60);
        paintTrail(state.swapCanvas, state.historyContext, trailStrength, releaseSeconds,
          config.smear, canvasWidth, canvasHeight);
      } else {
        releaseSeconds = null;
        const persistence = Math.pow(mathClamp(config.history, 0, 0.99), Math.max(0, deltaSeconds) * 60);
        paintTrail(state.historyCanvas, state.swapContext, persistence, deltaSeconds,
          config.smear, canvasWidth, canvasHeight);
        state.historyContext.clearRect(0, 0, canvasWidth, canvasHeight);
        state.historyContext.drawImage(state.swapCanvas, 0, 0, canvasWidth, canvasHeight);
      }
    }

    let resolvedColor: string | null = null;

    if (activeNotes.length > 0) {
      const firstNote = activeNotes[0];
      const noteMode = firstNote.mode ?? musicStore.currentMode;
      const noteKey = firstNote.key ?? musicStore.currentKey;
      resolvedColor = (reducedMotion
        ? musicColor.getStaticPrimaryColorForPitch
        : musicColor.getPrimaryColorForPitch)(
        firstNote.solfegeIndex,
        firstNote.pitchClassIndex,
        noteMode,
        noteKey as any,
        firstNote.octave,
      );
    }

    if (!resolvedColor && state.lastResolvedColor) {
      resolvedColor = state.lastResolvedColor;
    }

    if (!resolvedColor) {
      const scaleNotes = musicStore.solfegeData;
      if (scaleNotes && scaleNotes.length > 0) {
        resolvedColor = (reducedMotion
          ? musicColor.getStaticPrimaryColor
          : musicColor.getPrimaryColor)(
          scaleNotes[0].name,
          musicStore.currentMode,
          3,
          musicStore.currentKey as any
        );
      }
    }

    const strokeColor = resolvedColor ?? DEFAULT_SCOPE_COLOR;
    state.lastResolvedColor = strokeColor;

    const drawAlpha =
      config.opacity *
      state.fadeInProgress *
      (1 - state.fadeOutProgress) *
      mathScale(amplitude, 0, 1, 0.35, 1);

    const drawCurve = (targetContext: CanvasRenderingContext2D) => {
      targetContext.save();
      // This stroke accumulates in history: depositing it twice as often must
      // not double its energy. A zero-time wake deposits no additional ink.
      targetContext.globalAlpha = frameBlend(drawAlpha, deltaSeconds);

      if (config.glowEnabled) {
        targetContext.shadowBlur = config.glowIntensity * stageCanvasSize(state.historyCanvas!).dpr;
        targetContext.shadowColor = strokeColor;
      }

      targetContext.beginPath();
      targetContext.lineWidth = mathScale(
        amplitude,
        0,
        1,
        config.thickness * 0.5,
        config.thickness * 2
      );

      const scalar = state.currentRadius;

      for (let i = 0; i < xVals.length; i++) {
        const xVal = scaleValue(xVals[i]) * scalar + state.x;
        const yVal = scaleValue(yVals[i]) * scalar + state.y;

        if (i === 0) {
          targetContext.moveTo(xVal, yVal);
        } else {
          targetContext.lineTo(xVal, yVal);
        }
      }

      targetContext.strokeStyle = strokeColor;
      targetContext.stroke();
      targetContext.restore();
    };

    if (!reducedMotion && drawingWaveform) {
      drawCurve(state.historyContext);
      trailStrength = 1;
    } else if (reducedMotion) {
      ctx.save();
      ctx.globalAlpha = config.opacity * 0.45;
      ctx.strokeStyle = strokeColor;
      ctx.lineWidth = config.thickness;
      ctx.beginPath();
      ctx.arc(state.x, state.y, state.currentRadius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    }

    if (trailStrength < TRAIL_VISIBILITY) clearHistory();
    if (!reducedMotion) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.drawImage(state.historyCanvas, 0, 0, canvasWidth, canvasHeight);
      ctx.restore();
    }
  };

  /**
   * Update canvas size
   */
  const resizeHilbertScope = (
    width: number,
    height: number,
    config: HilbertScopeConfig,
    composition?: StageComposition,
    dpr = stagePixelRatio(),
  ) => {
    if (!state.isInitialized) return;

    if (state.historyCanvas) {
      sizeStageCanvas(state.historyCanvas, state.historyContext, width, height, dpr);
    }

    // Update swap canvas size
    if (state.swapCanvas) {
      sizeStageCanvas(state.swapCanvas, state.swapContext, width, height, dpr);
    }

    trailStrength = 0;
    releaseSeconds = null;
    // Update position to maintain relative position
    state.x = width / 2;
    state.y = composition?.centerY ?? height / 2;
    state.x = composition?.centerX ?? width / 2;

    // Recalculate radius
    state.targetRadius = composition?.hilbertRadius
      ?? Math.min(width, height) * config.sizeRatio / 2;
  };

  /**
   * Start fade out animation
   */
  const startFadeOut = (config: HilbertScopeConfig) => {
    state.fadeOutProgress = 0;
    fadeOutDuration = Math.max(0.001, config.scaleOutDuration);
  };

  /**
   * Cleanup resources
   */
  const cleanup = () => {
    lifetime++;
    hilbertProcessor.disconnect();

    trailStrength = 0;
    releaseSeconds = null;
    fadeOutDuration = null;
    state.isInitialized = false;
    state.isActive = false;
    state.historyCanvas = null;
    state.historyContext = null;
    state.swapCanvas = null;
    state.swapContext = null;
    state.lastResolvedColor = null;
    state.layoutCenterX = null;
    state.layoutCenterY = null;
  };

  return {
    hasPendingAnimation: () => trailStrength >= TRAIL_VISIBILITY || (fadeOutDuration !== null && state.isActive),
    initializeHilbertScope,
    renderHilbertScope,
    resizeHilbertScope,
    clearHistory,
    startFadeOut,
    cleanup,
    isActive: () => state.isActive,
  };
}

/** Smear redistributes the decaying trail; it must never amplify its alpha. */
function paintTrail(
  source: HTMLCanvasElement,
  target: CanvasRenderingContext2D,
  persistence: number,
  seconds: number,
  smear: number,
  width: number,
  height: number,
) {
  target.clearRect(0, 0, width, height);
  if (persistence <= 0) return;
  const amount = mathClamp(smear, 0, 1);
  const mix = frameBlend(amount * 0.25, seconds);
  target.save();
  // Source-over copies feed each other's alpha. A weighted additive mixture
  // has a strict persistence upper bound even where the two copies overlap.
  target.globalCompositeOperation = "lighter";
  target.globalAlpha = persistence * (1 - mix);
  target.drawImage(source, 0, 0, width, height);
  if (mix > 0) {
    const scale = Math.pow(1 + amount * 0.012, Math.max(0, seconds) * 60);
    target.globalAlpha = persistence * mix;
    target.drawImage(source, width * (1 - scale) / 2, height * (1 - scale) / 2,
      width * scale, height * scale);
  }
  target.restore();
}

function safeDisconnect(node: AudioNode | null) {
  try {
    node?.disconnect();
  } catch {
    // Partially initialized nodes may have no active connections.
  }
}

function safeDisconnectEdge(source: AudioNode, destination: AudioNode) {
  try {
    source.disconnect(destination);
  } catch {
    // The source owner may already have torn down this connection.
  }
}
