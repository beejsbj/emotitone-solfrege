import { velocityToGain } from "@/audio/velocity";
import { resumeAudioContext } from "@/services/audioLifecycle";
/**
 * superdoughAudio.ts
 * Audio startup, instrument warmup and the Superdough playback adapter.
 * The app's sound catalog (src/audio/soundCatalog.ts) and loader
 * (preparedNativeInstrument.ts) put sample and soundfont PCM into the live
 * worklet; superdough keeps only what the fallback renderer needs, loaded
 * when it needs it. audioRuntime owns the shared graph; patternTransport plays
 * patterns on the worklet; livePlayback selects the live renderer.
 */

// superdough has no bundled TypeScript declarations
// @ts-ignore
import { superdough, registerSynthSounds, samples, loadBuffer, getSound, soundMap, hasVoice, stopVoice, cancelVoice, releaseVoice, releaseAllVoices } from "superdough";
import { DEFAULT_INSTRUMENT, isSynthSound } from "@/data/instruments";
import { getLivePlaybackFailure, prepareLivePlayback } from "@/services/livePlayback";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import { resolveLiveEnvelope } from "@/services/shape";
import type { Shape } from "@/types/instrument";
import { LIVE_AUDIO_SCHEDULING_LEAD_MS } from "@/services/liveAudioTiming";
import { getAudioContext, getMasterGain, initializeAudio, LIVE_ORBIT } from "@/services/audioRuntime";
import { setLivePlaybackShaping } from "@/services/livePlayback";
import { LIVE_DELAY_FEEDBACK, LIVE_DELAY_TIME_SECONDS } from "@/audio/liveShaping";
import { SampleLoadError } from "@/services/audioFailures";
import { catalogSoundNames, getCatalogSound, registerSampleMap, registerSoundfonts, type CatalogSound, type SampleMap } from "@/audio/soundCatalog";
import { SAMPLE_PACKS, sampleMapUrl } from "@/audio/sampleSources";
import { fetchInstrumentFile } from "@/audio/instrumentAssetCache";
import { prewarmFallbackSoundfont, registerFallbackSoundfonts } from "@/services/soundfontFallback";

/** Compatibility facade: the playback graph is owned by audioRuntime. */
export { getAudioContext };

// ---------------------------------------------------------------------------
// Module-level init state so we only set up once
// ---------------------------------------------------------------------------

let _initialized = false;
let _initPromise: Promise<void> | null = null;
let _initProgressCallback: ((progress: number, message: string) => void) | undefined;

/**
 * The startup step currently in flight, so a caller that gives up waiting can
 * say what actually hung: the sample download, or the audio engine itself
 * (graph initialisation and preparing the default synth).
 */
export type AudioStartupStage = "idle" | "samples" | "engine" | "ready";
let _startupStage: AudioStartupStage = "idle";

export function getAudioStartupStage(): AudioStartupStage {
  return _startupStage;
}
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

/**
 * Envelope stages the live Shape controls set for this sound. Callers without
 * an override contract keep the legacy rule: controls shape synths only.
 */
function liveEnvelopeShape(sound: string): Pick<Shape, "attack" | "release"> {
  const controls = _liveSynthControls;
  const hasOverrideContract = controls?.overrides !== undefined;
  const isSynth = isSynthSound(sound);
  const stage = (name: "attack" | "release") =>
    controls?.[name] !== undefined && (hasOverrideContract ? controls.overrides?.[name] : isSynth)
      ? controls[name]!
      : null;
  return { attack: stage("attack"), release: stage("release") };
}

/**
 * Fetch one sample map and register it twice: in the app catalog, which the
 * worklet loader reads, and in superdough's sound map, which the fallback
 * renderer still reads until BJS-495. Registration downloads no audio.
 */
async function loadSamplePack(pack: string): Promise<void> {
  const response = await fetchInstrumentFile(sampleMapUrl(pack));
  if (!response.ok) throw new Error(`error loading "${sampleMapUrl(pack)}" (HTTP ${response.status})`);
  const map = await response.json() as SampleMap;
  registerSampleMap(map);
  await samples(map, typeof map._base === "string" ? map._base : "");
}

/** Catalog data is needed only by the picker or a selected GM instrument. */
let soundfontCatalog: Promise<void> | null = null;
export function ensureSoundfontCatalog(): Promise<void> {
  return soundfontCatalog ??= import("@/data/gmSoundfonts")
    .then(({ GM_SOUNDFONTS }) => {
      registerSoundfonts(GM_SOUNDFONTS);
      registerFallbackSoundfonts(GM_SOUNDFONTS);
    })
    .catch(error => { soundfontCatalog = null; throw error; });
}

