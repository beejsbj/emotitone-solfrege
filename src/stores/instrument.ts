import { ref, computed } from "vue";
import { defineStore } from "pinia";
import { logger } from "@/utils/logger";
import * as Tone from "tone";
import {
  AVAILABLE_INSTRUMENTS,
  DEFAULT_INSTRUMENT,
  MAX_POLYPHONY,
  PIANO_ENVELOPE,
  STANDARD_COMPRESSOR,
  SYNTH_CONFIGS,
  getInstrumentsByCategory,
} from "@/data/instruments";
import {
  loadSampleInstrument,
  createSalamanderPiano,
} from "@/lib/sample-library";
import type { SampleInstrumentName } from "@/types";
import { toast } from "vue-sonner";
import type { Sampler } from "tone";

/**
 * Instrument Store
 * Manages multiple Tone.js instruments and provides instrument selection functionality
 */

export const useInstrumentStore = defineStore("instrument", () => {
  // State
  const currentInstrument = ref<string>(DEFAULT_INSTRUMENT);
  const isLoading = ref(false);
  const instruments = ref<Map<string, any>>(new Map());

  // Getters
  const currentInstrumentConfig = computed(
    () => AVAILABLE_INSTRUMENTS[currentInstrument.value]
  );

  const availableInstruments = computed(() =>
    Object.values(AVAILABLE_INSTRUMENTS)
  );

  const instrumentsByCategory = computed(() => getInstrumentsByCategory());

  // Initialize instruments
  const initializeInstruments = async () => {
    if (instruments.value.size > 0) return; // Already initialized

    isLoading.value = true;

    try {
      // Create compressor for all instruments to prevent clipping
      const createCompressor = () => new Tone.Compressor(STANDARD_COMPRESSOR);

      // Basic Synth
      const synthPoly = new Tone.PolySynth(Tone.Synth, SYNTH_CONFIGS.basic);
      const synthCompressor = createCompressor();
      synthPoly.connect(synthCompressor);
      synthCompressor.toDestination();
      synthPoly.maxPolyphony = MAX_POLYPHONY;
      instruments.value.set("synth", synthPoly);

      // AM Synth
      const amSynthPoly = new Tone.PolySynth(
        Tone.AMSynth,
        SYNTH_CONFIGS.amSynth
      );
      const amCompressor = createCompressor();
      amSynthPoly.connect(amCompressor);
      amCompressor.toDestination();
      amSynthPoly.maxPolyphony = MAX_POLYPHONY;
      instruments.value.set("amSynth", amSynthPoly);

      // FM Synth
      const fmSynthPoly = new Tone.PolySynth(
        Tone.FMSynth,
        SYNTH_CONFIGS.fmSynth
      );
      const fmCompressor = createCompressor();
      fmSynthPoly.connect(fmCompressor);
      fmCompressor.toDestination();
      fmSynthPoly.maxPolyphony = MAX_POLYPHONY;
      instruments.value.set("fmSynth", fmSynthPoly);

      // Membrane Synth (for percussion-like sounds)
      const membranePoly = new Tone.PolySynth(
        Tone.MembraneSynth,
        SYNTH_CONFIGS.membrane
      );
      const membraneCompressor = createCompressor();
      membranePoly.connect(membraneCompressor);
      membraneCompressor.toDestination();
      membranePoly.maxPolyphony = MAX_POLYPHONY;
      instruments.value.set("membraneSynth", membranePoly);

      // Metal Synth
      const metalPoly = new Tone.PolySynth(
        Tone.MetalSynth,
        SYNTH_CONFIGS.metal
      );
      const metalCompressor = createCompressor();
      metalPoly.connect(metalCompressor);
      metalCompressor.toDestination();
      metalPoly.maxPolyphony = MAX_POLYPHONY;
      instruments.value.set("metalSynth", metalPoly);

      logger.dev("Basic instruments initialized");

      // Load sample-based instruments in background (non-blocking)
      // This prevents the loading from getting stuck
      loadSampleInstrumentsInBackground(createCompressor);

      logger.dev(
        "Instrument initialization completed (samples loading in background)"
      );
    } catch (error) {
      logger.error("Error initializing instruments:", error);

      // Ensure we have at least a basic synth available
      if (instruments.value.size === 0) {
        try {
          const fallbackSynth = new Tone.PolySynth(Tone.Synth);
          fallbackSynth.toDestination();
          instruments.value.set("synth", fallbackSynth);
          logger.dev("Created fallback synth");
        } catch (fallbackError) {
          logger.error("Failed to create fallback synth:", fallbackError);
        }
      }
    } finally {
      isLoading.value = false;
    }
  };

  // Load sample instruments in background to prevent blocking
  const loadSampleInstrumentsInBackground = async (
    createCompressor: () => any
  ) => {
    // Salamander Piano - use the integrated sample library system
    try {
      logger.dev("Loading Salamander piano...");

      // Show loading toast
      const loadingToast = toast.loading("🎹 Loading piano samples...", {
        description: "Using fallback synth until loaded",
        duration: Infinity, // Keep until manually dismissed
      });

      const salamanderPiano = await createSalamanderPiano();

      // Connect to compressor
      const pianoCompressor = createCompressor();
      salamanderPiano.connect(pianoCompressor);
      pianoCompressor.toDestination();

      instruments.value.set("piano", salamanderPiano);

      // Dismiss loading toast and show success
      toast.dismiss(loadingToast);
      toast.success("🎹 Piano samples loaded!", {
        description: "High-quality Salamander piano ready",
      });

      logger.dev("Salamander piano loaded successfully");
    } catch (error) {
      logger.error("Error loading Salamander piano:", error);

      // Show error toast
      toast.error("⚠️ Piano loading failed", {
        description: "Using fallback synthesizer",
      });

      // Fallback to basic synth if Salamander piano fails
      const pianoFallbackSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: PIANO_ENVELOPE,
      });
      pianoFallbackSynth.maxPolyphony = MAX_POLYPHONY;

      const pianoFallbackCompressor = createCompressor();
      pianoFallbackSynth.connect(pianoFallbackCompressor);
      pianoFallbackCompressor.toDestination();

      instruments.value.set("piano", pianoFallbackSynth);
      logger.dev("Using fallback synth for piano");
    }

    // Initialize sample-based instruments
    await initializeSampleInstruments();
  };

  // Initialize sample-based instruments
  const initializeSampleInstruments = async () => {
    const sampleInstrumentNames: SampleInstrumentName[] = [
      "piano",
      "bass-electric",
      "bassoon",
      "cello",
      "clarinet",
      "contrabass",
      "flute",
      "french-horn",
      "guitar-acoustic",
      "guitar-electric",
      "guitar-nylon",
      "harmonium",
      "harp",
      "organ",
      "saxophone",
      "trombone",
      "trumpet",
      "tuba",
      "violin",
      "xylophone",
    ];

    let loadedCount = 0;
    const totalInstruments = sampleInstrumentNames.length;

    // Show initial loading toast for sample instruments
    const sampleLoadingToast = toast.loading(
      `🎼 Loading sample instruments... (0/${totalInstruments})`,
      {
        description: "High-quality instrument samples",
        duration: Infinity,
      }
    );

    // Load instruments with timeout and better error handling
    const loadPromises = sampleInstrumentNames.map(async (instrumentName) => {
      try {
        const config =
          AVAILABLE_INSTRUMENTS[instrumentName] ||
          AVAILABLE_INSTRUMENTS[`sample-${instrumentName}`];
        if (!config) return null;

        // Add timeout to prevent hanging
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error(`Timeout loading ${instrumentName}`)),
            10000
          );
        });

        const loadPromise = loadSampleInstrument(instrumentName, {
          minify: config.minify || false,
          onload: () => {
            loadedCount++;
            // Update loading toast with progress
            toast.loading(
              `🎼 Loading sample instruments... (${loadedCount}/${totalInstruments})`,
              {
                id: sampleLoadingToast,
                description: `Just loaded: ${config.displayName}`,
                duration: Infinity,
              }
            );
            logger.dev(`${config.displayName} samples loaded successfully`);
          },
        });

        const sampleInstrument = (await Promise.race([
          loadPromise,
          timeoutPromise,
        ])) as any;

        // Connect to compressor
        const compressor = new Tone.Compressor(STANDARD_COMPRESSOR);
        sampleInstrument.connect(compressor);
        compressor.toDestination();

        // Store with appropriate key
        const storeKey =
          instrumentName === "piano" ? "sample-piano" : instrumentName;
        instruments.value.set(storeKey, sampleInstrument);

        return { instrumentName, success: true };
      } catch (error) {
        logger.error(
          `Error loading sample instrument ${instrumentName}:`,
          error
        );
        return { instrumentName, success: false, error };
      }
    });

    // Wait for all instruments to load (or timeout)
    const results = await Promise.allSettled(loadPromises);
    const successfulLoads = results.filter(
      (result) => result.status === "fulfilled" && result.value?.success
    ).length;

    // Dismiss loading toast and show completion
    toast.dismiss(sampleLoadingToast);

    if (successfulLoads > 0) {
      toast.success(`🎼 Sample instruments loaded!`, {
        description: `${successfulLoads} instruments ready to play`,
      });
    } else {
      toast.warning(`🎼 Sample instruments partially loaded`, {
        description: `Some instruments may not be available`,
      });
    }
  };

  // Get current instrument instance
  const getCurrentInstrument = (): any => {
    return instruments.value.get(currentInstrument.value) || null;
  };

  // Get any specific instrument by name (without changing global state)
  const getInstrument = (instrumentName: string): any => {
    return instruments.value.get(instrumentName) || null;
  };

  // Check if instrument is loaded
  const isInstrumentLoaded = (instrumentName: string): boolean => {
    return instruments.value.has(instrumentName);
  };

  // Set current instrument
  const setInstrument = (instrumentName: string) => {
    if (AVAILABLE_INSTRUMENTS[instrumentName]) {
      currentInstrument.value = instrumentName;
      logger.dev(
        `Switched to instrument: ${AVAILABLE_INSTRUMENTS[instrumentName].displayName}`
      );
    } else {
      logger.warn(`Unknown instrument: ${instrumentName}`);
    }
  };

  // Dispose all instruments
  const dispose = () => {
    instruments.value.forEach((instrument) => {
      instrument.dispose();
    });
    instruments.value.clear();
  };

  return {
    // State
    currentInstrument,
    isLoading,

    // Getters
    currentInstrumentConfig,
    availableInstruments,
    instrumentsByCategory,

    // Actions
    initializeInstruments,
    getCurrentInstrument,
    getInstrument,
    isInstrumentLoaded,
    setInstrument,
    dispose,
  };
});
