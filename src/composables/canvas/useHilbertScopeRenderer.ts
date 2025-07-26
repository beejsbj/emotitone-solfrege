/**
 * Hilbert Scope Rendering System
 * Creates a circular, oscillating visualization that responds to audio amplitude and timbre
 * Uses Hilbert transform for creating organic, fluid animations
 */

import type { HilbertScopeConfig } from "@/types/visual";
import * as Tone from "tone";
import { useColorSystem } from "../useColorSystem";
import { useMusicStore } from "@/stores/music";

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


// Hilbert transform processor using Web Audio API
class HilbertProcessor {
  private audioContext: AudioContext | null = null;
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
    if (this.analyserTime) {
      this.analyserTime.disconnect();
      this.analyserTime = null;
    }
    if (this.analyserQuad) {
      this.analyserQuad.disconnect();
      this.analyserQuad = null;
    }
    this.connected = false;
  }
}

// Amplitude analyzer for overall volume tracking
class AmplitudeAnalyzer {
  private analyser: AnalyserNode | null = null;
  private dataArray: Uint8Array;
  private connected = false;

  constructor() {
    this.dataArray = new Uint8Array(128);
  }

  connect(audioContext: AudioContext, sourceNode: AudioNode) {
    if (this.connected) return;
    
    this.analyser = audioContext.createAnalyser();
    this.analyser.fftSize = 256;
    this.dataArray = new Uint8Array(this.analyser.frequencyBinCount);
    sourceNode.connect(this.analyser);
    this.connected = true;
  }

  getAmplitude(): number {
    if (!this.analyser) return 0;
    
    this.analyser.getByteFrequencyData(this.dataArray);
    let sum = 0;
    for (let i = 0; i < this.dataArray.length; i++) {
      sum += this.dataArray[i];
    }
    const average = sum / this.dataArray.length;
    return Math.pow(average / 255, 0.8);
  }

  disconnect() {
    if (this.analyser) {
      this.analyser.disconnect();
      this.analyser = null;
    }
    this.connected = false;
  }
}

// State management for the Hilbert Scope
interface HilbertScopeState {
  isInitialized: boolean;
  swapCanvas: HTMLCanvasElement | null;
  swapContext: CanvasRenderingContext2D | null;
  x: number;
  y: number;
  currentRadius: number;
  targetRadius: number;
  fadeInProgress: number;
  fadeOutProgress: number;
  isActive: boolean;
}

