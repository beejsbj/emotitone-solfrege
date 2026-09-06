import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { DEFAULT_INSTRUMENT } from "@/data/instruments";
import {
  getReadySounds,
  initSuperdoughAudio,
  isPrewarmed,
  prewarmSoundSamples,
} from "@/services/superdoughAudio";

/**
 * Instrument Store
 * Manages instrument selection and delegates audio to superdough.
 * No Tone.js instruments are created here — superdough handles all audio.
 */

export const useInstrumentStore = defineStore("instrument", () => {
  // State
  const currentInstrument = ref<string>(DEFAULT_INSTRUMENT);
  const lastReadyInstrument = ref<string>(DEFAULT_INSTRUMENT);
  const readyInstruments = ref<Set<string>>(new Set([DEFAULT_INSTRUMENT]));
  const warmingInstrument = ref<string | null>(null);
  const warmupMessage = ref("");
  const lastWarmupError = ref<string | null>(null);
  const lastWarmupErrorInstrument = ref<string | null>(null);
  const isInitializing = ref(false);
  const warmupPromises = new Map<string, Promise<void>>();

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

  const syncReadyInstrumentsFromAudio = () => {
    readyInstruments.value = new Set(getReadySounds());

    if (isPrewarmed(currentInstrument.value)) {
      markInstrumentReady(currentInstrument.value);
      lastReadyInstrument.value = currentInstrument.value;
    }

    if (isPrewarmed(lastReadyInstrument.value)) {
      markInstrumentReady(lastReadyInstrument.value);
    }
  };

  const isInstrumentReady = (instrumentName: string) =>
    readyInstruments.value.has(instrumentName) || isPrewarmed(instrumentName);

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
    } finally {
      isInitializing.value = false;
    }
  };

  // Set current instrument — any registered superdough sound name is valid.
  // Awaits pre-warming for cold instruments so the first keypress is never dropped.
  const setInstrument = async (instrumentName: string) => {
    const previousReadyInstrument = lastReadyInstrument.value;
    currentInstrument.value = instrumentName;
    clearWarmupError();

    if (isInstrumentReady(instrumentName)) {
      markInstrumentReady(instrumentName);
      lastReadyInstrument.value = instrumentName;
      clearWarmupState();
      return;
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

      if (
        currentInstrument.value === instrumentName &&
        warmingInstrument.value === instrumentName
      ) {
        lastReadyInstrument.value = instrumentName;
        clearWarmupState();
      }
    } catch (error) {
      if (
        currentInstrument.value === instrumentName &&
        warmingInstrument.value === instrumentName
      ) {
        currentInstrument.value = previousReadyInstrument;
        lastWarmupError.value =
          error instanceof Error && error.message
            ? error.message
            : "Could not download samples for this instrument.";
        lastWarmupErrorInstrument.value = instrumentName;
        clearWarmupState();
      }
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
