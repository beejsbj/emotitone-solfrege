import { Interval } from "@tonaljs/tonal";

/** The single movable-do vocabulary, keyed by written interval from Do. */
export const INTERVAL_TO_SOLFEGE: Readonly<Record<string, string>> = {
  "1P": "Do", "1A": "Di",
  "2m": "Ra", "2M": "Re", "2A": "Ri",
  "3m": "Me", "3M": "Mi",
  "4P": "Fa", "4A": "Fi",
  "5d": "Se", "5P": "Sol", "5A": "Si",
  "6m": "Le", "6M": "La", "6A": "Li",
  "7m": "Te", "7M": "Ti",
};

const MAJOR = [0, 2, 4, 5, 7, 9, 11];
const DIATONIC = ["1P", "2M", "3M", "4P", "5P", "6M", "7M"];
export const SOLFEGE_NOTES = DIATONIC.map((interval) => INTERVAL_TO_SOLFEGE[interval]);
export const MOVABLE_DO_SOLFEGE_NOTES = Object.values(INTERVAL_TO_SOLFEGE);

/**
 * La-based minor rotates both letters and semitones to the relative major:
 * natural minor is La Ti Do Re Mi Fa Sol; its raised seventh is Si.
 * Rare chord spellings without a conventional syllable retain their alteration
 * visibly (e.g. a doubly lowered seventh is ♭♭Ti), never silently becoming Do.
 */
export function getSolfegeLabelForInterval(intervalName: string, laBased = false): string {
  const interval = Interval.get(intervalName);
  if (interval.empty) return "·";
  const degree = (Math.abs(interval.num) - 1 + (laBased ? 5 : 0)) % 7;
  const directedSemitones = interval.num < 0 ? -interval.semitones : interval.semitones;
  const semitones = (directedSemitones + (laBased ? 9 : 0) + 12) % 12;
  const alteration = ((semitones - MAJOR[degree] + 18) % 12) - 6;
  const perfect = [0, 3, 4].includes(degree);
  const quality = alteration === 0 ? (perfect ? "P" : "M")
    : alteration === 1 ? "A"
      : alteration === -1 ? (perfect ? "d" : "m") : "";
  return INTERVAL_TO_SOLFEGE[`${degree + 1}${quality}`]
    ?? `${(alteration < 0 ? "♭" : "♯").repeat(Math.abs(alteration))}${SOLFEGE_NOTES[degree]}`;
}
