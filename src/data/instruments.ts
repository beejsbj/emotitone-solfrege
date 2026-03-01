/**
 * Instrument Configuration Data
 * Centralized instrument definitions and configurations
 */

import type {
  InstrumentConfig,
  AudioEnvelope,
  CompressorConfig,
} from "@/types/instrument";

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
