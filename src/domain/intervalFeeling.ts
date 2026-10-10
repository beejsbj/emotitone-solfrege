import {
  identifyPitch,
  pitchSolfegeData,
  type IntervalIdentity,
  type MusicalContext,
} from "./musicalIdentity";

/**
 * The feeling-first cue for one sounding pitch: its syllable, the interval
 * from the tonic that names it, and the written feeling the interval data
 * already holds for that interval in this mode.
 */
export interface IntervalFeeling {
  /** Pitch class, C = 0. */
  pitchClass: number;
  syllable: string;
  /** Interval from the tonic up to the pitch, the one the syllable names. */
  interval: IntervalIdentity;
  /** Shortest field, e.g. "Bright, joyful optimism". */
  emotion: string;
  /** One sentence, e.g. "Sunny and optimistic, wants to rise." */
  description: string;
}

/**
 * Reads through the identity module only: the interval comes from the key's
 * spelling and the words from the interval data keyed by that interval's
 * Tonal name, so the cue is true in every key and mode.
 */
export function intervalFeeling(
  pitch: string | number,
  context: MusicalContext,
  laBasedMinor = false,
): IntervalFeeling | null {
  const identity = identifyPitch(pitch, context);
  const data = pitchSolfegeData(pitch, context, laBasedMinor);
  if (!identity || !data) return null;
  return {
    pitchClass: identity.pitchClass,
    syllable: data.name,
    // Scale tones are named by function; borrowed tones by their spelling.
    interval: identity.borrowed ? identity.interval : identity.functionalInterval,
    emotion: data.emotion,
    description: data.description,
  };
}
