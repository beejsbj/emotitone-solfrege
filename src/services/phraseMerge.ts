import { toRaw } from "vue";
import { createPhraseBook } from "@/domain/phraseBook";
import { sameJson } from "@/services/persistenceCodec";
import type { PatternNote } from "@/types/patterns";
import type { Phrase, PhraseBook, PhraseContext } from "@/types/phrases";

/**
 * Two tabs, one shelf (BJS-575). When another tab has saved since this tab
 * last agreed with storage, the two books are merged by id against that last
 * agreed copy (the base), so neither tab's sketches are written over. Rules in
 * docs/persistence-codec.md, "Two tabs":
 *
 *  - a phrase (or Loop, or note) new on either side is kept;
 *  - a change on one side wins over no change on the other;
 *  - a release on one side holds, unless the other side changed that phrase
 *    since (an edit beats a concurrent release: the sketch comes back), or this
 *    tab still needs it (a protected id, a saved Loop's member);
 *  - both sides changed one phrase: field by field. Notes are joined by note
 *    id, Kept beats any other shelf, and otherwise this tab's value wins (it
 *    saves last; the other tab takes it in from the next storage event);
 *  - the open take and its recorder are per tab and never merged. If the other
 *    tab moved this tab's take off the desk (kept it, closed it, released it),
 *    that holds and this tab opens a fresh take.
 */

interface WithId { id: string }

export interface PhraseStateData { book: PhraseBook; isRecordingEnabled: boolean }

