/**
 * TypeScript types for the tonejs-instruments SampleLibrary
 */

import * as Tone from "tone";

/**
 * Sample mapping for an instrument
 */
export interface InstrumentSamples {
  [noteName: string]: string;
}

/**
 * Available instrument names from tonejs-instruments
 */
export type SampleInstrumentName =
  | "bass-electric"
  | "bassoon"
  | "cello"
  | "clarinet"
  | "contrabass"
  | "flute"
  | "french-horn"
  | "guitar-acoustic"
  | "guitar-electric"
  | "guitar-nylon"
  | "harmonium"
  | "harp"
  | "organ"
  | "piano"
  | "saxophone"
  | "trombone"
  | "trumpet"
  | "tuba"
  | "violin"
  | "xylophone";

/**
 * SampleLibrary load options
 */
export interface SampleLibraryLoadOptions {
  /** Instrument(s) to load - can be a single name or array of names */
  instruments?: SampleInstrumentName | SampleInstrumentName[];
  /** Base URL for sample files */
  baseUrl?: string;
  /** File extension for samples */
  ext?: string;
  /** Whether to minify (reduce) the number of samples loaded */
  minify?: boolean;
  /** Callback function called when samples are loaded */
  onload?: () => void;
}

/**
 * Base SampleLibrary interface
 */
export interface SampleLibraryBase {
  /** Whether to minify samples by default */
  minify: boolean;
  /** Default file extension */
  ext: string;
  /** Base URL for samples */
  baseUrl: string;
  /** List of available instruments */
  list: SampleInstrumentName[];
  /** Default onload callback */
  onload: (() => void) | null;

  /**
   * Set file extension for all samples
   */
  setExt(newExt: string): void;

  /**
   * Load instrument(s) and return Tone.Sampler instance(s)
   */
  load(
    options?: SampleLibraryLoadOptions
  ): Tone.Sampler | Record<string, Tone.Sampler>;
}

/**
 * Sample mappings for each instrument
 */
export type SampleLibraryInstruments = {
  [K in SampleInstrumentName]: InstrumentSamples;
};

/**
 * Complete SampleLibrary interface
 */
export interface SampleLibrary
  extends SampleLibraryBase,
    SampleLibraryInstruments {}

/**
 * Extended instrument configuration for sample-based instruments
 */
export interface SampleInstrumentConfig {
  /** Unique instrument identifier */
  name: SampleInstrumentName;
  /** Human-readable display name */
  displayName: string;
  /** Description of the instrument */
  description: string;
  /** Category classification */
  category: "strings" | "brass" | "woodwinds" | "keyboards" | "percussion";
  /** Icon identifier */
  icon: string;
  /** Whether to minify samples for this instrument */
  minify?: boolean;
  /** Custom base URL for this instrument's samples */
  baseUrl?: string;
}

/**
 * Sample instrument categories
 */
export type SampleInstrumentCategory =
  | "strings"
  | "brass"
  | "woodwinds"
  | "keyboards"
  | "percussion";

/**
 * Wrapper interface for sample-based instruments to match PolySynth API
 */
export interface SampleInstrumentWrapper {
  /** Trigger note attack */
  triggerAttack(note: string | number, time?: number, velocity?: number): void;
  /** Trigger note release */
  triggerRelease(note: string | number, time?: number): void;
  /** Trigger attack and release */
  triggerAttackRelease(
    note: string | number,
    duration: string | number,
    time?: number,
    velocity?: number
  ): void;
  /** Release all currently playing notes */
  releaseAll(time?: number): void;
  /** Dispose of the instrument */
  dispose(): void;
  /** Connect to audio destination */
  connect(destination: any): any;
  /** Disconnect from audio destination */
  disconnect(): void;
  /** Check if samples are loaded */
  isLoaded(): boolean;
  /** Constructor name for identification */
  constructor: { name: string };
}
