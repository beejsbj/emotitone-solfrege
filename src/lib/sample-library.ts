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
import { PIANO_SAMPLER_CONFIG } from "@/data/instruments";
import { toast } from "vue-sonner";

// Import the JavaScript SampleLibrary
import SampleLibraryJS from "./tonejs-instruments";

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
    })
    .catch((error) => {
      console.error(`Error loading ${instrumentName} samples:`, error);
      toast.error(`Failed to load ${instrumentName}`, {
        description: "Sample loading error",
      });
    });

  return {
    triggerAttack: (
      note: string | number,
      time?: number,
      velocity?: number
    ) => {
      if (!isLoaded) {
        toast.warning(`${instrumentName} not ready`, {
          description: "Samples still loading...",
        });
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
        toast.warning(`${instrumentName} not ready`, {
          description: "Samples still loading...",
        });
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
        onload: () => {},
      }) as Tone.Sampler;

      const wrapper = createSampleInstrumentWrapper(sampler, instrumentName);
      resolve(wrapper);
    } catch (error) {
      console.error(
        `Error loading sample instrument ${instrumentName}:`,
        error
      );
      toast.error(`Failed to load ${instrumentName}`, {
        description: "Sample loading error",
      });
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
          toast.success(`All instruments loaded!`, {
            description: "Sample instruments ready",
          });
        },
      }) as Record<string, Tone.Sampler>;

      const wrappers: Record<string, SampleInstrumentWrapper> = {};

      for (const [name, sampler] of Object.entries(samplers)) {
        wrappers[name] = createSampleInstrumentWrapper(sampler, name);
      }

      resolve(wrappers);
    } catch (error) {
      console.error(`Error loading sample instruments:`, error);
      toast.error("Failed to load sample instruments", {
        description: "Multiple instrument loading error",
      });
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

/**
 * Create a Salamander piano sampler using the high-quality samples
 * This integrates the Salamander piano samples into the sample library system
 */
export function createSalamanderPiano(): Promise<SampleInstrumentWrapper> {
  return new Promise((resolve, reject) => {
    try {
      const pianoSampler = new Tone.Sampler({
        ...PIANO_SAMPLER_CONFIG,
        onload: () => {},
      });

      const wrapper = createSampleInstrumentWrapper(
        pianoSampler,
        "salamander-piano"
      );
      resolve(wrapper);
    } catch (error) {
      console.error("Error loading Salamander piano:", error);
      toast.error("🎹 Salamander piano loading failed", {
        description: "High-quality piano samples unavailable",
      });
      reject(error);
    }
  });
}
