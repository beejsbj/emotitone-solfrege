import { toRaw } from "vue";

/**
 * Serialize the patterns store's current Pinia state without making Vue track
 * every nested proxy property during JSON traversal.
 *
 * The persisted JSON shape intentionally remains the same as the default
 * persisted-state serializer. The replacer unwraps each reactive value as it
 * is visited, including values nested inside arrays and objects.
 */
export function serializePatternsState(state: unknown): string {
  const snapshot =
    state && typeof state === "object"
      ? { ...(state as Record<string, unknown>) }
      : state;

  return JSON.stringify(snapshot, (_key, value) => toRaw(value));
}

/** Older phrase books predate saved Loops. Other store shapes stay untouched. */
export function deserializePatternsState(serialized: string): ReturnType<typeof JSON.parse> {
  const state = JSON.parse(serialized);
  if (state?.book && typeof state.book === "object" && Array.isArray(state.book.phrases)) {
    state.book.loops ??= [];
  }
  return state;
}
