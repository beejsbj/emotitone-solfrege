/**
 * The phrase book: one noun (Phrase) on four shelves, with exactly one open
 * take. See docs/pattern-system-reimagined.md for the rules this enforces.
 *
 * Operations mutate the book in place (it is reactive state in the store) and
 * take time and ids as arguments so every rule is testable without a clock.
 */

import { CHROMATIC_NOTES } from "@/data/notes";
import {
  getSemitoneShift,
  mutatePatternMode,
  transposePatternNotes,
} from "@/data/patterns";
import { isSameShape, NEUTRAL_SHAPE, resolveLiveEnvelope } from "@/services/shape";
import type { Shape } from "@/types/instrument";
import type { ChromaticNote } from "@/types/music";
import type { Pattern, PatternNote, PatternSource } from "@/types/patterns";
import type {
  HeldNote,
  NotePress,
  Phrase,
  PhraseBook,
  PhraseBookConfig,
  PhraseContext,
  PhraseShelf,
  TakeOrigin,
  TakeRecorder,
} from "@/types/phrases";

export const DEFAULT_PHRASE_BOOK_CONFIG: PhraseBookConfig = {
  silenceGapThreshold: 4000,
  // Everything you play is kept; delete is how you curate. The count cap only
  // guards localStorage, and phrases you finished with Return are exempt.
  recentRetentionMs: Number.POSITIVE_INFINITY,
  recentLimit: 200,
};

/** Fresh takes shorter than this are stray taps, not phrases. */
export const MIN_FRESH_PHRASE_NOTES = 3;
export const DEFAULT_PHRASE_BPM = 120;

const BEATS_PER_BAR = 4;
const SILENCE_BOUNDARY_BARS = 1.5;
const MIN_SILENCE_GAP_MS = 1500;
const MAX_NAME_LENGTH = 80;
const CONTOUR_LENGTH = 5;
const CHROMATIC_SYLLABLES = [
  "Do", "Ra", "Re", "Me", "Mi", "Fa", "Se", "Sol", "Le", "La", "Te", "Ti",
];

export type NewId = (prefix: "phrase" | "note") => string;

export const createId: NewId = (prefix) =>
  `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 9)}`;

// ─── Construction ────────────────────────────────────────────────────────────

function freshRecorder(origin: TakeOrigin, baseDuration = 0): TakeRecorder {
  return {
    origin,
    liveNoteIds: [],
    wallOrigin: null,
    lastReleaseWall: null,
    edited: false,
    baseDuration,
  };
}

function cloneContext(context: PhraseContext): PhraseContext {
  return { ...context, shape: { ...(context.shape ?? NEUTRAL_SHAPE) } };
}

export function cloneNote(note: PatternNote): PatternNote {
  return {
    ...note,
    articulation: note.articulation ? { ...note.articulation } : undefined,
    pitchExpression: note.pitchExpression?.map((point) => ({ ...point })),
    gainExpression: note.gainExpression?.map((point) => ({ ...point })),
  };
}

function emptyTake(context: PhraseContext, now: number, newId: NewId): Phrase {
  return {
    id: newId("phrase"),
    shelf: "take",
    notes: [],
    context: cloneContext(context),
    duration: 0,
    createdAt: now,
  };
}

export function createPhraseBook(
  context: PhraseContext,
  now: number,
  newId: NewId = createId,
): PhraseBook {
  const take = emptyTake(context, now, newId);
  return {
    phrases: [take],
    loops: [],
    takeId: take.id,
    recorder: freshRecorder("fresh"),
    libraryNames: {},
    takeCounter: 0,
  };
}

function openFreshTake(
  book: PhraseBook,
  context: PhraseContext,
  now: number,
  newId: NewId,
): Phrase {
  const take = emptyTake(context, now, newId);
  book.phrases.push(take);
  book.takeId = take.id;
  book.recorder = freshRecorder("fresh");
  return take;
}

/**
 * Repair a book so it satisfies "exactly one take" (e.g. after hydration from
 * storage written by a crashed or older build).
 */
