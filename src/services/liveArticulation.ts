export interface LiveArticulation {
  attack: number;
  decay: number;
  sustain: number;
  release: number;
}

const PERCUSSIVE: LiveArticulation = { attack: 0.001, decay: 0.001, sustain: 1, release: 0.2 };
const OSCILLATOR: LiveArticulation = { attack: 0.003, decay: 0.001, sustain: 1, release: 0.12 };
const SUSTAINED: LiveArticulation = { attack: 0.01, decay: 0.001, sustain: 1, release: 0.4 };
const DEFAULT: LiveArticulation = { attack: 0.01, decay: 0.001, sustain: 1, release: 1.5 };

/** Shared defaults for live keyboard and recorded-note playback envelopes.
 * Samples retain their recorded onset. This small gain ramp avoids adding a
 * blanket soft attack to percussive instruments without introducing a hard step.
 */
export function getLiveArticulation(instrument: string): Readonly<LiveArticulation> {
  const name = instrument.toLowerCase().replace(/^gm_/, "");
  if (name === "piano" || /^(epiano[12]|acoustic_grand_piano|bright_acoustic_piano|electric_grand_piano|honkytonk_piano|electric_piano_[12]|harpsichord|clavinet|celesta|glockenspiel|music_box|vibraphone|marimba|xylophone|tubular_bells|dulcimer)$/.test(name)) {
    return PERCUSSIVE;
  }
  // The store also calls this before the audio wrapper resolves legacy names.
  if (["sine", "triangle", "square", "sawtooth", "buzz", "supersaw", "synth", "amsynth", "fmsynth", "membranesynth", "metalsynth"].includes(name)) return OSCILLATOR;
  if (["organ", "pipeorgan", "recorder", "drawbar_organ", "percussive_organ", "rock_organ", "church_organ", "reed_organ"].includes(name)) return SUSTAINED;
  if (/^(organ_|pipeorgan_|recorder_|violin|viola|cello|contrabass|flute|oboe|clarinet|bassoon|pad_)/.test(name)) return SUSTAINED;
  return DEFAULT;
}
