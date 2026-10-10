import { classifyDetectedPitch } from "@/domain/musicalIdentity";
import { CHROMATIC_NOTES } from "@/data";
import { LIVE_PITCH_SOURCE } from "@/services/livePitch";
import { voiceRmsToVelocity } from "@/services/voiceDynamics";
import type { LivePitchFrame } from "@/services/livePitch";
import type {
  ActiveNote,
  ChromaticNote,
  MusicalMode,
} from "@/types/music";

export interface HummingStageContext {
  laBasedMinor?: boolean;
  key: ChromaticNote;
  mode: MusicalMode;
  instrument: string;
}

interface StablePitchCallbacks {
  attack: (midi: number, frame: LivePitchFrame) => void;
  release: () => void;
}

let livePitchSessionCounter = 0;
const activeLivePitchStageNotes = new Map<string, ActiveNote>();

export function getActiveLivePitchStageNotes(): readonly ActiveNote[] {
  return Array.from(activeLivePitchStageNotes.values());
}

export const PITCH_HYSTERESIS_CENTS = 60;
export const PITCH_CONFIRMATION_SECONDS = 0.05;
export const PITCH_RELEASE_SECONDS = 0.05;
const PITCH_COMPARISON_EPSILON = 1e-9;

/** Audio-clock windows keep confirmation and silence independent of display rate.
 * Every change (including an octave) needs sustained evidence: an isolated
 * detector jump cannot release or replace the held note.
 */
export class StablePitchGate {
  private candidateMidi: number | null = null;
  private candidateSince = 0;
  private missingSince: number | null = null;
  private activeMidi: number | null = null;

  constructor(
    private readonly callbacks: StablePitchCallbacks,
  ) {}

  push(frame: LivePitchFrame) {
    if (!frame.voiced || frame.midi == null || frame.frequencyHz == null) {
      this.candidateMidi = null;
      this.missingSince ??= frame.timestampSeconds;
      if (frame.timestampSeconds - this.missingSince + PITCH_COMPARISON_EPSILON >= PITCH_RELEASE_SECONDS) {
        this.release();
      }
      return;
    }

    this.missingSince = null;
    const roundedMidi = Math.round(frame.midi);
    if (
      this.activeMidi != null
      && Math.abs(frame.midi - this.activeMidi) + PITCH_COMPARISON_EPSILON < PITCH_HYSTERESIS_CENTS / 100
    ) {
      this.candidateMidi = null;
      return;
    }

    if (roundedMidi !== this.candidateMidi) {
      this.candidateMidi = roundedMidi;
      this.candidateSince = frame.timestampSeconds;
      return;
    }

    if (frame.timestampSeconds - this.candidateSince + PITCH_COMPARISON_EPSILON < PITCH_CONFIRMATION_SECONDS) return;

    this.release();
    this.activeMidi = roundedMidi;
    this.candidateMidi = null;
    this.callbacks.attack(roundedMidi, frame);
  }

  flush() {
    this.release();
    this.candidateMidi = null;
    this.missingSince = null;
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
  let currentContext = { ...context };
  const sessionId = ++livePitchSessionCounter;
  let active: ActiveNote | null = null;
  let noteCounter = 0;

  const gate = new StablePitchGate({
    attack(midi, frame) {
      const pitch = classifyDetectedPitch(
        { midi },
        { tonic: currentContext.key, mode: currentContext.mode },
        currentContext.laBasedMinor,
      );
      if (!pitch) return;
      const { pitchClass: pitchClassIndex } = pitch;
      const pitchClass = CHROMATIC_NOTES[pitchClassIndex];
      const octave = Math.floor(midi / 12) - 1;
      if (!pitchClass || !Number.isFinite(octave)) {
        return;
      }
      const noteName = `${pitchClass}${octave}`;

      const solfegeIndex = pitch.scaleIndex ?? -1;
      const note = pitch.solfege;
      const tonicIndex = CHROMATIC_NOTES.indexOf(currentContext.key);
      const keyboardOctave = tonicIndex === -1
        ? octave
        : octave - Number(pitchClassIndex < tonicIndex);

      active = {
        noteId: `live-pitch-${sessionId}-${++noteCounter}`,
        noteName,
        solfege: note,
        frequency: pitch.frequency,
        octave,
        keyboardOctave,
        solfegeIndex,
        pitchClassIndex,
        key: currentContext.key,
        mode: currentContext.mode,
      };
      activeLivePitchStageNotes.set(active.noteId, active);

      target.dispatchEvent(new CustomEvent("note-played", {
        detail: {
          ...active,
          note: active.solfege,
          instrument: currentContext.instrument,
          instrumentConfig: null,
          source: LIVE_PITCH_SOURCE,
          record: false,
          mirrorMidi: false,
          velocity: voiceRmsToVelocity(frame.rms),
        },
      }));
    },
    release() {
      if (!active) return;
      target.dispatchEvent(new CustomEvent("note-released", {
        detail: {
          ...active,
          note: active.solfege.name,
          instrument: currentContext.instrument,
          instrumentConfig: null,
          source: LIVE_PITCH_SOURCE,
          record: false,
          mirrorMidi: false,
        },
      }));
      activeLivePitchStageNotes.delete(active.noteId);
      active = null;
    },
  });

  return {
    push: (frame: LivePitchFrame) => gate.push(frame),
    stop: () => gate.flush(),
    updateContext: (nextContext: HummingStageContext) => {
      if (
        nextContext.key === currentContext.key
        && nextContext.mode === currentContext.mode
        && nextContext.instrument === currentContext.instrument
        && Boolean(nextContext.laBasedMinor) === Boolean(currentContext.laBasedMinor)
      ) return;

      // Release with the same musical identity used for the attack, then let
      // the still-sounding pitch re-enter under the new context.
      gate.flush();
      currentContext = { ...nextContext };
    },
  };
}

// Capture keeps this compatibility name; the bridge itself is presentation-only
// and is also used by standalone Live Listening.
export const createHummingStageBridge = createLivePitchStageBridge;