export function ensureSingleTake(
  book: PhraseBook,
  context: PhraseContext,
  now: number,
  newId: NewId = createId,
): void {
  book.loops ??= [];
  const takes = book.phrases.filter((phrase) => phrase.shelf === "take");
  const chosen = takes.find((phrase) => phrase.id === book.takeId) ?? takes[0];
  for (const extra of takes) {
    if (extra === chosen) continue;
    extra.shelf = "recent";
    extra.closedAt = now;
  }
  backfillTakeNumbers(book);
  if (chosen) {
    book.takeId = chosen.id;
    book.recorder ??= freshRecorder("fresh", chosen.duration);
    book.recorder.baseDuration ??= chosen.duration;
    // Live wall-clock anchors do not survive a reload.
    book.recorder.wallOrigin = null;
    book.recorder.lastReleaseWall = null;
    return;
  }
  openFreshTake(book, context, now, newId);
}

// ─── Queries ─────────────────────────────────────────────────────────────────

export function getTake(book: PhraseBook): Phrase {
  const take = book.phrases.find((phrase) => phrase.id === book.takeId);
  if (!take) throw new Error("Phrase book has no open take");
  return take;
}

export function findPhrase(
  book: PhraseBook,
  id: string,
  library: readonly Phrase[] = [],
): Phrase | undefined {
  return book.phrases.find((phrase) => phrase.id === id)
    ?? library.find((phrase) => phrase.id === id);
}

export interface PhraseShelves {
  take: Phrase;
  recent: Phrase[];
  kept: Phrase[];
  library: Phrase[];
}

/** Every shelf, newest first. The order is the reel's order away from "now". */
export function shelveBook(book: PhraseBook, library: readonly Phrase[]): PhraseShelves {
  const newestFirst = (stamp: (phrase: Phrase) => number) =>
    (left: { phrase: Phrase; index: number }, right: { phrase: Phrase; index: number }) =>
      stamp(right.phrase) - stamp(left.phrase) || right.index - left.index;
  const indexed = book.phrases.map((phrase, index) => ({ phrase, index }));
  return {
    take: getTake(book),
    recent: indexed
      .filter(({ phrase }) => phrase.shelf === "recent")
      .sort(newestFirst((phrase) => phrase.closedAt ?? phrase.createdAt))
      .map(({ phrase }) => phrase),
    kept: indexed
      .filter(({ phrase }) => phrase.shelf === "kept")
      .sort(newestFirst((phrase) => phrase.keptAt ?? phrase.createdAt))
      .map(({ phrase }) => phrase),
    library: library.map((phrase) => {
      const name = book.libraryNames[phrase.id];
      return name ? { ...phrase, name } : phrase;
    }),
  };
}

export function isSameContext(
  left: Omit<PhraseContext, "octave">,
  right: Omit<PhraseContext, "octave">,
): boolean {
  return left.key === right.key
    && left.mode === right.mode
    && left.instrument === right.instrument
    && resolveBpm(left.bpm) === resolveBpm(right.bpm)
    && isSameShape(left.shape, right.shape);
}

export function resolveBpm(bpm?: number): number {
  return typeof bpm === "number" && Number.isFinite(bpm) && bpm > 0
    ? bpm
    : DEFAULT_PHRASE_BPM;
}

export function silenceThresholdMs(bpm: number, config: PhraseBookConfig): number {
  const barMs = (60000 / resolveBpm(bpm)) * BEATS_PER_BAR;
  return Math.min(
    config.silenceGapThreshold,
    Math.max(MIN_SILENCE_GAP_MS, barMs * SILENCE_BOUNDARY_BARS),
  );
}

function heldInPhrase(held: ReadonlyMap<string, HeldNote>, phraseId: string): boolean {
  for (const note of held.values()) if (note.phraseId === phraseId) return true;
  return false;
}

/** The take is being played into: it has live notes or held notes. */
export function takeIsLive(book: PhraseBook, held: ReadonlyMap<string, HeldNote>): boolean {
  return book.recorder.liveNoteIds.length > 0 || heldInPhrase(held, book.takeId);
}

/** When a phrase of yours last settled: closed into Recent, or kept. */
export function phraseStamp(phrase: Phrase): number {
  return phrase.closedAt ?? phrase.keptAt ?? phrase.createdAt;
}

/** You have written into the take (played, held, or deleted a note). */
export function isTakeTouched(book: PhraseBook, held: ReadonlyMap<string, HeldNote>): boolean {
  return book.recorder.edited || takeIsLive(book, held);
}

/**
 * The Kept/Library phrase the take is an untouched copy of, if it is one. Only
 * a copy opened from Kept or Library stands in for its source; a Recent phrase
 * that began as a copy still remembers its source but is its own phrase.
 */
export function untouchedCopySource(book: PhraseBook, touched: boolean): string | undefined {
  const { origin } = book.recorder;
  if (touched || (origin !== "kept" && origin !== "library")) return undefined;
  return getTake(book).derivedFrom?.id;
}

