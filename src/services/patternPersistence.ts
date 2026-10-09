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

export const deserializePatternsState = JSON.parse;
