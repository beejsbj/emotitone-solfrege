/**
 * superdoughAudio.ts
 * Live note playback via superdough — replaces Tone.js PolySynth/Sampler
 * for keyboard key presses only.  Sequencer files are untouched.
 */

// superdough has no bundled TypeScript declarations
// @ts-ignore
import { superdough, initAudio, registerSynthSounds, samples, getAudioContext as _getAudioContext, getSuperdoughAudioController, loadBuffer, getSound } from "superdough";

/** Re-export so other modules can get the superdough AudioContext without importing Tone. */
export function getAudioContext(): AudioContext {
  // @ts-ignore
  return _getAudioContext() as AudioContext;
}

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
 * Pre-loads every piano AudioBuffer directly into superdough's internal
 * bufferCache by calling its exported `loadBuffer(url, audioContext)`.
 *
 * Background: superdough lazy-decodes sample buffers on first play and
 * checks `if (ac.currentTime > scheduledTime)` after the async load.
 * We schedule notes only 10 ms into the future, but fetch + decodeAudioData
 * takes 50–200 ms on a cold cache, so the check fires and the note drops.
 *
 * We read the full CDN URLs from the already-registered piano bank
 * (populated by the `samples()` call above, which applies the base URL
 * prefix via processSampleMap).  Calling `loadBuffer` on those full URLs
 * runs fetch → decodeAudioData and stores the decoded AudioBuffer in the
 * shared cache BEFORE any user interaction, so the "took too long" check
 * is never reached during actual play.
 */
async function _prewarmPianoSamples(): Promise<void> {
  try {
    const ac = getAudioContext();

    // getSound('piano') returns the registered sound entry whose .data.samples
    // is the bank object: { "C4": ["https://.../C4v8.mp3"], ... } (full URLs).
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sound = (getSound as any)("piano");
    if (!sound?.data?.samples) return;

    const bank = sound.data.samples as Record<string, string[]> | string[];
    const audioUrls: string[] = Array.isArray(bank)
      ? bank
      : (Object.values(bank) as string[][]).flat();

    // Drive fetch + decodeAudioData for every sample through superdough's own
    // loadBuffer so the result lands in its shared bufferCache.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await Promise.allSettled(audioUrls.map((url) => (loadBuffer as any)(url, ac)));
  } catch {
    // Non-fatal — worst case, the very first note on an uncached range is
    // silently dropped once, then cached for all future plays.
  }
}

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

      // Pre-warm piano sample buffers so the first user keypress doesn't miss.
      // superdough lazy-fetches buffers on first play and has a short internal
      // timeout; if the fetch isn't done in time, the note is silently dropped.
      // Triggering near-silent notes here forces the buffers to download and
      // cache while the app is still loading, before the user can interact.
      await _prewarmPianoSamples();

      _initialized = true;
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

/**
 * Returns the superdough master GainNode that all superdough audio flows through.
 * Fan-out via WebAudio lets callers connect this to additional analysis chains
 * while superdough continues routing to the speakers normally.
 */
export function getSuperdoughMasterGain(): GainNode | null {
  try {
    // @ts-ignore — getSuperdoughAudioController has no TS declarations
    return (getSuperdoughAudioController() as any)?.output?.destinationGain ?? null;
  } catch {
    return null;
  }
}
