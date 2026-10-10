import { Chord, ChordType, Interval, Note } from "@tonaljs/tonal";
import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import { getSolfegeLabelForInterval } from "./solfege";
import { createSolfegeData } from "@/data/solfege";
export { INTERVAL_TO_SOLFEGE, getSolfegeLabelForInterval } from "./solfege";
import type { SolfegeData, MusicalMode } from "@/types/music";

/**
 * Musical identity: the one pure answer to "what is this pitch called here?"
 *
 * Stored notes stay as they are (sharps-only pitch names, scale indices and
 * MIDI pitches). Identity is derived at read time from a pitch plus its
 * context: the stored tonic and the mode. Sharps-only names may remain
 * internal lookup keys; every label goes through this module.
 *
 * Spelling policy:
 * - Each mode reads a heptatonic key signature (`SIGNATURE_MODE`). Diatonic
 *   modes use their own; harmonic and melodic minor, minor pentatonic and minor
 *   blues read the natural-minor signature; major pentatonic, major blues and
 *   chromatic read the major signature.
 * - The tonic is the enharmonic spelling whose signature has fewer
 *   accidentals (A# major reads Bb major). A tie (six sharps or six flats)
 *   is broken by the key as practised: minor signatures add the raised
 *   leading tone, so every minor-signature mode reads Eb rather than D#
 *   (whose leading tone is C##). A remaining tie keeps the stored sharp name
 *   (F# major, A# phrygian, G# dorian).
 * - Scale tones are the tonic transposed by the mode's own Tonal intervals.
 *   Heptatonic modes therefore use each letter once. Pentatonic scales are a
 *   subset of their signature's spelling; the blues scales add one blue note
 *   spelled by its interval (3m in major blues, 5d in minor blues), with the
 *   chromatic fallback below when needed (Eb minor blues uses A, not Bbb).
 *   A letter can repeat there (C D Eb E G A).
 * - Chromatic mode and borrowed (out-of-scale) tones use the harmonic chromatic
 *   scale from the tonic: b2, b3, #4, b6, b7. An explicit `inflection` asks
 *   for the raised or lowered form instead. When that spelling would need a
 *   double accidental, only the written spelling falls back to the other
 *   inflection (Db major's b6 is written A, not Bbb). The note's function,
 *   `degree` and `alteration`, stays on the chosen rule: Db major's pitch
 *   class 9 is degree 6 lowered, written A with interval A5. For chromatic
 *   solfege of borrowed tones after a fallback, use the written `interval`.
 *   Scale tones retain the mode's `functionalInterval`, as do explicit
 *   raised/lowered requests.
 * - Chord members are spelled from the chord root, so E major in C major is
 *   E G# B even though G# alone reads Ab. A scale-tone root keeps the key's
 *   spelling; a borrowed root takes the enharmonic spelling that gives the
 *   chord fewer accidentals (G#°7, not Ab°7 with Ebb and Gbb).
 */

export interface MusicalContext {
  /** Stored tonic. Any spelling is accepted; it resolves by pitch class. */
  tonic: string;
  mode: MusicalMode;
}

/** Raised (Di Ri Fi Si Li) or lowered (Ra Me Se Le Te) chromatic form. */
export type ChromaticInflection = "raised" | "lowered";

export interface SpellingOptions {
  /** Applies to chromatic (non-major-scale) semitones that are out of scale. */
  inflection?: ChromaticInflection;
}

type SignatureMode =
  | "major"
  | "minor"
  | "dorian"
  | "phrygian"
  | "lydian"
  | "mixolydian"
  | "locrian";

export const SIGNATURE_MODE: Readonly<Record<MusicalMode, SignatureMode>> = {
  major: "major",
  minor: "minor",
  dorian: "dorian",
  phrygian: "phrygian",
  lydian: "lydian",
  mixolydian: "mixolydian",
  locrian: "locrian",
  "harmonic minor": "minor",
  "melodic minor": "minor",
  "major pentatonic": "major",
  "minor pentatonic": "minor",
  "major blues": "major",
  "minor blues": "minor",
  chromatic: "major",
};

/** Harmonic chromatic scale from the tonic, indexed by semitone. */
export const HARMONIC_CHROMATIC_INTERVALS = [
  "1P", "2m", "2M", "3m", "3M", "4P", "4A", "5P", "6m", "6M", "7m", "7M",
] as const;

const RAISED_INTERVALS: Readonly<Record<number, string>> = {
  1: "1A", 3: "2A", 6: "4A", 8: "5A", 10: "6A",
};
const LOWERED_INTERVALS: Readonly<Record<number, string>> = {
  1: "2m", 3: "3m", 6: "5d", 8: "6m", 10: "7m",
};
const MAJOR_SCALE_SEMITONES = [0, 2, 4, 5, 7, 9, 11] as const;
const LETTER_CHROMA = [0, 2, 4, 5, 7, 9, 11] as const;
const NATURAL_NAMES: Readonly<Record<number, string>> = {
  0: "C", 2: "D", 4: "E", 5: "F", 7: "G", 9: "A", 11: "B",
};

function modulo(value: number, base: number) {
  return ((value % base) + base) % base;
}

