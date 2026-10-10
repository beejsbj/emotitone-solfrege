import { Note } from "@tonaljs/tonal";
import { CHROMATIC_NOTES } from "@/data/notes";
import { getScaleForMode } from "@/data/scales";
import { cloneNote } from "@/domain/phraseBook";
import { identifyPitch, pitchHeightOf } from "@/domain/musicalIdentity";
import type { ChromaticNote, MusicalMode } from "@/types/music";
import type { PatternNote } from "@/types/patterns";

/** More distant tones keep their pitch as borrowed notes. */
export const MODE_SNAP_SEMITONES = 1;

/**
 * Reinterpret an ORIGINAL melody, never the previous remap. Returning to its
 * mode restores every stored field, including explicit/absent borrowed flags.
 * Equal-size scales map scale tones by degree; other pitches snap by absolute
 * height within one semitone (ties lower), or stay at their borrowed pitch.
 * In equal-size scales, borrowed pitches snap between the mapped enclosing
 * degrees, even beyond one semitone. This preserves order; collapse is allowed.
 */
export function remap(
  baseNotes: readonly PatternNote[],
  fromMode: MusicalMode,
  toMode: MusicalMode,
  key: ChromaticNote,
): PatternNote[] {
  if (fromMode === toMode) return baseNotes.map(cloneNote);
  const source = getScaleForMode(fromMode);
  const target = getScaleForMode(toMode);
  const from = { tonic: key, mode: fromMode };
  const to = { tonic: key, mode: toMode };

  return baseNotes.map((note) => {
    const height = pitchHeightOf(note.note);
    const identity = identifyPitch(note.note, from);
    if (height === null || identity === null) return cloneNote(note);
    let nextHeight = height;
    const equalSize = source.degreeCount === target.degreeCount;
    if (equalSize && identity.scaleIndex !== null) {
      nextHeight = height - identity.semitones + target.intervals[identity.scaleIndex];
    } else {
      // Search both sides of the tonic boundary, rather than wrapping a pitch
      // class inside the current scientific octave (B4 can snap to C5).
      const tonicHeight = height - identity.semitones;
      let candidates = [-12, 0, 12].flatMap((octave) =>
        target.intervals.map((interval) => tonicHeight + octave + interval));
      if (equalSize) {
        const upper = source.intervals.findIndex((interval) => interval > identity.semitones);
        const lower = upper === -1 ? source.degreeCount - 1 : upper - 1;
        const floor = tonicHeight + target.intervals[lower];
        const ceiling = tonicHeight + (upper === -1 ? 12 : target.intervals[upper]);
        candidates = candidates.filter((pitch) => pitch >= floor && pitch <= ceiling);
      }
      candidates.sort((a, b) => Math.abs(a - height) - Math.abs(b - height) || a - b);
      if (equalSize || Math.abs(candidates[0] - height) <= MODE_SNAP_SEMITONES) nextHeight = candidates[0];
    }
    const next = identifyPitch(nextHeight, to)!;
    const octave = Math.floor(nextHeight / 12) - 1;
    return {
      ...cloneNote(note),
      note: `${CHROMATIC_NOTES[next.pitchClass]}${octave}`,
      scaleIndex: next.scaleIndex ?? -1,
      scaleDegree: next.scaleIndex === null ? 0 : next.scaleIndex + 1,
      isBorrowed: next.borrowed,
      pitchClassIndex: next.pitchClass,
      octave,
      frequency: Note.freq(`${CHROMATIC_NOTES[next.pitchClass]}${octave}`) ?? undefined,
    };
  });
}