/** superdough still registers and renders the synths the worklet does not (supersaw, pulse, …). */
function isRegisteredSynth(name: string): boolean {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sound = (getSound as any)(name);
    return Boolean(sound) && sound.data?.type !== "soundfont" && !sound.data?.samples;
  } catch {
    return false;
  }
}

/**
 * Warm the fallback renderer's own copy of a sound. Used only when the worklet
 * cannot hold the bank; patterns play on the worklet (BJS-485) and never warm
 * a superdough copy. The live worklet never reads these buffers.
 */
async function prewarmFallbackSound(sound: CatalogSound): Promise<void> {
  const ac = getAudioContext();
  if (sound.kind === "soundfont") {
    await prewarmFallbackSoundfont(sound.fonts[0], ac);
    return;
  }
  const urls = Array.isArray(sound.bank) ? sound.bank : Object.values(sound.bank).flat();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await Promise.all(urls.map((url) => (loadBuffer as any)(url, ac)));
}

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
  if (resolved.startsWith("gm_")) await ensureSoundfontCatalog();
  const sound = getCatalogSound(resolved);
  // Resolve the sound before treating it as ready. This prevents pre-init
  // callers and typos from being reported as playable.
  if (!sound && !isRegisteredSynth(resolved)) {
    if (tolerateBufferFailures) return;
    throw new Error(`Unknown sound: ${soundName}`);
  }

  await prepareLivePlayback(getAudioContext(), getSuperdoughMasterGain(), resolved);
  if (!sound) {
    _prewarmedSounds.add(resolved); // synths need no data → already "ready"
    return;
  }

  const failure = getLivePlaybackFailure(resolved);
  if (failure?.kind === "load") {
    if (!tolerateBufferFailures) throw new Error(failure.reason);
    return;
  }
  if (failure) {
    // The worklet cannot hold this bank (no AudioWorklet, over budget, or its
    // residency is held), so the fallback renderer plays it from its own copy.
    try {
      await prewarmFallbackSound(sound);
    } catch (error) {
      if (!tolerateBufferFailures) throw error;
      return;
    }
  }
  _prewarmedSounds.add(resolved);
}

/**
 * Loads an instrument into the live worklet (or, when the worklet cannot hold
 * it, the fallback renderer). Oscillator sounds need no data.
 *
 * Safe to call at any time — triggers audio init if not yet done, then
 * fetches and decodes the bank so the first keypress is never dropped.
 */
export async function prewarmSoundSamples(soundName: string): Promise<void> {
  await initSuperdoughAudio(); // no-op if already initialised; safe for external callers
  await _prewarmSoundCore(soundName);
}

/**
 * Returns true when a sound can play immediately. Sample and soundfont banks
 * must already be loaded; oscillator and other no-sample sounds are always ready.
 */
export function isPrewarmed(soundName: string): boolean {
  const resolved = resolveLiveSoundName(soundName);
  if (_prewarmedSounds.has(resolved)) return true;
  if (getCatalogSound(resolved)) return false;
  return isRegisteredSynth(resolved);
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
  // A replacement loading generation takes over reports from the shared load.
  // Callers without a loading UI keep the existing callback.
  if (progressCallback) _initProgressCallback = progressCallback;
  if (_initPromise) return _initPromise;

  _initPromise = (async () => {
    let settled = false;
    try {
      _startupStage = "samples";
      // Register built-in WebAudio oscillator sounds (sine, triangle, etc.)
      registerSynthSounds();
      _initProgressCallback?.(3, "Synth sounds registered");

      // Load sample-pack maps only; audio files load on selection.
      // Track individual completions so the loading screen shows real steps.
      const total = SAMPLE_PACKS.length;
      let done = 0;

      const reportPack = (label: string) => {
        if (settled) return;
        done++;
        // Range: 5 % → 75 % across all packs
        const pct = Math.round(5 + (done / total) * 70);
        _initProgressCallback?.(pct, `${label} loaded (${done}/${total})`);
      };

      try {
        await Promise.all([
          ...SAMPLE_PACKS.map(({ key, label }) =>
            loadSamplePack(key).then(() => reportPack(label))
          ),
        ]);
      } catch (error) {
        // Tagged so the loading screen can offer the synths, which need no download.
        throw new SampleLoadError(error instanceof Error ? error.message : String(error), { cause: error });
      }

      // The editor creates the single pattern transport through patternPlayback.
      // Instrument startup only initializes the shared audio graph.
      _startupStage = "engine";
      _initProgressCallback?.(79, "Starting audio context…");
      await initializeAudio();

      // Only the default instrument is decoded eagerly. Other registered
      // instruments warm on selection so startup stays bounded on mobile.
      _initProgressCallback?.(80, `Preparing ${DEFAULT_INSTRUMENT}…`);
      await _prewarmDefaultInstrument();
      _initProgressCallback?.(98, `${DEFAULT_INSTRUMENT} ready`);

      _initProgressCallback?.(100, "Audio engine ready");
      _initialized = true;
      _startupStage = "ready";
    } catch (err) {
      _startupStage = "idle";
      console.error("[superdoughAudio] init error:", err);
      // Reset so callers can retry after a user gesture
      _initPromise = null;
      throw err;
    } finally {
      settled = true;
      _initProgressCallback = undefined;
    }
  })();

  return _initPromise;
}

