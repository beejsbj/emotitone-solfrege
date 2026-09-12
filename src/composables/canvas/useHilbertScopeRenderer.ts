/**
 * Hilbert Scope Rendering System
 * Creates a circular, oscillating visualization that responds to audio amplitude and timbre
 * Uses Hilbert transform for creating organic, fluid animations
 */

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

export function useHilbertScopeRenderer() {
  // Core processors
  const hilbertProcessor = new HilbertProcessor();
  const sigmoid = sigmoidFactory(7);
  
  // Color system and music store
  const musicColor = useMusicColor({ animated: true });
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

    if (waveformSource) {
      await hilbertProcessor.connect(
        waveformSource.context as AudioContext,
        waveformSource,
      );
    }

    // Initialize position (center, top half)
    state.x = canvasWidth / 2;
    state.y = canvasHeight / 2;

    // Create dedicated history and swap canvases so the scope can preserve
    // its own colored trail even though the main canvas is cleared every frame.
    state.historyCanvas = document.createElement("canvas");
    state.historyCanvas.width = canvasWidth;
    state.historyCanvas.height = canvasHeight;
    state.historyContext = state.historyCanvas.getContext("2d");

    state.swapCanvas = document.createElement("canvas");
    state.swapCanvas.width = canvasWidth;
    state.swapCanvas.height = canvasHeight;
    state.swapContext = state.swapCanvas.getContext("2d");

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
      ? [new Float32Array(0), new Float32Array(0)]
      : hilbertProcessor.getValues();
    const amplitude = reducedMotion ? 0 : audioFrame.envelope;
    const activeNotes = musicStore.getActiveNotes();

    // Handle fade animations
    if (reducedMotion) {
      state.fadeInProgress = 1;
    } else if (state.fadeInProgress < 1) {
      state.fadeInProgress = Math.min(1, state.fadeInProgress + (1 / config.scaleInDuration) / 60);
    }

    const targetX = composition?.centerX ?? canvasWidth / 2;
    const targetY = composition?.centerY ?? canvasHeight / 2;
    const shiftX = targetX - (state.layoutCenterX ?? targetX);
    const shiftY = targetY - (state.layoutCenterY ?? targetY);
    if (!reducedMotion && (shiftX || shiftY) && state.historyCanvas) {
      state.swapContext.clearRect(0, 0, canvasWidth, canvasHeight);
      state.swapContext.drawImage(state.historyCanvas, shiftX, shiftY);
      state.historyContext.clearRect(0, 0, canvasWidth, canvasHeight);
      state.historyContext.drawImage(state.swapCanvas, 0, 0);
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
      : state.currentRadius + (state.targetRadius - state.currentRadius) * 0.1;

    if (reducedMotion) {
      // Reduced Motion is a fully still presentation, not a frozen waveform.
      // Clear both trail buffers so enabling it cannot preserve an earlier frame.
      state.historyContext.clearRect(0, 0, canvasWidth, canvasHeight);
      state.swapContext.clearRect(0, 0, canvasWidth, canvasHeight);
    } else {
      // Maintain an offscreen trail buffer instead of sampling the main canvas.
      const persistence = mathClamp(config.history, 0, 0.99);

      state.swapContext.clearRect(0, 0, canvasWidth, canvasHeight);
      if (persistence > 0) {
        state.swapContext.globalAlpha = persistence;
        state.swapContext.drawImage(state.historyCanvas, 0, 0);
        state.swapContext.globalAlpha = 1;

        if (config.smear > 0) {
          const smearScale = 1 + config.smear * 0.012;
          const smearWidth = canvasWidth * smearScale;
          const smearHeight = canvasHeight * smearScale;
          const smearX = (canvasWidth - smearWidth) / 2;
          const smearY = (canvasHeight - smearHeight) / 2;

          state.swapContext.globalAlpha = persistence * config.smear * 0.25;
          state.swapContext.drawImage(
            state.historyCanvas,
            smearX,
            smearY,
            smearWidth,
            smearHeight
          );
          state.swapContext.globalAlpha = 1;
        }
      }

      state.historyContext.clearRect(0, 0, canvasWidth, canvasHeight);
      state.historyContext.drawImage(state.swapCanvas, 0, 0);
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
      targetContext.globalAlpha = drawAlpha;

      if (config.glowEnabled) {
        targetContext.shadowBlur = config.glowIntensity;
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

    if (!reducedMotion && (amplitude > 0.01 || activeNotes.length > 0)) {
      drawCurve(state.historyContext);
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

    if (!reducedMotion) {
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.drawImage(state.historyCanvas, 0, 0);
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
  ) => {
    if (!state.isInitialized) return;

    if (state.historyCanvas) {
      state.historyCanvas.width = width;
      state.historyCanvas.height = height;
    }

    // Update swap canvas size
    if (state.swapCanvas) {
      state.swapCanvas.width = width;
      state.swapCanvas.height = height;
    }

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
    const fadeOutInterval = setInterval(() => {
      state.fadeOutProgress += (1 / config.scaleOutDuration) / 60;
      if (state.fadeOutProgress >= 1) {
        state.fadeOutProgress = 1;
        state.isActive = false;
        clearInterval(fadeOutInterval);
      }
    }, 1000 / 60);
  };

  /**
   * Cleanup resources
   */
  const cleanup = () => {
    hilbertProcessor.disconnect();

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
    initializeHilbertScope,
    renderHilbertScope,
    resizeHilbertScope,
    startFadeOut,
    cleanup,
    isActive: () => state.isActive,
  };
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
