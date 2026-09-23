/**
 * superdoughAudio.ts
 * Instrument catalog/preparation and the Superdough playback adapter.
 * audioRuntime owns the shared graph; patternPlayback owns the sole pattern
 * transport; livePlayback selects the prepared live renderer.
 */

// superdough has no bundled TypeScript declarations
// @ts-ignore
import { superdough, registerSynthSounds, samples, loadBuffer, getSound, soundMap, hasVoice, stopVoice, cancelVoice, releaseVoice, releaseAllVoices } from "superdough";
import { webaudioOutput } from "@strudel/webaudio";
// @ts-ignore
import { prewarmSoundfont, registerSoundfonts } from "@strudel/soundfonts";
import { musicTheory, CHROMATIC_NOTES } from "@/services/music";
import type {
  ActiveNote,
  ChromaticNote,
  MusicalMode,
  SolfegeData,
} from "@/types/music";
import { Note as TonalNote } from "@tonaljs/tonal";
import { DEFAULT_INSTRUMENT, isSynthSound } from "@/data/instruments";
import { prepareLivePlayback } from "@/services/livePlayback";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import { getLiveArticulation } from "@/services/liveArticulation";
import { audioTimeToOutputTime, LIVE_AUDIO_SCHEDULING_LEAD_MS } from "@/services/liveAudioTiming";
import { getAudioContext, getMasterGain, initializeAudio, LIVE_ORBIT } from "@/services/audioRuntime";
import { setLivePlaybackShaping } from "@/services/livePlayback";
import { LIVE_DELAY_FEEDBACK, LIVE_DELAY_TIME_SECONDS } from "@/audio/liveShaping";

/** Compatibility facade: the playback graph is owned by audioRuntime. */
export { getAudioContext };

/** Oscillator-based sounds that have no sample bank — skip pre-warm for these. */
const SYNTH_SOUNDS = new Set([
  "triangle", "sawtooth", "square", "sine", "buzz", "supersaw",
]);

// ---------------------------------------------------------------------------
// Module-level init state so we only set up once
// ---------------------------------------------------------------------------

let _initialized = false;
let _initPromise: Promise<void> | null = null;
const _prewarmedSounds = new Set<string>();
type LiveSynthControls = {
  cutoff?: number;
  resonance?: number;
  attack?: number;
  release?: number;
  room?: number;
  delay?: number;
  overrides?: { attack?: boolean; release?: boolean };
};

let _liveSynthControls: LiveSynthControls | null = null;

export function setLiveSynthControls(
  controls: LiveSynthControls | null
): void {
  _liveSynthControls = controls ? {
    ...controls,
    ...(controls.overrides ? { overrides: { ...controls.overrides } } : {}),
  } : null;
  // Prepared instruments bypass attackNote; mirror the same rules to the worklet.
  const current = _liveSynthControls;
  setLivePlaybackShaping({
    cutoff: current?.cutoff ?? 12000,
    resonance: current?.resonance ?? 0,
    room: current?.room ?? 0,
    delay: current?.delay ?? 0,
    envelope: {
      attack: current?.overrides?.attack ? current.attack : undefined,
      release: current?.overrides?.release ? current.release : undefined,
    },
  });
}
const STRUDEL_PLAYBACK_SOURCE = "strudel-playback";
const LIVE_NOTE_PLACEHOLDER_DURATION_SECONDS = 0.25;
const _activeStrudelVisuals = new Map<
  string,
  {
    note: SolfegeData;
    noteName: string;
    frequency: number;
    octave: number;
    keyboardOctave: number;
    solfegeIndex: number;
    pitchClassIndex: number;
    mode: MusicalMode;
    key: ChromaticNote;
    instrument: string;
    releaseTimeout: number;
    audibleAt: number;
  }
>();
let _strudelVisualCounter = 0;

export function getActiveStrudelStageNotes(): readonly ActiveNote[] {
  return Array.from(_activeStrudelVisuals, ([noteId, active]) => ({
    noteId,
    noteName: active.noteName,
    solfege: active.note,
    frequency: active.frequency,
    octave: active.octave,
    keyboardOctave: active.keyboardOctave,
    solfegeIndex: active.solfegeIndex,
    pitchClassIndex: active.pitchClassIndex,
    mode: active.mode,
    key: active.key,
    audibleAt: active.audibleAt,
  }));
}

// Sample packs with user-friendly labels for progress reporting
const SAMPLE_PACKS = [
  { key: "piano", label: "Piano" },
  { key: "vcsl", label: "Orchestra" },
] as const;

