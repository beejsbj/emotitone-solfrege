import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import type { ChromaticNote, MusicalMode } from "@/types/music";

export function findScaleIndexForPitchClass(
  pitchClass: ChromaticNote,
  context: { key: ChromaticNote; mode: MusicalMode },
): number | null {
  const keyIndex = CHROMATIC_NOTES.indexOf(context.key);
  const noteIndex = CHROMATIC_NOTES.indexOf(pitchClass);
  const relativeSemitone = (noteIndex - keyIndex + 12) % 12;
  const scaleIndex = getScaleForMode(context.mode).intervals.indexOf(
    relativeSemitone,
  );

  return scaleIndex >= 0 ? scaleIndex : null;
}
