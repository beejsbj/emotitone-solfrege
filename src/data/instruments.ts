/**
 * Instrument Configuration Data
 * Instrument selection is now fully dynamic via superdough's soundMap.
 */

export const DEFAULT_INSTRUMENT = "piano";

export function displayInstrumentName(instrument: string): string {
  return instrument.startsWith("gm_") ? instrument.slice(3) : instrument;
}
