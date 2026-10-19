import { toRaw } from "vue";
import { ensureSingleTake } from "@/domain/phraseBook";
import { createPersistedBinding, defineCodec, type BindingOptions } from "@/services/persistenceCodec";
import { writePhraseBackup } from "@/services/phraseBackups";
import { mergePhraseStates, storedPhraseState } from "@/services/phraseMerge";
import { claimSaveFailureNotice, persistentStorage, type SafeStorage } from "@/services/safeStorage";
import type { Phrase, PhraseBook, PhraseContext } from "@/types/phrases";
import type { PatternNote } from "@/types/patterns";

export const PHRASE_BUDGET_BYTES = 3_000_000;
/** localStorage stores DOMStrings. Budget UTF-16 code units, including the envelope. */
export const encodedPhraseBytes = (encoded: string): number => encoded.length * 2;

export interface PersistedPhraseState { book: PhraseBook; isRecordingEnabled: boolean }

/**
 * The one place that decides when the shelf is over budget. Over budget only
 * warns: the save still goes ahead (Burooj, 2026-10-17). A save is refused only
 * when the browser's storage itself fails, such as a QuotaExceededError.
 */
export const shelfOverBudget = (bytes: number): boolean => bytes > PHRASE_BUDGET_BYTES;

const MIN_SAMPLE_GAP_MS = 10;

/**
 * Keep both endpoints and at most 100 points per second, spaced at uniform
 * time targets (each target takes the nearest sample, never closer than 10 ms
 * to the last one kept). Never changes live curves.
 */
export function decimateCurve<T extends { timeMs: number }>(points: readonly T[]): T[] {
  if (points.length < 2) return [...points];
  const first = points[0];
  const last = points[points.length - 1];
  const duration = last.timeMs - first.timeMs;
  const limit = Math.max(2, Math.ceil(duration / MIN_SAMPLE_GAP_MS));
  if (points.length <= limit) return [...points];
  const kept = [first];
  let cursor = 0;
  for (let target = 1; target < limit - 1; target++) {
    const at = first.timeMs + (duration * target) / (limit - 1);
    while (cursor < points.length - 2 && points[cursor + 1].timeMs <= at) cursor++;
    let pick = at - points[cursor].timeMs <= points[cursor + 1].timeMs - at ? cursor : cursor + 1;
    // Too close to the last kept sample: take the next one that clears the gap.
    const earliest = kept[kept.length - 1].timeMs + MIN_SAMPLE_GAP_MS;
    while (pick < points.length - 1 && points[pick].timeMs < earliest) pick++;
    if (pick >= points.length - 1) break;
    kept.push(points[pick]);
  }
  // The end point wins over a neighbour that sits too close to it.
  if (kept.length > 1 && last.timeMs - kept[kept.length - 1].timeMs < MIN_SAMPLE_GAP_MS) kept.pop();
  kept.push(last);
  return kept;
}

function savedNote(note: PatternNote): PatternNote {
  const raw = toRaw(note);
  return {
    ...raw,
    ...(raw.pitchExpression && { pitchExpression: decimateCurve(raw.pitchExpression) }),
    ...(raw.gainExpression && { gainExpression: decimateCurve(raw.gainExpression) }),
  };
}

function savedPhrase(phrase: Phrase): Phrase {
  const raw = toRaw(phrase);
  return {
    ...raw,
    notes: raw.notes.map(savedNote),
    ...(raw.modeBase && { modeBase: { ...raw.modeBase, notes: raw.modeBase.notes.map(savedNote) } }),
  };
}

const byId = (entries: unknown): unknown =>
  Array.isArray(entries)
    ? [...entries].sort((left, right) => String(left?.id).localeCompare(String(right?.id)))
    : entries;

/**
 * Everything but the open take's pointer and recorder, which are each tab's
 * own, with phrases and Loops in id order. A merge keeps each tab's own order,
 * so two tabs can hold the same shelf in different orders; order alone must
 * never count as a change, or each tab would write its order back for ever.
 */
function sharedPhraseData(data: unknown): unknown {
  const state = data as { book?: Record<string, unknown> } | null;
  if (!state?.book) return data;
  const { book } = state;
  return {
    ...state,
    book: { ...book, phrases: byId(book.phrases), loops: byId(book.loops), takeId: undefined, recorder: undefined },
  };
}

export interface PhraseCodecOptions {
  /** Ids this tab still points at (the Looper's playing set); a merge never releases them. */
  protectedIds?: () => ReadonlySet<string>;
}