function alterationOf(name: string) {
  return Note.get(name).alt;
}

/** Absolute pitch class (C = 0) of a note name in any spelling, or a MIDI/pitch number. */
export function pitchClassOf(pitch: string | number): number | null {
  if (typeof pitch === "number") {
    return Number.isFinite(pitch) ? modulo(Math.round(pitch), 12) : null;
  }
  const chroma = Note.chroma(pitch);
  return typeof chroma === "number" && Number.isFinite(chroma) ? chroma : null;
}

/** Unbounded MIDI-like height of a scientific pitch name, or the number itself. */
export function pitchHeightOf(pitch: string | number): number | null {
  if (typeof pitch === "number") return Number.isFinite(pitch) ? Math.round(pitch) : null;
  const note = Note.get(pitch);
  return note.empty || note.oct === undefined ? null : note.height;
}

/** Appends the scientific octave for a spelled pitch class at a height (Cb5 = B4). */
export function withOctave(pitchClassName: string, height: number) {
  const note = Note.get(pitchClassName);
  const octave = Math.floor((height - LETTER_CHROMA[note.step] - note.alt) / 12) - 1;
  return `${note.pc}${octave}`;
}

function candidateTonicNames(pitchClass: number) {
  const natural = NATURAL_NAMES[pitchClass];
  if (natural) return [natural];
  const sharp = CHROMATIC_NOTES[pitchClass];
  return [sharp, Note.enharmonic(sharp)];
}

function signatureWeight(tonic: string, mode: SignatureMode) {
  return getScaleForMode(mode).intervalNames.reduce(
    (weight, interval) => weight + Math.abs(alterationOf(Note.transpose(tonic, interval))),
    0,
  );
}

function signedSignature(tonic: string, mode: SignatureMode) {
  return getScaleForMode(mode).intervalNames.reduce(
    (sum, interval) => sum + alterationOf(Note.transpose(tonic, interval)),
    0,
  );
}

function hasDoubleAccidental(name: string) {
  return Math.abs(alterationOf(name)) > 1;
}

export interface KeySpelling {
  /** Spelled tonic for display, e.g. "Bb" for a stored A# major. */
  tonic: string;
  tonicPitchClass: number;
  mode: MusicalMode;
  signatureMode: SignatureMode;
  /** Sharps as positive, flats as negative. */
  signature: number;
  /** Interval from the tonic for each scale degree. */
  intervals: readonly string[];
  /** Spelled pitch class for each scale degree. */
  degrees: readonly string[];
}

const keySpellingCache = new Map<string, KeySpelling>();

/**
 * `functional` is the interval the rule chooses (harmonic chromatic, or the
 * requested inflection); `spelled` differs only when that would be written
 * with a double accidental and the other inflection would not.
 */
function chromaticIntervalFor(
  tonic: string,
  semitones: number,
  inflection?: ChromaticInflection,
): { functional: string; spelled: string } {
  const preferred = inflection === "raised"
    ? RAISED_INTERVALS[semitones]
    : inflection === "lowered"
      ? LOWERED_INTERVALS[semitones]
      : undefined;
  const primary = preferred ?? HARMONIC_CHROMATIC_INTERVALS[semitones];
  if (!hasDoubleAccidental(Note.transpose(tonic, primary))) {
    return { functional: primary, spelled: primary };
  }

  const alternate = RAISED_INTERVALS[semitones] === primary
    ? LOWERED_INTERVALS[semitones]
    : RAISED_INTERVALS[semitones];
  return {
    functional: primary,
    spelled: alternate && !hasDoubleAccidental(Note.transpose(tonic, alternate))
      ? alternate
      : primary,
  };
}

/**
 * Breaks a signature tie by the key as practised: a minor signature adds its
 * raised leading tone (harmonic minor's seventh). It reads the signature
 * mode, not the mode's own extra tones, so every minor-signature mode
 * (natural, harmonic, melodic, pentatonic, blues) agrees on one tonic.
 */
function tieBreakWeight(tonic: string, signatureMode: SignatureMode) {
  const intervals = new Set(getScaleForMode(signatureMode).intervalNames);
  if (signatureMode === "minor") intervals.add("7M");
  return [...intervals].reduce(
    (weight, interval) => weight + Math.abs(alterationOf(Note.transpose(tonic, interval))),
    0,
  );
}

