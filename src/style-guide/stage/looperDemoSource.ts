/**
 * A scripted Looper for the style guide: three members in C major at 96 bpm
 * (a 1-bar arpeggio, a 2-bar bass and a 4-bar tune that sets the turn), plus
 * an optional live take that is held, released and left pending each turn.
 * Specimen-only demo state; production reads a real transport.
 */
import type {
  LooperStageMember,
  LooperStageNote,
  LooperStageSource,
} from "@/composables/canvas/looperStageSource";

export interface LooperDemoControls {
  running: boolean;
  /** Mutes the tune, so a silent member can be judged. */
  tuneMuted: boolean;
  /** Plays a live take over the loop: held notes, then pending ones. */
  liveTake: boolean;
}

const BPM = 96;
const BAR = 240_000 / BPM;
const TURN = 4 * BAR;

const note = (name: string, beat: number, beats: number): LooperStageNote => ({
  note: name,
  pressTime: beat * (BAR / 4),
  duration: beats * (BAR / 4) * 0.92,
});

const ARP: LooperStageMember = {
  id: "arp",
  bars: 1,
  audible: true,
  notes: [note("C5", 0, 0.4), note("E5", 1, 0.4), note("G5", 2, 0.4), note("B4", 3, 0.4)],
};

const BASS: LooperStageMember = {
  id: "bass",
  bars: 2,
  audible: true,
  notes: [note("C3", 0, 1.8), note("G2", 2, 1.8), note("A2", 4, 1.8), note("F2", 6, 1.8)],
};

const TUNE_NOTES = [
  note("E4", 0, 1), note("G4", 1, 1), note("A4", 2, 2),
  note("G4", 4, 1.5), note("E4", 6, 1), note("D4", 7, 1),
  note("C4", 8, 3), note("D4", 12, 1), note("E4", 13, 1), note("G4", 14, 2),
];
const TUNE: LooperStageMember = { id: "tune", bars: 4, audible: true, notes: TUNE_NOTES };
const MUTED_TUNE: LooperStageMember = { ...TUNE, audible: false };

// Oldest first: the bass sits nearest the centre, the arpeggio outermost.
const PLAYING = Object.freeze([BASS, TUNE, ARP]);
const PLAYING_MUTED = Object.freeze([BASS, MUTED_TUNE, ARP]);

/** The live take's gestures, in turn ms. */
const GESTURES = [
  { note: "B4", at: 2.5 * BAR, length: 0.3 * BAR },
  { note: "A4", at: 3 * BAR, length: 0.2 * BAR },
  { note: "G4", at: 3.25 * BAR, length: 0.5 * BAR },
];
const RELEASED: readonly LooperStageNote[] = GESTURES.map((gesture) => ({
  note: gesture.note,
  pressTime: gesture.at,
  duration: gesture.length,
}));
/** Released gestures as stable arrays, so the Stage rebuilds only when one lands. */
const PENDING = GESTURES.map((_, count) => Object.freeze(RELEASED.slice(0, count)))
  .concat([Object.freeze(RELEASED.slice())]);

export function createLooperDemoSource(
  controls: () => LooperDemoControls,
  now: () => number = () => performance.now(),
): LooperStageSource {
  let accumulated = 0;
  let startedAt = 0;
  let wasRunning = false;
  const held: { note: string; pressTime: number; duration: number }[] = GESTURES.map((gesture) => ({
    note: gesture.note,
    pressTime: gesture.at,
    duration: 0,
  }));
  const heldNow: LooperStageNote[] = [];

  const position = () => {
    const running = controls().running;
    const at = now();
    if (running !== wasRunning) {
      if (running) startedAt = at;
      else accumulated += at - startedAt;
      wasRunning = running;
    }
    return running ? accumulated + (at - startedAt) : accumulated;
  };

  const turnPosition = () => ((position() % TURN) + TURN) % TURN;

  return {
    get members() {
      return controls().tuneMuted ? PLAYING_MUTED : PLAYING;
    },
    bpm: BPM,
    get running() {
      return controls().running;
    },
    positionMs: position,
    heldNotes() {
      heldNow.length = 0;
      if (!controls().liveTake) return heldNow;
      const at = turnPosition();
      for (let index = 0; index < GESTURES.length; index += 1) {
        const gesture = GESTURES[index];
        if (at < gesture.at || at >= gesture.at + gesture.length) continue;
        held[index].duration = at - gesture.at;
        heldNow.push(held[index]);
      }
      return heldNow;
    },
    pendingNotes() {
      if (!controls().liveTake) return PENDING[0];
      const at = turnPosition();
      let released = 0;
      for (const gesture of GESTURES) if (at >= gesture.at + gesture.length) released += 1;
      return PENDING[released];
    },
  };
}
