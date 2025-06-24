/**
 * Instrument Configuration Data
 * Centralized instrument definitions and configurations
 */

import type {
  InstrumentConfig,
  AudioEnvelope,
  CompressorConfig,
} from "@/types/instrument";
import type { SampleInstrumentConfig } from "@/types/sample-library";

/**
 * Piano-like envelope settings for consistent feel across instruments
 */
export const PIANO_ENVELOPE: AudioEnvelope = {
  attack: 0.01, // Very quick attack for piano-like feel
  decay: 0.3, // Moderate decay
  sustain: 0.2, // Low sustain level
  release: 1.2, // Longer release for natural decay
};

/**
 * Standard compressor configuration to prevent audio artifacts
 */
export const STANDARD_COMPRESSOR: CompressorConfig = {
  threshold: -20,
  ratio: 8,
  attack: 0.003,
  release: 0.1,
};

/**
 * Available instrument configurations
 */
export const AVAILABLE_INSTRUMENTS: Record<string, InstrumentConfig> = {
  synth: {
    name: "synth",
    displayName: "Basic Synth",
    description: "Clean sine wave synthesizer",
    category: "synth",
    icon: "🎛️",
  },
  amSynth: {
    name: "amSynth",
    displayName: "AM Synth",
    description: "Amplitude modulation synthesizer",
    category: "synth",
    icon: "📻",
  },
  fmSynth: {
    name: "fmSynth",
    displayName: "FM Synth",
    description: "Frequency modulation synthesizer",
    category: "synth",
    icon: "🔊",
  },
  membraneSynth: {
    name: "membraneSynth",
    displayName: "Membrane",
    description: "Drum-like membrane synthesizer",
    category: "percussion",
    icon: "🥁",
  },
  metalSynth: {
    name: "metalSynth",
    displayName: "Metal",
    description: "Metallic percussion synthesizer",
    category: "percussion",
    icon: "🔔",
  },
  piano: {
    name: "piano",
    displayName: "Piano",
    description: "Sampled acoustic piano",
    category: "sampler",
    icon: "🎹",
  },

  // Sample-based instruments from tonejs-instruments
  "sample-piano": {
    name: "sample-piano",
    displayName: "Grand Piano",
    description: "High-quality sampled grand piano",
    category: "sampler",
    icon: "🎹",
  },
  "bass-electric": {
    name: "bass-electric",
    displayName: "Electric Bass",
    description: "Sampled electric bass guitar",
    category: "sampler",
    icon: "🎸",
  },
  bassoon: {
    name: "bassoon",
    displayName: "Bassoon",
    description: "Sampled bassoon",
    category: "sampler",
    icon: "🪈",
  },
  cello: {
    name: "cello",
    displayName: "Cello",
    description: "Sampled cello",
    category: "sampler",
    icon: "🎻",
  },
  clarinet: {
    name: "clarinet",
    displayName: "Clarinet",
    description: "Sampled clarinet",
    category: "sampler",
    icon: "🪈",
  },
  contrabass: {
    name: "contrabass",
    displayName: "Contrabass",
    description: "Sampled double bass",
    category: "sampler",
    icon: "🎻",
  },
  flute: {
    name: "flute",
    displayName: "Flute",
    description: "Sampled flute",
    category: "sampler",
    icon: "🪈",
  },
  "french-horn": {
    name: "french-horn",
    displayName: "French Horn",
    description: "Sampled french horn",
    category: "sampler",
    icon: "🎺",
  },
  "guitar-acoustic": {
    name: "guitar-acoustic",
    displayName: "Acoustic Guitar",
    description: "Sampled acoustic guitar",
    category: "sampler",
    icon: "🎸",
  },
  "guitar-electric": {
    name: "guitar-electric",
    displayName: "Electric Guitar",
    description: "Sampled electric guitar",
    category: "sampler",
    icon: "🎸",
  },
  "guitar-nylon": {
    name: "guitar-nylon",
    displayName: "Nylon Guitar",
    description: "Sampled nylon string guitar",
    category: "sampler",
    icon: "🎸",
  },
  harmonium: {
    name: "harmonium",
    displayName: "Harmonium",
    description: "Sampled harmonium",
    category: "sampler",
    icon: "🎹",
  },
  harp: {
    name: "harp",
    displayName: "Harp",
    description: "Sampled harp",
    category: "sampler",
    icon: "🪕",
  },
  organ: {
    name: "organ",
    displayName: "Organ",
    description: "Sampled organ",
    category: "sampler",
    icon: "🎹",
  },
  saxophone: {
    name: "saxophone",
    displayName: "Saxophone",
    description: "Sampled saxophone",
    category: "sampler",
    icon: "🎷",
  },
  trombone: {
    name: "trombone",
    displayName: "Trombone",
    description: "Sampled trombone",
    category: "sampler",
    icon: "🎺",
  },
  trumpet: {
    name: "trumpet",
    displayName: "Trumpet",
    description: "Sampled trumpet",
    category: "sampler",
    icon: "🎺",
  },
  tuba: {
    name: "tuba",
    displayName: "Tuba",
    description: "Sampled tuba",
    category: "sampler",
    icon: "🎺",
  },
  violin: {
    name: "violin",
    displayName: "Violin",
    description: "Sampled violin",
    category: "sampler",
    icon: "🎻",
  },
  xylophone: {
    name: "xylophone",
    displayName: "Xylophone",
    description: "Sampled xylophone",
    category: "sampler",
    icon: "🎵",
  },
};

