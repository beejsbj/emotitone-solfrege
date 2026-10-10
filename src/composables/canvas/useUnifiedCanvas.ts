import { sizeStageCanvas, stagePixelRatio } from "./stageCanvas";
import { liveAudioInput } from "@/services/liveAudio";
import { computed, ref, watch, type Ref } from "vue";
import { useMusicStore } from "@/stores/music";
import { useVisualConfig } from "@/composables/useVisualConfig";
import { useHarmonicAnalysis } from "@/composables/useHarmonicAnalysis";
import { spokenPitchName } from "@/domain/musicalIdentity";
import { useAnimationLifecycle } from "@/composables/useAnimationLifecycle";
import type {
  ActiveNote,
  ChromaticNote,
  MusicalMode,
  SolfegeData,
} from "@/types/music";
import { useBlobRenderer } from "./useBlobRenderer";
import { useStringRenderer } from "./useStringRenderer";
import { useAmbientRenderer } from "./useAmbientRenderer";
import { useHarmonicGeometryRenderer } from "./useHarmonicGeometryRenderer";
import { useBlobFieldRenderer } from "./useBlobFieldRenderer";
import { useHilbertScopeRenderer } from "./useHilbertScopeRenderer";
import { performanceMonitor } from "@/utils/performanceMonitor";
import {
  createStageAudioFeatures,
  type StageAudioFeatures,
} from "@/services/stageAudio";
import { getActiveLivePitchStageNotes } from "@/services/hummingStage";
import { getActiveStrudelStageNotes, getAudioContext } from "@/services/superdoughAudio";
import {
  STAGE_BODY_SIZE_BASE_RATIO,
  STAGE_BODY_SIZE_MAX_RATIO,
  STAGE_BODY_SIZE_MIN_RATIO,
} from "@/services/stageAppearance";
import {
  fullStageRect,
  resolveStageComposition,
  type StageRect,
} from "./stageRuntime";
import { resolveStageActiveNotes } from "./stageNoteSources";
import { createAudibleStageTimeline } from "@/services/audibleStageTimeline";

/**
 * Unified Canvas Management System
 * Manages a single canvas for all visual effects: blobs, strings, and ambient
 * Now modularized into separate rendering systems for better maintainability
 */

interface StageRuntimeInputs {
  usableRect: Readonly<Ref<StageRect>>;
  reducedMotion: Readonly<Ref<boolean>>;
  /** A caller-owned analysis source whose cleanup follows this renderer lifetime. */
  audioFeatures?: StageAudioFeatures;
  /** An authoritative controlled pitch view; omission selects the production registries. */
  getActiveNotes?: () => readonly ActiveNote[];
  /** Note lifecycle target shared by the canvas and pitch String renderer. */
  eventTarget?: EventTarget;
}

