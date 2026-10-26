import type { LoopDialSegment } from "@/components/primatives/LoopDial.vue";
import { chromaticPitchHeight } from "@/services/scalePitch";
import type { LooperMemberView } from "@/stores/looper";
import type { ChromaticNote, MusicalMode } from "@/types/music";

type PitchClassColor = (pitchClass: number, mode: MusicalMode, key: ChromaticNote, octave: number) => string;
type ScaleIndexColor = (scaleIndex: number, mode: MusicalMode, key: ChromaticNote, octave: number) => string;

/**
 * What a playing pattern's dial shows, shared by its loop dial (the Looper's
 * column) and its strip dial in the reel: the notes as they sound now (bent to
 * the Looper's key and mode unless pinned), at their place in the phrase, over
 * the member's loop length. The hand sweeps from `originBars` at `rate`.
 */
export function looperDialProps(
  view: LooperMemberView,
  colors: { byPitchClass: PitchClassColor; byScaleIndex: ScaleIndexColor },
) {
  const segments: LoopDialSegment[] = [...view.notes]
    .sort((left, right) => left.pressTime - right.pressTime)
    .map((note) => ({
      color: typeof note.pitchClassIndex === "number" && Number.isInteger(note.pitchClassIndex)
        ? colors.byPitchClass(note.pitchClassIndex, view.mode, view.key, note.octave)
        : colors.byScaleIndex(note.scaleIndex, view.mode, view.key, note.octave),
      startMs: note.pressTime,
      durationMs: note.duration,
      height: chromaticPitchHeight(note, { key: view.key, mode: view.mode }),
    }));
  return {
    segments,
    lengthMs: view.lengthBars * view.phraseBarMs,
    barMs: view.phraseBarMs,
    originBars: view.originBars,
    rate: view.rate,
  };
}
