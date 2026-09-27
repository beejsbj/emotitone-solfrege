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
import { getAudioContext, initSuperdoughAudio } from "@/services/superdoughAudio";

/**
 * A browser that refuses to start audio leaves resume() pending rather than
 * rejecting it, so the gesture waits this long before reporting the block.
 */
const AUDIO_RESUME_TIMEOUT_MS = 1500;

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
  const initializeAudioContext = async (): Promise<boolean> => {
    updatePhase("audioContext", {
      phase: "audio-context",
      progress: 10,
      message: "Enabling audio context...",
    });

    try {
      await initSuperdoughAudio();

      const context = getAudioContext();
      if (context.state !== "running") {
        await Promise.race([
          context.resume(),
          new Promise((resolve) => setTimeout(resolve, AUDIO_RESUME_TIMEOUT_MS)),
        ]);
      }
      if (context.state !== "running") {
        throw new Error("The browser has not allowed audio to start yet");
      }

      updatePhase("audioContext", {
        progress: 100,
        message: "Audio context ready",
        isComplete: true,
        error: undefined,
      });
      return true;
    } catch (error) {
      updatePhase("audioContext", {
        progress: 0,
        message: "Audio initialization failed",
        isComplete: false,
        error: error instanceof Error ? error.message : "Unknown error",
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

      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error("Instrument initialization timeout"));
        }, 60000); // 60 second timeout for all instruments
      });

      // Initialize instruments with progress tracking
      await Promise.race([
        instrumentStore.initializeInstruments(progressCallback),
        timeoutPromise,
      ]);

      updatePhase("instruments", {
        progress: 100,
        message: "All instruments ready",
        isComplete: true,
      });
    } catch (error) {
      console.error("Instrument initialization error:", error);

      // A failed load holds the count: the phase stays incomplete so loading
      // never reports ready, and the splash offers a retry from the top.
      updatePhase("instruments", {
        message: "Instrument samples failed to load",
        isComplete: false,
        error: error instanceof Error ? error.message : "Unknown error",
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
  const enableAudioContext = async (): Promise<boolean> => {
    return await initializeAudioContext();
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
