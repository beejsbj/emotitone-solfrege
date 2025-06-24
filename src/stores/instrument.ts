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
} from "@/data/instruments";
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

      // Salamander Piano - use the integrated sample library system
      try {
        console.log("Loading Salamander piano...");

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

        console.log("Salamander piano loaded successfully");
      } catch (error) {
        console.error("Error loading Salamander piano:", error);

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
        console.log("Using fallback synth for piano");
      }

      // Initialize sample-based instruments
      await initializeSampleInstruments();

      console.log("All instruments initialized successfully");
    } catch (error) {
      console.error("Error initializing instruments:", error);
    } finally {
      isLoading.value = false;
    }
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

    for (const instrumentName of sampleInstrumentNames) {
      try {
        const config =
          AVAILABLE_INSTRUMENTS[instrumentName] ||
          AVAILABLE_INSTRUMENTS[`sample-${instrumentName}`];
        if (!config) continue;

        const sampleInstrument = await loadSampleInstrument(instrumentName, {
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
            console.log(`${config.displayName} samples loaded successfully`);
          },
        });

        // Connect to compressor
        const compressor = new Tone.Compressor(STANDARD_COMPRESSOR);
        sampleInstrument.connect(compressor);
        compressor.toDestination();

        // Store with appropriate key
        const storeKey =
          instrumentName === "piano" ? "sample-piano" : instrumentName;
        instruments.value.set(storeKey, sampleInstrument);
      } catch (error) {
        console.error(
          `Error loading sample instrument ${instrumentName}:`,
          error
        );
        // Don't show error toast for sample instruments to avoid spam
      }
    }

    // Dismiss loading toast and show completion
    toast.dismiss(sampleLoadingToast);
    toast.success(`🎼 Sample instruments loaded!`, {
      description: `${loadedCount} instruments ready to play`,
    });
  };

  // Get current instrument instance
  const getCurrentInstrument = (): any => {
    return instruments.value.get(currentInstrument.value) || null;
  };

  // Set current instrument
  const setInstrument = (instrumentName: string) => {
    if (AVAILABLE_INSTRUMENTS[instrumentName]) {
      currentInstrument.value = instrumentName;
      console.log(
        `Switched to instrument: ${AVAILABLE_INSTRUMENTS[instrumentName].displayName}`
      );
    } else {
      console.warn(`Unknown instrument: ${instrumentName}`);
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
    setInstrument,
    dispose,
  };
});
