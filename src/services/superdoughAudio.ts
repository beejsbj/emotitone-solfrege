import { velocityToGain } from "@/audio/velocity";
import { pitchSolfegeData } from "@/domain/musicalIdentity";
import { resumeAudioContext } from "@/services/audioLifecycle";
/**
 * superdoughAudio.ts
 * Audio startup, instrument warmup and the Superdough playback adapter.
 * The app's sound catalog (src/audio/soundCatalog.ts) and loader
 * (preparedNativeInstrument.ts) put sample and soundfont PCM into the live
 * worklet; superdough keeps only what patterns and the fallback renderer need,
 * loaded when they need it. audioRuntime owns the shared graph; patternPlayback
 * owns the sole pattern transport; livePlayback selects the live renderer.
 */

// superdough has no bundled TypeScript declarations
// @ts-ignore
import { superdough, registerSynthSounds, samples, loadBuffer, getSound, soundMap, hasVoice, stopVoice, cancelVoice, releaseVoice, releaseAllVoices } from "superdough";
import { webaudioOutput } from "@strudel/webaudio";
import { musicTheory, CHROMATIC_NOTES } from "@/services/music";
import type {
  ActiveNote,
  ChromaticNote,
  MusicalMode,
  SolfegeData,
} from "@/types/music";
import { Note as TonalNote } from "@tonaljs/tonal";
import { DEFAULT_INSTRUMENT, isSynthSound } from "@/data/instruments";
import { getLivePlaybackFailure, prepareLivePlayback } from "@/services/livePlayback";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import { resolveLiveEnvelope } from "@/services/shape";
import type { Shape } from "@/types/instrument";
import { audioTimeToOutputTime, LIVE_AUDIO_SCHEDULING_LEAD_MS } from "@/services/liveAudioTiming";
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

/**
 * Fetch one sample map and register it twice: in the app catalog, which the
 * worklet loader reads, and in superdough's sound map, which patterns and the
 * fallback renderer still read until BJS-485. Registration downloads no audio.
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
 * cannot hold the bank, and before patterns play (superdough renders them
 * until BJS-485). The live worklet never reads these buffers.
 */
async function prewarmFallbackSound(sound: CatalogSound, allVariants = false): Promise<void> {
  const ac = getAudioContext();
  if (sound.kind === "soundfont") {
    for (const font of allVariants ? sound.fonts : sound.fonts.slice(0, 1)) {
      await prewarmFallbackSoundfont(font, ac).catch(error => {
        if (!allVariants) throw error;
        console.warn(`[superdoughAudio] could not warm soundfont ${font} for patterns:`, error);
      });
    }
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
 * Warm the sounds a pattern names before it plays. superdough renders patterns
 * until BJS-485 and drops onsets whose sample is still loading, so it loads its
 * own copy here, once per sound, rather than when the first note is due.
 */
export async function preparePatternSounds(code: string | undefined): Promise<void> {
  if (!code) return;
  if (code.includes("gm_")) await ensureSoundfontCatalog();
  const names = new Set<string>();
  for (const [, , value] of code.matchAll(/(?:^|[^\w$])(?:sound|s)\s*\(\s*(["'`])(.*?)\1/gs)) {
    for (const token of value.split(/[^\w-]+/)) {
      const sound = getCatalogSound(resolveLiveSoundName(token));
      if (sound) names.add(resolveLiveSoundName(token));
    }
  }
  await Promise.all([...names].map(name => prewarmFallbackSound(getCatalogSound(name)!, true).catch(error => {
    console.warn(`[superdoughAudio] could not warm ${name} for patterns:`, error);
  })));
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

let strudelLaBasedMinor = false;

/** The music store supplies the presentation preference; audio never reads Pinia. */
export function setStrudelLaBasedMinor(value: boolean): void {
  strudelLaBasedMinor = value;
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

    const note = pitchSolfegeData(chromaticNote, {
      tonic: musicTheory.getCurrentKey(), mode: musicTheory.getCurrentMode(),
    }, strudelLaBasedMinor);
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

const pendingStageWakes = new Set<number>();
export function stopStrudelVisuals(): void {
  pendingStageWakes.forEach(timer => clearTimeout(timer));
  pendingStageWakes.clear();
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

  if (!visualPayload && typeof window !== "undefined" && t >= submittedAt) {
    const timer = window.setTimeout(() => {
      pendingStageWakes.delete(timer);
      if (context.state === "running") window.dispatchEvent(new Event("stage-audio"));
    }, Math.max(0, audioTimeToOutputTime(context, t) - performance.now()));
    pendingStageWakes.add(timer);
  }

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
