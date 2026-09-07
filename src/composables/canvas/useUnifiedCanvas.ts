import { computed, ref, type Ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { useVisualConfig } from "@/composables/useVisualConfig";
import { useHarmonicAnalysis } from "@/composables/useHarmonicAnalysis";
import { useAnimationLifecycle } from "@/composables/useAnimationLifecycle";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";
import { useBlobRenderer } from "./useBlobRenderer";
import { useParticleSystem } from "./useParticleSystem";
import { useStringRenderer } from "./useStringRenderer";
import { useAmbientRenderer } from "./useAmbientRenderer";
import { useHarmonicGeometryRenderer } from "./useHarmonicGeometryRenderer";
import { useBlobFieldRenderer } from "./useBlobFieldRenderer";
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
    floatingPopupConfig,
    hilbertScopeConfig,
  } = useVisualConfig();
  const {
    snapshot: harmonicAnalysisSnapshot,
    notePlayed: recordHarmonicNote,
    noteReleased: releaseHarmonicNote,
    noteExpired: expireHarmonicNote,
    reset: resetHarmonicAnalysis,
  } = useHarmonicAnalysis(() => musicStore.getActiveNotes());

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
    harmonic: floatingPopupConfig.value,
    hilbertScope: hilbertScopeConfig.value,
  };

  // Rendering systems
  const blobRenderer = useBlobRenderer();
  const particleSystem = useParticleSystem();
  const stringRenderer = useStringRenderer();
  const ambientRenderer = useAmbientRenderer();
  const harmonicGeometryRenderer = useHarmonicGeometryRenderer();
  const blobFieldRenderer = useBlobFieldRenderer();
  const hilbertScopeRenderer = useHilbertScopeRenderer();
  const oneShotReleaseTimers = new Map<string, number>();
  const harmonicExpiryTimers = new Map<string, number>();
  let oneShotSequence = 0;

  const harmonicAccessibleText = computed(() => {
    const snapshot = harmonicAnalysisSnapshot.value;
    const config = floatingPopupConfig.value;

    if (
      !blobConfig.value.isEnabled ||
      !config.isEnabled ||
      !snapshot.isVisible ||
      snapshot.displayedNotes.length < 2
    ) {
      return "";
    }

    const notesById = new Map(
      snapshot.displayedNotes.map((note) => [note.noteId, note])
    );
    const announcements: string[] = [];

    if (config.showChord && snapshot.chordLabel) {
      announcements.push(`Chord: ${snapshot.chordLabel}`);
    }

    if (config.showIntervals) {
      snapshot.intervalEdges.forEach((edge) => {
        const from = notesById.get(edge.fromNoteId);
        const to = notesById.get(edge.toNoteId);
        if (from && to) {
          announcements.push(
            `Interval ${from.noteName} to ${to.noteName}: ${edge.interval}`
          );
        }
      });
    }

    if (config.showEmotionalDescription && snapshot.emotionalDescription) {
      announcements.push(`Emotion: ${snapshot.emotionalDescription}`);
    }

    return announcements.join(". ");
  });

  /**
   * Update cached configurations for performance
   */
  const updateCachedConfigs = () => {
    cachedConfigs = {
      blob: blobConfig.value,
      ambient: ambientConfig.value,
      particle: particleConfig.value,
      string: stringConfig.value,
      harmonic: floatingPopupConfig.value,
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

    // The canvas can mount after MIDI input has already populated the music
    // store (for example, while the loading gate is visible). Recreate only
    // missing visual anchors; do not replay audio or one-shot effects.
    if (blobConfig.value.isEnabled) {
      musicStore.getActiveNotes().forEach((activeNote) => {
        if (blobRenderer.activeBlobs.has(activeNote.noteId)) {
          return;
        }

        blobRenderer.createBlob(
          activeNote.solfege,
          activeNote.frequency,
          0,
          0,
          canvasWidth.value,
          canvasHeight.value,
          blobConfig.value,
          activeNote.noteId,
          activeNote.key,
          activeNote.mode,
          activeNote.octave
        );
      });
    }

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

  };

  /**
   * Main render frame function - coordinates all visual effects
   */
  const renderFrame = (elapsed: number) => {
    if (!ctx) {
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
      blobRenderer.prepareBlobs(ctx, cachedConfigs.blob);
    }

    const harmonicScene = cachedConfigs.blob.isEnabled
      ? harmonicGeometryRenderer.buildScene(
          harmonicAnalysisSnapshot.value,
          blobRenderer.activeBlobs,
          cachedConfigs.harmonic,
          canvasWidth.value,
          canvasHeight.value
        )
      : null;
    const fieldMode = cachedConfigs.harmonic.geometryMode;
    const renderedBlobField =
      cachedConfigs.blob.isEnabled &&
      cachedConfigs.harmonic.isEnabled &&
      blobFieldRenderer.renderBlobField(
        ctx,
        blobRenderer.getPreparedBlobFrames(),
        fieldMode,
        cachedConfigs.harmonic,
        harmonicScene,
        cachedConfigs.blob
      );

    if (cachedConfigs.blob.isEnabled && !renderedBlobField) {
      blobRenderer.renderBlobs(
        ctx,
        elapsed,
        cachedConfigs.blob,
        musicStore,
        true
      );
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

    harmonicGeometryRenderer.renderLabels(
      ctx,
      harmonicScene,
      cachedConfigs.harmonic
    );
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
    noteName?: string,
    mode?: MusicalMode,
    key?: ChromaticNote,
    durationMs?: number
  ) => {
    const noteMode = mode ?? musicStore.currentMode;
    const noteKey = key ?? (musicStore.currentKey as ChromaticNote);
    const isOneShot = !noteId && durationMs !== undefined;
    const harmonicNoteId = noteId ?? (
      isOneShot && noteName
        ? `one-shot:${noteName}:${++oneShotSequence}`
        : noteName
          ? `legacy:${noteName}`
          : undefined
    );

    if (harmonicNoteId) {
      const pendingRelease = oneShotReleaseTimers.get(harmonicNoteId);
      const pendingExpiry = harmonicExpiryTimers.get(harmonicNoteId);
      if (pendingRelease !== undefined) window.clearTimeout(pendingRelease);
      if (pendingExpiry !== undefined) window.clearTimeout(pendingExpiry);
      oneShotReleaseTimers.delete(harmonicNoteId);
      harmonicExpiryTimers.delete(harmonicNoteId);
    }

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
      isOneShot ? harmonicNoteId : noteId, // Give synthetic one-shots a stable lifecycle key
      noteKey, // Pass event key snapshot for circle positioning
      noteMode, // Pass event mode snapshot for scale positioning
      octave // Pass octave for vertical offset positioning
    );

    const activeNote = noteId
      ? musicStore
          .getActiveNotes()
          .find((candidate) => candidate.noteId === noteId)
      : null;
    const resolvedNoteName = noteName;
    const resolvedOctave = octave;

    if (activeNote) {
      recordHarmonicNote(activeNote);
    } else if (resolvedNoteName && resolvedOctave !== undefined) {
      recordHarmonicNote({
        solfegeIndex: Math.max(0, note.number - 1),
        solfege: note,
        frequency,
        octave: resolvedOctave,
        noteId: harmonicNoteId ?? `legacy:${resolvedNoteName}`,
        noteName: resolvedNoteName,
        mode: noteMode,
        key: noteKey,
      });
    }

    if (isOneShot && harmonicNoteId) {
      const releaseTimer = window.setTimeout(() => {
        oneShotReleaseTimers.delete(harmonicNoteId);
        releaseHarmonicNote(harmonicNoteId);
        blobRenderer.startBlobFadeOutById(harmonicNoteId);
        scheduleHarmonicExpiry(harmonicNoteId);
      }, Math.max(0, durationMs));
      oneShotReleaseTimers.set(harmonicNoteId, releaseTimer);
    }

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
      noteMode,
      noteKey,
      particleCount
    );
  };

  /**
   * Handle note released event - enhanced for polyphonic support
   */
  const scheduleHarmonicExpiry = (noteId: string) => {
    const pendingExpiry = harmonicExpiryTimers.get(noteId);
    if (pendingExpiry !== undefined) window.clearTimeout(pendingExpiry);

    const expiryTimer = window.setTimeout(() => {
      harmonicExpiryTimers.delete(noteId);
      expireHarmonicNote(noteId);
    }, Math.max(0, blobConfig.value.fadeOutDuration * 1000 + 16));
    harmonicExpiryTimers.set(noteId, expiryTimer);
  };

  const handleNoteReleased = (
    blobKey: string,
    noteId?: string,
    harmonicNoteName = blobKey
  ) => {
    const harmonicNoteId = noteId ?? `legacy:${harmonicNoteName}`;
    const pendingRelease = oneShotReleaseTimers.get(harmonicNoteId);
    if (pendingRelease !== undefined) {
      window.clearTimeout(pendingRelease);
      oneShotReleaseTimers.delete(harmonicNoteId);
    }

    releaseHarmonicNote(harmonicNoteId);

    if (noteId) {
      // Use noteId for precise blob removal in polyphonic scenarios
      blobRenderer.startBlobFadeOutById(noteId);
    } else {
      // Fallback to name-based removal for backward compatibility
      blobRenderer.startBlobFadeOut(blobKey);
    }

    scheduleHarmonicExpiry(harmonicNoteId);
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
    blobFieldRenderer.dispose();
    resetHarmonicAnalysis();
    oneShotReleaseTimers.forEach((timer) => window.clearTimeout(timer));
    harmonicExpiryTimers.forEach((timer) => window.clearTimeout(timer));
    oneShotReleaseTimers.clear();
    harmonicExpiryTimers.clear();
    clearCaches();
    window.removeEventListener("resize", handleResize);
    performanceMonitor.reset();
    ctx = null;
  };

  return {
    // Canvas state
    canvasWidth,
    canvasHeight,
    harmonicAccessibleText,

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
