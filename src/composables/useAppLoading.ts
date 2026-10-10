import { resumeAudioContext } from "@/services/audioLifecycle";
/**
 * App Loading State Composable
 * Manages the overall loading state and coordination between different initialization phases
 */

import { ref, reactive, computed, watch, readonly } from "vue";
import type {
  LoadingPhase,
  LoadingState,
  InitializationProgress,
  SplashConfig,
  AppLoadingState,
  LoadingEvent,
} from "@/types/loading";
import {
  getAudioContext,
  getAudioStartupStage,
  initSuperdoughAudio,
  initSynthOnlyAudio,
} from "@/services/superdoughAudio";
import {
  AudioBlockedError,
  INSTRUMENT_LOAD_TIMEOUT_MESSAGE,
  INSTRUMENT_LOAD_TIMEOUT_MS,
  SampleLoadError,
} from "@/services/audioFailures";

/**
 * A browser that refuses to start audio leaves resume() pending rather than
 * rejecting it, so the gesture waits this long before reporting the block.
 */
const AUDIO_RESUME_TIMEOUT_MS = 1500;

/** A tap never waits on the engine longer than this; past it, the engine has hung. */
const ENGINE_START_TIMEOUT_MS = 15_000;

/** Rejects with `error()` after `ms`, so a hung promise becomes a named failure. */
function within<T>(promise: Promise<T>, ms: number, error: () => Error): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const expiry = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(error()), ms);
  });
  return Promise.race([promise, expiry]).finally(() => clearTimeout(timer));
}

/**
 * Names a load that ran out of time by the step that was still pending. Only a
 * hung sample download (or a sampled instrument still warming after the engine
 * is ready) can fall back to the synths; a hung engine cannot.
 */
function instrumentLoadTimeout(): Error {
  const stage = getAudioStartupStage();
  const message = INSTRUMENT_LOAD_TIMEOUT_MESSAGE;
  return stage === "samples" || stage === "ready"
    ? new SampleLoadError(message)
    : new Error(`${message}: the audio engine did not start`);
}

// Default splash configuration
const DEFAULT_SPLASH_CONFIG: SplashConfig = {
  showLogo: true,
  showProgress: true,
  showMessages: true,
  autoHideDelay: 1500,
  enableAnimations: true,
  theme: "dark",
};

// Create default loading state
const createDefaultLoadingState = (
  phase: LoadingPhase = "initial"
): LoadingState => ({
  phase,
  progress: 0,
  message: "Initializing...",
  isComplete: false,
});

// Global loading state (singleton pattern)
let globalLoadingState: AppLoadingState | null = null;