/**
 * Core pre-warm logic — assumes superdough is already initialised.
 * Do NOT call initSuperdoughAudio() here; it would deadlock when invoked
 * from inside the init flow (e.g. _prewarmDefaultInstrument called by initSuperdoughAudio).
 */
async function _prewarmSoundCore(
  soundName: string,
  tolerateBufferFailures = false
): Promise<void> {
  const resolved = resolveLiveSoundName(soundName);
  let sound;
  try {
    // Resolve the registered sound before treating synth names as ready. This
    // prevents pre-init callers and typos from being reported as playable.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    sound = (getSound as any)(resolved);
  } catch (error) {
    if (tolerateBufferFailures) return;
    throw error;
  }

  if (!sound) {
    if (tolerateBufferFailures) return;
    throw new Error(`Unknown sound: ${soundName}`);
  }

  if (sound.data?.type === "soundfont") {
    const font = Array.isArray(sound.data.fonts) ? sound.data.fonts[0] : null;
    if (!font) {
      if (tolerateBufferFailures) return;
      throw new Error(`Soundfont has no preset: ${soundName}`);
    }

    try {
      await prewarmSoundfont(font, getAudioContext());
      await prepareLivePlayback(getAudioContext(), getSuperdoughMasterGain(), resolved);
      _prewarmedSounds.add(resolved);
    } catch (error) {
      if (!tolerateBufferFailures) throw error;
    }
    return;
  }

  if (SYNTH_SOUNDS.has(resolved) || !sound?.data?.samples) {
    await prepareLivePlayback(getAudioContext(), getSuperdoughMasterGain(), resolved);
    _prewarmedSounds.add(resolved); // no samples needed → already "ready"
    return;
  }

  const ac = getAudioContext();
  const bank = sound.data.samples as Record<string, string[]> | string[];
  const audioUrls: string[] = Array.isArray(bank)
    ? bank
    : (Object.values(bank) as string[][]).flat();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const results = await Promise.allSettled(
    audioUrls.map((url) => (loadBuffer as any)(url, ac))
  );
  const failedBuffer = results.find(
    (result): result is PromiseRejectedResult => result.status === "rejected"
  );

  if (failedBuffer) {
    if (!tolerateBufferFailures) {
      throw failedBuffer.reason;
    }
    return;
  }

  await prepareLivePlayback(getAudioContext(), getSuperdoughMasterGain(), resolved);
  _prewarmedSounds.add(resolved);
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
  await initSuperdoughAudio(); // no-op if already initialised; safe for external callers
  await _prewarmSoundCore(soundName);
}

/**
 * Returns true when a sound can play immediately. Sample banks must already be
 * in the buffer cache; oscillator and other no-sample sounds are always ready.
 */
export function isPrewarmed(soundName: string): boolean {
  const resolved = resolveLiveSoundName(soundName);
  if (_prewarmedSounds.has(resolved)) {
    return true;
  }

  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sound = (getSound as any)(resolved);
    if (sound?.data?.type === "soundfont") return false;
    return Boolean(
      sound && (SYNTH_SOUNDS.has(resolved) || !sound?.data?.samples)
    );
  } catch {
    return false;
  }
}

/**
 * Returns all registered sounds that can currently play without a warmup.
 */
export function getReadySounds(): string[] {
  return getRegisteredSounds().filter((soundName) => isPrewarmed(soundName));
}

async function _prewarmDefaultInstrument(): Promise<void> {
  // Called from within initSuperdoughAudio — skip the init guard to avoid deadlock.
  return _prewarmSoundCore(DEFAULT_INSTRUMENT, true);
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
          Promise.resolve(samples(`${BASE}${key}.json`)).then(() => reportPack(label))
        ),
        Promise.resolve(registerSoundfonts()).then(() => reportPack("Soundfonts")),
      ]);

      // The editor creates the single pattern transport through patternPlayback.
      // Instrument startup only initializes the shared audio graph.
      progressCallback?.(79, "Starting audio context…");
      await initializeAudio();

      // Only the default instrument is decoded eagerly. Other registered
      // instruments warm on selection so startup stays bounded on mobile.
      progressCallback?.(80, `Preparing ${DEFAULT_INSTRUMENT}…`);
      await _prewarmDefaultInstrument();
      progressCallback?.(98, `${DEFAULT_INSTRUMENT} ready`);

      progressCallback?.(100, "Audio engine ready");
      _initialized = true;
    } catch (err) {
      console.error("[superdoughAudio] init error:", err);
      // Reset so callers can retry after a user gesture
      _initPromise = null;
      throw err;
    }
  })();

  return _initPromise;
}

