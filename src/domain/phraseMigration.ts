/**
 * One-way read of the legacy `patterns` store into a phrase book. The legacy
 * localStorage entry is left untouched so an older build still finds it.
 */

import type { LogNote, Pattern } from "@/types/patterns";
import type { Phrase, PhraseBook, PhraseContext } from "@/types/phrases";
import {
  backfillTakeNumbers,
  createId,
  createPhraseBook,
  DEFAULT_PHRASE_BOOK_CONFIG,
  normalizeNotes,
  phraseFromPattern,
  pruneRecent,
  resolveBpm,
  type NewId,
} from "./phraseBook";
import { NEUTRAL_SHAPE } from "@/services/shape";

/** The old store dropped log slices this short from the reel; so do we. */
const LEGACY_MIN_DYNAMIC_NOTES = 3;

interface LegacyPatternsState {
  loggedNotes?: LogNote[];
  savedPatterns?: Pattern[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function splitLog(notes: readonly LogNote[]): LogNote[][] {
  const groups: LogNote[][] = [];
  for (const note of notes) {
    if (note.isStartingNewPattern || !groups.length) groups.push([note]);
    else groups[groups.length - 1].push(note);
  }
  return groups;
}

function phraseFromLog(notes: LogNote[]): Phrase {
  const first = notes[0];
  const normalized = normalizeNotes(notes.map((note) => ({
    id: note.id,
    note: note.note,
    scaleDegree: note.scaleDegree,
    scaleIndex: note.scaleIndex,
    pitchClassIndex: note.pitchClassIndex,
    isBorrowed: note.isBorrowed,
    octave: note.octave,
    frequency: note.frequency,
    velocity: note.velocity,
    articulation: note.articulation,
    pitchExpression: note.pitchExpression,
    gainExpression: note.gainExpression,
    pressTime: note.pressTime,
    releaseTime: note.releaseTime,
    duration: note.duration,
  })));
  const closedAt = Math.max(...notes.map((note) => note.releaseTime));
  const context: PhraseContext = {
    key: first.key,
    mode: first.mode,
    instrument: first.instrument,
    bpm: resolveBpm(first.bpm),
    shape: { ...(first.shape ?? NEUTRAL_SHAPE) },
    octave: normalized.find((note) => note.scaleIndex === 0)?.octave ?? first.octave,
  };
  return {
    id: `phrase_migrated_${first.id}`,
    shelf: "recent",
    notes: normalized,
    context,
    duration: Math.max(...normalized.map((note) => note.releaseTime)),
    createdAt: Math.min(...notes.map((note) => note.pressTime)),
    closedAt,
  };
}

/**
 * Returns null when there is nothing to migrate. Saved or kept patterns become
 * Kept; unsent imports and the note log become Recent; renamed defaults become
 * library name overrides. The legacy desk is not reopened: its content already
 * lives in one of those places, so the migrated book opens on an empty take.
 */
export function migrateLegacyPatterns(
  legacy: unknown,
  options: {
    libraryIds: ReadonlySet<string>;
    /** Built-ins that have left the library: dropped, never migrated as the player's own. */
    retiredLibraryIds?: ReadonlySet<string>;
    liveContext: PhraseContext;
    now: number;
    newId?: NewId;
  },
): PhraseBook | null {
  if (!isRecord(legacy)) return null;
  const { loggedNotes = [], savedPatterns = [] } = legacy as LegacyPatternsState;
  if (!Array.isArray(loggedNotes) || !Array.isArray(savedPatterns)) return null;
  if (!loggedNotes.length && !savedPatterns.length) return null;

  const book = createPhraseBook(options.liveContext, options.now, options.newId ?? createId);
  const savedIds = new Set<string>();

  for (const pattern of savedPatterns) {
    if (!isRecord(pattern) || typeof pattern.id !== "string" || !Array.isArray(pattern.notes)) continue;
    savedIds.add(pattern.id);
    if (options.retiredLibraryIds?.has(pattern.id)) continue;
    if (options.libraryIds.has(pattern.id)) {
      if (pattern.name) book.libraryNames[pattern.id] = pattern.name;
      continue;
    }
    if (!pattern.notes.length) continue;
    const kept = Boolean(pattern.isSaved || pattern.isKept);
    const phrase = phraseFromPattern(pattern, kept ? "kept" : "recent", options.liveContext.octave);
    if (kept) phrase.keptAt = pattern.createdAt;
    else phrase.closedAt = pattern.createdAt;
    book.phrases.push(phrase);
  }

  const sortedLog = [...loggedNotes]
    .filter((note) => isRecord(note) && Number.isFinite(note.pressTime) && Number.isFinite(note.releaseTime))
    .sort((left, right) => left.pressTime - right.pressTime);
  for (const group of splitLog(sortedLog)) {
    if (group.length < LEGACY_MIN_DYNAMIC_NOTES) continue;
    // A dynamic pattern the user kept already arrived through savedPatterns.
    if (savedIds.has(`dynamic-pattern-${group[0].id}-${group[group.length - 1].id}`)) continue;
    book.phrases.push(phraseFromLog(group));
  }

  pruneRecent(book, options.now, DEFAULT_PHRASE_BOOK_CONFIG);
  backfillTakeNumbers(book);
  return book;
}
