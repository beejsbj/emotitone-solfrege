/**
 * A Heads-up: one short line the instrument tells you, shown in the stack
 * just above the deck. It fades on its own; a swipe right, Escape or Delete
 * puts it away early.
 */

/** Told by the Brass lamp, never by colour: a warning (unlit) or a problem (lit). */
export type HeadsUpSignal = "warning" | "problem";

export interface HeadsUpEntry {
  /** One entry per id: the same id raised again refreshes or replaces it. */
  id: string;
  /** The one line on screen; 32 characters or fewer, so it fits at 390px. */
  line: string;
  /** The entry's name for assistive technology, e.g. "Looper". */
  label: string;
  /** Read after the line by assistive technology only: what the line can't fit. */
  hint?: string;
  signal: HeadsUpSignal;
  /** `alert` interrupts; `status` waits its turn. */
  role: "alert" | "status";
}