/**
 * Instrument category display names
 */
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  synth: "Synthesizers",
  sampler: "Sampled Instruments",
  percussion: "Percussion",
};

/**
 * Default instrument name
 */
export const DEFAULT_INSTRUMENT = "piano";

/**
 * Maximum polyphony for instruments
 */
export const MAX_POLYPHONY = 12;

/**
 * Sample-based instrument configurations
 */
export const SAMPLE_INSTRUMENT_CONFIGS: Record<string, SampleInstrumentConfig> =
  {
    "sample-piano": {
      name: "piano",
      displayName: "Grand Piano",
      description: "High-quality sampled grand piano",
      category: "keyboards",
      icon: "🎹",
      minify: false,
    },
    "bass-electric": {
      name: "bass-electric",
      displayName: "Electric Bass",
      description: "Sampled electric bass guitar",
      category: "strings",
      icon: "🎸",
      minify: true,
    },
    bassoon: {
      name: "bassoon",
      displayName: "Bassoon",
      description: "Sampled bassoon",
      category: "woodwinds",
      icon: "🪈",
      minify: true,
    },
    cello: {
      name: "cello",
      displayName: "Cello",
      description: "Sampled cello",
      category: "strings",
      icon: "🎻",
      minify: false,
    },
    clarinet: {
      name: "clarinet",
      displayName: "Clarinet",
      description: "Sampled clarinet",
      category: "woodwinds",
      icon: "🪈",
      minify: true,
    },
    contrabass: {
      name: "contrabass",
      displayName: "Contrabass",
      description: "Sampled double bass",
      category: "strings",
      icon: "🎻",
      minify: true,
    },
    flute: {
      name: "flute",
      displayName: "Flute",
      description: "Sampled flute",
      category: "woodwinds",
      icon: "🪈",
      minify: true,
    },
    "french-horn": {
      name: "french-horn",
      displayName: "French Horn",
      description: "Sampled french horn",
      category: "brass",
      icon: "🎺",
      minify: true,
    },
    "guitar-acoustic": {
      name: "guitar-acoustic",
      displayName: "Acoustic Guitar",
      description: "Sampled acoustic guitar",
      category: "strings",
      icon: "🎸",
      minify: true,
    },
    "guitar-electric": {
      name: "guitar-electric",
      displayName: "Electric Guitar",
      description: "Sampled electric guitar",
      category: "strings",
      icon: "🎸",
      minify: true,
    },
    "guitar-nylon": {
      name: "guitar-nylon",
      displayName: "Nylon Guitar",
      description: "Sampled nylon string guitar",
      category: "strings",
      icon: "🎸",
      minify: true,
    },
    harmonium: {
      name: "harmonium",
      displayName: "Harmonium",
      description: "Sampled harmonium",
      category: "keyboards",
      icon: "🎹",
      minify: false,
    },
    harp: {
      name: "harp",
      displayName: "Harp",
      description: "Sampled harp",
      category: "strings",
      icon: "🪕",
      minify: true,
    },
    organ: {
      name: "organ",
      displayName: "Organ",
      description: "Sampled organ",
      category: "keyboards",
      icon: "🎹",
      minify: false,
    },
    saxophone: {
      name: "saxophone",
      displayName: "Saxophone",
      description: "Sampled saxophone",
      category: "woodwinds",
      icon: "🎷",
      minify: false,
    },
    trombone: {
      name: "trombone",
      displayName: "Trombone",
      description: "Sampled trombone",
      category: "brass",
      icon: "🎺",
      minify: true,
    },
    trumpet: {
      name: "trumpet",
      displayName: "Trumpet",
      description: "Sampled trumpet",
      category: "brass",
      icon: "🎺",
      minify: true,
    },
    tuba: {
      name: "tuba",
      displayName: "Tuba",
      description: "Sampled tuba",
      category: "brass",
      icon: "🎺",
      minify: true,
    },
    violin: {
      name: "violin",
      displayName: "Violin",
      description: "Sampled violin",
      category: "strings",
      icon: "🎻",
      minify: true,
    },
    xylophone: {
      name: "xylophone",
      displayName: "Xylophone",
      description: "Sampled xylophone",
      category: "percussion",
      icon: "🎵",
      minify: true,
    },
  };

