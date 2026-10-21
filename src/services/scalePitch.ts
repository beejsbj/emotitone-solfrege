import { Note as TonalNote } from "@tonaljs/tonal";
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

export interface ChromaticHeightSource {
  /** Exact note name with octave, e.g. "F#5". */
  note?: string;
  /** Exact chromatic pitch class, 0 = C. */
  pitchClassIndex?: number;
  /** Scale index inside the context; used only when no exact pitch exists. */
  scaleIndex?: number;
  octave: number;
}

/**
 * Chromatic pitch height as `octave × 12 + pitch class`, so equal heights are
 * equal pitches and one semitone is one step. Exact pitch identity wins: the
 * note name, then the stored pitch class; the scale-index approximation
 * (tonic + mode interval above the given octave) is only a fallback.
 */
export function chromaticPitchHeight(
  source: ChromaticHeightSource,
  context: { key: ChromaticNote; mode: MusicalMode },
): number {
  const midi = source.note ? TonalNote.midi(source.note) : null;
  if (typeof midi === "number") return midi - 12;

  if (
    typeof source.pitchClassIndex === "number"
    && Number.isInteger(source.pitchClassIndex)
  ) {
    return source.octave * 12 + ((source.pitchClassIndex % 12) + 12) % 12;
  }

  const scale = getScaleForMode(context.mode);
  // -1 marks a borrowed pitch with no degree; without an exact pitch it sits on the tonic.
  const scaleIndex = Math.max(0, source.scaleIndex ?? 0);
  const degree = scaleIndex % scale.degreeCount;
  const octaveShift = Math.floor(scaleIndex / scale.degreeCount);
  const tonic = Math.max(0, CHROMATIC_NOTES.indexOf(context.key));
  return (source.octave + octaveShift) * 12 + tonic + (scale.intervals[degree] ?? 0);
}
