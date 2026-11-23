import type { HeadsUpInput } from "@/composables/useHeadsUpQueue";

/**
 * The phrase shelf's storage line, as a Heads-up: two honest states told by
 * the lamp and the words. Over budget still saves (a warning); failed means
 * the browser refused the write (a problem).
 */
export type ShelfState = "over-budget" | "failed";

/** The shelf's entry in the Heads-up stack: one line at a time. */
export const SHELF_HEADS_UP = "shelf";

// While nothing saves, what was played lives only in this tab.
const KEEP_TAB = "Keep this tab open: closing or reloading it loses new sketches.";

/** What the line can't fit, for screen readers only. */
export function shelfHint(state: ShelfState, oldestTitle?: string): string {
  const keep = state === "failed" ? ` ${KEEP_TAB}` : "";
  if (!oldestTitle) {
    return `.${keep} No Recent phrases to release. Open any phrases you want to save in Strudel before deleting them from the reel.`;
  }
  const ask = state === "failed" ? "Free space" : "Free some space soon";
  return `.${keep} ${ask}: delete old Recent phrases from the reel, oldest first: ${oldestTitle}.`;
}

export function shelfHeadsUp(state: ShelfState, oldestTitle?: string): HeadsUpInput {
  return {
    id: SHELF_HEADS_UP,
    // The visible line says what to do; 32 characters fit one line at 390px.
    ...(state === "failed"
      ? { label: "Not saving", line: "Not saving. Delete old takes.", signal: "problem" as const }
      : { label: "Shelf full", line: "Shelf full · still saving", signal: "warning" as const }),
    hint: shelfHint(state, oldestTitle),
  };
}