/** The key's spelled tonic, signature and scale-degree spellings. */
export function keySpelling(context: MusicalContext): KeySpelling {
  const tonicPitchClass = pitchClassOf(context.tonic) ?? 0;
  const cacheKey = `${tonicPitchClass}|${context.mode}`;
  const cached = keySpellingCache.get(cacheKey);
  if (cached) return cached;

  const signatureMode = SIGNATURE_MODE[context.mode] ?? "major";
  const [tonic] = candidateTonicNames(tonicPitchClass)
    .map((name, order) => ({
      name,
      order,
      weight: signatureWeight(name, signatureMode),
      tieBreak: tieBreakWeight(name, signatureMode),
    }))
    // Stable: a remaining tie keeps the first (stored, sharp) candidate.
    .sort((first, second) => first.weight - second.weight
      || first.tieBreak - second.tieBreak
      || first.order - second.order)
    .map(({ name }) => name);
  const scale = getScaleForMode(context.mode);
  const intervals = scale.family === "chromatic"
    ? scale.intervals.map((semitones) =>
      chromaticIntervalFor(tonic, modulo(semitones, 12)).spelled)
    : scale.intervalNames.map((interval, index) =>
      scale.family === "hexatonic" && (interval === "3m" || interval === "5d")
        ? chromaticIntervalFor(tonic, scale.intervals[index], "lowered").spelled
        : interval);
  const spelling: KeySpelling = {
    tonic,
    tonicPitchClass,
    mode: context.mode,
    signatureMode,
    signature: signedSignature(tonic, signatureMode),
    intervals,
    degrees: intervals.map((interval) => Note.transpose(tonic, interval)),
  };
  keySpellingCache.set(cacheKey, spelling);
  return spelling;
}

/** Spelled tonic of a stored key in a mode (A# major -> Bb). */
export function spellTonic(context: MusicalContext) {
  return keySpelling(context).tonic;
}

export type IntervalQuality = "P" | "M" | "m" | "A" | "d" | "AA" | "dd";

export interface IntervalIdentity {
  /** Tonal's name, e.g. "3m" or "10M"; the key used by interval data tables. */
  tonal: string;
  /** Conventional label, e.g. "m3", "P5", "A4", "M10". */
  label: string;
  /** Screen-reader name, e.g. "minor third". */
  spoken: string;
  semitones: number;
  /** Generic interval number (letter distance + 1), e.g. 3 for any third. */
  number: number;
  quality: string;
}

const QUALITY_WORDS: Readonly<Record<string, string>> = {
  P: "perfect",
  M: "major",
  m: "minor",
  A: "augmented",
  d: "diminished",
  AA: "doubly augmented",
  dd: "doubly diminished",
};

const NUMBER_WORDS = [
  "",
  "unison",
  "second",
  "third",
  "fourth",
  "fifth",
  "sixth",
  "seventh",
  "octave",
  "ninth",
  "tenth",
  "eleventh",
  "twelfth",
  "thirteenth",
  "fourteenth",
  "double octave",
] as const;

function ordinal(value: number) {
  const tens = value % 100;
  if (tens >= 11 && tens <= 13) return `${value}th`;
  return `${value}${({ 1: "st", 2: "nd", 3: "rd" } as Record<number, string>)[value % 10] ?? "th"}`;
}

/** Identity of a Tonal interval name. Direction is dropped: labels name size. */
export function describeInterval(tonalName: string): IntervalIdentity | null {
  const interval = Interval.get(tonalName);
  if (interval.empty) return null;
  const number = Math.abs(interval.num);
  const tonal = `${number}${interval.q}`;
  return {
    tonal,
    label: `${interval.q}${number}`,
    spoken: `${QUALITY_WORDS[interval.q] ?? interval.q} ${NUMBER_WORDS[number] ?? ordinal(number)}`,
    semitones: Math.abs(interval.semitones),
    number,
    quality: interval.q,
  };
}

/** Harmonic interval between two spelled scientific pitches, lower to upper. */
export function intervalBetween(first: string, second: string): IntervalIdentity | null {
  const firstHeight = pitchHeightOf(first);
  const secondHeight = pitchHeightOf(second);
  if (firstHeight === null || secondHeight === null) return null;
  // Equal heights (B#3 and C4) are ordered by letter, so the size is a
  // diminished second rather than Tonal's wrap to an augmented seventh.
  const letterRank = (name: string) => {
    const note = Note.get(name);
    return (note.oct ?? 0) * 7 + note.step;
  };
  const firstIsLower = firstHeight < secondHeight
    || (firstHeight === secondHeight && letterRank(first) <= letterRank(second));
  const [lower, upper] = firstIsLower ? [first, second] : [second, first];
  return describeInterval(Interval.distance(lower, upper));
}

export interface PitchIdentity {
  /** Absolute pitch class, C = 0. */
  pitchClass: number;
  /** Semitones above the tonic, 0 to 11. */
  semitones: number;
  /** Index in the mode's scale, or null when borrowed. */
  scaleIndex: number | null;
  borrowed: boolean;
  /** Spelled pitch class, e.g. "Bb". */
  spelling: string;
  /** Written interval from the tonic up to this pitch class (matches `spelling`). */
  interval: IntervalIdentity;
  /**
   * The interval the spelling rule chose before any double-accidental
   * fallback. Equal to `interval` except in that fallback (Db major's b6:
   * functional m6, written A5).
   */
  functionalInterval: IntervalIdentity;
  /** Diatonic degree number of the functional interval, 1 to 7. */
  degree: number;
  /** Semitones relative to that degree of the major scale (-1 for b3, +1 for #4). */
  alteration: number;
}

/**
 * Identity of a pitch (any spelling, or a MIDI/pitch-class number) in a key.
 * Internally a degree plus chromatic offset relative to the tonic.
 */