export function useUnifiedCanvas(
  canvasRef: Ref<HTMLCanvasElement | null>,
  runtime?: StageRuntimeInputs,
) {
  const musicStore = useMusicStore();
  const readProductionNotes = (): readonly ActiveNote[] => resolveStageActiveNotes(
    undefined,
    () => musicStore.getActiveNotes(),
    getActiveLivePitchStageNotes,
    getActiveStrudelStageNotes,
  );
  // Controlled specimens own their clock. Production receives a private
  // presentation projection, leaving the input, recording and MIDI paths alone.
  const audibleTimeline = runtime?.getActiveNotes || runtime?.eventTarget
    ? undefined : createAudibleStageTimeline(window, readProductionNotes);
  const getStageActiveNotes = runtime?.getActiveNotes ?? audibleTimeline?.getActiveNotes ?? readProductionNotes;
  const noteEventTarget = runtime?.eventTarget ?? audibleTimeline?.eventTarget ?? window;
  const {
    stageConfig,
    blobConfig,
    ambientConfig,
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
  } = useHarmonicAnalysis(getStageActiveNotes);

  // Canvas state (merged from useCanvasCore)
  const canvasWidth = ref(window.innerWidth);
  const canvasHeight = ref(window.innerHeight);
  let ctx: CanvasRenderingContext2D | null = null;
  let resolutionQuery: MediaQueryList | null = null;
  let canvasObserver: ResizeObserver | null = null;
  let loopEnabled = false;
  let disposed = false;
  let liveInputActive = false;
  let previousTimestamp: number | null = null;
  let motionElapsed = 0;

  // Performance optimization: Cache colors
  const colorCache = new Map<string, string>();

  // Cached configurations for performance
  let cachedConfigs = {
    blob: blobConfig.value,
    ambient: ambientConfig.value,
    string: stringConfig.value,
    hilbertScope: hilbertScopeConfig.value,
  };

  const colorAnimationActive = ref(false);
  const animateColors = () => colorAnimationActive.value;

  // Rendering systems
  const blobRenderer = useBlobRenderer(animateColors);
  const stringRenderer = useStringRenderer(animateColors);
  const ambientRenderer = useAmbientRenderer(animateColors);
  const harmonicGeometryRenderer = useHarmonicGeometryRenderer();
  const blobFieldRenderer = useBlobFieldRenderer();
  const hilbertScopeRenderer = useHilbertScopeRenderer(animateColors);
  const stageAudio = runtime?.audioFeatures ?? createStageAudioFeatures();
  const oneShotReleaseTimers = new Map<string, number>();
  const harmonicExpiryTimers = new Map<string, number>();
  let oneShotSequence = 0;
  let wasCompositionSuspended = false;
  const clearTransientStageState = () => {
    hilbertScopeRenderer.clearHistory();
  };
  const stopStageEnabledWatch = watch(
    () => stageConfig.value.isEnabled,
    (isEnabled) => {
      if (isEnabled) return;
      clearTransientStageState();
      clearCanvas();
    },
    { flush: "sync" },
  );

  const harmonicAccessibleText = computed(() => {
    const snapshot = harmonicAnalysisSnapshot.value;
    const config = blobConfig.value;

    if (
      !blobConfig.value.isEnabled ||
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
      announcements.push(`Chord: ${snapshot.chordSpoken ?? snapshot.chordLabel}`);
    }

    if (config.showIntervalLabels) {
      snapshot.intervalEdges.forEach((edge) => {
        const from = notesById.get(edge.fromNoteId);
        const to = notesById.get(edge.toNoteId);
        if (from && to) {
          // Spoken from the key's spelling; stored sharps never reach a label.
          const spoken = (note: typeof from) =>
            spokenPitchName(snapshot.noteSpellings?.[note.noteId] ?? note.noteName);
          announcements.push(
            `Interval ${spoken(from)} to ${spoken(to)}: ${edge.spokenInterval || edge.interval}`
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
    const canonicalBlobRadius = Math.max(
      blobConfig.value.minSize,
      Math.min(
        blobConfig.value.maxSize,
        Math.min(usable.width, usable.height) * STAGE_BODY_SIZE_BASE_RATIO,
      ),
    );
    return resolveStageComposition(
      usable,
      canonicalBlobRadius,
      hilbertScopeConfig.value.sizeRatio,
      Math.max(
        STAGE_BODY_SIZE_MIN_RATIO,
        Math.min(STAGE_BODY_SIZE_MAX_RATIO, blobConfig.value.baseSizeRatio),
      ) / STAGE_BODY_SIZE_BASE_RATIO,
    );
  };

  /**
   * Update cached configurations for performance
   */
  const updateCachedConfigs = () => {
    cachedConfigs = {
      blob: blobConfig.value,
      ambient: ambientConfig.value,
      string: stringConfig.value,
      hilbertScope: hilbertScopeConfig.value,
    };
  };

  /**
   * Reconcile sounding store and live-input notes with renderer-owned Blob
   * anchors. This restores notes that began while Stage or Note Bodies was
   * disabled without replaying their audio or timers.
   */
  const hydrateMissingBlobAnchors = (
    activeNotes: readonly ActiveNote[] = getStageActiveNotes(),
  ) => {
    if (!blobConfig.value.isEnabled) return;

    activeNotes.forEach((activeNote) => {
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
    const bounds = canvasRef.value?.getBoundingClientRect();
    canvasWidth.value = bounds?.width || window.innerWidth;
    canvasHeight.value = bounds?.height || window.innerHeight;

    if (canvasRef.value) {
      sizeStageCanvas(canvasRef.value, ctx, canvasWidth.value, canvasHeight.value);
      if (ctx) {
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
      }
    }

    // Resize Hilbert Scope
    hilbertScopeRenderer.resizeHilbertScope(
      canvasWidth.value,
      canvasHeight.value,
      hilbertScopeConfig.value,
      getComposition(),
      stagePixelRatio(),
    );
    stringRenderer.initializeStrings(stringConfig.value, canvasWidth.value, canvasHeight.value, musicStore.solfegeData);
    wakeAnimation();
  };

  const watchResolution = () => {
    resolutionQuery?.removeEventListener("change", onResolutionChange);
    resolutionQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    resolutionQuery.addEventListener("change", onResolutionChange);
  };
  const onResolutionChange = () => {
    handleResize();
    watchResolution();
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
    handleResize();
    watchResolution();
    canvasObserver = new ResizeObserver(handleResize);
    canvasObserver.observe(canvasRef.value);

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

    // Add string event listeners for sequencer integration
    stringRenderer.addEventListeners(noteEventTarget);

    // Initialize Hilbert Scope
    const waveformSource = stageAudio.initialize();
    void hilbertScopeRenderer.initializeHilbertScope(
      canvasWidth.value,
      canvasHeight.value,
      hilbertScopeConfig.value,
      waveformSource,
    ).then(() => {
      if (disposed) return;
      hilbertScopeRenderer.resizeHilbertScope(canvasWidth.value, canvasHeight.value,
        hilbertScopeConfig.value, getComposition(), stagePixelRatio());
      wakeAnimation();
    });

  };

  /**
   * Main render frame function - coordinates all visual effects
   */
  const renderFrame = (elapsed: number, timestamp: number, deltaSeconds: number) => {
    if (!ctx) {
      return false;
    }

    // Update cached configurations for performance
    updateCachedConfigs();
    const stageActiveNotes = getStageActiveNotes();
    hydrateMissingBlobAnchors(stageActiveNotes);
    const composition = getComposition();
    if (composition.suspended) {
      if (!wasCompositionSuspended) clearTransientStageState();
      wasCompositionSuspended = true;
    } else {
      wasCompositionSuspended = false;
    }
    const reducedMotion = runtime?.reducedMotion.value ?? false;
    const audioFrame = stageAudio.sample(timestamp);

    // Clear canvas
    clearCanvas();

    // Render effects in order (back to front)
    // Atmosphere reconciles pitch lifetime on every sampled frame; its own
    // enable/suspension gates control painting only.
    ambientRenderer.renderAmbientBackground(
      ctx,
      elapsed,
      cachedConfigs.ambient,
      canvasWidth.value,
      canvasHeight.value,
      musicStore,
      composition,
      audioFrame,
      reducedMotion,
      stageActiveNotes,
    );

    if (composition.suspended || !stageConfig.value.isEnabled) return false;

    // Strings are pitch-bearing atmospheric texture behind the focal system.
    if (cachedConfigs.string.isEnabled) {
      stringRenderer.updateStringProperties(
        stringConfig.value,
        animationConfig.value,
        musicStore,
        audioFrame,
        reducedMotion,
        stageActiveNotes,
        deltaSeconds,
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
        stageActiveNotes,
        deltaSeconds,
      );
    }

    if (cachedConfigs.blob.isEnabled) {
      blobRenderer.reprojectBlobs(composition, cachedConfigs.blob, reducedMotion, deltaSeconds);
      blobRenderer.prepareBlobs(ctx, cachedConfigs.blob, {
        reducedMotion,
        bounds: composition.usable,
        elapsed,
        deltaSeconds,
        driftIntegrated: true,
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

    harmonicGeometryRenderer.renderLabels(
      ctx,
      harmonicScene,
      cachedConfigs.blob,
      { now: timestamp, reducedMotion, bounds: composition.usable }
    );

    // Each animated layer owns its release lifetime. The unpitched microphone
    // meter stays live even before pitch detection produces a note event.
    return stageActiveNotes.length > 0 || liveInputActive
      || audioFrame.hasSignal || audioFrame.envelope >= 0.001
      || (cachedConfigs.blob.isEnabled && blobRenderer.hasPendingAnimation())
      || (cachedConfigs.string.isEnabled && stringRenderer.hasPendingAnimation(cachedConfigs.string))
      || (cachedConfigs.hilbertScope.isEnabled && hilbertScopeRenderer.hasPendingAnimation());
  };

  // Setup animation with performance monitoring
  const getActiveObjectCount = () => {
    return (
      blobRenderer.getActiveBlobCount() +
      stringRenderer.getActiveStringCount()
    );
  };

  const animation = useAnimationLifecycle({
    onStart: () => { colorAnimationActive.value = true; },
    onStop: () => { colorAnimationActive.value = false; },
    onFrame: (timestamp: number) => {
      const deltaSeconds = previousTimestamp === null ? 0
        : Math.min(0.05, Math.max(0, (timestamp - previousTimestamp) / 1000));
      previousTimestamp = timestamp;
      motionElapsed += deltaSeconds;
      const pending = renderFrame(motionElapsed, timestamp, deltaSeconds);
      if (!pending) animation.stopAnimation();

      // Update performance metrics
      const activeObjectCount = getActiveObjectCount();
      performanceMonitor.update(timestamp, activeObjectCount);

      // Check for performance warnings
      performanceMonitor.checkAndWarnPerformance();
    },
    autoCleanup: true,
  });

  const isAnimating = animation.isAnimating;
  const canAnimate = () => !disposed && !!ctx && loopEnabled && !document.hidden && stageConfig.value.isEnabled;
  const wakeAnimation = () => {
    if (!canAnimate()) return;
    if (!isAnimating.value) {
      previousTimestamp = null;
      animation.startAnimation();
    }
  };
  const startAnimation = () => {
    loopEnabled = true;
    wakeAnimation();
  };
  const stopAnimation = () => {
    loopEnabled = false;
    animation.stopAnimation();
    previousTimestamp = null;
  };
  const onVisibilityChange = () => {
    if (document.hidden) animation.stopAnimation();
    else wakeAnimation();
  };
  document.addEventListener("visibilitychange", onVisibilityChange);
  const wakeEvents = ["note-played", "note-released", "note-expression"];
  wakeEvents.forEach(event => noteEventTarget.addEventListener(event, wakeAnimation));
  const audioEventTarget = runtime?.eventTarget ?? window;
  audioEventTarget.addEventListener("stage-audio", wakeAnimation);
  // Soundfonts, unpitched samples and late-connected audio taps need no pitch
  // event. Probe only idle, visible Stages with a running audio clock; never draw
  // silent transport frames just to discover a later onset.
  const idleAudioTimer = window.setInterval(() => {
    if (!canAnimate() || isAnimating.value || getAudioContext().state !== "running") return;
    const frame = stageAudio.sample(performance.now());
    if (frame.hasSignal || frame.envelope >= 0.001 || getStageActiveNotes().length) wakeAnimation();
  }, 50);
  const unsubscribeLiveInput = runtime?.audioFeatures ? () => {} : liveAudioInput.subscribe(source => {
    liveInputActive = source !== null;
    wakeAnimation();
  });
  const stopPresentationWatch = watch(
    () => [stageConfig.value, blobConfig.value, ambientConfig.value, stringConfig.value,
      hilbertScopeConfig.value, animationConfig.value, runtime?.usableRect.value,
      runtime?.reducedMotion.value, getStageActiveNotes()],
    () => {
      if (!stageConfig.value.isEnabled) animation.stopAnimation();
      else wakeAnimation();
    },
    { deep: true },
  );

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
    const composition = getComposition();
    blobRenderer.reprojectBlobs(
      composition,
      blobConfig.value,
      true,
    );

    const activeNote = noteId
      ? getStageActiveNotes().find((candidate) => candidate.noteId === noteId)
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
        wakeAnimation();
      }, Math.max(0, durationMs));
      oneShotReleaseTimers.set(harmonicNoteId, releaseTimer);
    }
    wakeAnimation();
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
    wakeAnimation();
  };

  /**
   * Clear caches to prevent memory leaks
   */
  const clearCaches = () => {
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
    disposed = true;
    stopAnimation();
    stopPresentationWatch();
    unsubscribeLiveInput();
    canvasObserver?.disconnect();
    resolutionQuery?.removeEventListener("change", onResolutionChange);
    document.removeEventListener("visibilitychange", onVisibilityChange);
    wakeEvents.forEach(event => noteEventTarget.removeEventListener(event, wakeAnimation));
    audioEventTarget.removeEventListener("stage-audio", wakeAnimation);
    window.clearInterval(idleAudioTimer);
    audibleTimeline?.dispose();
    blobRenderer.clearAllBlobs();
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
    stopStageEnabledWatch();
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
    noteEventTarget,

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
    handleNotePlayed,
    handleNoteReleased,

    // Performance monitoring
    getPerformanceMetrics,

    // Cleanup
    cleanup,
  };
}
