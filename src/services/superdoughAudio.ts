/**
 * superdoughAudio.ts
 * Live note playback via superdough — replaces Tone.js PolySynth/Sampler
 * for keyboard key presses only.  Sequencer files are untouched.
 */

// superdough has no bundled TypeScript declarations
// @ts-ignore
import { superdough, initAudio, registerSynthSounds, samples, getAudioContext as _getAudioContext, getSuperdoughAudioController, loadBuffer, getSound, soundMap } from "superdough";
// @ts-ignore
import { registerSoundfonts } from "@strudel/soundfonts";

/** Re-export so other modules can get the superdough AudioContext without importing Tone. */
export function getAudioContext(): AudioContext {
  // @ts-ignore
  return _getAudioContext() as AudioContext;
}

// ---------------------------------------------------------------------------
// Legacy Tone.js alias → superdough sound name
// Only non-identity mappings needed; all other instrument keys pass through.
// ---------------------------------------------------------------------------

/** Oscillator-based sounds that have no sample bank — skip pre-warm for these. */
const SYNTH_SOUNDS = new Set([
  "triangle", "sawtooth", "square", "sine", "buzz", "supersaw",
]);

const LEGACY_ALIASES: Record<string, string> = {
  synth: "triangle",
  amSynth: "sawtooth",
  fmSynth: "square",
  membraneSynth: "sine",
  metalSynth: "square",
  organ: "organ_full",
  pipeorgan: "pipeorgan_quiet",
  recorder: "recorder_tenor_sus",
};

// ---------------------------------------------------------------------------
// Module-level init state so we only set up once
// ---------------------------------------------------------------------------

let _initialized = false;
let _initPromise: Promise<void> | null = null;

// Sample packs with user-friendly labels for progress reporting
const SAMPLE_PACKS = [
  { key: "piano", label: "Piano" },
  { key: "vcsl", label: "Orchestra" },
  { key: "tidal-drum-machines", label: "Drum Machines" },
  { key: "EmuSP12", label: "EmuSP12" },
  { key: "Dirt-Samples", label: "Dirt Samples" },
  { key: "mridangam", label: "Mridangam" },
] as const;

/**
 * Core pre-warm logic — assumes superdough is already initialised.
 * Do NOT call initSuperdoughAudio() here; it would deadlock when invoked
 * from inside the init flow (e.g. _prewarmPianoSamples called by initSuperdoughAudio).
 */
async function _prewarmSoundCore(soundName: string): Promise<void> {
  const resolved = LEGACY_ALIASES[soundName] ?? soundName;
  if (SYNTH_SOUNDS.has(resolved)) return; // oscillators have no sample bank

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sound = (getSound as any)(resolved);
  if (!sound?.data?.samples) return;

  const ac = getAudioContext();
  const bank = sound.data.samples as Record<string, string[]> | string[];
  const audioUrls: string[] = Array.isArray(bank)
    ? bank
    : (Object.values(bank) as string[][]).flat();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await Promise.allSettled(audioUrls.map((url) => (loadBuffer as any)(url, ac)));
}

/**
 * Pre-loads every AudioBuffer for any registered superdough sound into its
 * shared bufferCache.  Works for any sample-based instrument; oscillator
 * sounds (sine, triangle, etc.) are skipped immediately.
 *
 * Safe to call at any time — triggers audio init if not yet done,
 * then drives fetch → decodeAudioData for all samples in the bank
 * so the first keypress is never silently dropped.
 */
export async function prewarmSoundSamples(soundName: string): Promise<void> {
  try {
    await initSuperdoughAudio(); // no-op if already initialised; safe for external callers
    await _prewarmSoundCore(soundName);
  } catch {
    // Non-fatal — worst case the first note may be silently dropped once.
  }
}

async function _prewarmPianoSamples(): Promise<void> {
  // Called from within initSuperdoughAudio — skip the init guard to avoid deadlock.
  return _prewarmSoundCore("piano");
}

/**
 * One-time setup: registers synth sounds, loads all sample packs, starts the
 * audio context.  Safe to call multiple times — subsequent calls are no-ops.
 *
 * @param progressCallback  Optional callback receiving (0-100, message) as each
 *                          sample pack resolves so callers can drive a loading UI.
 */
export async function initSuperdoughAudio(
  progressCallback?: (progress: number, message: string) => void
): Promise<void> {
  if (_initialized) return;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    try {
      // Register built-in WebAudio oscillator sounds (sine, triangle, etc.)
      registerSynthSounds();
      progressCallback?.(3, "Synth sounds registered");

      // Load all sample packs from the dough-samples CDN + GM soundfonts.
      // Track individual completions so the loading screen shows real steps.
      const BASE = "https://raw.githubusercontent.com/felixroos/dough-samples/main/";
      // 7 items total: 6 JSON packs + soundfonts
      const total = SAMPLE_PACKS.length + 1;
      let done = 0;

      const reportPack = (label: string) => {
        done++;
        // Range: 5 % → 75 % across all packs
        const pct = Math.round(5 + (done / total) * 70);
        progressCallback?.(pct, `${label} loaded (${done}/${total})`);
      };

      await Promise.all([
        ...SAMPLE_PACKS.map(({ key, label }) =>
          samples(`${BASE}${key}.json`).then(() => reportPack(label))
        ),
        registerSoundfonts().then(() => reportPack("Soundfonts")),
      ]);

      // Resume / set up the AudioContext and load worklets
      progressCallback?.(78, "Starting audio context…");
      await initAudio();

      // Pre-warm piano buffers so the first keypress is never silently dropped.
      progressCallback?.(82, "Warming up piano…");
      await _prewarmPianoSamples();

      progressCallback?.(100, "Audio engine ready");
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

  const sound = LEGACY_ALIASES[instrument] ?? instrument;
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

  const sound = LEGACY_ALIASES[instrument] ?? instrument;
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

/**
 * Returns all sound names currently registered in superdough's soundMap.
 * Available after initSuperdoughAudio() resolves.
 * Excludes internal entries starting with "_".
 */
export function getRegisteredSounds(): string[] {
  try {
    // @ts-ignore — soundMap is a nanostores map
    const dict = (soundMap as any).get() as Record<string, unknown>;
    return Object.keys(dict).filter((k) => !k.startsWith("_"));
  } catch {
    return [];
  }
}
