import type { ActiveNote } from "@/types/music";

/**
 * A controlled note view is authoritative for its renderer lifetime. Without
 * one, production registries are merged by note id as before.
 */
export function resolveStageActiveNotes(
  controlledNotes: readonly ActiveNote[] | undefined,
  ...productionSources: readonly (readonly ActiveNote[])[]
): readonly ActiveNote[] {
  if (controlledNotes !== undefined) return controlledNotes;

  const activeNotes = new Map<string, ActiveNote>();
  productionSources.forEach((source) => {
    source.forEach((note) => activeNotes.set(note.noteId, note));
  });
  return Array.from(activeNotes.values());
}