export function identifyPitch(
  pitch: string | number,
  context: MusicalContext,
  options: SpellingOptions = {},
): PitchIdentity | null {
  const pitchClass = pitchClassOf(pitch);
  if (pitchClass === null) return null;
  const key = keySpelling(context);
  const semitones = modulo(pitchClass - key.tonicPitchClass, 12);
  const scale = getScaleForMode(context.mode);
  const foundIndex = scale.intervals.findIndex((offset) => modulo(offset, 12) === semitones);
  const scaleIndex = foundIndex === -1 ? null : foundIndex;
  // Scale tones keep the key's spelling. Chromatic mode and borrowed tones
  // follow the harmonic-chromatic rule (or the requested inflection).
  const { functional, spelled } = scaleIndex !== null && scale.family !== "chromatic"
    ? { functional: scale.intervalNames[scaleIndex], spelled: key.intervals[scaleIndex] }
    : chromaticIntervalFor(key.tonic, semitones, options.inflection);
  const interval = describeInterval(spelled)!;
  const functionalInterval = describeInterval(functional)!;
  const degree = modulo(functionalInterval.number - 1, 7) + 1;

  return {
    pitchClass,
    semitones,
    scaleIndex,
    borrowed: scaleIndex === null,
    spelling: Note.transpose(key.tonic, spelled),
    interval,
    functionalInterval,
    degree,
    alteration: functionalInterval.semitones - MAJOR_SCALE_SEMITONES[degree - 1],
  };
}

/** La-based applies to the five minor-signature modes; other modes stay do-based. */
function usesLaBasedMinor(context: MusicalContext, laBasedMinor = false) {
  return laBasedMinor && SIGNATURE_MODE[context.mode] === "minor";
}

export interface SolfegeOptions extends SpellingOptions {
  laBasedMinor?: boolean;
}

/** Scale tones follow the mode; borrowed tones follow their written spelling. */
export function pitchSolfege(
  pitch: string | number, context: MusicalContext, options: SolfegeOptions = {},
): string {
  const identity = identifyPitch(pitch, context, options);
  if (!identity) return "·";
  const interval = identity.scaleIndex !== null || options.inflection
    ? identity.functionalInterval : identity.interval;
  return getSolfegeLabelForInterval(interval.tonal, usesLaBasedMinor(context, options.laBasedMinor));
}

/** Already-spelled chord members must retain the chord's spelling (G# = Si, not Le). */
export function spelledPitchSolfege(
  spelling: string, context: MusicalContext, laBasedMinor = false,
): string {
  return getSolfegeLabelForInterval(
    Interval.distance(spellTonic(context), Note.get(spelling).pc),
    usesLaBasedMinor(context, laBasedMinor),
  );
}

/** Display metadata for live and recorded Stage notes; number 0 keeps borrowed positioning. */
export function pitchSolfegeData(
  pitch: string | number, context: MusicalContext, laBasedMinor = false,
): SolfegeData | null {
  const identity = identifyPitch(pitch, context);
  if (!identity) return null;
  const metadata = identity.scaleIndex === null ? {
    number: 0,
    emotion: "Borrowed harmony tone",
    description: "A tone outside the active scale.",
    texture: "harmonic",
  } : context.mode === "chromatic" ? {
    ...createSolfegeData([identity.functionalInterval.tonal], [identity.semitones], context.mode)[0],
    number: identity.scaleIndex + 1,
  } : getScaleForMode(context.mode).solfege[identity.scaleIndex];
  return {
    ...metadata,
    name: pitchSolfege(pitch, context, { laBasedMinor }),
    intervalName: identity.scaleIndex === null ? identity.interval.tonal : identity.functionalInterval.tonal,
    semitones: identity.semitones,
  };
}

export type DetectedPitch = { frequencyHz: number } | { midi: number; cents?: number };

export interface DetectedPitchIdentity {
  midi: number;
  frequency: number;
  pitchClass: number;
  scaleIndex: number | null;
  borrowed: boolean;
  solfege: SolfegeData;
}

/**
 * Round to the nearest semitone; only pitches outside the scale are borrowed.
 * Both humming lanes share identity and spelling here, while their timing and
 * stability gates remain separate. Invalid detections are not pitches.
 */
export function classifyDetectedPitch(
  pitch: DetectedPitch,
  context: MusicalContext,
  laBasedMinor = false,
): DetectedPitchIdentity | null {
  const height = "frequencyHz" in pitch
    ? (pitch.frequencyHz > 0 ? 69 + 12 * Math.log2(pitch.frequencyHz / 440) : NaN)
    : pitch.midi + (pitch.cents ?? 0) / 100;
  if (!Number.isFinite(height)) return null;

  // Identity owns scale membership and spelling, independently of intonation.
  const midi = Math.round(height);
  const identity = identifyPitch(midi, context)!;
  const solfege = pitchSolfegeData(midi, context, laBasedMinor)!;
  return {
    midi,
    frequency: 440 * 2 ** ((midi - 69) / 12),
    pitchClass: identity.pitchClass,
    scaleIndex: identity.scaleIndex,
    borrowed: identity.borrowed,
    solfege,
  };
}

