/**
 * Looper membership uses one shared 4/4 bar grid; phrases retain their ms.
 * Convert captured ms to bars using the recorded BPM: ms / (240000 / bpm).
 * Offsets are captured directly on the bar clock, relative to barOriginBars.
 * At playback, loopBars = clockBars - barOriginBars and local phrase bars =
 * (loopBars - offsetBars) * rate. Each member cycles every lengthBars / rate
 * shared bars. Tempo bends never rewrite these values or the source phrase.
 * The transport owns the mapping between the audio clock and this bar clock.
 */
import type { PhraseContext } from "./phrases";

export type LooperRate = 0.5 | 1 | 2;
export type KeyMode = Pick<PhraseContext, "key" | "mode">;

/** A pointer and playback controls, never a copy of a phrase. */
export interface PlayingPattern {
  phraseId: string;
  /** Phrase time 0, relative to the Looper's bar origin. May be fractional or negative. */
  offsetBars: number;
  /** Whole bars at the phrase's recorded BPM, before the membership rate. */
  lengthBars: number;
  muted: boolean;
  pinned: boolean;
  rate: LooperRate;
}

export interface Looper {
  members: PlayingPattern[];
  /** Null until the first member joins. */
  bpm: number | null;
  /** Position of bar one on the caller's continuous bar clock; null while empty. */
  barOriginBars: number | null;
  soloId: string | null;
  latched: boolean;
}

export type JoinPlacement =
  | { kind: "played"; phraseOriginBars: number }
  | { kind: "pinned-to-bar-one" };

export interface Loop {
  id: string;
  name: string;
  members: PlayingPattern[];
  /** Wall-clock milliseconds, like Phrase timestamps. */
  createdAt: number;
  updatedAt: number;
}

export type NewLoopId = (prefix: "loop") => string;
