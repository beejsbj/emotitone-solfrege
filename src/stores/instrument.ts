import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { DEFAULT_INSTRUMENT } from "@/data/instruments";
import {
  getReadySounds,
  initSuperdoughAudio,
  isPrewarmed,
  prewarmSoundSamples,
} from "@/services/superdoughAudio";

export type InstrumentSelectionResult =
  | { status: "ready"; instrument: string }
  | { status: "failed"; instrument: string; fallback: string | null }
  | { status: "superseded"; instrument: string };

/**
 * Instrument Store
 * Manages instrument selection and delegates audio to superdough.
 * No Tone.js instruments are created here — superdough handles all audio.
 */

export const useInstrumentStore = defineStore("instrument", () => {
  // State
  const currentInstrument = ref<string>(DEFAULT_INSTRUMENT);
  const lastReadyInstrument = ref<string | null>(null);
  const readyInstruments = ref<Set<string>>(new Set());
  const warmingInstrument = ref<string | null>(null);
  const warmupMessage = ref("");
  const lastWarmupError = ref<string | null>(null);
  const lastWarmupErrorInstrument = ref<string | null>(null);
  const isInitializing = ref(false);
  const warmupPromises = new Map<string, Promise<void>>();
  let selectionGeneration = 0;

  const isInteractionLocked = computed(() => warmingInstrument.value !== null);
  const isLoading = computed(
    () => isInitializing.value || isInteractionLocked.value
  );

  const clearWarmupError = () => {
    lastWarmupError.value = null;
    lastWarmupErrorInstrument.value = null;
  };

  const clearWarmupState = () => {
    warmingInstrument.value = null;
    warmupMessage.value = "";
  };

  const markInstrumentReady = (instrumentName: string) => {
    readyInstruments.value.add(instrumentName);
  };

  const isInstrumentReady = (instrumentName: string) =>
    readyInstruments.value.has(instrumentName) || isPrewarmed(instrumentName);

  const findReadyFallback = (preferred: Array<string | null> = []) => {
    const candidates = [
      ...preferred,
      lastReadyInstrument.value,
      DEFAULT_INSTRUMENT,
      "triangle",
      ...readyInstruments.value,
    ];

    return (
      candidates.find(
        (candidate, index) =>
          candidate !== null &&
          candidates.indexOf(candidate) === index &&
          isInstrumentReady(candidate)
      ) ?? null
    );
  };

  const syncReadyInstrumentsFromAudio = () => {
    readyInstruments.value = new Set(getReadySounds());

    const fallback = findReadyFallback([currentInstrument.value]);
    if (fallback) {
      markInstrumentReady(fallback);
      currentInstrument.value = fallback;
      lastReadyInstrument.value = fallback;
    } else {
      lastReadyInstrument.value = null;
    }
  };

  const isInstrumentWarming = (instrumentName: string) =>
    warmingInstrument.value === instrumentName;

  // Initialize — boots superdough and reports granular sample-pack progress
  // through the optional callback so loading screens can show real steps.
  const initializeInstruments = async (
    progressCallback?: (progress: number, message: string) => void
  ) => {
    isInitializing.value = true;
    try {
      await initSuperdoughAudio(progressCallback);
      syncReadyInstrumentsFromAudio();
      // Guarantee a 100% call even when already initialized (early return path)
      progressCallback?.(100, "Audio engine ready");
    } catch (error) {
      console.error("Error initializing superdough:", error);
      // Synth registration can succeed before a sample pack fails. Reconcile
      // that partial success so the app falls back to something truly playable.
      syncReadyInstrumentsFromAudio();
      throw error;
    } finally {
      isInitializing.value = false;
    }
  };

  // Set current instrument — any registered superdough sound name is valid.
  // Awaits pre-warming for cold instruments so the first keypress is never dropped.
  const setInstrument = async (
    instrumentName: string
  ): Promise<InstrumentSelectionResult> => {
    const selection = ++selectionGeneration;
    const previousReadyInstrument = findReadyFallback([
      currentInstrument.value,
      lastReadyInstrument.value,
    ]);
    currentInstrument.value = instrumentName;
    clearWarmupError();

    if (isInstrumentReady(instrumentName)) {
      markInstrumentReady(instrumentName);
      lastReadyInstrument.value = instrumentName;
      clearWarmupState();
      return { status: "ready", instrument: instrumentName };
    }

    warmingInstrument.value = instrumentName;
    warmupMessage.value = "Samples being downloaded...";

    let warmupPromise = warmupPromises.get(instrumentName);
    if (!warmupPromise) {
      warmupPromise = prewarmSoundSamples(instrumentName)
        .then(() => markInstrumentReady(instrumentName))
        .finally(() => warmupPromises.delete(instrumentName));
      warmupPromises.set(instrumentName, warmupPromise);
    }

    try {
      await warmupPromise;

      if (selection !== selectionGeneration) {
        return { status: "superseded", instrument: instrumentName };
      }

      currentInstrument.value = instrumentName;
      lastReadyInstrument.value = instrumentName;
      clearWarmupState();
      return { status: "ready", instrument: instrumentName };
    } catch (error) {
      if (selection !== selectionGeneration) {
        return { status: "superseded", instrument: instrumentName };
      }

      const fallback = findReadyFallback([previousReadyInstrument]);
      if (fallback) {
        currentInstrument.value = fallback;
        lastReadyInstrument.value = fallback;
      }
      lastWarmupError.value =
        error instanceof Error && error.message
          ? error.message
          : "Could not download samples for this instrument.";
      lastWarmupErrorInstrument.value = instrumentName;
      clearWarmupState();
      return { status: "failed", instrument: instrumentName, fallback };
    }
  };

  return {
    // State
    currentInstrument,
    readyInstruments,
    warmingInstrument,
    warmupMessage,
    lastWarmupError,
    lastWarmupErrorInstrument,
    isLoading,
    isInteractionLocked,

    // Actions
    initializeInstruments,
    setInstrument,
    isInstrumentReady,
    isInstrumentWarming,
  };
});