/**
 * Piano sampler configuration
 */
export const PIANO_SAMPLER_CONFIG = {
  urls: {
    A0: "A0.mp3",
    C1: "C1.mp3",
    "D#1": "Ds1.mp3",
    "F#1": "Fs1.mp3",
    A1: "A1.mp3",
    C2: "C2.mp3",
    "D#2": "Ds2.mp3",
    "F#2": "Fs2.mp3",
    A2: "A2.mp3",
    C3: "C3.mp3",
    "D#3": "Ds3.mp3",
    "F#3": "Fs3.mp3",
    A3: "A3.mp3",
    C4: "C4.mp3",
    "D#4": "Ds4.mp3",
    "F#4": "Fs4.mp3",
    A4: "A4.mp3",
    C5: "C5.mp3",
    "D#5": "Ds5.mp3",
    "F#5": "Fs5.mp3",
    A5: "A5.mp3",
    C6: "C6.mp3",
    "D#6": "Ds6.mp3",
    "F#6": "Fs6.mp3",
    A6: "A6.mp3",
    C7: "C7.mp3",
    "D#7": "Ds7.mp3",
    "F#7": "Fs7.mp3",
    A7: "A7.mp3",
  },
  release: 1,
  baseUrl: "https://tonejs.github.io/audio/salamander/",
};

/**
 * Synthesizer configurations
 */
export const SYNTH_CONFIGS = {
  basic: {
    oscillator: { type: "sine" as const },
    envelope: PIANO_ENVELOPE,
  },

  amSynth: {
    harmonicity: 2,
    oscillator: { type: "sine" as const },
    envelope: PIANO_ENVELOPE,
    modulation: { type: "sine" as const },
    modulationEnvelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.1,
      release: 0.8,
    },
  },

  fmSynth: {
    harmonicity: 1.5,
    modulationIndex: 10,
    oscillator: { type: "sine" as const },
    envelope: PIANO_ENVELOPE,
    modulation: { type: "sine" as const },
    modulationEnvelope: {
      attack: 0.01,
      decay: 0.2,
      sustain: 0.1,
      release: 0.8,
    },
  },

  membrane: {
    pitchDecay: 0.05,
    octaves: 2,
    oscillator: { type: "sine" as const },
    envelope: {
      attack: 0.001,
      decay: 0.4,
      sustain: 0.01,
      release: 1.4,
    },
  },

  metal: {
    envelope: {
      attack: 0.001,
      decay: 0.1,
      release: 0.8,
    },
    harmonicity: 5.1,
    modulationIndex: 32,
    resonance: 4000,
    octaves: 1.5,
  },
};

/**
 * Get instrument configuration by name
 */
export function getInstrumentConfig(
  name: string
): InstrumentConfig | undefined {
  return AVAILABLE_INSTRUMENTS[name];
}

/**
 * Get instruments by category
 */
export function getInstrumentsByCategory(): Record<string, InstrumentConfig[]> {
  const categories: Record<string, InstrumentConfig[]> = {
    synth: [],
    sampler: [],
    percussion: [],
  };

  Object.values(AVAILABLE_INSTRUMENTS).forEach((instrument) => {
    categories[instrument.category].push(instrument);
  });

  return categories;
}

/**
 * Get all available instrument names
 */
export function getAvailableInstrumentNames(): string[] {
  return Object.keys(AVAILABLE_INSTRUMENTS);
}

/**
 * Check if instrument name is valid
 */
export function isValidInstrument(name: string): boolean {
  return name in AVAILABLE_INSTRUMENTS;
}
