import { ref, computed } from "vue";
import { defineStore } from "pinia";
import * as Tone from "tone";
import {
  AVAILABLE_INSTRUMENTS,
  DEFAULT_INSTRUMENT,
  MAX_POLYPHONY,
  PIANO_ENVELOPE,
  STANDARD_COMPRESSOR,
  SYNTH_CONFIGS,
  getInstrumentsByCategory,
  getInstrumentEnvelope,
} from "@/data/instruments";
import type { AudioEnvelope } from "@/types/instrument";
import {
  loadSampleInstrument,
  createSalamanderPiano,
} from "@/lib/sample-library";
import type { SampleInstrumentName } from "@/types/sample-library";
import { toast } from "vue-sonner";

/**
 * Instrument Store
 * Manages multiple Tone.js instruments and provides instrument selection functionality
 */

export const useInstrumentStore = defineStore("instrument", () => {
  // State
  const currentInstrument = ref<string>(DEFAULT_INSTRUMENT);
  const currentEnvelope = ref<string>("default");
  const isLoading = ref(false);
  const instruments = ref<Map<string, any>>(new Map());

  // Getters
  const currentInstrumentConfig = computed(
    () => AVAILABLE_INSTRUMENTS[currentInstrument.value]
  );

  const availableInstruments = computed(() =>
    Object.values(AVAILABLE_INSTRUMENTS).filter(
      (instrument) => !instrument.isDisabled
    )
  );

  const instrumentsByCategory = computed(() => {
    const categories = getInstrumentsByCategory();
    // Filter out disabled instruments from each category
    Object.keys(categories).forEach((category) => {
      categories[category] = categories[category].filter(
        (instrument) => !instrument.isDisabled
      );
    });
    return categories;
  });

  // Envelope getters
  const currentInstrumentEnvelopes = computed(() => {
    const config = currentInstrumentConfig.value;
    return config?.envelopes || [];
  });

  const currentEnvelopeConfig = computed(() => {
    const envelopes = currentInstrumentEnvelopes.value;
    return envelopes.find((env) => env.name === currentEnvelope.value) || null;
  });

  const hasMultipleEnvelopes = computed(() => {
    return currentInstrumentEnvelopes.value.length > 1;
  });

  // Initialize instruments
  const initializeInstruments = async (
    progressCallback?: (progress: number, message: string) => void
  ) => {
    if (instruments.value.size > 0) return; // Already initialized

    isLoading.value = true;
    const reportProgress = (progress: number, message: string) => {
      if (progressCallback) progressCallback(progress, message);
    };

    try {
      // Create compressor for all instruments to prevent clipping
      const createCompressor = () => new Tone.Compressor(STANDARD_COMPRESSOR);

      reportProgress(15, "Loading basic synthesizers...");

      // Basic Synth
      if (!AVAILABLE_INSTRUMENTS.synth.isDisabled) {
        const synthPoly = new Tone.PolySynth(Tone.Synth, SYNTH_CONFIGS.basic);
        const synthCompressor = createCompressor();
        synthPoly.connect(synthCompressor);
        synthCompressor.toDestination();
        synthPoly.maxPolyphony = MAX_POLYPHONY;
        instruments.value.set("synth", synthPoly);
      }

      reportProgress(20, "Loading AM synthesizer...");

      // AM Synth
      if (!AVAILABLE_INSTRUMENTS.amSynth.isDisabled) {
        const amSynthPoly = new Tone.PolySynth(
          Tone.AMSynth,
          SYNTH_CONFIGS.amSynth
        );
        const amCompressor = createCompressor();
        amSynthPoly.connect(amCompressor);
        amCompressor.toDestination();
        amSynthPoly.maxPolyphony = MAX_POLYPHONY;
        instruments.value.set("amSynth", amSynthPoly);
      }

      reportProgress(25, "Loading FM synthesizer...");

      // FM Synth
      if (!AVAILABLE_INSTRUMENTS.fmSynth.isDisabled) {
        const fmSynthPoly = new Tone.PolySynth(
          Tone.FMSynth,
          SYNTH_CONFIGS.fmSynth
        );
        const fmCompressor = createCompressor();
        fmSynthPoly.connect(fmCompressor);
        fmCompressor.toDestination();
        fmSynthPoly.maxPolyphony = MAX_POLYPHONY;
        instruments.value.set("fmSynth", fmSynthPoly);
      }

      reportProgress(30, "Loading membrane synthesizer...");

      // Membrane Synth (for percussion-like sounds)
      if (!AVAILABLE_INSTRUMENTS.membraneSynth.isDisabled) {
        const membranePoly = new Tone.PolySynth(
          Tone.MembraneSynth,
          SYNTH_CONFIGS.membrane
        );
        const membraneCompressor = createCompressor();
        membranePoly.connect(membraneCompressor);
        membraneCompressor.toDestination();
        membranePoly.maxPolyphony = MAX_POLYPHONY;
        instruments.value.set("membraneSynth", membranePoly);
      }

      reportProgress(35, "Loading metal synthesizer...");

      // Metal Synth
      if (!AVAILABLE_INSTRUMENTS.metalSynth.isDisabled) {
        const metalPoly = new Tone.PolySynth(
          Tone.MetalSynth,
          SYNTH_CONFIGS.metal
        );
        const metalCompressor = createCompressor();
        metalPoly.connect(metalCompressor);
        metalCompressor.toDestination();
        metalPoly.maxPolyphony = MAX_POLYPHONY;
        instruments.value.set("metalSynth", metalPoly);
      }

      console.log("Basic instruments initialized");
      reportProgress(
        40,
        "Basic synthesizers ready, loading sample instruments..."
      );

      // Load sample-based instruments (blocking to ensure they're ready)
      await loadSampleInstrumentsWithProgress(createCompressor, reportProgress);

      console.log("All instruments initialized successfully");
    } catch (error) {
      console.error("Error initializing instruments:", error);

      // Ensure we have at least a basic synth available
      if (instruments.value.size === 0) {
        try {
          const fallbackSynth = new Tone.PolySynth(Tone.Synth);
          fallbackSynth.toDestination();
          instruments.value.set("synth", fallbackSynth);
          console.log("Created fallback synth");
        } catch (fallbackError) {
          console.error("Failed to create fallback synth:", fallbackError);
        }
      }
    } finally {
      isLoading.value = false;
    }
  };

  // Load sample instruments with progress tracking
  const loadSampleInstrumentsWithProgress = async (
    createCompressor: () => any,
    reportProgress: (progress: number, message: string) => void
  ) => {
    // Salamander Piano - use the integrated sample library system
    try {
      console.log("Loading Salamander piano...");
      reportProgress(45, "Loading high-quality piano samples...");

      const salamanderPiano = await createSalamanderPiano();

      // Connect to compressor
      const pianoCompressor = createCompressor();
      salamanderPiano.connect(pianoCompressor);
      pianoCompressor.toDestination();

      instruments.value.set("piano", salamanderPiano);
      console.log("Salamander piano loaded successfully");
      reportProgress(55, "Piano loaded, loading orchestral instruments...");
    } catch (error) {
      console.error("Error loading Salamander piano:", error);

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
      console.log("Using fallback synth for piano");
    }

    // Initialize sample-based instruments with progress
    await initializeSampleInstrumentsWithProgress(
      createCompressor,
      reportProgress
    );
  };

  // Initialize sample-based instruments with progress tracking
  const initializeSampleInstrumentsWithProgress = async (
    createCompressor: () => any,
    reportProgress: (progress: number, message: string) => void
  ) => {
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

    // Filter out disabled instruments
    const enabledSampleInstrumentNames = sampleInstrumentNames.filter(
      (name) => {
        const config =
          AVAILABLE_INSTRUMENTS[name] ||
          AVAILABLE_INSTRUMENTS[`sample-${name}`];
        return config && !config.isDisabled;
      }
    );

    let loadedCount = 0;
    const totalInstruments = enabledSampleInstrumentNames.length;
    const startProgress = 55;
    const endProgress = 90;

    // Load instruments with timeout and better error handling
    const loadPromises = enabledSampleInstrumentNames.map(
      async (instrumentName) => {
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
              const progress =
                startProgress +
                ((endProgress - startProgress) * loadedCount) /
                  totalInstruments;
              reportProgress(
                Math.round(progress),
                `Loading ${config.displayName}... (${loadedCount}/${totalInstruments})`
              );
              console.log(`${config.displayName} samples loaded successfully`);
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
          // Use console.warn instead of console.error to reduce noise
          console.warn(
            `Sample instrument ${instrumentName} not available, will use basic synth fallback`
          );
          return { instrumentName, success: false, error };
        }
      }
    );

    // Wait for all instruments to load (or timeout)
    const results = await Promise.allSettled(loadPromises);
    const successfulLoads = results.filter(
      (result) => result.status === "fulfilled" && result.value?.success
    ).length;

    // Report completion
    if (successfulLoads === totalInstruments) {
      reportProgress(
        90,
        `All ${successfulLoads} sample instruments loaded successfully!`
      );
    } else if (successfulLoads > 0) {
      reportProgress(
        90,
        `${successfulLoads} of ${totalInstruments} instruments loaded`
      );
    } else {
      reportProgress(90, "Sample instruments unavailable, using synthesizers");
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
    const config = AVAILABLE_INSTRUMENTS[instrumentName];
    if (config) {
      if (config.isDisabled) {
        console.warn(`Cannot switch to disabled instrument: ${instrumentName}`);
        return;
      }
      currentInstrument.value = instrumentName;
      // Reset envelope to default when switching instruments
      currentEnvelope.value = "default";
      console.log(`Switched to instrument: ${config.displayName}`);
    } else {
      console.warn(`Unknown instrument: ${instrumentName}`);
    }
  };

  // Set current envelope
  const setEnvelope = (envelopeName: string) => {
    const envelopes = currentInstrumentEnvelopes.value;
    if (envelopes.length === 0) {
      // No custom envelopes, use default
      currentEnvelope.value = "default";
    } else if (envelopes.some((env) => env.name === envelopeName)) {
      currentEnvelope.value = envelopeName;
      console.log(`Switched to envelope: ${envelopeName}`);
    } else {
      console.warn(`Unknown envelope: ${envelopeName}`);
    }
  };

  // Get current envelope (either custom or default)
  const getCurrentEnvelope = (): AudioEnvelope => {
    const customEnvelope = currentEnvelopeConfig.value;
    if (customEnvelope) {
      return customEnvelope.envelope;
    }
    // Fall back to default envelope logic
    return getInstrumentEnvelope(currentInstrument.value);
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
    currentEnvelope,
    isLoading,

    // Getters
    currentInstrumentConfig,
    availableInstruments,
    instrumentsByCategory,
    currentInstrumentEnvelopes,
    currentEnvelopeConfig,
    hasMultipleEnvelopes,

    // Actions
    initializeInstruments,
    getCurrentInstrument,
    getInstrument,
    isInstrumentLoaded,
    setInstrument,
    setEnvelope,
    getCurrentEnvelope,
    dispose,
  };
});
