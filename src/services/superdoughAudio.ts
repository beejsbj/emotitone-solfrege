/**
 * superdoughAudio.ts
 * Live note playback via superdough — replaces Tone.js PolySynth/Sampler
 * for keyboard key presses only.  Sequencer files are untouched.
 */

// superdough has no bundled TypeScript declarations
// @ts-ignore
import { superdough, initAudio, registerSynthSounds, samples, getAudioContext } from "superdough";

// ---------------------------------------------------------------------------
// Instrument → superdough sound name mapping
// ---------------------------------------------------------------------------

const INSTRUMENT_SOUND_MAP: Record<string, string> = {
  piano: "piano",
  synth: "triangle",
  amSynth: "sawtooth",
  fmSynth: "sawtooth",
  membraneSynth: "sine",
  metalSynth: "square",
  flute: "flute",
};

function toSuperdoughSound(instrument: string): string {
  return INSTRUMENT_SOUND_MAP[instrument] ?? "triangle";
}

// ---------------------------------------------------------------------------
// Module-level init state so we only set up once
// ---------------------------------------------------------------------------

let _initialized = false;
let _initPromise: Promise<void> | null = null;

/**
 * One-time setup: registers synth sounds, loads piano samples, starts the
 * audio context.  Safe to call multiple times — subsequent calls are no-ops.
 */
export async function initSuperdoughAudio(): Promise<void> {
  if (_initialized) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      // Register built-in WebAudio oscillator sounds (sine, triangle, etc.)
      registerSynthSounds();

      // Load piano samples from the dough-samples CDN
      await samples(
        "https://raw.githubusercontent.com/felixroos/dough-samples/main/piano.json"
      );

      // Resume / set up the AudioContext and load worklets
      await initAudio();

      _initialized = true;
      console.log("[superdoughAudio] ready");
    } catch (err) {
      console.error("[superdoughAudio] init error:", err);
      // Reset so callers can retry after a user gesture
      _initPromise = null;
    }
  })();

  return _initPromise;
}

// ---------------------------------------------------------------------------
// Core helpers
// ---------------------------------------------------------------------------

/**
 * Returns the AudioContext current time plus a small scheduling offset so
 * superdough can schedule the note into the near future.
 */
function nowPlusOffset(offsetSeconds = 0.01): number {
  return (getAudioContext() as AudioContext).currentTime + offsetSeconds;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Attack a note.  Because superdough is fire-and-forget (no true sustain),
 * we schedule it with a long duration + release tail so it sounds "held".
 *
 * @param noteId      Unique identifier for this press (unused by superdough
 *                    itself but kept so call-sites remain symmetric).
 * @param noteName    Scientific pitch notation e.g. "C4", "F#5".
 * @param instrument  Instrument key from the instrument store.
 */
export async function attackNote(
  noteId: string,
  noteName: string,
  instrument: string
): Promise<void> {
  await initSuperdoughAudio();

  const sound = toSuperdoughSound(instrument);
  const duration = 3; // seconds — long enough to feel "held"

  await superdough(
    {
      s: sound,
      note: noteName,
      duration,
      gain: 0.8,
      attack: 0.01,
      release: 1.5,
    },
    nowPlusOffset(),
    duration,
    1 // cps
  );
}

/**
 * Release a note.  superdough manages its own voice lifecycle via the
 * release envelope set in attackNote, so this is a no-op stub.
 * Web Audio gain ramping can be added here if true sustain is needed later.
 *
 * @param _noteId  The ID that was returned by attackNote (unused for now).
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function releaseNote(_noteId: string): void {
  // No-op: superdough voices decay via their own release envelope.
}

/**
 * Play a note for a specific duration (in milliseconds).
 *
 * @param noteName    Scientific pitch notation e.g. "C4".
 * @param durationMs  Duration in milliseconds.
 * @param instrument  Instrument key from the instrument store.
 */
export async function playNoteWithDuration(
  noteName: string,
  durationMs: number,
  instrument: string
): Promise<void> {
  await initSuperdoughAudio();

  const sound = toSuperdoughSound(instrument);
  const durationSeconds = durationMs / 1000;

  await superdough(
    {
      s: sound,
      note: noteName,
      duration: durationSeconds,
      gain: 0.8,
      attack: 0.01,
      release: Math.min(durationSeconds * 0.5, 1),
    },
    nowPlusOffset(),
    durationSeconds,
    1
  );
}

/**
 * Release all active voices.  Stub for now — superdough voices are
 * self-managing.  Replace with AudioContext gain ramp if needed.
 */
export function releaseAll(): void {
  // No-op stub.
}
