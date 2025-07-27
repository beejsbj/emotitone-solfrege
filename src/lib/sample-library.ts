/**
 * TypeScript wrapper for tonejs-instruments SampleLibrary
 */

import * as Tone from "tone";
import type { ToneAudioNode } from "tone";
import type {
  SampleLibrary as SampleLibraryType,
  SampleLibraryLoadOptions,
  SampleInstrumentName,
  SampleInstrumentWrapper,
} from "@/types/sample-library";
import { PIANO_SAMPLER_CONFIG } from "@/data/instruments";
import { toast } from "vue-sonner";

// Import the JavaScript SampleLibrary
// @ts-expect-error - JS module without types
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
  // Check if already loaded
  let isLoaded = sampler.loaded;

  // If not loaded, wait for it
  if (!isLoaded) {
    sampler.context.decodeAudioData = sampler.context.decodeAudioData.bind(sampler.context);
  }

  return {
    triggerAttack: (
      note: string | number,
      time?: number,
      velocity?: number
    ) => {
      const noteStr =
        typeof note === "number" ? Tone.Frequency(note).toNote() : note;
      sampler.triggerAttack(noteStr, time, velocity);
    },

    triggerRelease: (note: string | number, time?: number) => {
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
      const noteStr =
        typeof note === "number" ? Tone.Frequency(note).toNote() : note;
      sampler.triggerAttackRelease(noteStr, duration, time, velocity);
    },

    releaseAll: (time?: number) => {
      sampler.releaseAll(time);
    },

    dispose: () => {
      sampler.dispose();
    },

    connect: (destination: ToneAudioNode): ToneAudioNode => {
      return sampler.connect(destination);
    },

    disconnect: () => {
      sampler.disconnect();
    },

    isLoaded: () => sampler.loaded,

    constructor: { name: instrumentName },
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
      let isResolved = false;

      const sampler = SampleLibrary.load({
        ...options,
        instruments: instrumentName,
        onload: () => {
          if (!isResolved) {
            isResolved = true;
            const wrapper = createSampleInstrumentWrapper(
              sampler,
              instrumentName
            );
            resolve(wrapper);

            // Call the original onload if provided
            if (options?.onload) {
              options.onload();
            }
          }
        },
      }) as Tone.Sampler;

      // Set a timeout to reject if loading takes too long
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          reject(new Error(`Timeout loading ${instrumentName} after 30 seconds`));
        }
      }, 30000);

      // Clear timeout when resolved
      const originalOnload = options?.onload;
      if (options) {
        options.onload = () => {
          clearTimeout(timeoutId);
          if (originalOnload) originalOnload();
        };
      }
    } catch (error) {
      console.error(
        `Error loading sample instrument ${instrumentName}:`,
        error
      );
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
      let isResolved = false;

      const pianoSampler = new Tone.Sampler({
        ...PIANO_SAMPLER_CONFIG,
        onload: () => {
          if (!isResolved) {
            isResolved = true;
            const wrapper = createSampleInstrumentWrapper(
              pianoSampler,
              "salamander-piano"
            );
            resolve(wrapper);
          }
        },
        onerror: (error) => {
          if (!isResolved) {
            isResolved = true;
            console.error("Piano sampler error:", error);
            reject(new Error("Failed to load piano samples"));
          }
        },
      });

      // Add timeout for piano loading
      const timeoutId = setTimeout(() => {
        if (!isResolved) {
          isResolved = true;
          // Check if samples are loaded
          if (pianoSampler.loaded) {
            const wrapper = createSampleInstrumentWrapper(
              pianoSampler,
              "salamander-piano"
            );
            resolve(wrapper);
          } else {
            reject(new Error("Piano samples failed to load within timeout"));
          }
        }
      }, 30000); // 30 second timeout for piano

      // Store original onload to clear timeout
      const originalOnload = PIANO_SAMPLER_CONFIG.onload;
      PIANO_SAMPLER_CONFIG.onload = () => {
        clearTimeout(timeoutId);
        if (originalOnload) originalOnload();
        if (!isResolved) {
          isResolved = true;
          const wrapper = createSampleInstrumentWrapper(
            pianoSampler,
            "salamander-piano"
          );
          resolve(wrapper);
        }
      };
    } catch (error) {
      console.error("Error loading Salamander piano:", error);
      reject(error);
    }
  });
}