export function useAppLoading() {
  // Initialize global state if it doesn't exist
  if (!globalLoadingState) {
    globalLoadingState = reactive<AppLoadingState>({
      isLoading: true,
      isVisible: true,
      progress: {
        audioContext: createDefaultLoadingState("initial"),
        instruments: createDefaultLoadingState("initial"),
        visualEffects: createDefaultLoadingState("initial"),
        overall: createDefaultLoadingState("initial"),
      },
      config: { ...DEFAULT_SPLASH_CONFIG },
      startTime: Date.now(),
    });
  }

  const loadingState = globalLoadingState;

  // Computed properties
  const isLoading = computed(() => loadingState.isLoading);
  const isVisible = computed(() => loadingState.isVisible);
  const overallProgress = computed(() => {
    const { audioContext, instruments, visualEffects } = loadingState.progress;
    return Math.round(
      (audioContext.progress + instruments.progress + visualEffects.progress) /
        3
    );
  });

  // Update a specific loading phase
  const updatePhase = (
    phase: keyof InitializationProgress,
    updates: Partial<LoadingState>
  ) => {
    if (phase === "overall") return; // Overall is computed

    Object.assign(loadingState.progress[phase], updates);

    // Update overall progress
    loadingState.progress.overall.progress = overallProgress.value;
    loadingState.progress.overall.message =
      updates.message || loadingState.progress.overall.message;

    // Dispatch loading event
    const event: LoadingEvent = {
      phase: updates.phase || loadingState.progress[phase].phase,
      progress: updates.progress || loadingState.progress[phase].progress,
      message: updates.message || loadingState.progress[phase].message,
      timestamp: Date.now(),
    };

    window.dispatchEvent(
      new CustomEvent("app-loading-progress", { detail: event })
    );
  };

  // Start audio inside a user gesture. Loading prepares the graph but leaves the
  // context suspended; this resumes it and reports whether the browser let it run.
  // synthsOnly starts the built-in synths without the sample packs, for when they failed.
  const initializeAudioContext = async (
    { synthsOnly = false }: { synthsOnly?: boolean } = {}
  ): Promise<boolean> => {
    updatePhase("audioContext", {
      phase: "audio-context",
      progress: 10,
      message: "Enabling audio context...",
    });

    let selectedInstrumentTimedOut = false;
    try {
      await within(
        synthsOnly ? initSynthOnlyAudio() : initSuperdoughAudio(),
        ENGINE_START_TIMEOUT_MS,
        () => new Error("The audio engine did not start in time"),
      );
      if (synthsOnly) {
        // Whatever is selected (a persisted sampled instrument, say) may never
        // have loaded; the synth entry plays the synth that was just prepared.
        const { useInstrumentStore } = await import("@/stores/instrument");
        useInstrumentStore().fallBackToSynth();
      }

      const context = getAudioContext();
      const resumption = resumeAudioContext(context);
      if (resumption) {
        await Promise.race([
          resumption,
          new Promise((resolve) => setTimeout(resolve, AUDIO_RESUME_TIMEOUT_MS)),
        ]);
      }
      if (context.state !== "running") throw new AudioBlockedError();
      if (!synthsOnly) {
        const { useInstrumentStore } = await import("@/stores/instrument");
        updatePhase("instruments", { isComplete: false, progress: 0, message: "Preparing instrument…" });
        await within(
          useInstrumentStore().initializeInstruments((progress, message) => {
            loadingState.progress.instruments.progress = progress;
            loadingState.progress.instruments.message = message;
          }),
          INSTRUMENT_LOAD_TIMEOUT_MS,
          () => { selectedInstrumentTimedOut = true; return instrumentLoadTimeout(); },
        );
        updatePhase("instruments", { isComplete: true, progress: 100 });
      }

      updatePhase("audioContext", {
        progress: 100,
        message: "Audio context ready",
        isComplete: true,
        error: undefined,
        failure: undefined,
      });
      return true;
    } catch (error) {
      if (error instanceof SampleLoadError) {
        updatePhase("instruments", {
          message: "Instrument samples failed to load",
          isComplete: false,
          error: error.message,
          failure: "samples",
          timedOut: selectedInstrumentTimedOut,
        });
        return false;
      }
      // Only a context the browser refused is a cue. Engine faults keep the splash.
      const blocked = error instanceof AudioBlockedError;
      updatePhase("audioContext", {
        progress: 0,
        message: blocked ? "Audio is waiting for a tap" : "Audio engine failed to start",
        isComplete: false,
        error: error instanceof Error ? error.message : "Unknown error",
        failure: blocked ? "blocked" : "engine",
      });
      return false;
    }
  };

  // Initialize instruments (coordinates with instrument store)
  const initializeInstruments = async () => {
    updatePhase("instruments", {
      phase: "instruments",
      progress: 0,
      message: "Loading audio samples…",
    });

    let timedOut = false;
    try {
      // Lazy import to avoid circular dependencies
      const { useInstrumentStore } = await import("@/stores/instrument");
      const instrumentStore = useInstrumentStore();

      // Granular callback: update instruments phase with the step detail but
      // keep overall.message as a stable header ("Loading audio samples…")
      // so the two message lines don't echo each other in the UI.
      const progressCallback = (progress: number, message: string) => {
        loadingState.progress.instruments.progress = Math.min(progress, 99);
        loadingState.progress.instruments.message = message;
        loadingState.progress.overall.progress = overallProgress.value;
        // overall.message intentionally left unchanged ("Loading audio samples…")
      };

      // A load that hangs stops the count; the timeout is named by the step that hung.
      await within(
        instrumentStore.initializeInstruments(progressCallback, { prepareSelected: false }),
        INSTRUMENT_LOAD_TIMEOUT_MS,
        () => {
          timedOut = true;
          return instrumentLoadTimeout();
        },
      );

      updatePhase("instruments", {
        progress: 100,
        message: "Audio engine ready; selected sound prepares on Play",
        isComplete: true,
      });
    } catch (error) {
      console.error("Instrument initialization error:", error);

      // A failed load holds the count: the phase stays incomplete so loading
      // never reports ready, and the splash offers a retry from the top.
      // Sample fetches and the load timeout can fall back to synths; any other
      // rejection (the audio graph failing to initialise) is an engine fault.
      const samples = error instanceof SampleLoadError;
      updatePhase("instruments", {
        message: samples ? "Instrument samples failed to load" : "Audio engine failed to start",
        isComplete: false,
        error: error instanceof Error ? error.message : "Unknown error",
        failure: samples ? "samples" : "engine",
        timedOut,
      });
    }
  };

  // Initialize visual effects
  const initializeVisualEffects = async () => {
    updatePhase("visualEffects", {
      phase: "visual-effects",
      progress: 10,
      message: "Initializing visual effects...",
    });

    // Simulate visual effects initialization
    await new Promise((resolve) => setTimeout(resolve, 300));

    updatePhase("visualEffects", {
      progress: 100,
      message: "Visual effects ready",
      isComplete: true,
    });
  };

  // Complete loading process
  const completeLoading = () => {
    loadingState.progress.overall.phase = "complete";
    loadingState.progress.overall.progress = 100;
    loadingState.progress.overall.message = "Ready to play!";
    loadingState.progress.overall.isComplete = true;
    loadingState.endTime = Date.now();

    // Don't auto-hide - let user click "Start App" button
    // The LoadingSplash component will handle hiding when user clicks the button

    // Dispatch completion event
    window.dispatchEvent(
      new CustomEvent("app-loading-complete", {
        detail: {
          duration: loadingState.endTime - loadingState.startTime,
          timestamp: Date.now(),
        },
      })
    );
  };

  // Watch for completion - allow completion even if audio context needs user interaction
  watch(
    () => [
      loadingState.progress.audioContext.isComplete ||
        loadingState.progress.audioContext.error,
      loadingState.progress.instruments.isComplete,
      loadingState.progress.visualEffects.isComplete,
    ],
    ([
      audioCompleteOrNeedsInteraction,
      instrumentsComplete,
      visualComplete,
    ]) => {
      // Complete loading if visual effects are done and either:
      // 1. Audio and instruments are complete, OR
      // 2. Audio needs user interaction (will show enable button)
      if (
        visualComplete &&
        ((audioCompleteOrNeedsInteraction && instrumentsComplete) ||
          (loadingState.progress.audioContext.error &&
            !loadingState.progress.audioContext.isComplete))
      ) {
        completeLoading();
      }
    }
  );

  // Manual audio context trigger (for user interaction)
  const enableAudioContext = async (
    options?: { synthsOnly?: boolean }
  ): Promise<boolean> => {
    return await initializeAudioContext(options);
  };

  // Hide the splash screen
  const hideSplash = (delayMs = 500) => {
    loadingState.isVisible = false;
    if (delayMs <= 0) {
      loadingState.isLoading = false;
      return;
    }
    setTimeout(() => {
      loadingState.isLoading = false;
    }, delayMs); // Allow for the visual fade-out when motion is enabled.
  };

  // Skip loading (for development)
  const skipLoading = () => {
    loadingState.isVisible = false;
    loadingState.isLoading = false;
  };

  // Reset loading state (for development/testing)
  const resetLoading = () => {
    loadingState.isLoading = true;
    loadingState.isVisible = true;
    loadingState.progress.audioContext = createDefaultLoadingState("initial");
    loadingState.progress.instruments = createDefaultLoadingState("initial");
    loadingState.progress.visualEffects = createDefaultLoadingState("initial");
    loadingState.progress.overall = createDefaultLoadingState("initial");
    loadingState.startTime = Date.now();
    delete loadingState.endTime;
  };

  return {
    // State
    loadingState: readonly(loadingState),
    isLoading,
    isVisible,
    overallProgress,

    // Actions
    updatePhase,
    initializeAudioContext,
    initializeInstruments,
    initializeVisualEffects,
    enableAudioContext,
    completeLoading,
    hideSplash,
    skipLoading,
    resetLoading,
  };
}
