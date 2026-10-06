/**
 * Phrase model — see docs/pattern-system-reimagined.md.
 *
 * One noun (Phrase) on one of four shelves. `library` phrases are static data
 * and never stored; the book holds the take, recent, and kept phrases.
 */

import type { GainExpressionPoint, PitchExpressionPoint } from "./expression";
import type { Shape } from "./instrument";
import type { ChromaticNote, MusicalMode } from "./music";
import type { PatternNote, PatternSource } from "./patterns";
import type { LiveArticulation } from "@/services/liveArticulation";
import type { Loop } from "./looper";

export type PhraseShelf = "take" | "recent" | "kept" | "library";
export type StoredPhraseShelf = Exclude<PhraseShelf, "library">;

/** Everything whose change starts a new take. Octave is carried, not compared. */
export interface PhraseContext {
  key: ChromaticNote;
  mode: MusicalMode;
  instrument: string;
  bpm: number;
  shape: Shape;
  octave: number;
}

/** Where a phrase was copied from, for display ("from Golden Sun"). */
export interface PhraseLineage {
  id: string;
  name: string;
  shelf: "kept" | "library";
  /**
   * false when the source was an unnamed take of yours ("Take 4"): a played
   * copy then gets its own number instead of sharing that name. Absent
   * (older storage) means true.
   */
  named?: boolean;
}

export interface Phrase {
  /** Stable from birth; never derived from notes. */
  id: string;
  shelf: PhraseShelf;
  /** User-given name. */
  name?: string;
  /** "Take 7": given when you first play into a fresh take, never changed. */
  number?: number;
  /** Notes in phrase-relative ms: the earliest press sits at 0. */
  notes: PatternNote[];
  context: PhraseContext;
  /** Phrase length in ms, including authored trailing silence. */
  duration: number;
  createdAt: number;
  /** Wall-clock ms when the phrase last left the take. Orders Recent. */
  closedAt?: number;
  /** Wall-clock ms when the phrase was kept. Orders Kept. */
  keptAt?: number;
  derivedFrom?: PhraseLineage;
  source?: PatternSource;
}

/** How the open take came to be; decides its fate when it closes. */
export type TakeOrigin = "fresh" | "recent" | "kept" | "library";

/** Recording state of the open take. Reset whenever a new take opens. */
export interface TakeRecorder {
  origin: TakeOrigin;
  /** Ids of notes played into this take (as opposed to loaded with it). */
  liveNoteIds: string[];
  /** Wall-clock ms that maps to phrase time 0 for live input. */
  wallOrigin: number | null;
  /** Latest release (wall-clock ms) of a live note in this take. */
  lastReleaseWall: number | null;
  /** Any note added or removed since the take opened. */
  edited: boolean;
  /** Length of the loaded (non-live) material, incl. its trailing silence. */
  baseDuration: number;
}

export interface PhraseBook {
  phrases: Phrase[];
  /** Saved playing sets: pointers to stored or library phrases. */
  loops: Loop[];
  takeId: string;
  recorder: TakeRecorder;
  /** Renames of library phrases, by library id. */
  libraryNames: Record<string, string>;
  /** Last take number handed out. */
  takeCounter: number;
}

/** A pressed note that has not been released yet. Never persisted. */
export interface HeldNote {
  noteId: string;
  phraseId: string;
  /** Press position in the owning phrase's time. */
  phraseTime: number;
  pressWall: number;
  note: string;
  scaleDegree: number;
  scaleIndex: number;
  pitchClassIndex?: number;
  isBorrowed?: boolean;
  octave: number;
  frequency?: number;
  velocity?: number;
  articulation?: LiveArticulation;
  pitchExpression?: PitchExpressionPoint[];
  gainExpression?: GainExpressionPoint[];
}

export interface NotePress {
  noteId: string;
  wallTime: number;
  context: PhraseContext;
  note: string;
  scaleDegree: number;
  scaleIndex: number;
  pitchClassIndex?: number;
  isBorrowed?: boolean;
  octave: number;
  frequency?: number;
  velocity?: number;
  articulation?: LiveArticulation;
}

export interface PhraseBookConfig {
  /** Upper clamp (ms) for the tempo-aware silence that closes a take. */
  silenceGapThreshold: number;
  /** How long closed-but-unkept phrases stay in Recent. */
  recentRetentionMs: number;
  /** Most phrases Recent holds; oldest fall off first. */
  recentLimit: number;
  /**
   * Phrases something else still points at (the Looper's playing set). They
   * are never pruned, and a closing take among them is kept in Recent.
   */
  protectedIds?: ReadonlySet<string>;
}