export function phraseCodec(
  defaults: () => PersistedPhraseState,
  context: () => PhraseContext,
  { protectedIds = () => new Set() }: PhraseCodecOptions = {},
) {
  return defineCodec<PersistedPhraseState>({
    key: "phrases",
    version: 1,
    defaults,
    decode(data) {
      const { book: stored, isRecordingEnabled } = storedPhraseState(data);
      // An entry the app can't use is dropped; the rest of the shelf survives.
      // An empty take left by another tab (open, or closed without moving on)
      // holds nothing: drop it rather than shelve an empty phrase in Recent.
      const book = {
        ...stored,
        phrases: stored.phrases.filter((phrase) =>
          phrase.shelf !== "take" || phrase.id === stored.takeId || phrase.notes.length > 0),
      };
      ensureSingleTake(book, context(), Date.now());
      return { book, isRecordingEnabled: isRecordingEnabled !== false };
    },
    // Plain data for the envelope; JSON.stringify unwraps reactive proxies itself.
    encode(state) {
      const book = toRaw(state.book);
      return {
        isRecordingEnabled: state.isRecordingEnabled,
        book: { ...book, phrases: book.phrases.map(savedPhrase) },
      };
    },
    merge: (base, ours, theirs) => mergePhraseStates(base, ours, theirs, {
      savedPhrase, savedNote, protectedIds, context, now: Date.now(),
    }),
    shared: sharedPhraseData,
    migrations: { 0: (data) => data },
  });
}

/** Best effort, once: a shelf worth keeping should survive storage pressure. */
function askBrowserToKeepStorage(): void {
  try {
    void navigator.storage?.persist?.().catch(() => {});
  } catch {
    // Unsupported or refused: nothing to do.
  }
}

export interface PhrasePersistenceOptions extends BindingOptions<PersistedPhraseState>, PhraseCodecOptions {
  /** The UTF-16 size of every payload the save path encodes. */
  onMeasure?: (bytes: number) => void;
  /**
   * Whether the shelf actually reached storage: false when a write of the
   * shelf, or the backup it waits on, failed; true when a write succeeded.
   */
  onStored?: (stored: boolean) => void;
}

export function createPhrasePersistence(
  defaults: () => PersistedPhraseState,
  context: () => PhraseContext,
  options: PhrasePersistenceOptions = {},
) {
  const { onMeasure, onStored, protectedIds, storage: base = persistentStorage, ...binding } = options;
  let asked = false;
  // Whether the current load or save has already told onStored its outcome.
  let told = false;
  const report = (stored: boolean) => {
    told = true;
    onStored?.(stored);
  };
  // Watch the shelf's own reads and writes, wherever the binding makes them (a
  // save, the eager migration rewrite, or the save queued behind a backup).
  const storage: SafeStorage = {
    ...base,
    read(key) {
      const result = base.read(key);
      if (key === "phrases" && !result.ok) report(false);
      return result;
    },
    write(key, value, writeOptions) {
      const stored = base.write(key, value, writeOptions);
      if (key === "phrases") report(stored);
      return stored;
    },
  };
  // Whoever listens for the outcome shows it: the shelf notice carries a
  // phrase failure, so the shared storage Sticker does not repeat it.
  const release = onStored ? claimSaveFailureNotice("phrases") : () => {};
  const persisted = createPersistedBinding(phraseCodec(defaults, context, { protectedIds }), {
    storage,
    // A one-off save still writes the merged state. Anything that saves again
    // from its own memory (the store) must pass adopt, or its next save would
    // release what the merge brought in.
    adopt: () => {},
    backup: (...args) => writePhraseBackup(...args).catch((error: unknown) => {
      report(false);
      throw error;
    }),
    accept(encoded) {
      onMeasure?.(encodedPhraseBytes(encoded));
      if (!asked) {
        asked = true;
        askBrowserToKeepStorage();
      }
      return true;
    },
    ...binding,
  });
  // A save can also be refused before any storage call: the shelf can't be
  // encoded (JSON throws inside the envelope, past the codec's own encode),
  // or a hold refuses every write (a newer app's shelf, an unread load). Each
  // is a failure the player must see. A backup still in flight is not: its
  // queued save follows, and a failed backup reports itself above. A support
  // restore is not either: it asks for a reload, which this must not discourage.
  const refusing = () => {
    const reason = persisted.hold?.reason;
    return reason !== "needs-backup" && reason !== "restored";
  };
  const { load, save } = persisted;
  persisted.load = () => {
    told = false;
    const state = load();
    if (!told && persisted.hold && refusing()) report(false);
    return state;
  };
  persisted.save = (state) => {
    told = false;
    const saved = save(state);
    if (!saved && !told && refusing()) report(false);
    // Nothing to write: storage already holds this shelf (another tab wrote it).
    if (saved && !told) report(true);
    return saved;
  };
  const unregister = persisted.unregister;
  persisted.unregister = () => {
    release();
    unregister();
  };
  return persisted;
}