function normalizeChromaticNote(noteName: string): ChromaticNote | null {
  const candidates = [noteName, TonalNote.enharmonic(noteName)]
    .map((candidate) => TonalNote.get(candidate).pc)
    .filter(Boolean);

  for (const candidate of candidates) {
    if (CHROMATIC_NOTES.includes(candidate as ChromaticNote)) {
      return candidate as ChromaticNote;
    }
  }

  return null;
}

function resolveSolfegeIndex(noteName: string): number | null {
  const chromaticNote = normalizeChromaticNote(noteName);
  if (!chromaticNote) {
    return null;
  }

  return musicTheory.getCurrentScaleNotes().indexOf(chromaticNote);
}

function borrowedPitchSolfege(noteName: ChromaticNote): SolfegeData {
  return {
    name: noteName,
    number: 0,
    emotion: "Borrowed harmony tone",
    description: "An explicit chord alteration outside the active scale.",
    texture: "harmonic",
  };
}

function extractHapNoteName(hap: unknown): string | null {
  const value = (hap as { value?: unknown })?.value;

  if (typeof value === "string") {
    return value;
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const candidate = (value as { note?: unknown; value?: unknown }).note
      ?? (value as { note?: unknown; value?: unknown }).value;
    return typeof candidate === "string" ? candidate : null;
  }

  return null;
}

function extractHapFrequency(hap: unknown, noteName: string): number {
  const value = (hap as { value?: unknown })?.value;

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const freq = (value as { freq?: unknown }).freq;
    if (typeof freq === "number") {
      return freq;
    }
  }

  return TonalNote.get(noteName).freq || 0;
}

function buildStrudelVisualPayload(hap: unknown) {
  try {
    const noteValue = extractHapNoteName(hap);
    if (!noteValue) {
      return null;
    }

    const parsedNote = TonalNote.get(noteValue);
    if (parsedNote.empty || parsedNote.oct === undefined) {
      return null;
    }

    const solfegeIndex = resolveSolfegeIndex(noteValue);
    const chromaticNote = normalizeChromaticNote(noteValue);
    if (solfegeIndex === null || !chromaticNote) {
      return null;
    }

    const pitchClassIndex = CHROMATIC_NOTES.indexOf(chromaticNote);
    if (pitchClassIndex === -1) {
      return null;
    }

    const note = solfegeIndex === -1
      ? borrowedPitchSolfege(chromaticNote)
      : musicTheory.getCurrentScale().solfege[solfegeIndex];
    if (!note) {
      return null;
    }

    const tonicIndex = CHROMATIC_NOTES.indexOf(
      musicTheory.getCurrentKey() as ChromaticNote,
    );
    const keyboardOctave = solfegeIndex === -1 || tonicIndex === -1
      ? parsedNote.oct
      : parsedNote.oct - Number(pitchClassIndex < tonicIndex);

    return {
      note,
      solfegeIndex,
      pitchClassIndex,
      isBorrowed: solfegeIndex === -1,
      noteName: parsedNote.name,
      octave: parsedNote.oct,
      keyboardOctave,
      frequency: extractHapFrequency(hap, noteValue),
      mode: musicTheory.getCurrentMode(),
      key: musicTheory.getCurrentKey() as ChromaticNote,
      instrument:
        typeof (hap as { value?: { s?: unknown } })?.value?.s === "string"
          ? String((hap as { value?: { s?: unknown } }).value?.s)
          : "sine",
    };
  } catch {
    return null;
  }
}

function releaseStrudelVisual(noteId: string, audibleAt = audioTimeToOutputTime(getAudioContext(), getAudioContext().currentTime)) {
  const active = _activeStrudelVisuals.get(noteId);
  if (!active || typeof window === "undefined") {
    return;
  }

  window.clearTimeout(active.releaseTimeout);
  window.dispatchEvent(
    new CustomEvent("note-released", {
      detail: {
        note: active.note.name,
        noteId,
        noteName: active.noteName,
        frequency: active.frequency,
        octave: active.octave,
        keyboardOctave: active.keyboardOctave,
        solfegeIndex: active.solfegeIndex,
        pitchClassIndex: active.pitchClassIndex,
        isBorrowed: active.solfegeIndex === -1,
        mode: active.mode,
        key: active.key,
        instrument: active.instrument,
        instrumentConfig: null,
        source: STRUDEL_PLAYBACK_SOURCE,
        audibleAt,
      },
    })
  );
  _activeStrudelVisuals.delete(noteId);
}

