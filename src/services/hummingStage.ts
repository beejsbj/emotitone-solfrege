import { CHROMATIC_NOTES, getScaleForMode } from "@/data";
import { LIVE_PITCH_SOURCE } from "@/services/livePitch";
import { findScaleIndexForPitchClass } from "@/services/scalePitch";
import type { LivePitchFrame } from "@/services/livePitch";
import type { ChromaticNote, MusicalMode, SolfegeData } from "@/types/music";

export interface HummingStageContext {
  key: ChromaticNote;
  mode: MusicalMode;
  instrument: string;
}

interface StablePitchCallbacks {
  attack: (midi: number, frame: LivePitchFrame) => void;
  release: () => void;
}

let livePitchSessionCounter = 0;

/**
 * Converts noisy provisional frames into a monophonic note lifecycle. A new
 * pitch must hold for two frames, and one missing frame is tolerated so a
 * momentary clarity dip does not flash the Stage off.
 */
export class StablePitchGate {
  private candidateMidi: number | null = null;
  private candidateFrames = 0;
  private missingFrames = 0;
  private activeMidi: number | null = null;

  constructor(
    private readonly callbacks: StablePitchCallbacks,
    private readonly stableFrameCount = 2,
    private readonly releaseFrameCount = 2,
  ) {}

  push(frame: LivePitchFrame) {
    if (!frame.voiced || frame.midi == null || frame.frequencyHz == null) {
      this.candidateMidi = null;
      this.candidateFrames = 0;
      this.missingFrames += 1;
      if (this.missingFrames >= this.releaseFrameCount) this.release();
      return;
    }

    this.missingFrames = 0;
    const roundedMidi = Math.round(frame.midi);
    if (roundedMidi === this.activeMidi) {
      this.candidateMidi = null;
      this.candidateFrames = 0;
      return;
    }

    if (roundedMidi === this.candidateMidi) {
      this.candidateFrames += 1;
    } else {
      this.candidateMidi = roundedMidi;
      this.candidateFrames = 1;
    }

    if (this.candidateFrames < this.stableFrameCount) return;

    this.release();
    this.activeMidi = roundedMidi;
    this.candidateMidi = null;
    this.candidateFrames = 0;
    this.callbacks.attack(roundedMidi, frame);
  }

  flush() {
    this.release();
    this.candidateMidi = null;
    this.candidateFrames = 0;
    this.missingFrames = 0;
  }

  private release() {
    if (this.activeMidi == null) return;
    this.callbacks.release();
    this.activeMidi = null;
  }
}

export function createLivePitchStageBridge(
  context: HummingStageContext,
  target: Pick<Window, "dispatchEvent"> = window,
) {
  const sessionId = ++livePitchSessionCounter;
  let active: {
    noteId: string;
    noteName: string;
    note: SolfegeData;
    frequency: number;
    octave: number;
    solfegeIndex: number;
    pitchClassIndex: number;
  } | null = null;
  let noteCounter = 0;

  const gate = new StablePitchGate({
    attack(midi, frame) {
      const pitchClass = CHROMATIC_NOTES[((midi % 12) + 12) % 12];
      const pitchClassIndex = ((midi % 12) + 12) % 12;
      const octave = Math.floor(midi / 12) - 1;
      if (!pitchClass || !Number.isFinite(octave) || frame.frequencyHz == null) {
        return;
      }
      const noteName = `${pitchClass}${octave}`;

      const solfegeIndex = findScaleIndexForPitchClass(
        pitchClass,
        context,
      );
      if (solfegeIndex == null) return;
      const note = getScaleForMode(context.mode).solfege[solfegeIndex];
      if (!note) return;

      active = {
        noteId: `live-pitch-${sessionId}-${++noteCounter}`,
        noteName,
        note,
        frequency: frame.frequencyHz,
        octave,
        solfegeIndex,
        pitchClassIndex,
      };

      target.dispatchEvent(new CustomEvent("note-played", {
        detail: {
          ...active,
          key: context.key,
          mode: context.mode,
          instrument: context.instrument,
          instrumentConfig: null,
          source: LIVE_PITCH_SOURCE,
          record: false,
          mirrorMidi: false,
        },
      }));
    },
    release() {
      if (!active) return;
      target.dispatchEvent(new CustomEvent("note-released", {
        detail: {
          ...active,
          note: active.note.name,
          key: context.key,
          mode: context.mode,
          instrument: context.instrument,
          instrumentConfig: null,
          source: LIVE_PITCH_SOURCE,
          record: false,
          mirrorMidi: false,
        },
      }));
      active = null;
    },
  });

  return {
    push: (frame: LivePitchFrame) => gate.push(frame),
    stop: () => gate.flush(),
  };
}

// Capture keeps this compatibility name; the bridge itself is presentation-only
// and is also used by standalone Live Listening.
export const createHummingStageBridge = createLivePitchStageBridge;