export interface ReelEntry {
  /** null for the blank "new take" slot at the front. */
  phrase: Phrase | null;
  /** desk: what you're playing into. shelf: everything else. blank: start fresh. */
  role: "desk" | "shelf" | "blank";
  /** Stable presentation key, so a strip keeps its node while it changes role. */
  key: string;
}

/**
 * The reel, deepest first, with the front last. "Whatever is at the cursor is
 * on the desk": a take you have only looked at is drawn where it came from
 * (its Recent slot, or in place of its Kept/Library source), and a blank slot
 * waits at the front. Once you write into it, the take moves to the front.
 * Because a looked-at take never leaves its place, scrolling never reorders
 * the reel under you, which is what makes load-on-scroll safe.
 */
export function arrangeReel(
  book: PhraseBook,
  library: readonly Phrase[],
  touched: boolean,
): ReelEntry[] {
  const { take, recent, kept, library: shelvedLibrary } = shelveBook(book, library);
  const origin = book.recorder.origin;
  const inPlace = !touched && take.notes.length > 0 && origin !== "fresh";
  const sourceId = untouchedCopySource(book, touched);
  const desk: ReelEntry = {
    phrase: take,
    role: "desk",
    key: `phrase:${inPlace && sourceId ? sourceId : take.id}`,
  };
  const shelf = (phrase: Phrase): ReelEntry => ({ phrase, role: "shelf", key: `phrase:${phrase.id}` });
  const withSource = (phrases: Phrase[]) =>
    phrases.map((phrase) => (inPlace && phrase.id === sourceId ? desk : shelf(phrase)));

  // Recent and Kept read as one timeline of your phrases, newest first.
  const yours = [...recent, ...kept, ...(inPlace && origin === "recent" ? [take] : [])]
    .sort((left, right) => phraseStamp(right) - phraseStamp(left));
  const newestFirst = [
    ...withSource(yours).map((entry) => (entry.phrase === take ? desk : entry)),
    ...withSource(shelvedLibrary),
  ];
  const deskIsShelved = newestFirst.includes(desk);
  const front: ReelEntry = deskIsShelved
    ? { phrase: null, role: "blank", key: "blank" }
    : { ...desk, key: take.notes.length ? `phrase:${take.id}` : "blank" };
  return [...newestFirst.reverse(), front];
}