/**
 * Degraded start for when the sample packs cannot load: registers the built-in
 * oscillator synths, starts the shared audio graph and prepares the default
 * synth, then marks the engine initialised so notes stop retrying the sample
 * download. Sampled instruments stay unavailable until a reload. A full load
 * still in flight (a slow network) keeps caching its samples, but its cancelled
 * loading generation does not reconcile them into the instrument store.
 */
export async function initSynthOnlyAudio(): Promise<void> {
  if (_initialized) return;
  // Never queue behind an engine start that is still pending: if it hung, the
  // synths would hang with it. That is an engine fault, not a sample one.
  if (_startupStage === "engine") throw new Error("The audio engine is still starting");
  const resumeStage = _startupStage;
  _startupStage = "engine";
  try {
    registerSynthSounds();
    await initializeAudio();
    await _prewarmSoundCore(DEFAULT_INSTRUMENT, true);
  } catch (error) {
    _startupStage = resumeStage;
    throw error;
  }
  _initialized = true;
  _startupStage = "ready";
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
    /** Normalized input velocity; omitted on-screen input keeps unity. */
    velocity?: number;
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
  const resumption = resumeAudioContext(ac);
  if (resumption) await resumption;

  const sound = resolveLiveSoundName(instrument);
  const envelope = resolveLiveEnvelope(sound, liveEnvelopeShape(sound));
  const duration = LIVE_NOTE_PLACEHOLDER_DURATION_SECONDS;
  const wasReady = isPrewarmed(sound);

  // Defensively clear stale voices if a note id is ever re-used.
  if (hasVoice(noteId)) {
    stopVoice(noteId, ac.currentTime);
  }

  // Keep a small preparation margin even for explicit "now" attacks. The
  // patched engine preserves overdue live presses, but this margin normally
  // lets the complete graph reach the render thread before its intended onset.
  const requestedAt = Math.max(options?.atTime ?? 0, nowPlusOffset(LIVE_AUDIO_SCHEDULING_LEAD_MS / 1000));
  const attack = options?.attack ?? envelope.attack;
  const release = options?.release ?? envelope.release;
  const cutoff = options?.cutoff ?? _liveSynthControls?.cutoff;
  const resonance = options?.resonance ?? _liveSynthControls?.resonance;

  const payload: Record<string, unknown> = {
    s: sound,
    note: noteName,
    gain: 0.8 * velocityToGain(options?.velocity),
    attack,
    decay: envelope.decay,
    sustain: envelope.sustain,
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
  const resumption = resumeAudioContext(ac);
  if (resumption) await resumption;

  const sound = resolveLiveSoundName(instrument);
  const durationSeconds = durationMs / 1000;
  const { attack, release } = resolveLiveEnvelope(sound, liveEnvelopeShape(sound));

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
 * Returns every playable sound name: the synths superdough registers, then the
 * app catalog's sample and soundfont instruments. Available after
 * initSuperdoughAudio() resolves (GM names after ensureSoundfontCatalog()).
 * Excludes internal entries starting with "_".
 */
export function getRegisteredSounds(): string[] {
  let synths: string[] = [];
  try {
    // @ts-ignore — soundMap is a nanostores map
    const dict = (soundMap as any).get() as Record<string, unknown>;
    synths = Object.keys(dict).filter((k) => !k.startsWith("_") && isRegisteredSynth(k));
  } catch {
    synths = [];
  }
  return [...new Set([...synths, ...catalogSoundNames()])];
}
