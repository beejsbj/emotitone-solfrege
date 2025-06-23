import { ref, type Ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { useVisualConfig } from "@/composables/useVisualConfig";
import { useAnimationLifecycle } from "@/composables/useAnimationLifecycle";
import type { SolfegeData } from "@/types/music";
import { useBlobRenderer } from "./useBlobRenderer";
import { useParticleSystem } from "./useParticleSystem";
import { useStringRenderer } from "./useStringRenderer";
import { useAmbientRenderer } from "./useAmbientRenderer";
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
  };

  // Rendering systems
  const blobRenderer = useBlobRenderer();
  const particleSystem = useParticleSystem();
  const stringRenderer = useStringRenderer();
  const ambientRenderer = useAmbientRenderer();

  /**
   * Update cached configurations for performance
   */
  const updateCachedConfigs = () => {
    cachedConfigs = {
      blob: blobConfig.value,
      ambient: ambientConfig.value,
      particle: particleConfig.value,
      string: stringConfig.value,
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
    console.log("🎨 Initializing unified canvas...");
    console.log("Canvas ref:", canvasRef.value);

    if (!canvasRef.value) {
      console.error("❌ Canvas ref is null!");
      return;
    }

    ctx = canvasRef.value.getContext("2d");
    if (!ctx) {
      console.error("❌ Could not get 2D context!");
      return;
    }

    console.log("✅ Got 2D context");

    // Set canvas size
    canvasRef.value.width = canvasWidth.value;
    canvasRef.value.height = canvasHeight.value;

    console.log(
      `📐 Canvas size set to: ${canvasWidth.value}x${canvasHeight.value}`
    );

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
   * Handle note played event
   */
  const handleNotePlayed = (note: SolfegeData, frequency: number) => {
    console.log(`🎵 Note played: ${note.name} (${frequency}Hz)`);

    // Create persistent gradient blob at random position
    const x = 30 + Math.random() * 40;
    const y = 30 + Math.random() * 40;
    blobRenderer.createBlob(
      note,
      frequency,
      x,
      y,
      canvasWidth.value,
      canvasHeight.value,
      blobConfig.value
    );

    // Create particles
    particleSystem.createParticles(
      note,
      particleConfig.value,
      canvasWidth.value,
      canvasHeight.value,
      musicStore
    );

    console.log(`✨ Created blob and particles for ${note.name}`);
  };

  /**
   * Handle note released event - start fade-out instead of immediate removal
   */
  const handleNoteReleased = (noteName: string) => {
    blobRenderer.startBlobFadeOut(noteName);
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