function pitchClassOf(note: PatternNote): number | null {
  if (typeof note.pitchClassIndex === "number" && Number.isInteger(note.pitchClassIndex)) {
    return ((note.pitchClassIndex % 12) + 12) % 12;
  }
  const match = /^([A-G])([#b]?)/.exec(note.note);
  if (!match) return null;
  const natural = CHROMATIC_NOTES.indexOf(match[1] as ChromaticNote);
  if (natural < 0) return null;
  const accidental = match[2] === "#" ? 1 : match[2] === "b" ? -1 : 0;
  return (natural + accidental + 12) % 12;
}

/** First few movable-do syllables, e.g. "Do Mi Sol Mi Do…". */
export function phraseContour(phrase: Pick<Phrase, "notes" | "context">): string {
  const root = Math.max(0, CHROMATIC_NOTES.indexOf(phrase.context.key));
  const ordered = [...phrase.notes].sort((left, right) => left.pressTime - right.pressTime);
  const syllables = ordered.slice(0, CONTOUR_LENGTH).map((note) => {
    const pitchClass = pitchClassOf(note);
    return pitchClass === null ? "·" : CHROMATIC_SYLLABLES[(pitchClass - root + 12) % 12];
  });
  return syllables.join(" ") + (ordered.length > CONTOUR_LENGTH ? "…" : "");
}

/** A user's name if given; otherwise the phrase names itself by its contour. */
/**
 * A stable title: the user's name, a copy's source name, or "Take 7". Never
 * the solfège contour: a title that rewrote itself on every note read as
 * broken. The contour belongs on the meta line.
 */
export function phraseTitle(
  phrase: Pick<Phrase, "name" | "number" | "derivedFrom">,
): string {
  return phrase.name
    || (phrase.number ? `Take ${phrase.number}` : phrase.derivedFrom?.name)
    || "New take";
}

/**
 * Number phrases saved before take numbers existed (older storage, migrated
 * legacy phrases), oldest first, so none of them reads as "New take".
 */
export function backfillTakeNumbers(book: PhraseBook): void {
  book.takeCounter ??= 0;
  const unnumbered = book.phrases
    .filter((phrase) => !phrase.number && !phrase.name && !phrase.derivedFrom && phrase.notes.length)
    .sort((left, right) => left.createdAt - right.createdAt);
  for (const phrase of unnumbered) {
    book.takeCounter += 1;
    phrase.number = book.takeCounter;
  }
}

/** Give a fresh take its number the moment it first gets a note. */
function numberTake(book: PhraseBook, take: Phrase): void {
  // Library songs and named phrases lend their name to a copy; a copy of an
  // unnamed take gets its own number, so two strips never both say "Take 4".
  if (take.number || take.name || (take.derivedFrom && take.derivedFrom.named !== false)) return;
  book.takeCounter = (book.takeCounter ?? 0) + 1;
  take.number = book.takeCounter;
}

// ─── Recording ───────────────────────────────────────────────────────────────

function shiftPhrase(
  book: PhraseBook,
  held: Map<string, HeldNote>,
  phrase: Phrase,
  delta: number,
): void {
  for (const note of phrase.notes) {
    note.pressTime += delta;
    note.releaseTime += delta;
  }
  phrase.duration += delta;
  for (const note of held.values()) if (note.phraseId === phrase.id) note.phraseTime += delta;
  if (phrase.id === book.takeId && book.recorder.wallOrigin !== null) {
    book.recorder.wallOrigin -= delta;
  }
}

/**
 * A key goes down. Decides the take boundary *now*: silence since the last
 * live release, or a context that differs from the take's, closes the take
 * and the note opens a fresh one. The note belongs to whichever take is open
 * after that decision, no matter when it is released.
 */
export function pressNote(
  book: PhraseBook,
  held: Map<string, HeldNote>,
  press: NotePress,
  config: PhraseBookConfig = DEFAULT_PHRASE_BOOK_CONFIG,
  newId: NewId = createId,
): HeldNote {
  let take = getTake(book);
  const heldHere = heldInPhrase(held, take.id);

  if (take.notes.length > 0 || heldHere) {
    const contextChanged = !isSameContext(take.context, press.context);
    const lastRelease = book.recorder.lastReleaseWall;
    const silent = !heldHere
      && lastRelease !== null
      && press.wallTime - lastRelease >= silenceThresholdMs(take.context.bpm, config);
    if (contextChanged || silent) {
      closeTake(book, press.wallTime, press.context, newId, config);
      take = getTake(book);
    }
  }

  numberTake(book, take);
  if (!takeIsLive(book, held)) {
    if (take.notes.length === 0) take.context = cloneContext(press.context);
    // Seam: live input continues at the phrase's end, whenever it arrives.
    book.recorder.wallOrigin = press.wallTime - take.duration;
  }

  const phraseTime = press.wallTime - (book.recorder.wallOrigin ?? press.wallTime);
  const note: HeldNote = {
    noteId: press.noteId,
    phraseId: take.id,
    phraseTime,
    pressWall: press.wallTime,
    note: press.note,
    scaleDegree: press.scaleDegree,
    scaleIndex: press.scaleIndex,
    pitchClassIndex: press.pitchClassIndex,
    isBorrowed: press.isBorrowed,
    octave: press.octave,
    frequency: press.frequency,
    velocity: press.velocity,
    articulation: press.articulation ? { ...press.articulation } : undefined,
  };
  held.set(press.noteId, note);
  // Scheduled pulses can carry an onset slightly before the take's origin.
  if (phraseTime < 0) shiftPhrase(book, held, take, -phraseTime);
  return note;
}

/**
 * A key comes up. The note lands in the phrase it was pressed into, even if
 * that phrase has since left the take (Return while holding).
 */
export function releaseNote(
  book: PhraseBook,
  held: Map<string, HeldNote>,
  noteId: string,
  releaseWall: number,
  options: { articulation?: HeldNote["articulation"] } = {},
  newId: NewId = createId,
): PatternNote | null {
  const pending = held.get(noteId);
  if (!pending) return null;
  held.delete(noteId);
  const phrase = book.phrases.find((candidate) => candidate.id === pending.phraseId);
  if (!phrase) return null;

  const duration = Math.max(0, releaseWall - pending.pressWall);
  // Movement delivered after the gate ended does not extend the note.
  const pitchExpression = pending.pitchExpression?.filter((point) => point.timeMs <= duration);
  const gainExpression = pending.gainExpression?.filter((point) => point.timeMs <= duration);
  const articulation = options.articulation ?? pending.articulation;
  const note: PatternNote = {
    id: newId("note"),
    note: pending.note,
    scaleDegree: pending.scaleDegree,
    scaleIndex: pending.scaleIndex,
    pitchClassIndex: pending.pitchClassIndex,
    isBorrowed: pending.isBorrowed,
    octave: pending.octave,
    frequency: pending.frequency,
    velocity: pending.velocity,
    articulation: articulation ? { ...articulation } : undefined,
    pitchExpression: pitchExpression?.some((point) => point.cents !== 0) ? pitchExpression : undefined,
    gainExpression: gainExpression?.some((point) => point.gain !== 1) ? gainExpression : undefined,
    pressTime: pending.phraseTime,
    releaseTime: pending.phraseTime + duration,
    duration,
  };

  // Completion order can differ from onset order; keep notes onset-sorted.
  const insertAt = phrase.notes.findIndex((existing) => existing.pressTime > note.pressTime);
  phrase.notes.splice(insertAt < 0 ? phrase.notes.length : insertAt, 0, note);
  phrase.duration = Math.max(phrase.duration, note.releaseTime);

  if (phrase.id === book.takeId) {
    book.recorder.liveNoteIds.push(note.id);
    book.recorder.edited = true;
    book.recorder.lastReleaseWall = Math.max(book.recorder.lastReleaseWall ?? releaseWall, releaseWall);
  }
  return note;
}

// ─── Closing, keeping, loading ───────────────────────────────────────────────

/**
 * Why a take is closing. The stray-tap noise floor only applies to closes the
 * performer didn't ask for (silence, a new context). Moving the reel away is a
 * deliberate act, so it never drops notes.
 */
export type CloseReason = "boundary" | "navigate";

/** Where a closing take goes, or null when it leaves nothing behind. */
function closingShelf(
  take: Phrase,
  recorder: TakeRecorder,
  reason: CloseReason,
): "recent" | null {
  if (!take.notes.length) return null;
  switch (recorder.origin) {
    case "fresh":
      return reason === "navigate" || take.notes.length >= MIN_FRESH_PHRASE_NOTES || take.source
        ? "recent"
        : null;
    case "recent":
      return "recent";
    case "kept":
    case "library":
      // An unplayed fork is a copy of something that still exists.
      return recorder.edited ? "recent" : null;
  }
}

/** Retire the take by its lineage without opening a new one. */
function retireTake(
  book: PhraseBook,
  now: number,
  config: PhraseBookConfig,
  reason: CloseReason,
): void {
  const take = getTake(book);
  // A take the Looper is playing stays findable even if it would be a stray tap.
  if (closingShelf(take, book.recorder, reason) === "recent"
    || (take.notes.length > 0 && config.protectedIds?.has(take.id))) {
    // A Recent phrase that was only looked at goes back to its own place, so
    // scrolling through Recent never reshuffles it.
    const untouchedReopen = book.recorder.origin === "recent" && !book.recorder.edited;
    take.shelf = "recent";
    take.closedAt = untouchedReopen && take.closedAt !== undefined ? take.closedAt : now;
  } else {
    book.phrases = book.phrases.filter((phrase) => phrase !== take);
  }
  pruneRecent(book, now, config);
}

/** Close the take (to Recent, or discard per its lineage) and open an empty one. */
export function closeTake(
  book: PhraseBook,
  now: number,
  nextContext: PhraseContext,
  newId: NewId = createId,
  config: PhraseBookConfig = DEFAULT_PHRASE_BOOK_CONFIG,
  reason: CloseReason = "boundary",
): Phrase {
  retireTake(book, now, config, reason);
  return openFreshTake(book, nextContext, now, newId);
}

/**
 * Return. The take moves to Kept and an empty take opens. Recent is not
 * touched. Returns the kept phrase's id, or null when there was nothing to keep.
 */
export function keepTake(
  book: PhraseBook,
  now: number,
  nextContext: PhraseContext,
  newId: NewId = createId,
  config: PhraseBookConfig = DEFAULT_PHRASE_BOOK_CONFIG,
  library: readonly Phrase[] = [],
): string | null {
  const take = getTake(book);
  if (!take.notes.length) return null;

  const { origin, edited } = book.recorder;
  const source = take.derivedFrom && (origin === "kept" || origin === "library") && !edited
    ? findPhrase(book, take.derivedFrom.id, library)
    : undefined;
  if (source && isSameContext(source.context, take.context)
    && source.context.octave === take.context.octave) {
    // An untouched copy of something that already exists: Return just clears
    // the desk rather than keeping a duplicate.
    book.phrases = book.phrases.filter((phrase) => phrase !== take);
    openFreshTake(book, nextContext, now, newId);
    pruneRecent(book, now, config);
    return origin === "kept" ? source.id : null;
  }

  take.shelf = "kept";
  take.keptAt = now;
  // A reopened Recent phrase still carries its closedAt; kept now means now.
  take.closedAt = undefined;
  openFreshTake(book, nextContext, now, newId);
  return take.id;
}

/** Delete the take outright (an explicit, confirmed delete) and open an empty one. */
export function discardTake(
  book: PhraseBook,
  now: number,
  nextContext: PhraseContext,
  newId: NewId = createId,
): Phrase {
  const take = getTake(book);
  book.phrases = book.phrases.filter((phrase) => phrase !== take);
  return openFreshTake(book, nextContext, now, newId);
}

/**
 * Put a phrase on the desk. Recent phrases move back into the take (they were
 * takes); Kept and Library phrases are copied so the source never changes.
 * The previous take closes by its own lineage first.
 */
export function openPhrase(
  book: PhraseBook,
  id: string,
  library: readonly Phrase[],
  now: number,
  newId: NewId = createId,
  config: PhraseBookConfig = DEFAULT_PHRASE_BOOK_CONFIG,
): Phrase | null {
  if (id === book.takeId) return null;
  const stored = book.phrases.find((phrase) => phrase.id === id);
  const source = stored ?? library.find((phrase) => phrase.id === id);
  if (!source || source.shelf === "take") return null;

  retireTake(book, now, config, "navigate");

  if (stored && stored.shelf === "recent") {
    // closedAt is kept: if this phrase is only looked at, it returns to its place.
    stored.shelf = "take";
    book.takeId = stored.id;
    book.recorder = freshRecorder("recent", stored.duration);
    return stored;
  }

  const origin = source.shelf as "kept" | "library";
  const displayName = origin === "library"
    ? book.libraryNames[source.id] ?? source.name
    : source.name;
  const fork: Phrase = {
    id: newId("phrase"),
    shelf: "take",
    notes: source.notes.map(cloneNote),
    context: cloneContext(source.context),
    duration: source.duration,
    createdAt: now,
    derivedFrom: {
      id: source.id,
      name: displayName || phraseTitle(source),
      shelf: origin,
      named: Boolean(displayName),
    },
    source: source.source ? { ...source.source } : undefined,
  };
  book.phrases.push(fork);
  book.takeId = fork.id;
  book.recorder = freshRecorder(origin, fork.duration);
  return fork;
}

/** Keep a phrase straight from the reel without disturbing the take. */
export function keepPhrase(
  book: PhraseBook,
  id: string,
  library: readonly Phrase[],
  now: number,
  newId: NewId = createId,
): string | null {
  const stored = book.phrases.find((phrase) => phrase.id === id);
  if (stored?.shelf === "kept") return stored.id;
  if (stored?.shelf === "recent") {
    stored.shelf = "kept";
    stored.keptAt = now;
    stored.closedAt = undefined;
    return stored.id;
  }
  const fromLibrary = library.find((phrase) => phrase.id === id);
  if (!fromLibrary) return null;
  const copy: Phrase = {
    ...fromLibrary,
    id: newId("phrase"),
    shelf: "kept",
    name: book.libraryNames[id] ?? fromLibrary.name,
    notes: fromLibrary.notes.map(cloneNote),
    context: cloneContext(fromLibrary.context),
    createdAt: now,
    keptAt: now,
    derivedFrom: undefined,
  };
  book.phrases.push(copy);
  return copy.id;
}

/**
 * Saved Loop pointers are protected even without a caller-supplied set.
 * Force detaches saved memberships; it never overrides supplied protection.
 * For force, leave the live playing set first and supply its remaining ids
 * (not the saved Loop ids this function will detach).
 */
export function deletePhrase(
  book: PhraseBook,
  id: string,
  protectedIds: ReadonlySet<string> = new Set(),
  force = false,
): boolean {
  const target = book.phrases.find((phrase) => phrase.id === id);
  if (!target || target.shelf === "take" || protectedIds.has(id)) return false;
  const loops = book.loops.filter((loop) => loop.members.some((member) => member.phraseId === id));
  if (loops.length && !force) return false;
  for (const loop of loops) loop.members = loop.members.filter((member) => member.phraseId !== id);
  book.phrases = book.phrases.filter((phrase) => phrase !== target);
  return true;
}

export function renamePhrase(
  book: PhraseBook,
  id: string,
  nextName: string,
  library: readonly Phrase[] = [],
): boolean {
  const name = nextName.trim().slice(0, MAX_NAME_LENGTH);
  if (!name) return false;
  const stored = book.phrases.find((phrase) => phrase.id === id);
  if (stored) {
    stored.name = name;
    return true;
  }
  if (!library.some((phrase) => phrase.id === id)) return false;
  book.libraryNames[id] = name;
  return true;
}

/** Backspace: remove the take's last note, played or loaded. */
export function undoLastNote(book: PhraseBook): PatternNote | null {
  const take = getTake(book);
  if (!take.notes.length) return null;
  const recorder = book.recorder;
  const live = new Set(recorder.liveNoteIds);
  const baseEnd = (notes: PatternNote[]) =>
    soundingLength(notes.filter((note) => !live.has(note.id)));

  let lastIndex = 0;
  take.notes.forEach((note, index) => {
    if (note.pressTime >= take.notes[lastIndex].pressTime) lastIndex = index;
  });
  const baseTrailing = Math.max(0, recorder.baseDuration - baseEnd(take.notes));
  const [removed] = take.notes.splice(lastIndex, 1);

  if (live.has(removed.id)) {
    recorder.liveNoteIds = recorder.liveNoteIds.filter((id) => id !== removed.id);
    if (!recorder.liveNoteIds.length) recorder.lastReleaseWall = null;
  } else {
    // Loaded material keeps its authored trailing silence as it shrinks.
    const remainingBase = take.notes.filter((note) => !live.has(note.id));
    recorder.baseDuration = remainingBase.length ? baseEnd(take.notes) + baseTrailing : 0;
  }
  take.duration = Math.max(recorder.baseDuration, soundingLength(take.notes));
  recorder.edited = true;
  return removed;
}

/**
 * The live controls moved. An empty take adopts them; an untouched loaded
 * take re-skins to them (transpose, re-mode, re-voice). Once the take is being
 * played into, its context is fixed. BPM is never followed: changing it would
 * need a time-stretch, and a different BPM at press opens a new take instead.
 */
export function followControls(
  book: PhraseBook,
  held: ReadonlyMap<string, HeldNote>,
  live: PhraseContext,
): boolean {
  if (takeIsLive(book, held)) return false;
  const take = getTake(book);
  if (!take.notes.length) {
    take.context = cloneContext(live);
    return true;
  }
  // A Recent phrase on the desk is your stored phrase itself (reopen is a
  // move), so browsing and knob turns must not rewrite it. Only a disposable
  // copy follows the controls; a note in a new context opens a new take.
  if (book.recorder.origin === "recent") return false;

  const context = take.context;
  let notes = take.notes;
  let changed = false;
  if (context.key !== live.key) {
    notes = transposePatternNotes(notes, getSemitoneShift(context.key, live.key));
    context.key = live.key;
    changed = true;
  }
  if (context.mode !== live.mode) {
    notes = mutatePatternMode(notes, context.key, live.mode);
    context.mode = live.mode;
    changed = true;
  }
  if (context.octave !== live.octave) {
    notes = transposePatternNotes(notes, (live.octave - context.octave) * 12);
    context.octave = live.octave;
    changed = true;
  }
  if (context.instrument !== live.instrument || !isSameShape(context.shape, live.shape)) {
    notes = reskinArticulation(notes, context, live.instrument, live.shape);
    context.instrument = live.instrument;
    context.shape = { ...live.shape };
    changed = true;
  }
  if (changed) take.notes = notes;
  return changed;
}

/**
 * Envelope stages that came from the old instrument + Shape follow the new
 * pair; other values (e.g. 30ms rhythmic gates) stay authored.
 */
function reskinArticulation(
  notes: PatternNote[],
  from: PhraseContext,
  instrument: string,
  shape: Shape,
): PatternNote[] {
  const before = resolveLiveEnvelope(from.instrument, from.shape);
  const after = resolveLiveEnvelope(instrument, shape);
  return notes.map((note) => {
    if (!note.articulation) return note;
    const articulation = { ...note.articulation };
    // Compare at knob precision; recorded values may carry float noise.
    if (Number(articulation.attack.toFixed(3)) === before.attack) articulation.attack = after.attack;
    if (Number(articulation.release.toFixed(2)) === before.release) articulation.release = after.release;
    return { ...note, articulation };
  });
}

export function pruneRecent(
  book: PhraseBook,
  now: number,
  config: PhraseBookConfig = DEFAULT_PHRASE_BOOK_CONFIG,
  protectedIds: ReadonlySet<string> = config.protectedIds ?? new Set(),
): void {
  const savedIds = new Set(book.loops.flatMap((loop) => loop.members.map((member) => member.phraseId)));
  const cutoff = now - config.recentRetentionMs;
  const recent = book.phrases
    .filter((phrase) => phrase.shelf === "recent")
    .sort((left, right) => (right.closedAt ?? right.createdAt) - (left.closedAt ?? left.createdAt));
  const expired = new Set(recent.filter((phrase, index) =>
    !protectedIds.has(phrase.id) && !savedIds.has(phrase.id)
    && ((phrase.closedAt ?? phrase.createdAt) < cutoff || index >= config.recentLimit)
  ));
  if (expired.size) book.phrases = book.phrases.filter((phrase) => !expired.has(phrase));
}

// ─── Imports and the library ─────────────────────────────────────────────────

/** Shift notes so the earliest press sits at 0. */
export function normalizeNotes(notes: readonly PatternNote[]): PatternNote[] {
  if (!notes.length) return [];
  const start = Math.min(...notes.map((note) => note.pressTime));
  return notes
    .map((note) => ({
      ...cloneNote(note),
      pressTime: note.pressTime - start,
      releaseTime: note.releaseTime - start,
    }))
    .sort((left, right) => left.pressTime - right.pressTime);
}

function soundingLength(notes: readonly PatternNote[]): number {
  return notes.length ? Math.max(...notes.map((note) => note.releaseTime)) : 0;
}

function rootOctave(notes: readonly PatternNote[], fallback: number): number {
  return notes.find((note) => note.scaleIndex === 0)?.octave ?? notes[0]?.octave ?? fallback;
}

export interface PhraseCandidate {
  name: string;
  notes: PatternNote[];
  source?: PatternSource;
}

/**
 * Finalized external takes (e.g. humming) arrive in Recent, and the first one
 * opens on the desk. Short imports are real phrases: the noise floor is for
 * stray taps, not for things you deliberately captured.
 */
export function importPhrases(
  book: PhraseBook,
  candidates: readonly PhraseCandidate[],
  context: Omit<PhraseContext, "octave">,
  now: number,
  newId: NewId = createId,
  config: PhraseBookConfig = DEFAULT_PHRASE_BOOK_CONFIG,
): string[] {
  const imported = candidates
    .filter((candidate) => candidate.notes.length > 0)
    .map((candidate): Phrase => {
      const notes = normalizeNotes(candidate.notes);
      return {
        id: newId("phrase"),
        shelf: "recent",
        name: candidate.name,
        notes,
        context: cloneContext({ ...context, octave: rootOctave(notes, 4) }),
        duration: soundingLength(notes),
        createdAt: now,
        closedAt: now,
        source: candidate.source ? { ...candidate.source } : undefined,
      };
    });
  if (!imported.length) return [];
  book.phrases.push(...imported);
  openPhrase(book, imported[0].id, [], now, newId, config);
  return imported.map((phrase) => phrase.id);
}

export function patternDuration(pattern: Pick<Pattern, "duration" | "notes">): number {
  if (typeof pattern.duration === "number" && Number.isFinite(pattern.duration) && pattern.duration >= 0) {
    return pattern.duration;
  }
  const notes = normalizeNotes(pattern.notes);
  return soundingLength(notes);
}

/** Adapt a legacy/default Pattern into a Phrase on the given shelf. */
export function phraseFromPattern(
  pattern: Pattern,
  shelf: Exclude<PhraseShelf, "take">,
  fallbackOctave = 4,
): Phrase {
  const notes = normalizeNotes(pattern.notes);
  return {
    id: pattern.id,
    shelf,
    name: pattern.name,
    notes,
    context: {
      key: pattern.key,
      mode: pattern.mode,
      instrument: pattern.instrument,
      bpm: resolveBpm(pattern.bpm),
      shape: { ...(pattern.shape ?? NEUTRAL_SHAPE) },
      octave: rootOctave(notes, fallbackOctave),
    },
    duration: Math.max(patternDuration(pattern), soundingLength(notes)),
    createdAt: pattern.createdAt,
    source: pattern.source ? { ...pattern.source } : undefined,
  };
}
