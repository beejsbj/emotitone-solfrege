import { toRaw } from "vue";
import { cloneNote, createPhraseBook } from "@/domain/phraseBook";
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
 *  - the open take and its recorder are per tab and never merged. A merge
 *    never releases this tab's take or moves it off the desk, except for a
 *    Keep from a tab sharing it, which holds (this tab opens a fresh take);
 *  - `base` is null when the other tab's bytes came from another format
 *    version: then nothing is read as released, and the merge is a union.
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

/**
 * Entries keyed by id: ours in our order, then entries only theirs has.
 * `both` merges an entry both tabs changed; `theirsChanged` takes in an entry
 * only the other tab changed (by default its stored copy, but the phrase merge
 * goes field by field so this tab's live data survives where nothing changed).
 */
function mergeById<E extends WithId>(
  base: readonly WithId[] | undefined,
  ours: readonly E[],
  theirs: readonly E[],
  saved: (entry: E) => unknown,
  both: (base: E | undefined, ours: E, theirs: E) => E,
  keep: (id: string) => boolean,
  theirsChanged: (base: E, ours: E, theirs: E) => E = (_base, _ours, other) => other,
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
      if (sameJson(mine, other)) merged.push(entry);
      else if (before && sameJson(mine, before)) merged.push(theirsChanged(before, entry, other));
      else if (before && sameJson(other, before)) merged.push(entry);
      else merged.push(both(before, entry, other));
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

/**
 * A note only the other tab edited (a remap, re-skin or shift): a field it
 * left alone, such as a curve, keeps this tab's live value rather than the
 * thinned saved one.
 */
function editedByOther(was: PatternNote | undefined, live: PatternNote, note: PatternNote): PatternNote {
  if (!was) return note;
  const before = was as unknown as Record<string, unknown>;
  const edited: Record<string, unknown> = { ...note };
  const own = toRaw(live) as unknown as Record<string, unknown>;
  for (const field of Object.keys(own)) {
    if (sameJson((note as unknown as Record<string, unknown>)[field], before[field])) edited[field] = own[field];
  }
  return edited as unknown as PatternNote;
}

function mergeNotes(base: unknown, ours: PatternNote[], theirs: PatternNote[], savedNote: (note: PatternNote) => unknown) {
  return mergeById(
    Array.isArray(base) ? base : undefined, ours, theirs, savedNote,
    (_base, mine) => mine, () => false,
    // Only the other tab edited this note (this tab edited others).
    editedByOther,
  // Ties (a chord) break by id, so both tabs join the same notes in the same order.
  ).sort((left, right) => left.pressTime - right.pressTime || left.id.localeCompare(right.id));
}

/**
 * One list of notes, merged against its base. Notes the other tab did not
 * change keep this tab's live objects: saved curves are thinned, so taking the
 * other tab's stored copy of an unchanged note would swap live curves for
 * lossy ones. `saved` is this tab's list as it would be saved.
 */
function mergeNoteList(
  before: unknown, ours: PatternNote[], saved: unknown, theirs: PatternNote[], options: PhraseMergeOptions,
): PatternNote[] {
  const base = Array.isArray(before) ? (before as PatternNote[]) : undefined;
  if (sameJson(saved, theirs) || (base && sameJson(theirs, base))) return ours;
  if (!base || !sameJson(saved, base)) return mergeNotes(base, ours, theirs, options.savedNote);
  // Only the other tab changed them: its notes, in its order, but each note
  // it did not change keeps this tab's live object.
  const mine = new Map(ours.map((note) => [note.id, note]));
  const was = new Map(base.map((note) => [note.id, note]));
  return theirs.map((note) => {
    const live = mine.get(note.id);
    if (!live || sameJson(options.savedNote(live), note)) return live ?? note;
    return editedByOther(was.get(note.id), live, note);
  });
}

type ModeBase = NonNullable<Phrase["modeBase"]>;
const isModeBase = (value: unknown): value is ModeBase => isRecord(value) && Array.isArray(value.notes);

/**
 * The other tab's `modeBase` (written by followControls when it changed key,
 * mode or instrument on a shared take), with its notes merged like the
 * phrase's own: a later control change here rebuilds the notes from it, so its
 * thinned curves must not replace this tab's live ones. Without a modeBase of
 * its own, this tab's live take notes are what the other tab captured from.
 */
function mergeModeBase(base: Phrase | undefined, ours: Phrase, theirs: ModeBase, options: PhraseMergeOptions): ModeBase {
  const own = toRaw(ours).modeBase;
  const notes = own
    ? mergeNoteList(base?.modeBase?.notes, own.notes, own.notes.map(options.savedNote), theirs.notes, options)
    : mergeNoteList(
      base?.modeBase?.notes ?? base?.notes, ours.notes, ours.notes.map(options.savedNote), theirs.notes, options,
    // A copy: modeBase must never share a note object with the live take.
    ).map((note) => cloneNote(toRaw(note)));
  return { ...theirs, notes };
}

/**
 * Merge a phrase field by field, when either or both tabs changed it. Fields
 * the other tab did not change keep this tab's live values, and notes (the
 * take's and its modeBase's) merge note by note (mergeNoteList).
 */
function mergePhrase(base: Phrase | undefined, ours: Phrase, theirs: Phrase, options: PhraseMergeOptions): Phrase {
  const live = toRaw(ours) as unknown as Record<string, unknown>;
  const saved = options.savedPhrase(ours) as Record<string, unknown>;
  const other = theirs as unknown as Record<string, unknown>;
  const before = base as unknown as Record<string, unknown> | undefined;
  const merged: Record<string, unknown> = {};
  // Both tabs changed the notes (or nothing is known): the joined notes may outrun either duration.
  const joinedNotes = !before
    || (!sameJson(saved.notes, before.notes) && !sameJson(other.notes, before.notes));
  for (const key of new Set([...Object.keys(live), ...Object.keys(other), ...Object.keys(before ?? {})])) {
    if (key === "notes") {
      merged.notes = mergeNoteList(before?.notes, ours.notes, saved.notes, theirs.notes, options);
      continue;
    }
    let value = mergeValue(Boolean(before), before?.[key], saved[key], live[key], other[key], () => {
      switch (key) {
        case "shelf":
          // A Keep is deliberate: never silently undone by the other tab.
          return ours.shelf === "kept" || theirs.shelf === "kept" ? "kept" : ours.shelf;
        case "duration":
          return Math.max(ours.duration, theirs.duration);
        default:
          return live[key];
      }
    });
    if (key === "modeBase" && value === other.modeBase && isModeBase(value)) value = mergeModeBase(base, ours, value, options);
    if (value !== undefined) merged[key] = value;
  }
  const phrase = merged as unknown as Phrase;
  if (joinedNotes && !sameJson(saved.notes, other.notes)) {
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
  // Only Loops that survive the merge protect their members: a Loop the other
  // tab deleted must not hold on to the phrases it pointed at.
  const pointedAt = new Set(
    (loops ?? []).flatMap((loop) =>
      (loop.members ?? []).map((member) => member.phraseId).filter((id): id is string => typeof id === "string")),
  );
  const protectedIds = options.protectedIds();
  const fieldByField = (baseEntry: Phrase | undefined, entry: Phrase, theirsEntry: Phrase) =>
    mergePhrase(baseEntry, entry, theirsEntry, options);

  const book: PhraseBook = {
    ...mine,
    phrases: mergeById(
      before?.book.phrases, mine.phrases, other.book.phrases, options.savedPhrase,
      fieldByField,
      (id) => id === mine.takeId || protectedIds.has(id) || pointedAt.has(id),
      fieldByField,
    ),
    libraryNames: mergeRecord(before?.book.libraryNames, mine.libraryNames ?? {}, other.book.libraryNames),
    // Numbers are handed out by both tabs; never hand one out twice from here on.
    takeCounter: Math.max(mine.takeCounter ?? 0, Number(other.book.takeCounter) || 0),
    // The open take and its recorder are this tab's own.
    takeId: mine.takeId,
    recorder: mine.recorder,
  };
  // The merged entries are stored Loops, checked only as far as an id: the
  // codec owns their shape.
  if (loops) (book as unknown as { loops: unknown }).loops = loops;

  // This tab's open take stays on its desk: another tab sharing it (or one
  // that shelved it) never splits a sketch in progress. The one exception is
  // a Keep: honouring it is the only way it survives, since this tab would
  // otherwise close the take into Recent later and undo the Keep. Then this
  // tab opens a fresh take.
  const takeAt = book.phrases.findIndex((phrase) => phrase.id === book.takeId);
  const take = book.phrases[takeAt];
  if (take && take.shelf !== "take" && take.shelf !== "kept") {
    book.phrases[takeAt] = { ...take, shelf: "take" };
  }
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
