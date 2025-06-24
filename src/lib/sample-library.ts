/**
 * TypeScript wrapper for tonejs-instruments SampleLibrary
 */

import * as Tone from "tone";
import type {
  SampleLibrary as SampleLibraryType,
  SampleLibraryLoadOptions,
  SampleInstrumentName,
  SampleInstrumentWrapper,
} from "@/types/sample-library";

// Import the JavaScript SampleLibrary
import SampleLibraryJS from "./tonejs-instruments.js";

/**
 * TypeScript-wrapped SampleLibrary with proper typing
 */
export const SampleLibrary: SampleLibraryType = SampleLibraryJS;

/**
 * Create a wrapper for sample-based instruments to match PolySynth API
 */
export function createSampleInstrumentWrapper(
  sampler: Tone.Sampler,
  instrumentName: string
): SampleInstrumentWrapper {
  let isLoaded = false;

  // Track loading state
  Tone.loaded()
    .then(() => {
      isLoaded = true;
      console.log(`${instrumentName} samples loaded successfully`);
    })
    .catch((error) => {
      console.error(`Error loading ${instrumentName} samples:`, error);
    });

  return {
    triggerAttack: (
      note: string | number,
      time?: number,
      velocity?: number
    ) => {
      if (!isLoaded) {
        console.warn(`${instrumentName} samples not loaded yet`);
        return;
      }
      const noteStr =
        typeof note === "number" ? Tone.Frequency(note).toNote() : note;
      sampler.triggerAttack(noteStr, time, velocity);
    },

    triggerRelease: (note: string | number, time?: number) => {
      if (!isLoaded) return;
      const noteStr =
        typeof note === "number" ? Tone.Frequency(note).toNote() : note;
      sampler.triggerRelease(noteStr, time);
    },

    triggerAttackRelease: (
      note: string | number,
      duration: string | number,
      time?: number,
      velocity?: number
    ) => {
      if (!isLoaded) {
        console.warn(`${instrumentName} samples not loaded yet`);
        return;
      }
      const noteStr =
        typeof note === "number" ? Tone.Frequency(note).toNote() : note;
      sampler.triggerAttackRelease(noteStr, duration, time, velocity);
    },

    releaseAll: (time?: number) => {
      if (!isLoaded) return;
      sampler.releaseAll(time);
    },

    dispose: () => {
      sampler.dispose();
    },

    connect: (destination: any) => {
      return sampler.connect(destination);
    },

    disconnect: () => {
      sampler.disconnect();
    },

    isLoaded: () => isLoaded,

    constructor: { name: `${instrumentName}Wrapper` },
  };
}

/**
 * Load a single sample-based instrument with proper typing
 */
export function loadSampleInstrument(
  instrumentName: SampleInstrumentName,
  options?: Omit<SampleLibraryLoadOptions, "instruments">
): Promise<SampleInstrumentWrapper> {
  return new Promise((resolve, reject) => {
    try {
      const sampler = SampleLibrary.load({
        ...options,
        instruments: instrumentName,
        onload: () => {
          console.log(`${instrumentName} loaded successfully`);
        },
      }) as Tone.Sampler;

      const wrapper = createSampleInstrumentWrapper(sampler, instrumentName);
      resolve(wrapper);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Load multiple sample-based instruments
 */
export function loadSampleInstruments(
  instrumentNames: SampleInstrumentName[],
  options?: Omit<SampleLibraryLoadOptions, "instruments">
): Promise<Record<string, SampleInstrumentWrapper>> {
  return new Promise((resolve, reject) => {
    try {
      const samplers = SampleLibrary.load({
        ...options,
        instruments: instrumentNames,
        onload: () => {
          console.log(`Instruments loaded: ${instrumentNames.join(", ")}`);
        },
      }) as Record<string, Tone.Sampler>;

      const wrappers: Record<string, SampleInstrumentWrapper> = {};

      for (const [name, sampler] of Object.entries(samplers)) {
        wrappers[name] = createSampleInstrumentWrapper(sampler, name);
      }

      resolve(wrappers);
    } catch (error) {
      reject(error);
    }
  });
}

/**
 * Get list of available sample instruments
 */
export function getAvailableSampleInstruments(): SampleInstrumentName[] {
  return SampleLibrary.list;
}

/**
 * Check if an instrument name is a valid sample instrument
 */
export function isValidSampleInstrument(
  name: string
): name is SampleInstrumentName {
  return SampleLibrary.list.includes(name as SampleInstrumentName);
}