export function useHilbertScopeRenderer() {
  // Core processors
  const hilbertProcessor = new HilbertProcessor();
  const amplitudeAnalyzer = new AmplitudeAnalyzer();
  const sigmoid = sigmoidFactory(7);
  
  // Color system and music store
  const colorSystem = useColorSystem();
  const musicStore = useMusicStore();

  // State
  const state: HilbertScopeState = {
    isInitialized: false,
    swapCanvas: null,
    swapContext: null,
    x: 0,
    y: 0,
    currentRadius: 0,
    targetRadius: 0,
    fadeInProgress: 0,
    fadeOutProgress: 0,
    isActive: false,
  };

  // Audio connection state
  let audioGainNode: GainNode | null = null;

  /**
   * Initialize the Hilbert Scope with audio context
   */
  const initializeHilbertScope = async (
    canvasWidth: number,
    canvasHeight: number,
    config: HilbertScopeConfig
  ) => {
    if (state.isInitialized) return;

    // Get Tone.js audio context
    const audioContext = Tone.getContext().rawContext as AudioContext;
    if (!audioContext) {
      console.error("No audio context available for Hilbert Scope");
      return;
    }

    // Create a gain node to tap into the audio
    audioGainNode = audioContext.createGain();
    audioGainNode.gain.value = 1.0;

    // Connect to Tone.js destination
    const toneDestination = Tone.getDestination();
    toneDestination.connect(audioGainNode);

    // Connect processors
    await hilbertProcessor.connect(audioContext, audioGainNode);
    amplitudeAnalyzer.connect(audioContext, audioGainNode);

    // Initialize position (center, top half)
    state.x = canvasWidth / 2;
    state.y = canvasHeight * 0.25; // 25% from top

    // Create swap canvas for trail effect
    state.swapCanvas = document.createElement("canvas");
    state.swapCanvas.width = canvasWidth;
    state.swapCanvas.height = canvasHeight;
    state.swapContext = state.swapCanvas.getContext("2d");

    // Calculate initial radius
    const screenBasedSize = Math.min(canvasWidth, canvasHeight) * config.sizeRatio;
    state.targetRadius = mathClamp(screenBasedSize, config.minSize, config.maxSize) / 2;

    state.isInitialized = true;
    state.isActive = true;
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
    canvasHeight: number
  ) => {
    if (!state.isInitialized || !state.isActive || !config.isEnabled) return;
    if (!state.swapContext) return;

    // Get audio data
    const [xVals, yVals] = hilbertProcessor.getValues();
    const amplitude = amplitudeAnalyzer.getAmplitude();

    // Handle fade animations
    if (state.fadeInProgress < 1) {
      state.fadeInProgress = Math.min(1, state.fadeInProgress + (1 / config.scaleInDuration) / 60);
    }

    // Update position with drift
    const driftAmount = (config.driftSpeed / 60) * 0.1; // Convert to pixels per frame
    state.x += (Math.random() - 0.5) * driftAmount;
    state.y += (Math.random() - 0.7) * driftAmount; // Bias upward
    
    // Keep within bounds (favor top half)
    state.x = mathClamp(state.x, 50, canvasWidth - 50);
    state.y = mathClamp(state.y, 50, canvasHeight * 0.5);

    // Smooth radius transitions
    state.currentRadius += (state.targetRadius - state.currentRadius) * 0.1;

    // Apply trail effect
    if (config.history > 0 && state.swapCanvas) {
      // Clear swap canvas
      state.swapContext.clearRect(0, 0, canvasWidth, canvasHeight);
      
      // Draw previous frame with reduced opacity
      state.swapContext.globalAlpha = config.history;
      state.swapContext.drawImage(ctx.canvas, 0, 0);
      state.swapContext.globalAlpha = 1;
      
      // Copy swap canvas back to main canvas
      ctx.save();
      ctx.globalAlpha = 1;
      ctx.clearRect(0, 0, canvasWidth, canvasHeight);
      ctx.drawImage(state.swapCanvas, 0, 0);
      ctx.restore();
    }

    // Set up drawing style
    ctx.save();
    ctx.globalAlpha = config.opacity * state.fadeInProgress * (1 - state.fadeOutProgress);
    
    // Always use color system for dynamic solfège colors
    let strokeColor: string;
    let glowColor: string;
    
    // Use the color system based on active notes
    const activeNotes = musicStore.getActiveNotes();
    if (activeNotes.length > 0) {
      // Use the first active note's color, or blend multiple
      const firstNote = activeNotes[0];
      const noteName = firstNote.solfege.name;
      const noteColor = colorSystem.getPrimaryColor(noteName, musicStore.currentMode);
      
      // Modulate opacity based on amplitude
      const alphaValue = 0.5 + amplitude * 0.5; // Range from 0.5 to 1.0
      strokeColor = colorSystem.withAlpha(noteColor, alphaValue);
      glowColor = noteColor;
    } else {
      // When no notes are active, cycle through scale colors based on amplitude
      // This creates a dynamic color effect even when not playing
      const scaleNotes = musicStore.solfegeData;
      if (scaleNotes && scaleNotes.length > 0) {
        // Pick a note from the scale based on amplitude
        const noteIndex = Math.floor(amplitude * (scaleNotes.length - 1));
        const scaleNote = scaleNotes[noteIndex];
        const noteColor = colorSystem.getPrimaryColor(scaleNote.name, musicStore.currentMode);
        
        const alphaValue = 0.3 + amplitude * 0.7;
        strokeColor = colorSystem.withAlpha(noteColor, alphaValue);
        glowColor = noteColor;
      } else {
        // Ultimate fallback
        const defaultColor = colorSystem.getPrimaryColor('C', 'major');
        const alphaValue = 0.3 + amplitude * 0.7;
        strokeColor = colorSystem.withAlpha(defaultColor, alphaValue);
        glowColor = defaultColor;
      }
    }
    
    // Apply glow effect if enabled
    if (config.glowEnabled) {
      ctx.shadowBlur = config.glowIntensity;
      ctx.shadowColor = glowColor;
    }

    // Draw Hilbert curve
    ctx.beginPath();
    ctx.lineWidth = mathScale(amplitude, 0, 1, config.lineWidth * 0.5, config.lineWidth * 2);
    
    const scalar = state.currentRadius;
    
    for (let i = 0; i < xVals.length; i++) {
      const xVal = scaleValue(xVals[i]) * scalar + state.x;
      const yVal = scaleValue(yVals[i]) * scalar + state.y;
      
      if (i === 0) {
        ctx.moveTo(xVal, yVal);
      } else {
        ctx.lineTo(xVal, yVal);
      }
    }
    
    ctx.strokeStyle = strokeColor;
    ctx.stroke();
    ctx.restore();
  };

  /**
   * Update canvas size
   */
  const resizeHilbertScope = (width: number, height: number, config: HilbertScopeConfig) => {
    if (!state.isInitialized) return;

    // Update swap canvas size
    if (state.swapCanvas) {
      state.swapCanvas.width = width;
      state.swapCanvas.height = height;
    }

    // Update position to maintain relative position
    state.x = width / 2;
    state.y = height * 0.25;

    // Recalculate radius
    const screenBasedSize = Math.min(width, height) * config.sizeRatio;
    state.targetRadius = mathClamp(screenBasedSize, config.minSize, config.maxSize) / 2;
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
    amplitudeAnalyzer.disconnect();
    
    if (audioGainNode) {
      audioGainNode.disconnect();
      audioGainNode = null;
    }

    state.isInitialized = false;
    state.isActive = false;
    state.swapCanvas = null;
    state.swapContext = null;
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