/** Spelled pitch class in the key, e.g. "Bb". */
export function spellPitchClass(
  pitch: string | number,
  context: MusicalContext,
  options?: SpellingOptions,
) {
  return identifyPitch(pitch, context, options)?.spelling ?? null;
}

/** Spelled scientific pitch in the key, e.g. "Bb4"; null when it has no octave. */
export function spellPitch(
  pitch: string | number,
  context: MusicalContext,
  options?: SpellingOptions,
) {
  const height = pitchHeightOf(pitch);
  const spelling = spellPitchClass(pitch, context, options);
  return height === null || spelling === null ? null : withOctave(spelling, height);
}

const SPOKEN_ACCIDENTALS: Readonly<Record<string, string>> = {
  "#": "sharp",
  "##": "double sharp",
  b: "flat",
  bb: "double flat",
};

/** "Bb" -> "B flat", "Bb4" -> "B flat 4". */
export function spokenPitchName(name: string) {
  const note = Note.get(name);
  if (note.empty) return name;
  return [note.letter, SPOKEN_ACCIDENTALS[note.acc], note.oct]
    .filter((part) => part !== undefined && part !== "")
    .join(" ");
}

export type ChordQuality =
  | "major"
  | "minor"
  | "diminished"
  | "augmented"
  | "sus2"
  | "sus4"
  | "power"
  | "major6"
  | "minor6"
  | "dominant7"
  | "major7"
  | "minor7"
  | "minorMajor7"
  | "halfDiminished7"
  | "diminished7"
  | "augmented7"
  | "augmentedMajor7"
  | "dominant7sus4"
  | "add9"
  | "minorAdd9"
  | "sixNine"
  | "dominant9"
  | "major9"
  | "minor9"
  | "minor11"
  | "dominant13"
  | "major13"
  | "minor13";

interface ChordQualityEntry {
  quality: ChordQuality;
  /** Intervals from the root, in chord order. */
  intervals: readonly string[];
  /** Lead-sheet suffix after the root. */
  suffix: string;
  spoken: string;
  /** A Tonal alias, so the symbol can be classified by Tonal. */
  tonal: string;
}

/**
 * The one chord-symbol vocabulary: major is the bare letter, then m, °, +,
 * ø7, °7 and conventional extensions. Inversions are slash chords.
 */
export const CHORD_QUALITIES: readonly ChordQualityEntry[] = [
  { quality: "major", intervals: ["1P", "3M", "5P"], suffix: "", spoken: "major", tonal: "M" },
  { quality: "minor", intervals: ["1P", "3m", "5P"], suffix: "m", spoken: "minor", tonal: "m" },
  { quality: "diminished", intervals: ["1P", "3m", "5d"], suffix: "°", spoken: "diminished", tonal: "dim" },
  { quality: "augmented", intervals: ["1P", "3M", "5A"], suffix: "+", spoken: "augmented", tonal: "aug" },
  { quality: "sus2", intervals: ["1P", "2M", "5P"], suffix: "sus2", spoken: "suspended second", tonal: "sus2" },
  { quality: "sus4", intervals: ["1P", "4P", "5P"], suffix: "sus4", spoken: "suspended fourth", tonal: "sus4" },
  { quality: "power", intervals: ["1P", "5P"], suffix: "5", spoken: "power chord", tonal: "5" },
  { quality: "major6", intervals: ["1P", "3M", "5P", "6M"], suffix: "6", spoken: "major sixth", tonal: "6" },
  { quality: "minor6", intervals: ["1P", "3m", "5P", "6M"], suffix: "m6", spoken: "minor sixth", tonal: "m6" },
  { quality: "dominant7", intervals: ["1P", "3M", "5P", "7m"], suffix: "7", spoken: "dominant seventh", tonal: "7" },
  { quality: "major7", intervals: ["1P", "3M", "5P", "7M"], suffix: "maj7", spoken: "major seventh", tonal: "maj7" },
  { quality: "minor7", intervals: ["1P", "3m", "5P", "7m"], suffix: "m7", spoken: "minor seventh", tonal: "m7" },
  { quality: "minorMajor7", intervals: ["1P", "3m", "5P", "7M"], suffix: "m(maj7)", spoken: "minor major seventh", tonal: "mMaj7" },
  { quality: "halfDiminished7", intervals: ["1P", "3m", "5d", "7m"], suffix: "ø7", spoken: "half-diminished seventh", tonal: "m7b5" },
  { quality: "diminished7", intervals: ["1P", "3m", "5d", "7d"], suffix: "°7", spoken: "diminished seventh", tonal: "dim7" },
  { quality: "augmented7", intervals: ["1P", "3M", "5A", "7m"], suffix: "+7", spoken: "augmented seventh", tonal: "7#5" },
  { quality: "augmentedMajor7", intervals: ["1P", "3M", "5A", "7M"], suffix: "+maj7", spoken: "augmented major seventh", tonal: "maj7#5" },
  { quality: "dominant7sus4", intervals: ["1P", "4P", "5P", "7m"], suffix: "7sus4", spoken: "dominant seventh suspended fourth", tonal: "7sus4" },
  { quality: "add9", intervals: ["1P", "3M", "5P", "9M"], suffix: "add9", spoken: "added ninth", tonal: "add9" },
  { quality: "minorAdd9", intervals: ["1P", "3m", "5P", "9M"], suffix: "m(add9)", spoken: "minor added ninth", tonal: "madd9" },
  { quality: "sixNine", intervals: ["1P", "3M", "5P", "6M", "9M"], suffix: "6/9", spoken: "six nine", tonal: "69" },
  { quality: "dominant9", intervals: ["1P", "3M", "5P", "7m", "9M"], suffix: "9", spoken: "dominant ninth", tonal: "9" },
  { quality: "major9", intervals: ["1P", "3M", "5P", "7M", "9M"], suffix: "maj9", spoken: "major ninth", tonal: "maj9" },
  { quality: "minor9", intervals: ["1P", "3m", "5P", "7m", "9M"], suffix: "m9", spoken: "minor ninth", tonal: "m9" },
  { quality: "minor11", intervals: ["1P", "3m", "5P", "7m", "9M", "11P"], suffix: "m11", spoken: "minor eleventh", tonal: "m11" },
  { quality: "dominant13", intervals: ["1P", "3M", "5P", "7m", "9M", "13M"], suffix: "13", spoken: "dominant thirteenth", tonal: "13" },
  { quality: "major13", intervals: ["1P", "3M", "5P", "7M", "9M", "13M"], suffix: "maj13", spoken: "major thirteenth", tonal: "maj13" },
  { quality: "minor13", intervals: ["1P", "3m", "5P", "7m", "9M", "13M"], suffix: "m13", spoken: "minor thirteenth", tonal: "m13" },
];