export function stopStrudelVisuals(): void {
  if (typeof window === "undefined") {
    _activeStrudelVisuals.clear();
    return;
  }

  for (const noteId of Array.from(_activeStrudelVisuals.keys())) {
    releaseStrudelVisual(noteId);
  }
}

export async function emotitoneStrudelOutput(
  hap: unknown,
  deadline: number,
  hapDuration: number,
  cps: number,
  t: number
): Promise<void> {
  const context = getAudioContext();
  const submittedAt = context.currentTime;
  // Submit audio before preparing presentation events. Strudel passes the
  // absolute audio-clock onset as t; its legacy deadline argument is unused.
  const output = webaudioOutput(hap as never, deadline, hapDuration, cps, t);
  const visualPayload = buildStrudelVisualPayload(hap);

  if (visualPayload && typeof window !== "undefined" && t >= submittedAt) {
    const noteId = `strudel_${++_strudelVisualCounter}`;
    // The scheduler supplies the clipped gate. Presentation must not invent a
    // longer hold for short notes; release tails are separate from key-down.
    const durationMs = Math.max(0, hapDuration * 1000);
    const audibleAt = audioTimeToOutputTime(context, t);
    const releaseAt = audioTimeToOutputTime(context, t + durationMs / 1000);
    const releaseTimeout = window.setTimeout(() => {
      releaseStrudelVisual(noteId, releaseAt);
    }, Math.max(0, (t - submittedAt) * 1000) + durationMs);

    _activeStrudelVisuals.set(noteId, {
      note: visualPayload.note,
      noteName: visualPayload.noteName,
      frequency: visualPayload.frequency,
      octave: visualPayload.octave,
      keyboardOctave: visualPayload.keyboardOctave,
      solfegeIndex: visualPayload.solfegeIndex,
      pitchClassIndex: visualPayload.pitchClassIndex,
      mode: visualPayload.mode,
      key: visualPayload.key,
      instrument: visualPayload.instrument,
      releaseTimeout,
      audibleAt,
    });

    window.dispatchEvent(
      new CustomEvent("note-played", {
        detail: {
          note: visualPayload.note,
          frequency: visualPayload.frequency,
          solfegeIndex: visualPayload.solfegeIndex,
          pitchClassIndex: visualPayload.pitchClassIndex,
          isBorrowed: visualPayload.isBorrowed,
          octave: visualPayload.octave,
          keyboardOctave: visualPayload.keyboardOctave,
          noteId,
          noteName: visualPayload.noteName,
          mode: visualPayload.mode,
          key: visualPayload.key,
          instrument: visualPayload.instrument,
          instrumentConfig: null,
          durationMs,
          audibleAt,
          source: STRUDEL_PLAYBACK_SOURCE,
        },
      })
    );
  }

  await output;
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
 * Attack a live note. The patched superdough layer promotes this to a
 * first-class held voice that sustains until releaseNote(noteId) is called.
 *
 * @param noteId      Unique identifier for this press.
 * @param noteName    Scientific pitch notation e.g. "C4", "F#5".
 * @param instrument  Instrument key from the instrument store.
 */
export async function attackNote(
  noteId: string,
  noteName: string,
  instrument: string,
  options?: {
    atTime?: number;
    attack?: number;
    release?: number;
    cutoff?: number;
    resonance?: number;
  },
): Promise<number> {
  // The ready path must submit audio before yielding to unrelated microtasks.
  // Initialization and resume remain asynchronous only when actually needed.
  if (!_initialized) await initSuperdoughAudio();

  // Ensure the AudioContext is running before scheduling.
  // On first note the context may still be "suspended" from loading-screen init;
  // this call is a fast no-op on all subsequent notes.
  const ac = getAudioContext();
  if (ac.state !== "running") {
    await ac.resume();
  }

  const sound = resolveLiveSoundName(instrument);
  const articulation = getLiveArticulation(sound);
  const duration = LIVE_NOTE_PLACEHOLDER_DURATION_SECONDS;
  const wasReady = isPrewarmed(sound);
  const isSynth = isSynthSound(sound);
  const hasEnvelopeOverrideContract = _liveSynthControls?.overrides !== undefined;

  // Defensively clear stale voices if a note id is ever re-used.
  if (hasVoice(noteId)) {
    stopVoice(noteId, ac.currentTime);
  }

  // Keep a small preparation margin even for explicit "now" attacks. The
  // patched engine preserves overdue live presses, but this margin normally
  // lets the complete graph reach the render thread before its intended onset.
  const requestedAt = Math.max(options?.atTime ?? 0, nowPlusOffset(LIVE_AUDIO_SCHEDULING_LEAD_MS / 1000));
  const attack = options?.attack ?? (
    _liveSynthControls?.attack !== undefined &&
    (hasEnvelopeOverrideContract ? _liveSynthControls.overrides?.attack : isSynth)
      ? _liveSynthControls.attack
      : articulation.attack
  );
  const release = options?.release ?? (
    _liveSynthControls?.release !== undefined &&
    (hasEnvelopeOverrideContract ? _liveSynthControls.overrides?.release : isSynth)
      ? _liveSynthControls.release
      : articulation.release
  );
  const cutoff = options?.cutoff ?? _liveSynthControls?.cutoff;
  const resonance = options?.resonance ?? _liveSynthControls?.resonance;

  const payload: Record<string, unknown> = {
    s: sound,
    note: noteName,
    gain: 0.8,
    attack,
    decay: articulation.decay,
    sustain: articulation.sustain,
    release,
    voiceId: noteId,
    sustainUntilRelease: true,
    orbit: LIVE_ORBIT,
  };

  if (cutoff !== undefined && cutoff < 12000) {
    payload.cutoff = cutoff;
  }
  if (resonance !== undefined && resonance > 0) {
    payload.resonance = resonance;
  }
  if ((_liveSynthControls?.room ?? 0) > 0) {
    payload.room = _liveSynthControls?.room;
  }
  if ((_liveSynthControls?.delay ?? 0) > 0) {
    payload.delay = _liveSynthControls?.delay;
    payload.delaytime = LIVE_DELAY_TIME_SECONDS;
    payload.delayfeedback = LIVE_DELAY_FEEDBACK;
  }

  const armedAt = await superdough(
    payload,
    requestedAt,
    duration,
    1 // cps
  );

  // The engine reports a later onset if the audio clock overtook entry. Cold
  // sources can also start late while loading; preserve that separate fallback.
  const onset = Number.isFinite(armedAt) ? Math.max(requestedAt, armedAt) : requestedAt;
  return wasReady ? onset : Math.max(onset, ac.currentTime);
}

/**
 * Start the release phase for a live note if it is still active.
 */
export function releaseNote(noteId: string, atTime?: number): void {
  if (atTime === undefined) releaseVoice(noteId);
  else releaseVoice(noteId, atTime);
}

/** Cancel a queued onset without letting it sound during its release tail. */
export function stopNote(noteId: string): void {
  cancelVoice(noteId);
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

  const ac = getAudioContext();
  if (ac.state !== "running") {
    await ac.resume();
  }

  const sound = resolveLiveSoundName(instrument);
  const durationSeconds = durationMs / 1000;
  const isSynth = isSynthSound(sound);
  const hasEnvelopeOverrideContract = _liveSynthControls?.overrides !== undefined;
  const articulation = getLiveArticulation(sound);
  const attack = _liveSynthControls?.attack !== undefined &&
    (hasEnvelopeOverrideContract ? _liveSynthControls.overrides?.attack : isSynth)
    ? _liveSynthControls.attack
    : articulation.attack;
  const release = _liveSynthControls?.release !== undefined &&
    (hasEnvelopeOverrideContract ? _liveSynthControls.overrides?.release : isSynth)
    ? _liveSynthControls.release
    : articulation.release;

  await superdough(
    {
      s: sound,
      note: noteName,
      duration: durationSeconds,
      gain: 0.8,
      attack,
      release,
      orbit: LIVE_ORBIT,
      ...((_liveSynthControls?.cutoff ?? 12000) < 12000
        ? { cutoff: _liveSynthControls?.cutoff }
        : {}),
      ...((_liveSynthControls?.resonance ?? 0) > 0
        ? { resonance: _liveSynthControls?.resonance }
        : {}),
      ...((_liveSynthControls?.room ?? 0) > 0
        ? { room: _liveSynthControls?.room }
        : {}),
      ...((_liveSynthControls?.delay ?? 0) > 0
        ? {
            delay: _liveSynthControls?.delay,
            delaytime: LIVE_DELAY_TIME_SECONDS,
            delayfeedback: LIVE_DELAY_FEEDBACK,
          }
        : {}),
    },
    nowPlusOffset(),
    durationSeconds,
    1
  );
}

/**
 * Release every live voice currently tracked by the patched superdough layer.
 */
export function releaseAll(): void {
  releaseAllVoices();
}

/**
 * Returns the superdough master GainNode that all superdough audio flows through.
 * Fan-out via WebAudio lets callers connect this to additional analysis chains
 * while superdough continues routing to the speakers normally.
 */
export function getSuperdoughMasterGain(): GainNode | null {
  return getMasterGain();
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
