/**
 * Instrument Configuration Data
 * Instrument selection is now fully dynamic via superdough's soundMap.
 */

export const DEFAULT_INSTRUMENT = "triangle";

export function displayInstrumentName(instrument: string): string {
  return instrument.startsWith("gm_") ? instrument.slice(3) : instrument;
}

export function isSynthSound(instrument: string): boolean {
  const name = instrument.toLowerCase().replace(/^gm_/, "");
  return (
    ["triangle", "sine", "square", "sawtooth", "pulse", "supersaw", "tri", "sin", "sqr", "saw", "synth", "amsynth", "fmsynth"].includes(name) ||
    name.startsWith("lead_") ||
    name.startsWith("pad_") ||
    name.startsWith("synth_")
  );
}
