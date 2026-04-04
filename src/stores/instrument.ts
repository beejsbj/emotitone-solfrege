import { computed, ref } from "vue";
import { defineStore } from "pinia";
import { DEFAULT_INSTRUMENT } from "@/data/instruments";
import { initSuperdoughAudio, isPrewarmed, prewarmSoundSamples } from "@/services/superdoughAudio";
import type { InstrumentStatus } from "@/types/instrument";

/**
 * Instrument Store
 * Manages instrument selection and delegates audio to superdough.
 * No Tone.js instruments are created here — superdough handles all audio.
 */

export const useInstrumentStore = defineStore("instrument", () => {
  // State
  const currentInstrument = ref<string>(DEFAULT_INSTRUMENT);
  const readyInstrument = ref<string>(DEFAULT_INSTRUMENT);
  const warmingInstrument = ref<string | null>(null);
  const instrumentStatus = ref<InstrumentStatus>("ready");
  const isWarmingInstrument = computed(() => instrumentStatus.value === "warming");
  const isLoading = ref(false);
  let requestToken = 0;

  // Initialize — boots superdough and reports granular sample-pack progress
  // through the optional callback so loading screens can show real steps.
  const initializeInstruments = async (
    progressCallback?: (progress: number, message: string) => void
  ) => {
    isLoading.value = true;
    try {
      await initSuperdoughAudio(progressCallback);
      // Guarantee a 100% call even when already initialized (early return path)
      progressCallback?.(100, "Audio engine ready");
    } catch (error) {
      console.error("Error initializing superdough:", error);
    } finally {
      isLoading.value = false;
    }
  };

  // Set current instrument — any registered superdough sound name is valid.
  // Selected state changes immediately, but ready/playable state only changes
  // once the latest warmup request completes.
  const setInstrument = async (instrumentName: string) => {
    currentInstrument.value = instrumentName;

    const nextRequestToken = ++requestToken;
    if (isPrewarmed(instrumentName)) {
      readyInstrument.value = instrumentName;
      warmingInstrument.value = null;
      instrumentStatus.value = "ready";
      isLoading.value = false;
      return;
    }

    warmingInstrument.value = instrumentName;
    instrumentStatus.value = "warming";
    isLoading.value = true;

    await prewarmSoundSamples(instrumentName);

    if (nextRequestToken !== requestToken) {
      return;
    }

    readyInstrument.value = instrumentName;
    warmingInstrument.value = null;
    instrumentStatus.value = "ready";
    isLoading.value = false;
  };

  return {
    // State
    currentInstrument,
    readyInstrument,
    warmingInstrument,
    isWarmingInstrument,
    instrumentStatus,
    isLoading,

    // Actions
    initializeInstruments,
    setInstrument,
  };
});