// Symmetric chords name the same pitches from several roots.
const SYMMETRIC_INTERVALS = new Set(["1P 3M 5A", "1P 3m 5d 7d"]);
const QUALITY_BY_KEY = new Map(CHORD_QUALITIES.map((entry) => [entry.quality, entry]));
const QUALITY_BY_INTERVALS = new Map(
  CHORD_QUALITIES.map((entry) => [entry.intervals.join(" "), entry]),
);
// Longest suffix first so "m7" is not read as "m" followed by "7".
const QUALITY_BY_SUFFIX = [...CHORD_QUALITIES].sort(
  (first, second) => second.suffix.length - first.suffix.length,
);

export function chordQualityEntry(quality: ChordQuality) {
  const entry = QUALITY_BY_KEY.get(quality);
  if (!entry) throw new Error(`Unknown chord quality: ${quality}`);
  return entry;
}

export interface ChordIdentity {
  /** Lead-sheet symbol, e.g. "C/E", "Bbmaj7", "Bø7". */
  symbol: string;
  /** Screen-reader name, e.g. "B flat major over D". */
  spoken: string;
  root: string;
  /** Spelled bass when it is not the root. */
  bass: string | null;
  /** Catalog quality, or null for a rarer Tonal chord type. */
  quality: ChordQuality | null;
  intervals: readonly string[];
  /** Spelled pitch classes in chord order (root first). */
  members: readonly string[];
  /** Tonal-parseable root-position name, e.g. "Bm7b5". */
  tonalName: string;
}

export interface FormatChordRequest {
  root: string;
  quality: ChordQuality;
  bass?: string | null;
}

/** The one chord-symbol formatter. */
export function formatChordSymbol({ root, quality, bass }: FormatChordRequest) {
  const symbol = `${root}${chordQualityEntry(quality).suffix}`;
  return bass && bass !== root ? `${symbol}/${bass}` : symbol;
}

function spokenChord(root: string, qualityWords: string, bass: string | null) {
  const name = `${spokenPitchName(root)} ${qualityWords}`;
  return bass ? `${name} over ${spokenPitchName(bass)}` : name;
}

function chordIdentityFor(
  root: string,
  entry: Pick<ChordQualityEntry, "intervals" | "suffix" | "spoken" | "tonal"> & { quality: ChordQuality | null },
  bassPitchClass: number | null,
): ChordIdentity {
  const members = entry.intervals.map((interval) => Note.transpose(root, interval));
  const bassMember = bassPitchClass === null
    ? null
    : members.find((member) => Note.chroma(member) === bassPitchClass) ?? null;
  const bass = bassMember && bassMember !== root ? bassMember : null;
  const symbol = `${root}${entry.suffix}${bass ? `/${bass}` : ""}`;
  return {
    symbol,
    spoken: spokenChord(root, entry.spoken, bass),
    root,
    bass,
    quality: entry.quality,
    intervals: [...entry.intervals],
    members,
    tonalName: `${root}${entry.tonal}`,
  };
}

/**
 * Spells a chord root. A scale-tone root keeps the key's spelling. A borrowed
 * root takes whichever enharmonic spelling gives the chord's members fewer
 * accidentals (G#°7 rather than Ab°7 with Ebb and Gbb); a tie keeps the
 * harmonic-chromatic spelling.
 */
