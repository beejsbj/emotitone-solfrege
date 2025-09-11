import { ref, type Ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { useVisualConfig } from "@/composables/useVisualConfig";
import { useAnimationLifecycle } from "@/composables/useAnimationLifecycle";
import type { SolfegeData } from "@/types/music";
import { useBlobRenderer } from "./useBlobRenderer";
import { useParticleSystem } from "./useParticleSystem";
import { useStringRenderer } from "./useStringRenderer";
import { useAmbientRenderer } from "./useAmbientRenderer";
import { useHilbertScopeRenderer } from "./useHilbertScopeRenderer";
import { performanceMonitor } from "@/utils/performanceMonitor";

/**
 * Unified Canvas Management System
 * Manages a single canvas for all visual effects: blobs, particles, strings, and ambient
 * Now modularized into separate rendering systems for better maintainability
 */

export function useUnifiedCanvas(canvasRef: Ref<HTMLCanvasElement | null>) {
  const musicStore = useMusicStore();
  const {
    blobConfig,
    ambientConfig,
    particleConfig,
    stringConfig,
    animationConfig,
    hilbertScopeConfig,
  } = useVisualConfig();

  // Canvas state (merged from useCanvasCore)
  const canvasWidth = ref(window.innerWidth);
  const canvasHeight = ref(window.innerHeight);
  let ctx: CanvasRenderingContext2D | null = null;

  // Performance optimization: Cache gradients and colors
  const gradientCache = new Map<string, CanvasGradient>();
  const colorCache = new Map<string, string>();

  // Cached configurations for performance
  let cachedConfigs = {
    blob: blobConfig.value,
    ambient: ambientConfig.value,
    particle: particleConfig.value,
    string: stringConfig.value,
    hilbertScope: hilbertScopeConfig.value,
  };

  // Rendering systems
  const blobRenderer = useBlobRenderer();
  const particleSystem = useParticleSystem();
  const stringRenderer = useStringRenderer();
  const ambientRenderer = useAmbientRenderer();
  const hilbertScopeRenderer = useHilbertScopeRenderer();

  /**
   * Update cached configurations for performance
   */
  const updateCachedConfigs = () => {
    cachedConfigs = {
      blob: blobConfig.value,
      ambient: ambientConfig.value,
      particle: particleConfig.value,
      string: stringConfig.value,
      hilbertScope: hilbertScopeConfig.value,
    };
  };

  /**
   * Handle window resize
   */
  const handleResize = () => {
    canvasWidth.value = window.innerWidth;
    canvasHeight.value = window.innerHeight;

    if (canvasRef.value) {
      canvasRef.value.width = canvasWidth.value;
      canvasRef.value.height = canvasHeight.value;
    }

    // Resize Hilbert Scope
    hilbertScopeRenderer.resizeHilbertScope(
      canvasWidth.value,
      canvasHeight.value,
      hilbertScopeConfig.value
    );
  };

  /**
   * Get or create cached gradient
   */
  const getCachedGradient = (
    key: string,
    createFn: () => CanvasGradient
  ): CanvasGradient => {
    if (!gradientCache.has(key)) {
      gradientCache.set(key, createFn());
    }
    return gradientCache.get(key)!;
  };

  /**
   * Clear canvas
   */
  const clearCanvas = () => {
    if (!ctx) return;
    ctx.clearRect(0, 0, canvasWidth.value, canvasHeight.value);
  };

  /**
   * Initialize the canvas system
   */
  const initializeCanvas = () => {
    if (!canvasRef.value) {
      console.error("❌ Canvas ref is null!");
      return;
    }

    ctx = canvasRef.value.getContext("2d");
    if (!ctx) {
      console.error("❌ Could not get 2D context!");
      return;
    }

    // Set canvas size
    canvasRef.value.width = canvasWidth.value;
    canvasRef.value.height = canvasHeight.value;

    // Set canvas style for crisp rendering
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";

    // Update cached configurations
    updateCachedConfigs();

    // Initialize strings
    stringRenderer.initializeStrings(
      stringConfig.value,
      canvasWidth.value,
      canvasHeight.value,
      musicStore.solfegeData
    );

    // Add string event listeners for sequencer integration
    stringRenderer.addEventListeners();

    // Initialize Hilbert Scope
    hilbertScopeRenderer.initializeHilbertScope(
      canvasWidth.value,
      canvasHeight.value,
      hilbertScopeConfig.value
    );

    console.log("✅ Canvas initialized successfully");
  };

  /**
   * Main render frame function - coordinates all visual effects
   */
  const renderFrame = (elapsed: number) => {
    if (!ctx) {
      console.warn("⚠️ No canvas context in renderFrame");
      return;
    }

    // Update cached configurations for performance
    updateCachedConfigs();

    // Clear canvas
    clearCanvas();

    // Render effects in order (back to front)
    if (cachedConfigs.ambient.isEnabled) {
      ambientRenderer.renderAmbientBackground(
        ctx,
        elapsed,
        cachedConfigs.ambient,
        canvasWidth.value,
        canvasHeight.value,
        musicStore,
        getCachedGradient
      );
    }

    // Render Hilbert Scope (after ambient, before blobs)
    if (cachedConfigs.hilbertScope.isEnabled) {
      hilbertScopeRenderer.renderHilbertScope(
        ctx,
        elapsed,
        cachedConfigs.hilbertScope,
        canvasWidth.value,
        canvasHeight.value
      );
    }

    if (cachedConfigs.blob.isEnabled) {
      blobRenderer.renderBlobs(ctx, elapsed, cachedConfigs.blob, musicStore);
    }

    if (cachedConfigs.particle.isEnabled) {
      particleSystem.renderParticles(ctx, elapsed, cachedConfigs.particle);
    }

    if (cachedConfigs.string.isEnabled) {
      stringRenderer.updateStringProperties(
        stringConfig.value,
        animationConfig.value,
        musicStore
      );
      stringRenderer.renderStrings(ctx, elapsed, canvasHeight.value);
    }
  };

  // Setup animation with performance monitoring
  const getActiveObjectCount = () => {
    return (
      blobRenderer.getActiveBlobCount() +
      particleSystem.getActiveParticleCount() +
      stringRenderer.getActiveStringCount()
    );
  };

  const { startAnimation, stopAnimation, isAnimating } = useAnimationLifecycle({
    onFrame: (timestamp: number, elapsed: number) => {
      renderFrame(elapsed);

      // Update performance metrics
      const activeObjectCount = getActiveObjectCount();
      performanceMonitor.update(timestamp, activeObjectCount);

      // Check for performance warnings
      performanceMonitor.checkAndWarnPerformance();
    },
    autoCleanup: true,
  });

  /**
   * Handle note played event - enhanced for polyphonic support with Circle of Fifths positioning
   */
  const handleNotePlayed = (
    note: SolfegeData,
    frequency: number,
    noteId?: string,
    octave?: number,
    _noteName?: string
  ) => {
    // Create blob using Circle of Fifths positioning
    // No longer need to calculate x,y - the blob renderer handles positioning
    blobRenderer.createBlob(
      note,
      frequency,
      0, // x parameter is now ignored but kept for compatibility
      0, // y parameter is now ignored but kept for compatibility
      canvasWidth.value,
      canvasHeight.value,
      blobConfig.value,
      noteId, // Pass noteId for tracking
      musicStore.currentKey, // Pass current key for circle positioning
      musicStore.currentMode // Pass current mode for circle direction
    );

    // Create particles with reduced count for polyphonic scenarios
    const activeNoteCount = musicStore.getActiveNotes().length;
    const particleCount = Math.max(
      5,
      Math.floor(particleConfig.value.count / Math.max(1, activeNoteCount - 1))
    );

    particleSystem.createParticles(
      note,
      particleConfig.value,
      canvasWidth.value,
      canvasHeight.value,
      musicStore,
      particleCount
    );
  };

  /**
   * Handle note released event - enhanced for polyphonic support
   */
  const handleNoteReleased = (noteName: string, noteId?: string) => {
    if (noteId) {
      // Use noteId for precise blob removal in polyphonic scenarios
      blobRenderer.startBlobFadeOutById(noteId);
    } else {
      // Fallback to name-based removal for backward compatibility
      blobRenderer.startBlobFadeOut(noteName);
    }
  };

  /**
   * Clear caches to prevent memory leaks
   */
  const clearCaches = () => {
    gradientCache.clear();
    colorCache.clear();
  };

  /**
   * Get current performance metrics
   */
  const getPerformanceMetrics = () => {
    return performanceMonitor.getMetrics();
  };

  /**
   * Cleanup function
   */
  const cleanup = () => {
    stopAnimation();
    blobRenderer.clearAllBlobs();
    particleSystem.clearAllParticles();
    stringRenderer.clearAllStrings();
    stringRenderer.removeEventListeners(); // Clean up string event listeners
    hilbertScopeRenderer.cleanup(); // Clean up Hilbert Scope
    clearCaches();
    window.removeEventListener("resize", handleResize);
    performanceMonitor.reset();
    ctx = null;
  };

  return {
    // Canvas state
    canvasWidth,
    canvasHeight,

    // Methods
    initializeCanvas,
    handleResize,

    // Animation control
    startAnimation,
    stopAnimation,
    isAnimating,

    // Effect management
    createBlob: blobRenderer.createBlob,
    removeBlob: blobRenderer.removeBlob,
    createParticles: particleSystem.createParticles,
    handleNotePlayed,
    handleNoteReleased,

    // Performance monitoring
    getPerformanceMetrics,

    // Cleanup
    cleanup,
  };
}
