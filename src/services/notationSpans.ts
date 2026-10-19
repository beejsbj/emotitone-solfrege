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
