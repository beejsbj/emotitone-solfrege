import { toRaw } from "vue";
import { ensureSingleTake } from "@/domain/phraseBook";
import { createPersistedBinding, defineCodec, type BindingOptions } from "@/services/persistenceCodec";
import { serializePatternsState } from "@/services/patternPersistence";
import { writePhraseBackup } from "@/services/phraseBackups";
import { reportSaveFailure } from "@/services/safeStorage";
import type { PhraseBook, PhraseContext } from "@/types/phrases";
import type { PatternNote } from "@/types/patterns";

export const PHRASE_BUDGET_BYTES = 3_000_000;
/** localStorage stores DOMStrings. Budget UTF-16 code units, including the envelope. */
export const encodedPhraseBytes = (encoded: string): number => encoded.length * 2;

export interface PersistedPhraseState { book: PhraseBook; isRecordingEnabled: boolean }

/** Keep endpoints and at least 10 ms between samples (100 Hz). Never change live curves. */
export function decimateCurve<T extends { timeMs: number }>(points: readonly T[]): T[] {
  if (points.length < 2) return [...points];
  const last = points[points.length - 1];
  const duration = last.timeMs - points[0].timeMs;
  const limit = Math.max(1, Math.ceil(duration / 10));
  if (limit === 1) return [last];
  const spacing = Math.max(10, duration / (limit - 1));
  const kept = [points[0]];
  for (let index = 1; index < points.length - 1; index++) {
    const point = points[index];
    if (point.timeMs - kept[kept.length - 1].timeMs >= spacing && last.timeMs - point.timeMs >= spacing) kept.push(point);
  }
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

export function phraseCodec(defaults: () => PersistedPhraseState, context: () => PhraseContext) {
  return defineCodec<PersistedPhraseState>({
    key: "phrases",
    version: 1,
    defaults,
    decode(data) {
      const state = data as PersistedPhraseState;
      if (!state?.book || !Array.isArray(state.book.phrases)
        || state.book.phrases.some((phrase) => !phrase || !Array.isArray(phrase.notes) || !phrase.context)) {
        throw new Error("Invalid phrase book");
      }
      ensureSingleTake(state.book, context(), Date.now());
      return { book: state.book, isRecordingEnabled: state.isRecordingEnabled !== false };
    },
    encode(state) {
      const book = toRaw(state.book);
      return JSON.parse(serializePatternsState({
        isRecordingEnabled: state.isRecordingEnabled,
        book: {
          ...book,
          phrases: book.phrases.map((phrase) => {
            const raw = toRaw(phrase);
            return {
              ...raw,
              notes: raw.notes.map(savedNote),
              ...(raw.modeBase && { modeBase: { ...raw.modeBase, notes: raw.modeBase.notes.map(savedNote) } }),
            };
          }),
        },
      }));
    },
    migrations: { 0: (data) => data },
  });
}

export function createPhrasePersistence(
  defaults: () => PersistedPhraseState, context: () => PhraseContext, options: BindingOptions = {},
) {
  return createPersistedBinding(phraseCodec(defaults, context), {
    backup: writePhraseBackup,
    accept(encoded) {
      if (encodedPhraseBytes(encoded) <= PHRASE_BUDGET_BYTES) return true;
      reportSaveFailure("shelf", "phrases");
      return false;
    },
    ...options,
  });
}
