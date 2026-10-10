import { Note } from "@tonaljs/tonal";
import { CHROMATIC_NOTES } from "@/data/notes";
import { getScaleForMode } from "@/data/scales";
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
 * Nearest-tone snapping can collapse adjacent pitches onto one tone. Mixing
 * equal-size degree mapping with borrowed-tone snapping can reverse contour
 * (C major blues E-F -> C minor blues F#-F); the two explicit rules win here.
 */
export function remap(
  baseNotes: readonly PatternNote[],
  fromMode: MusicalMode,
  toMode: MusicalMode,
  key: ChromaticNote,
): PatternNote[] {
  if (fromMode === toMode) return baseNotes.map((note) => ({ ...note }));
  const source = getScaleForMode(fromMode);
  const target = getScaleForMode(toMode);
  const from = { tonic: key, mode: fromMode };
  const to = { tonic: key, mode: toMode };

  return baseNotes.map((note) => {
    const height = pitchHeightOf(note.note);
    const identity = identifyPitch(note.note, from);
    if (height === null || identity === null) return { ...note };
    let nextHeight = height;
    if (source.degreeCount === target.degreeCount && identity.scaleIndex !== null
      && !note.isBorrowed) {
      nextHeight = height - identity.semitones + target.intervals[identity.scaleIndex];
    } else {
      // Search both sides of the tonic boundary, rather than wrapping a pitch
      // class inside the current scientific octave (B4 can snap to C5).
      const tonicHeight = height - identity.semitones;
      const candidates = [-12, 0, 12].flatMap((octave) =>
        target.intervals.map((interval) => tonicHeight + octave + interval));
      candidates.sort((a, b) => Math.abs(a - height) - Math.abs(b - height) || a - b);
      if (Math.abs(candidates[0] - height) <= MODE_SNAP_SEMITONES) nextHeight = candidates[0];
    }
    const next = identifyPitch(nextHeight, to)!;
    const octave = Math.floor(nextHeight / 12) - 1;
    return {
      ...note,
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
