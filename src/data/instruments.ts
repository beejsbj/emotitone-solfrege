/**
 * Instrument Data Configuration
 * Static data defining available instruments and their audio properties
 */

import type {
  InstrumentConfig,
  InstrumentCategory,
  AudioEnvelope,
  CompressorConfig,
} from "@/types";

/**
 * Piano-like envelope settings for keyboards
 */
export const PIANO_ENVELOPE: AudioEnvelope = {
  attack: 0.01, // Very quick attack for piano-like feel
  decay: 0.3, // Moderate decay
  sustain: 0.2, // Low sustain level
  release: 1.2, // Longer release for natural decay
};

/**
 * String instruments envelope - slower attack, sustained tone
 */
export const STRING_ENVELOPE: AudioEnvelope = {
  attack: 0.1, // Slower attack as bow contacts string
  decay: 0.2, // Quick initial decay
  sustain: 0.8, // High sustain for bowed instruments
  release: 0.8, // Moderate release
};

/**
 * Brass instruments envelope - moderate attack, sustained tone
 */
export const BRASS_ENVELOPE: AudioEnvelope = {
  attack: 0.05, // Moderate attack as air pressure builds
  decay: 0.15, // Quick decay to sustain level
  sustain: 0.7, // Good sustain for wind instruments
  release: 0.6, // Moderate release
};

/**
 * Woodwind instruments envelope - quick attack, sustained tone
 */
export const WOODWIND_ENVELOPE: AudioEnvelope = {
  attack: 0.02, // Quick attack from reed/embouchure
  decay: 0.1, // Very quick decay
  sustain: 0.85, // Very high sustain for wind instruments
  release: 0.4, // Quick release when breath stops
};

/**
 * Percussion envelope - very quick attack, quick decay
 */
export const PERCUSSION_ENVELOPE: AudioEnvelope = {
  attack: 0.001, // Instant attack for struck instruments
  decay: 0.3, // Quick decay
  sustain: 0.05, // Very low sustain
  release: 0.8, // Natural decay tail
};

/**
 * Plucked string envelope (guitar, harp, etc.)
 */
export const PLUCKED_ENVELOPE: AudioEnvelope = {
  attack: 0.005, // Very quick attack from pluck
  decay: 0.4, // Moderate decay
  sustain: 0.3, // Moderate sustain
  release: 1.5, // Longer release for string resonance
};

/**
 * Organ/sustained keyboard envelope
 */
export const ORGAN_ENVELOPE: AudioEnvelope = {
  attack: 0.02, // Quick attack
  decay: 0.05, // Minimal decay
  sustain: 0.95, // Very high sustain
  release: 0.3, // Quick release when key released
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
    displayName: "Salamander Piano",
    description: "High-quality Salamander piano samples",
    category: "keyboards",
    icon: "🎹",
    minify: false,
  },

  // Sample-based instruments from tonejs-instruments
  "sample-piano": {
    name: "sample-piano",
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
 * Instrument category display names
 */
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  keyboards: "🎹 Keyboards",
  synth: "🎛️ Synthesizers",
  strings: "🎻 Strings",
  brass: "🎺 Brass",
  woodwinds: "🪈 Woodwinds",
  percussion: "🥁 Percussion",
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
 * Synthesizer configurations with instrument-appropriate envelopes
 */
export const SYNTH_CONFIGS = {
  basic: {
    oscillator: { type: "sine" as const },
    envelope: PIANO_ENVELOPE, // Keep piano envelope for basic synth
  },

  amSynth: {
    harmonicity: 2,
    oscillator: { type: "sine" as const },
    envelope: ORGAN_ENVELOPE, // AM synth works well with sustained envelope
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
    envelope: BRASS_ENVELOPE, // FM synth can sound brass-like
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
    envelope: PERCUSSION_ENVELOPE, // Perfect for membrane drums
  },

  metal: {
    envelope: PERCUSSION_ENVELOPE, // Metal synth is percussion
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
    keyboards: [],
    synth: [],
    strings: [],
    brass: [],
    woodwinds: [],
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

/**
 * Get the appropriate envelope for an instrument category
 */
export function getEnvelopeForCategory(category: string): AudioEnvelope {
  switch (category) {
    case "keyboards":
      return PIANO_ENVELOPE;
    case "synth":
      return PIANO_ENVELOPE; // Synths use their own configured envelopes
    case "strings":
      return STRING_ENVELOPE;
    case "brass":
      return BRASS_ENVELOPE;
    case "woodwinds":
      return WOODWIND_ENVELOPE;
    case "percussion":
      return PERCUSSION_ENVELOPE;
    default:
      return PIANO_ENVELOPE; // Fallback
  }
}

/**
 * Get the appropriate envelope for a specific instrument
 * Checks for instrument-specific envelope first, then falls back to category envelope
 */
export function getInstrumentEnvelope(instrumentName: string): AudioEnvelope {
  const config = AVAILABLE_INSTRUMENTS[instrumentName];
  if (!config) {
    return PIANO_ENVELOPE; // Fallback
  }

  // Use instrument-specific envelope if defined
  if (config.envelope) {
    return config.envelope;
  }

  // Handle special cases for stringed instruments
  if (["guitar-acoustic", "guitar-electric", "guitar-nylon", "harp"].indexOf(instrumentName) !== -1) {
    return PLUCKED_ENVELOPE;
  }

  if (["organ", "harmonium"].indexOf(instrumentName) !== -1) {
    return ORGAN_ENVELOPE;
  }

  // Fall back to category envelope
  return getEnvelopeForCategory(config.category);
}
