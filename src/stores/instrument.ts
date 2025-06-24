import { ref, computed } from "vue";
import { defineStore } from "pinia";
import * as Tone from "tone";
import {
  AVAILABLE_INSTRUMENTS,
  DEFAULT_INSTRUMENT,
  MAX_POLYPHONY,
  PIANO_ENVELOPE,
  STANDARD_COMPRESSOR,
  PIANO_SAMPLER_CONFIG,
  SYNTH_CONFIGS,
  SAMPLE_INSTRUMENT_CONFIGS,
  getInstrumentsByCategory,
} from "@/data/instruments";
import { loadSampleInstrument } from "@/lib/sample-library";
import type { SampleInstrumentName } from "@/types/sample-library";

/**
 * Instrument Store
 * Manages multiple Tone.js instruments and provides instrument selection functionality
 */

export const useInstrumentStore = defineStore("instrument", () => {
  // State
  const currentInstrument = ref<string>(DEFAULT_INSTRUMENT);
  const isLoading = ref(false);
  const pianoLoading = ref(true);
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

      // Piano Sampler - create a wrapper to match PolySynth API
      const pianoSampler = new Tone.Sampler(PIANO_SAMPLER_CONFIG);

      // Create a fallback synth for when piano isn't loaded
      const pianoFallbackSynth = new Tone.PolySynth(Tone.Synth, {
        oscillator: { type: "triangle" },
        envelope: PIANO_ENVELOPE,
      });
      pianoFallbackSynth.maxPolyphony = MAX_POLYPHONY;

      // Track loading state
      let pianoLoaded = false;

      // Wait for piano samples to load
      Tone.loaded()
        .then(() => {
          pianoLoaded = true;
          pianoLoading.value = false;
          console.log("Piano samples loaded successfully");
        })
        .catch((error) => {
          console.error("Error loading piano samples:", error);
          console.log("Piano will use fallback synth");
          pianoLoading.value = false;
        });

      // Create a wrapper object that matches PolySynth API
      const pianoWrapper = {
        triggerAttack: (
          note: string | number,
          time?: number,
          velocity?: number
        ) => {
          if (!pianoLoaded) {
            console.log("Piano samples not loaded yet, using fallback synth");
            pianoFallbackSynth.triggerAttack(note, time, velocity);
            return;
          }
          const noteStr =
            typeof note === "number" ? Tone.Frequency(note).toNote() : note;
          pianoSampler.triggerAttack(noteStr, time, velocity);
        },
        triggerRelease: (note: string | number, time?: number) => {
          if (!pianoLoaded) {
            pianoFallbackSynth.triggerRelease(note, time);
            return;
          }
          const noteStr =
            typeof note === "number" ? Tone.Frequency(note).toNote() : note;
          pianoSampler.triggerRelease(noteStr, time);
        },
        triggerAttackRelease: (
          note: string | number,
          duration: string | number,
          time?: number,
          velocity?: number
        ) => {
          if (!pianoLoaded) {
            console.log("Piano samples not loaded yet, using fallback synth");
            pianoFallbackSynth.triggerAttackRelease(
              note,
              duration,
              time,
              velocity
            );
            return;
          }
          const noteStr =
            typeof note === "number" ? Tone.Frequency(note).toNote() : note;
          pianoSampler.triggerAttackRelease(noteStr, duration, time, velocity);
        },
        releaseAll: (time?: number) => {
          if (!pianoLoaded) {
            pianoFallbackSynth.releaseAll(time);
            return;
          }
          pianoSampler.releaseAll(time);
        },
        dispose: () => {
          pianoSampler.dispose();
        },
        connect: (destination: any) => {
          return pianoSampler.connect(destination);
        },
        disconnect: () => {
          pianoSampler.disconnect();
        },
        isLoaded: () => pianoLoaded,
        constructor: { name: "PianoWrapper" },
      };

      const pianoCompressor = createCompressor();
      pianoSampler.connect(pianoCompressor);
      pianoCompressor.toDestination();

      // Also connect the fallback synth to the same compressor
      const pianoFallbackCompressor = createCompressor();
      pianoFallbackSynth.connect(pianoFallbackCompressor);
      pianoFallbackCompressor.toDestination();

      instruments.value.set("piano", pianoWrapper);

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
      "guitar-acoustic",
      "guitar-electric",
      "violin",
      "cello",
      "flute",
      "trumpet",
      "saxophone",
      "organ",
      "harp",
    ];

    for (const instrumentName of sampleInstrumentNames) {
      try {
        const config =
          SAMPLE_INSTRUMENT_CONFIGS[instrumentName] ||
          SAMPLE_INSTRUMENT_CONFIGS[`sample-${instrumentName}`];
        if (!config) continue;

        console.log(`Loading sample instrument: ${instrumentName}`);

        const sampleInstrument = await loadSampleInstrument(instrumentName, {
          minify: config.minify,
          onload: () => {
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
      }
    }
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
    pianoLoading,

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
