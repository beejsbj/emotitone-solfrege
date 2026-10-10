import type { NotationLocation, NotationSpan } from "@/types/notation";

/**
 * Resolve the phrase note that produced a sounding event from the source
 * locations its engine reports. The narrowest location wins: an enclosing
 * `< ... >` or `{ ... }` also covers the note, but only the leaf names it.
 */
export function noteIdAtLocations(
  spans: readonly NotationSpan[],
  locations: readonly NotationLocation[] | undefined,
): string | undefined {
  if (!spans.length || !locations?.length) return undefined;
  const narrowestFirst = [...locations].sort(
    (left, right) => (left.end - left.start) - (right.end - right.start),
  );
  for (const location of narrowestFirst) {
    const span = spans.find((candidate) =>
      candidate.from < location.end && candidate.to > location.start);
    if (span) return span.noteId;
  }
  return undefined;
}

// The spans of the code the pattern transport is playing now. The Strudel
// output reads it to stamp each note event with the phrase note's id; an engine
// that already knows its note ids never needs it.
let soundingSpans: readonly NotationSpan[] = [];

export function setSoundingNotationSpans(spans: readonly NotationSpan[] | null): void {
  soundingSpans = spans ?? [];
}

/** The phrase note id for a Strudel hap, or undefined when it cannot be named. */
export function soundingNoteIdForHap(hap: unknown): string | undefined {
  const locations = (hap as { context?: { locations?: NotationLocation[] } } | null)
    ?.context?.locations;
  return noteIdAtLocations(soundingSpans, locations);
}