export interface PhraseMergeOptions {
  /** A phrase as it would be saved, to compare with stored data. */
  savedPhrase: (phrase: Phrase) => unknown;
  /** A note as it would be saved. */
  savedNote: (note: PatternNote) => unknown;
  /** Ids this tab still points at (the Looper's playing set). Never released by a merge. */
  protectedIds: () => ReadonlySet<string>;
  /** Context for a fresh take, when the other tab moved this tab's take away. */
  context: () => PhraseContext;
  now: number;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/** One value, three ways. `conflict` decides when both sides changed it. */
function mergeValue<V>(hasBase: boolean, base: unknown, oursSaved: unknown, ours: V, theirs: V, conflict: () => V): V {
  if (sameJson(oursSaved, theirs)) return ours;
  if (hasBase && sameJson(oursSaved, base)) return theirs;
  if (hasBase && sameJson(theirs, base)) return ours;
  return conflict();
}

/** Entries keyed by id: ours in our order, then entries only theirs has. */
function mergeById<E extends WithId>(
  base: readonly WithId[] | undefined,
  ours: readonly E[],
  theirs: readonly E[],
  saved: (entry: E) => unknown,
  both: (base: E | undefined, ours: E, theirs: E) => E,
  keep: (id: string) => boolean,
): E[] {
  const baseById = new Map((base ?? []).map((entry) => [entry.id, entry as E]));
  const theirsById = new Map(theirs.map((entry) => [entry.id, entry]));
  const oursIds = new Set(ours.map((entry) => entry.id));
  const merged: E[] = [];
  for (const entry of ours) {
    const before = baseById.get(entry.id);
    const other = theirsById.get(entry.id);
    const mine = saved(entry);
    if (other) {
      merged.push(mergeValue(Boolean(before), before, mine, entry, other, () => both(before, entry, other)));
    } else if (!before || !sameJson(mine, before) || keep(entry.id)) {
      // New here, changed here since the other tab released it, or still needed here.
      merged.push(entry);
    }
    // Otherwise the other tab released it and this tab had not touched it.
  }
  for (const entry of theirs) {
    if (oursIds.has(entry.id)) continue;
    const before = baseById.get(entry.id);
    // New there, changed there since this tab released it, or still needed here.
    if (!before || !sameJson(entry, before) || keep(entry.id)) merged.push(entry);
  }
  return merged;
}

function mergeNotes(base: unknown, ours: PatternNote[], theirs: PatternNote[], savedNote: (note: PatternNote) => unknown) {
  return mergeById(
    Array.isArray(base) ? base : undefined, ours, theirs, savedNote,
    (_base, mine) => mine, () => false,
  ).sort((left, right) => left.pressTime - right.pressTime);
}

/** Both tabs changed one phrase: merge it field by field. */
function mergePhrase(base: Phrase | undefined, ours: Phrase, theirs: Phrase, options: PhraseMergeOptions): Phrase {
  const live = toRaw(ours) as unknown as Record<string, unknown>;
  const saved = options.savedPhrase(ours) as Record<string, unknown>;
  const other = theirs as unknown as Record<string, unknown>;
  const before = base as unknown as Record<string, unknown> | undefined;
  const merged: Record<string, unknown> = {};
  let joinedNotes = false;
  for (const key of new Set([...Object.keys(live), ...Object.keys(other), ...Object.keys(before ?? {})])) {
    const value = mergeValue(Boolean(before), before?.[key], saved[key], live[key], other[key], () => {
      switch (key) {
        case "notes":
          joinedNotes = true;
          return mergeNotes(before?.notes, ours.notes, theirs.notes, options.savedNote);
        case "shelf":
          // A Keep is deliberate: never silently undone by the other tab.
          return ours.shelf === "kept" || theirs.shelf === "kept" ? "kept" : ours.shelf;
        case "duration":
          return Math.max(ours.duration, theirs.duration);
        default:
          return live[key];
      }
    });
    if (value !== undefined) merged[key] = value;
  }
  const phrase = merged as unknown as Phrase;
  if (joinedNotes) {
    phrase.duration = Math.max(phrase.duration ?? 0, ...phrase.notes.map((note) => note.releaseTime));
  }
  return phrase;
}

/** Field by field; this tab's value wins where both changed it. */
function mergeFields<E extends WithId>(base: E | undefined, ours: E, theirs: E): E {
  const live = toRaw(ours) as unknown as Record<string, unknown>;
  const other = theirs as unknown as Record<string, unknown>;
  const before = base as unknown as Record<string, unknown> | undefined;
  const merged: Record<string, unknown> = {};
  for (const key of new Set([...Object.keys(live), ...Object.keys(other), ...Object.keys(before ?? {})])) {
    const value = mergeValue(Boolean(before), before?.[key], live[key], live[key], other[key], () => live[key]);
    if (value !== undefined) merged[key] = value;
  }
  return merged as unknown as E;
}

function mergeRecord(base: unknown, ours: Record<string, string>, theirs: unknown): Record<string, string> {
  const before = isRecord(base) ? base : undefined;
  const other = isRecord(theirs) ? (theirs as Record<string, string>) : {};
  const merged: Record<string, string> = {};
  for (const key of new Set([...Object.keys(ours), ...Object.keys(other), ...Object.keys(before ?? {})])) {
    const value = mergeValue(Boolean(before), before?.[key], ours[key], ours[key], other[key], () => ours[key]);
    if (value !== undefined) merged[key] = value;
  }
  return merged;
}

/** Stored data → a book the merge can use; drops phrases the app can't use. */
export function storedPhraseState(data: unknown): PhraseStateData {
  const state = data as PhraseStateData;
  if (!isRecord(state) || !isRecord(state.book) || !Array.isArray(state.book.phrases)) {
    throw new Error("Invalid phrase book");
  }
  return {
    ...state,
    book: {
      ...state.book,
      phrases: state.book.phrases.filter((phrase) => isRecord(phrase) && Array.isArray(phrase.notes) && phrase.context),
    },
  };
}

type LoopLike = WithId & { members?: Array<{ phraseId?: unknown }> };
const loopsOf = (book: unknown): LoopLike[] | undefined => {
  const loops = isRecord(book) ? book.loops : undefined;
  return Array.isArray(loops) ? loops.filter((loop): loop is LoopLike => isRecord(loop) && typeof loop.id === "string") : undefined;
};

/**
 * Merge another tab's saved shelf into this tab's. `base` and `theirs` are
 * stored data at the current version; `ours` is the state in memory, which is
 * not changed (unchanged phrases are shared by reference with the result).
 */
export function mergePhraseStates(
  base: unknown,
  ours: PhraseStateData,
  theirs: unknown,
  options: PhraseMergeOptions,
): PhraseStateData {
  const other = storedPhraseState(theirs);
  let before: PhraseStateData | null = null;
  try {
    before = base === null ? null : storedPhraseState(base);
  } catch {
    // An unusable base only means nothing is known to be agreed: keep everything.
  }
  const mine = toRaw(ours.book);

  // Saved Loops (BJS-493) are pointers: merged like any entry, and a phrase a
  // Loop still points at is never released by a merge.
  const ourLoops = loopsOf(mine);
  const theirLoops = loopsOf(other.book);
  const loops = ourLoops || theirLoops
    ? mergeById(loopsOf(before?.book), ourLoops ?? [], theirLoops ?? [], (loop) => toRaw(loop), mergeFields, () => false)
    : undefined;
  const pointedAt = new Set(
    [...(loops ?? []), ...(ourLoops ?? [])].flatMap((loop) =>
      (loop.members ?? []).map((member) => member.phraseId).filter((id): id is string => typeof id === "string")),
  );
  const protectedIds = options.protectedIds();

  const book: PhraseBook = {
    ...mine,
    phrases: mergeById(
      before?.book.phrases, mine.phrases, other.book.phrases, options.savedPhrase,
      (baseEntry, entry, theirsEntry) => mergePhrase(baseEntry, entry, theirsEntry, options),
      (id) => id === mine.takeId || protectedIds.has(id) || pointedAt.has(id),
    ),
    libraryNames: mergeRecord(before?.book.libraryNames, mine.libraryNames ?? {}, other.book.libraryNames),
    // Numbers are handed out by both tabs; never hand one out twice from here on.
    takeCounter: Math.max(mine.takeCounter ?? 0, Number(other.book.takeCounter) || 0),
    // The open take and its recorder are this tab's own.
    takeId: mine.takeId,
    recorder: mine.recorder,
  };
  if (loops) (book as PhraseBook & { loops: unknown }).loops = loops;

  // The other tab moved this tab's take off the desk: that holds, and this tab
  // opens a fresh take (the phrase itself stays wherever the merge put it).
  if (!book.phrases.some((phrase) => phrase.id === book.takeId && phrase.shelf === "take")) {
    const fresh = createPhraseBook(options.context(), options.now);
    book.phrases.push(...fresh.phrases);
    book.takeId = fresh.takeId;
    book.recorder = fresh.recorder;
  }

  return {
    book,
    isRecordingEnabled: mergeValue(
      before !== null, before?.isRecordingEnabled, ours.isRecordingEnabled,
      ours.isRecordingEnabled, other.isRecordingEnabled !== false, () => ours.isRecordingEnabled,
    ),
  };
}
