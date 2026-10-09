/**
 * The text one note produced in generated pattern code: `[from, to)` offsets
 * into `SpannedNotation.code`. `noteId` is the phrase note's own id, the same
 * id a note event carries as `sourceNoteId`.
 */
export interface NotationSpan {
  noteId: string;
  from: number;
  to: number;
}

/**
 * Generated pattern code plus the span each note produced.
 *
 * The notation generator supplies one for a recorded phrase; any other source
 * of note data (a Looper member built without the transpiler, for instance)
 * can supply its own, because nothing here depends on how the code is played.
 * The HighlightStrip lights spans by note id from note events.
 */
export interface SpannedNotation {
  code: string;
  spans: readonly NotationSpan[];
}

/** Source offsets Strudel's mini-notation attaches to a hap (`hap.context.locations`). */
export interface NotationLocation {
  start: number;
  end: number;
}

/** Window events that carry note timing, shared by every engine. */
export type NotationNoteEventName = "note-played" | "note-released";

/**
 * The fields of a `note-played` / `note-released` event that notation
 * highlighting reads. `noteId` names the sounding voice; `sourceNoteId` names
 * the phrase note that produced it, which is what a `NotationSpan` is keyed by.
 */
export interface NotationNoteEventDetail {
  noteId: string;
  sourceNoteId?: string;
  /** `performance.now()` milliseconds at which the note is heard. */
  audibleAt?: number;
  durationMs?: number;
  source?: string;
}
