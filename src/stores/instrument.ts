import { ref } from "vue";
import { defineStore } from "pinia";
import { DEFAULT_INSTRUMENT } from "@/data/instruments";
import { initSuperdoughAudio, isPrewarmed, prewarmSoundSamples } from "@/services/superdoughAudio";

/**
 * Instrument Store
 * Manages instrument selection and delegates audio to superdough.
 * No Tone.js instruments are created here — superdough handles all audio.
 */

export const useInstrumentStore = defineStore("instrument", () => {
  // State
  const currentInstrument = ref<string>(DEFAULT_INSTRUMENT);
  const isLoading = ref(false);

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
  // Awaits pre-warming for cold instruments so the first keypress is never dropped.
  const setInstrument = async (instrumentName: string) => {
    currentInstrument.value = instrumentName;
    if (!isPrewarmed(instrumentName)) {
      isLoading.value = true;
      try {
        await prewarmSoundSamples(instrumentName);
      } finally {
        isLoading.value = false;
      }
    }
  };

  return {
    // State
    currentInstrument,
    isLoading,

    // Actions
    initializeInstruments,
    setInstrument,
  };
});
