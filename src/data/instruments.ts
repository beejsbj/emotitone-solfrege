/**
 * Instrument Configuration Data
 * The selectable sounds come from the audio engine's catalog (services/audioEngine.ts).
 */

export const DEFAULT_INSTRUMENT = "triangle";

export function displayInstrumentName(instrument: string): string {
  return instrument.startsWith("gm_") ? instrument.slice(3) : instrument;
}
