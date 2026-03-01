import { ref, computed } from "vue";
import { defineStore } from "pinia";
import {
  AVAILABLE_INSTRUMENTS,
  DEFAULT_INSTRUMENT,
  getInstrumentsByCategory,
} from "@/data/instruments";
import { initSuperdoughAudio } from "@/services/superdoughAudio";

/**
 * Instrument Store
 * Manages instrument selection and delegates audio to superdough.
 * No Tone.js instruments are created here — superdough handles all audio.
 */

export const useInstrumentStore = defineStore("instrument", () => {
  // State
  const currentInstrument = ref<string>(DEFAULT_INSTRUMENT);
  const isLoading = ref(false);
  // Kept as empty Map for backward-compat; superdough manages actual audio
  const instruments = ref<Map<string, any>>(new Map());

  // Getters
  const currentInstrumentConfig = computed(
    () => AVAILABLE_INSTRUMENTS[currentInstrument.value]
  );

  const availableInstruments = computed(() =>
    Object.values(AVAILABLE_INSTRUMENTS)
  );

  const instrumentsByCategory = computed(() => getInstrumentsByCategory());

  // Initialize — just boots superdough; no Tone.js instruments to build
  const initializeInstruments = async (
    progressCallback?: (progress: number, message: string) => void
  ) => {
    isLoading.value = true;
    try {
      progressCallback?.(10, "Initializing audio engine...");
      await initSuperdoughAudio();
      progressCallback?.(100, "Audio engine ready");
    } catch (error) {
      console.error("Error initializing superdough:", error);
    } finally {
      isLoading.value = false;
    }
  };

  // Set current instrument
  const setInstrument = (instrumentName: string) => {
    if (AVAILABLE_INSTRUMENTS[instrumentName]) {
      currentInstrument.value = instrumentName;
    }
  };

  return {
    // State
    currentInstrument,
    isLoading,
    instruments,

    // Getters
    currentInstrumentConfig,
    availableInstruments,
    instrumentsByCategory,

    // Actions
    initializeInstruments,
    setInstrument,
  };
});
