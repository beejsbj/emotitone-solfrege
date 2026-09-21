import type { PatternNote } from '@/types/patterns';

const MICRO_GAP_MS = 40;

/** One beat of breathing room; a take need not end on a measure boundary. */
export function recordedLoopTailMs(sourceBpm: number): number {
  return 60000 / (Number.isFinite(sourceBpm) && sourceBpm > 0 ? sourceBpm : 120);
}

/** Clean only globally silent micro-gaps, preserving every onset and overlap.
 * Work on copies: raw performance timestamps remain available for later edits.
 * Only the voice(s) ending at the silence boundary get extended, including
 * unison/chord endings. Lane-padding rests are timing structure, not noise.
 */
export function prepareRecordedNotes<T extends Pick<PatternNote, 'pressTime' | 'releaseTime' | 'duration'>>(
  notes: readonly T[],
): T[] {
  const sorted = notes.map(note => ({ ...note, duration: Math.max(1, note.duration) }))
    .sort((a, b) => a.pressTime - b.pressTime);
  let ending: T[] = [];
  let end = -Infinity;
  for (const note of sorted) {
    const gap = note.pressTime - end;
    if (gap > 0 && gap <= MICRO_GAP_MS) {
      for (const prior of ending) {
        prior.duration = note.pressTime - prior.pressTime;
        prior.releaseTime = note.pressTime;
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
