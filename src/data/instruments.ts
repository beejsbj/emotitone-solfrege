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
 * Available instrument configurations — all backed by superdough/Strudel.
 * WebAudio oscillators need no loading; vcsl/piano sounds are pre-loaded
 * via initSuperdoughAudio().
 */
export const AVAILABLE_INSTRUMENTS: Record<string, InstrumentConfig> = {
  // ── WebAudio oscillators (zero load time) ──────────────────────────
  synth: {
    name: "synth",
    displayName: "Triangle",
    description: "Soft triangle wave oscillator",
    category: "synth",
    icon: "△",
  },
  amSynth: {
    name: "amSynth",
    displayName: "Sawtooth",
    description: "Bright sawtooth wave oscillator",
    category: "synth",
    icon: "⋀",
  },
  fmSynth: {
    name: "fmSynth",
    displayName: "Square",
    description: "Hollow square wave oscillator",
    category: "synth",
    icon: "⊓",
  },

  // ── Keyboards (piano.json + vcsl.json) ─────────────────────────────
  piano: {
    name: "piano",
    displayName: "Piano",
    description: "Salamander grand piano samples",
    category: "keyboards",
    icon: "🎹",
  },
  steinway: {
    name: "steinway",
    displayName: "Steinway",
    description: "Steinway concert grand",
    category: "keyboards",
    icon: "🎹",
  },
  kawai: {
    name: "kawai",
    displayName: "Kawai",
    description: "Kawai grand piano",
    category: "keyboards",
    icon: "🎹",
  },
  fmpiano: {
    name: "fmpiano",
    displayName: "FM Piano",
    description: "FM synthesis piano tone",
    category: "keyboards",
    icon: "🎹",
  },
  clavisynth: {
    name: "clavisynth",
    displayName: "Clavi",
    description: "Clavichord-style keyboard",
    category: "keyboards",
    icon: "🎹",
  },

  // ── Mallets (vcsl.json) ─────────────────────────────────────────────
  marimba: {
    name: "marimba",
    displayName: "Marimba",
    description: "Orchestral marimba",
    category: "mallets",
    icon: "🎵",
  },
  vibraphone: {
    name: "vibraphone",
    displayName: "Vibraphone",
    description: "Jazz vibraphone with motor",
    category: "mallets",
    icon: "🎵",
  },
  kalimba: {
    name: "kalimba",
    displayName: "Kalimba",
    description: "African thumb piano",
    category: "mallets",
    icon: "🎵",
  },
  glockenspiel: {
    name: "glockenspiel",
    displayName: "Glockenspiel",
    description: "Orchestral glockenspiel",
    category: "mallets",
    icon: "🔔",
  },
  tubularbells: {
    name: "tubularbells",
    displayName: "Chimes",
    description: "Orchestral tubular bells",
    category: "mallets",
    icon: "🔔",
  },

  // ── Strings (vcsl.json) ─────────────────────────────────────────────
  harp: {
    name: "harp",
    displayName: "Harp",
    description: "Concert pedal harp",
    category: "strings",
    icon: "🪕",
  },
  folkharp: {
    name: "folkharp",
    displayName: "Folk Harp",
    description: "Celtic / folk harp",
    category: "strings",
    icon: "🪕",
  },

  // ── Organs (vcsl.json) ──────────────────────────────────────────────
  organ: {
    name: "organ",
    displayName: "Organ",
    description: "Full organ all stops",
    category: "organs",
    icon: "🎹",
  },
  pipeorgan: {
    name: "pipeorgan",
    displayName: "Pipe Organ",
    description: "Quiet classical pipe organ",
    category: "organs",
    icon: "🎹",
  },

  // ── Winds (vcsl.json) ───────────────────────────────────────────────
  sax: {
    name: "sax",
    displayName: "Saxophone",
    description: "Sustained saxophone",
    category: "winds",
    icon: "🎷",
  },
  recorder: {
    name: "recorder",
    displayName: "Recorder",
    description: "Tenor recorder sustained",
    category: "winds",
    icon: "🪈",
  },
  ocarina: {
    name: "ocarina",
    displayName: "Ocarina",
    description: "Clay ocarina",
    category: "winds",
    icon: "🪈",
  },
  harmonica: {
    name: "harmonica",
    displayName: "Harmonica",
    description: "Diatonic harmonica",
    category: "winds",
    icon: "🎵",
  },
};

/**
 * Instrument category display names
 */
export const CATEGORY_DISPLAY_NAMES: Record<string, string> = {
  synth: "Synthesizers",
  keyboards: "Keyboards",
  mallets: "Mallets",
  strings: "Strings",
  organs: "Organs",
  winds: "Winds",
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
    synth: [],
    keyboards: [],
    mallets: [],
    strings: [],
    organs: [],
    winds: [],
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