function spellChordRoot(
  rootPitch: string | number,
  intervals: readonly string[],
  context: MusicalContext,
) {
  const identity = identifyPitch(rootPitch, context);
  if (!identity) return "C";
  if (!identity.borrowed) return identity.spelling;
  const weight = (root: string) => intervals.reduce(
    (sum, interval) => sum + Math.abs(alterationOf(Note.transpose(root, interval))),
    0,
  );
  const alternate = Note.enharmonic(identity.spelling);
  return alternate && alternate !== identity.spelling
    && Math.abs(alterationOf(alternate)) <= 1
    && weight(alternate) < weight(identity.spelling)
    ? alternate
    : identity.spelling;
}

/**
 * Names a chord built on a root in a key. The root is spelled in the key
 * (see `spellChordRoot`); the members and bass are spelled from the root.
 *
 * A symmetric chord (augmented, diminished seventh) is named from whichever
 * of its members gives the simplest spelling, with the built root as the
 * bass when that moves it, exactly as `identifyChord` names the same
 * pitches: E G# C in C major is C+/E on both the chord row and the Stage.
 */
export function nameChord(
  rootPitch: string | number,
  quality: ChordQuality,
  context: MusicalContext,
  bassPitch?: string | number | null,
): ChordIdentity {
  const entry = chordQualityEntry(quality);
  const builtRoot = pitchClassOf(rootPitch) ?? 0;
  const bassPitchClass = bassPitch === undefined || bassPitch === null
    ? builtRoot
    : pitchClassOf(bassPitch);
  const rootChoices = SYMMETRIC_INTERVALS.has(entry.intervals.join(" "))
    ? entry.intervals.map((interval) => modulo(builtRoot + Interval.semitones(interval)!, 12))
    : [builtRoot];
  const [root] = rootChoices
    .map((pitchClass) => ({
      pitchClass,
      spelled: spellChordRoot(pitchClass, entry.intervals, context),
    }))
    .sort(compareSymmetricRoots(entry.intervals, bassPitchClass ?? builtRoot, context))
    .map(({ spelled }) => spelled);
  return chordIdentityFor(root, entry, bassPitchClass);
}

/**
 * One order for naming a symmetric chord, shared by the chord row and the
 * Stage: fewest accidentals, then the bass as root (G#°7 over G#), then a
 * scale-tone root (C+/E rather than Ab+/E), then the nearest root above.
 */
function compareSymmetricRoots(
  intervals: readonly string[],
  bassPitchClass: number,
  context: MusicalContext,
) {
  const rank = ({ pitchClass, spelled }: { pitchClass: number; spelled: string }) => [
    spellingWeight(spelled, intervals),
    pitchClass === bassPitchClass ? 0 : 1,
    identifyPitch(pitchClass, context)?.borrowed ? 1 : 0,
    modulo(pitchClass - bassPitchClass, 12),
  ];
  return (
    first: { pitchClass: number; spelled: string },
    second: { pitchClass: number; spelled: string },
  ) => {
    const [a, b] = [rank(first), rank(second)];
    return a.map((value, index) => value - b[index]).find((difference) => difference !== 0) ?? 0;
  };
}

function spellingWeight(root: string, intervals: readonly string[]) {
  return intervals.reduce(
    (sum, interval) => sum + Math.abs(alterationOf(Note.transpose(root, interval))),
    0,
  );
}

function fallbackSuffix(aliases: readonly string[]) {
  return aliases.find((alias) => alias && !/^[M^Δ\-o]/.test(alias)) ?? aliases[0] ?? "";
}

// The installed Tonal dictionaries omit maj11. Register it for Chord.get too,
// so emitted tonalName values remain usable by typography/emotion consumers.
// Chord.detect ships a separate dictionary version, so registration alone
// does not make it detect this type; the fallback below covers that gap.
const SUPPLEMENTAL_CHORD_TYPES = [
  { alias: "maj11", name: "major eleventh", intervals: ["1P", "3M", "5P", "7M", "9M", "11P"] },
];
for (const { alias, name, intervals } of SUPPLEMENTAL_CHORD_TYPES) {
  if (ChordType.get(alias).empty) ChordType.add(intervals, [alias], name);
}

function detectChordCandidates(pitches: readonly string[]): string[] {
  const detected = Chord.detect([...pitches]);
  if (detected.length) return detected;

  const roots = [...new Set(pitches.map((pitch) => Note.get(pitch).pc))];
  const pitchClasses = new Set(roots.map((root) => Note.chroma(root)));
  return roots.flatMap((root) => SUPPLEMENTAL_CHORD_TYPES.flatMap(({ alias }) => {
    const chord = Chord.get([root, alias]);
    return chord.notes.length === pitchClasses.size
      && chord.notes.every((note) => pitchClasses.has(Note.chroma(note)))
      ? [chord.symbol]
      : [];
  }));
}

/** Splits Tonal's "CM/E" into chord and bass; "Cm/ma7" is one chord name. */
function splitDetectedChord(candidate: string) {
  const slash = candidate.lastIndexOf("/");
  const tail = slash === -1 ? "" : candidate.slice(slash + 1);
  return tail && !Note.get(tail).empty
    ? { plain: candidate.slice(0, slash), bass: tail }
    : { plain: candidate, bass: null };
}

