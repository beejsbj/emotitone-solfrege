import type { PatternNote } from '@/types/patterns';

const MICRO_GAP_MS = 40;

/** A display slot can include silence without lengthening its audible gate. */
export type PreparedRecordedNote<T> = T & { gateDuration?: number };

/** One beat of breathing room; a take need not end on a measure boundary. */
export function recordedLoopTailMs(sourceBpm: number): number {
  return 60000 / (Number.isFinite(sourceBpm) && sourceBpm > 0 ? sourceBpm : 120);
}

/** Clean only globally silent micro-gaps, preserving every onset and overlap.
 * Work on copies and retain raw timestamps. gateDuration preserves key-up when
 * duration is extended to absorb silence into the display/notation slot.
 * Only the voice(s) ending at the silence boundary get extended, including
 * unison/chord endings. Lane-padding rests are timing structure, not noise.
 */
export function prepareRecordedNotes<T extends Pick<PatternNote, 'pressTime' | 'releaseTime' | 'duration'>>(
  notes: readonly T[],
): PreparedRecordedNote<T>[] {
  const sorted: PreparedRecordedNote<T>[] = notes.map(note => ({ ...note, duration: Math.max(1, note.duration) }))
    .sort((a, b) => a.pressTime - b.pressTime);
  let ending: PreparedRecordedNote<T>[] = [];
  let end = -Infinity;
  for (const note of sorted) {
    const gap = note.pressTime - end;
    if (gap > 0 && gap <= MICRO_GAP_MS) {
      for (const prior of ending) {
        prior.gateDuration ??= prior.duration;
        prior.duration = note.pressTime - prior.pressTime;
      }
      end = note.pressTime;
    }
    const noteEnd = note.pressTime + note.duration;
    if (noteEnd > end) {
      end = noteEnd;
      ending = [note];
    } else if (noteEnd === end) ending.push(note);
  }
  return sorted;
}
