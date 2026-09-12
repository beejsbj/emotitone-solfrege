import { computed, ref, watch, type Ref } from "vue";
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
import { createStageAudioFeatures } from "@/services/stageAudio";
import {
  fullStageRect,
  resolveStageComposition,
  type StageRect,
} from "./stageRuntime";

/**
 * Unified Canvas Management System
 * Manages a single canvas for all visual effects: blobs, particles, strings, and ambient
 * Now modularized into separate rendering systems for better maintainability
 */

interface StageRuntimeInputs {
  usableRect: Readonly<Ref<StageRect>>;
  reducedMotion: Readonly<Ref<boolean>>;
}

export function useUnifiedCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  runtime?: StageRuntimeInputs,
) {
  const musicStore = useMusicStore();
  const {
    blobConfig,
    ambientConfig,
    particleConfig,
    stringConfig,
    animationConfig,
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
  const stageAudio = createStageAudioFeatures();
  const oneShotReleaseTimers = new Map<string, number>();
  const harmonicExpiryTimers = new Map<string, number>();
  let oneShotSequence = 0;
  const stopReducedMotionWatch = runtime
    ? watch(
        runtime.reducedMotion,
        (reducedMotion) => {
          if (reducedMotion) particleSystem.clearAllParticles();
        },
        { flush: "sync" },
      )
    : () => undefined;

  const harmonicAccessibleText = computed(() => {
    const snapshot = harmonicAnalysisSnapshot.value;
    const config = blobConfig.value;

    if (
      !blobConfig.value.isEnabled ||
      config.connectionMode === "off" ||
      !snapshot.isVisible ||
      snapshot.displayedNotes.length < 2
    ) {
      return "";
    }

    const notesById = new Map(
      snapshot.displayedNotes.map((note) => [note.noteId, note])
    );
    const announcements: string[] = [];

    if (config.showChordLabel && snapshot.chordLabel) {
      announcements.push(`Chord: ${snapshot.chordLabel}`);
    }

    if (config.showIntervalLabels) {
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

    if (config.showEmotionLabel && snapshot.emotionalDescription) {
      announcements.push(`Emotion: ${snapshot.emotionalDescription}`);
    }

    return announcements.join(". ");
  });

  const getComposition = () => {
    const usable = runtime?.usableRect.value
      ?? fullStageRect(canvasWidth.value, canvasHeight.value);
    const configuredBlobRadius = Math.max(
      blobConfig.value.minSize,
      Math.min(
        blobConfig.value.maxSize,
        Math.min(usable.width, usable.height) * blobConfig.value.baseSizeRatio,
      ),
    );
    const desiredBlobRadius = Math.max(
      configuredBlobRadius,
      ...Array.from(blobRenderer.activeBlobs.values(), (blob) => blob.baseRadius),
    );
    return resolveStageComposition(
      usable,
      desiredBlobRadius,
      hilbertScopeConfig.value.sizeRatio,
    );
  };

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
   * Reconcile store-backed sounding notes with renderer-owned Blob anchors.
   * This restores notes that began while Stage or Note Bodies was disabled
   * without replaying their audio, harmonic analysis, timers, or flecks.
   */
  const hydrateMissingBlobAnchors = () => {
    if (!blobConfig.value.isEnabled) return;

    musicStore.getActiveNotes().forEach((activeNote) => {
      if (blobRenderer.activeBlobs.has(activeNote.noteId)) return;

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
        activeNote.octave,
        activeNote.noteName,
      );
    });
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
      hilbertScopeConfig.value,
      getComposition(),
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
      hydrateMissingBlobAnchors();
      blobRenderer.reprojectBlobs(
        getComposition(),
        blobConfig.value,
        true,
      );
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
    const waveformSource = stageAudio.initialize();
    hilbertScopeRenderer.initializeHilbertScope(
      canvasWidth.value,
      canvasHeight.value,
      hilbertScopeConfig.value,
      waveformSource,
    );

  };

  /**
   * Main render frame function - coordinates all visual effects
   */
  const renderFrame = (elapsed: number, timestamp = performance.now()) => {
    if (!ctx) {
      return;
    }

    // Update cached configurations for performance
    updateCachedConfigs();
    hydrateMissingBlobAnchors();
    const composition = getComposition();
    const reducedMotion = runtime?.reducedMotion.value ?? false;
    const audioFrame = stageAudio.sample(timestamp);

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
        getCachedGradient,
        audioFrame,
        reducedMotion,
      );
    }

    if (composition.suspended) return;

    // Strings are pitch-bearing atmospheric texture behind the focal system.
    if (cachedConfigs.string.isEnabled) {
      stringRenderer.updateStringProperties(
        stringConfig.value,
        animationConfig.value,
        musicStore,
        audioFrame,
        reducedMotion,
      );
      stringRenderer.renderStrings(
        ctx,
        elapsed,
        composition.usable.height,
        reducedMotion,
      );
    }

    // Render Hilbert Scope (after ambient, before blobs)
    if (cachedConfigs.hilbertScope.isEnabled) {
      hilbertScopeRenderer.renderHilbertScope(
        ctx,
        elapsed,
        cachedConfigs.hilbertScope,
        canvasWidth.value,
        canvasHeight.value,
        composition,
        audioFrame,
        reducedMotion,
      );
    }

    if (cachedConfigs.blob.isEnabled) {
      blobRenderer.reprojectBlobs(composition, cachedConfigs.blob, reducedMotion);
      blobRenderer.prepareBlobs(ctx, cachedConfigs.blob, {
        reducedMotion,
        bounds: composition.usable,
      });
    }

    const harmonicScene = cachedConfigs.blob.isEnabled
      ? harmonicGeometryRenderer.buildScene(
          harmonicAnalysisSnapshot.value,
          blobRenderer.activeBlobs,
          cachedConfigs.blob,
          canvasWidth.value,
          canvasHeight.value
        )
      : null;
    const renderedBlobField =
      cachedConfigs.blob.isEnabled &&
      cachedConfigs.blob.connectionMode !== "off" &&
      blobFieldRenderer.renderBlobField(
        ctx,
        blobRenderer.getPreparedBlobFrames(),
        cachedConfigs.blob,
        harmonicScene
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

    if (cachedConfigs.particle.isEnabled && !reducedMotion) {
      particleSystem.renderParticles(ctx, elapsed, cachedConfigs.particle);
    }

    harmonicGeometryRenderer.renderLabels(
      ctx,
      harmonicScene,
      cachedConfigs.blob
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
      renderFrame(elapsed, timestamp);

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
    pitchClassIndex?: number,
    durationMs?: number,
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
      octave, // Pass octave for vertical offset positioning
      noteName, // Preserve exact pitch identity for borrowed harmony tones
    );
    blobRenderer.reprojectBlobs(
      getComposition(),
      blobConfig.value,
      true,
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
        pitchClassIndex,
        solfege: note,
        frequency,
        octave: resolvedOctave,
        keyboardOctave: resolvedOctave,
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

    if (!(runtime?.reducedMotion.value ?? false)) {
      particleSystem.createParticles(
        note,
        particleConfig.value,
        canvasWidth.value,
        getComposition().usable.height,
        noteMode,
        noteKey,
        particleCount,
        { pitchClassIndex, octave },
      );
    }
  };

  /**
   * Handle note released event - enhanced for polyphonic support
   */
  const scheduleHarmonicExpiry = (noteId: string) => {
    const pendingExpiry = harmonicExpiryTimers.get(noteId);
    if (pendingExpiry !== undefined) window.clearTimeout(pendingExpiry);

    const visibleExitDuration = Math.min(
      blobConfig.value.fadeOutDuration,
      blobConfig.value.scaleOutDuration
    );
    const expiryTimer = window.setTimeout(() => {
      harmonicExpiryTimers.delete(noteId);
      expireHarmonicNote(noteId);
    }, Math.max(0, visibleExitDuration * 1000 + 16));
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
    stageAudio.cleanup();
    blobFieldRenderer.dispose();
    resetHarmonicAnalysis();
    oneShotReleaseTimers.forEach((timer) => window.clearTimeout(timer));
    harmonicExpiryTimers.forEach((timer) => window.clearTimeout(timer));
    oneShotReleaseTimers.clear();
    harmonicExpiryTimers.clear();
    stopReducedMotionWatch();
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