interface DetectedCandidate {
  order: number;
  tonalChord: ReturnType<typeof Chord.get>;
  known: ChordQualityEntry | undefined;
  root: string;
  /** Accidentals across the members spelled from `root`. */
  weight: number;
}


/**
 * Chooses among Tonal's candidates (ranked with the bass as root first):
 * an ordinary major or minor triad over Tonal's augmented respelling of an
 * inversion, then the first candidate in the catalog (Cmaj7#5 over CM7b6),
 * then Tonal's first. A symmetric chord (augmented, diminished seventh)
 * takes the root whose spelling needs the fewest accidentals (C+/E rather
 * than E+ with B#), by the same order the chord row uses.
 */
function pickDetectedChord(
  detected: readonly string[],
  context: MusicalContext,
  bassPitchClass: number,
): DetectedCandidate | null {
  const candidates = detected.flatMap((candidate, order): DetectedCandidate[] => {
    const tonalChord = Chord.get(splitDetectedChord(candidate).plain);
    if (tonalChord.empty || !tonalChord.tonic) return [];
    const root = spellChordRoot(tonalChord.tonic, tonalChord.intervals, context);
    return [{
      order,
      tonalChord,
      known: QUALITY_BY_INTERVALS.get(tonalChord.intervals.join(" ")),
      root,
      weight: spellingWeight(root, tonalChord.intervals),
    }];
  });
  const chosen = candidates.find(({ known }) =>
    known?.quality === "major" || known?.quality === "minor")
    ?? candidates.find(({ known }) => known)
    ?? candidates[0];
  if (!chosen) return null;

  const signature = chosen.tonalChord.intervals.join(" ");
  if (!SYMMETRIC_INTERVALS.has(signature)) return chosen;
  const compare = compareSymmetricRoots(chosen.tonalChord.intervals, bassPitchClass, context);
  return candidates
    .filter((candidate) => candidate.tonalChord.intervals.join(" ") === signature)
    .map((candidate) => ({
      candidate,
      pitchClass: pitchClassOf(candidate.root) ?? 0,
      spelled: candidate.root,
    }))
    .sort(compare)[0].candidate;
}

export interface IdentifiedChord extends ChordIdentity {
  /** Each input pitch spelled as a chord member, in input order. */
  pitchSpellings: readonly string[];
}

/**
 * Detects the chord a set of sounding pitches forms in a key and spells it.
 * Pitches may be scientific names in any spelling or MIDI-like heights.
 * Returns null when fewer than three pitch classes form no Tonal chord.
 */
export function identifyChord(
  pitches: readonly (string | number)[],
  context: MusicalContext,
): IdentifiedChord | null {
  const heights = pitches.map(pitchHeightOf);
  if (heights.some((height) => height === null) || heights.length < 2) return null;
  const sorted = [...new Set(heights as number[])].sort((first, second) => first - second);
  const keyNames = sorted.map((height) => spellPitch(height, context)!);
  const detected = pickDetectedChord(detectChordCandidates(keyNames), context, modulo(sorted[0], 12));
  if (!detected) return null;

  const { tonalChord, known, root } = detected;
  const entry = known ?? {
    quality: null,
    intervals: tonalChord.intervals,
    suffix: fallbackSuffix(tonalChord.aliases),
    spoken: tonalChord.type || "chord",
    tonal: tonalChord.aliases[0] ?? "",
  };
  const identity = chordIdentityFor(root, entry, modulo(sorted[0], 12));
  const memberByPitchClass = new Map(
    identity.members.map((member) => [Note.chroma(member), member]),
  );
  const pitchSpellings = (heights as number[]).map((height) => {
    const member = memberByPitchClass.get(modulo(height, 12));
    return member ? withOctave(member, height) : spellPitch(height, context)!;
  });
  return { ...identity, pitchSpellings };
}

export interface ParsedChordSymbol {
  root: string;
  bass: string | null;
  quality: ChordQuality | null;
  intervals: readonly string[];
  /** Tonal chord for classification (quality words, intervals). */
  tonalName: string;
}

const SYMBOL_PATTERN = /^([A-G](?:#{1,2}|b{1,2})?)(.*?)(?:\/([A-G](?:#{1,2}|b{1,2})?))?$/;

/** Reads a symbol produced by this module (or a Tonal name) back into intervals. */
export function parseChordSymbol(symbol: string): ParsedChordSymbol | null {
  const match = symbol.trim().match(SYMBOL_PATTERN);
  if (!match) return null;
  const [, root, suffix, bass] = match;
  const entry = QUALITY_BY_SUFFIX.find((candidate) => candidate.suffix === suffix);
  if (entry) {
    return {
      root,
      bass: bass ?? null,
      quality: entry.quality,
      intervals: entry.intervals,
      tonalName: `${root}${entry.tonal}`,
    };
  }
  const tonalChord = Chord.get(`${root}${suffix}`);
  if (tonalChord.empty) return null;
  const known = QUALITY_BY_INTERVALS.get(tonalChord.intervals.join(" "));
  return {
    root,
    bass: bass ?? null,
    quality: known?.quality ?? null,
    intervals: tonalChord.intervals,
    tonalName: `${root}${suffix}`,
  };
}
