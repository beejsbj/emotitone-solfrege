/**
 * audioEngine.ts
 * Audio startup and instrument warmup for the app's own engine: the sound
 * catalog (src/audio/soundCatalog.ts) and loader (preparedNativeInstrument.ts)
 * put sample and soundfont PCM into the live worklet, which also renders the
 * oscillator synths. audioRuntime owns the context and graph; livePlayback
 * holds the worklet; patternTransport plays patterns on it.
 */
import { DEFAULT_INSTRUMENT } from "@/data/instruments";
import { getLivePlaybackFailure, prepareLivePlayback, setLivePlaybackShaping } from "@/services/livePlayback";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import { getAudioContext, getMasterGain, initializeAudio } from "@/services/audioRuntime";
import { SampleLoadError } from "@/services/audioFailures";
import { catalogSoundNames, getCatalogSound, registerSampleMap, registerSoundfonts, type SampleMap } from "@/audio/soundCatalog";
import { SAMPLE_PACKS, sampleMapUrl } from "@/audio/sampleSources";
import { fetchInstrumentFile } from "@/audio/instrumentAssetCache";

/**
 * The synths the worklet renders with its band-limited oscillators, with the
 * Strudel short names the picker has always listed beside them (aliased in
 * liveInstrumentNames.ts). They need no download.
 */
export const OSCILLATOR_SOUNDS = ["triangle", "square", "sawtooth", "sine", "tri", "sqr", "saw", "sin"] as const;
const oscillators = new Set<string>(OSCILLATOR_SOUNDS);

let initialized = false;
let initPromise: Promise<void> | null = null;
let initProgressCallback: ((progress: number, message: string) => void) | undefined;

/**
 * The startup step currently in flight, so a caller that gives up waiting can
 * say what actually hung: the sample-map download, or the audio engine itself
 * (graph initialisation and preparing the default synth).
 */
export type AudioStartupStage = "idle" | "samples" | "engine" | "ready";
let startupStage: AudioStartupStage = "idle";

export function getAudioStartupStage(): AudioStartupStage {
  return startupStage;
}

const prewarmedSounds = new Set<string>();

type LiveSynthControls = {
  cutoff?: number;
  resonance?: number;
  attack?: number;
  release?: number;
  room?: number;
  delay?: number;
  overrides?: { attack?: boolean; release?: boolean };
};

/** The Shape-tab controls, applied to the worklet now and after rebuilds. */
export function setLiveSynthControls(controls: LiveSynthControls | null): void {
  setLivePlaybackShaping({
    cutoff: controls?.cutoff ?? 12000,
    resonance: controls?.resonance ?? 0,
    room: controls?.room ?? 0,
    delay: controls?.delay ?? 0,
    envelope: {
      attack: controls?.overrides?.attack ? controls.attack : undefined,
      release: controls?.overrides?.release ? controls.release : undefined,
    },
  });
}

/** Fetch one sample map into the catalog the worklet loader reads. Registration downloads no audio. */
async function loadSamplePack(pack: string): Promise<void> {
  const response = await fetchInstrumentFile(sampleMapUrl(pack));
  if (!response.ok) throw new Error(`error loading "${sampleMapUrl(pack)}" (HTTP ${response.status})`);
  registerSampleMap(await response.json() as SampleMap);
}

/** Catalog data is needed only by the picker or a selected GM instrument. */
let soundfontCatalog: Promise<void> | null = null;
export function ensureSoundfontCatalog(): Promise<void> {
  return soundfontCatalog ??= import("@/data/gmSoundfonts")
    .then(({ GM_SOUNDFONTS }) => registerSoundfonts(GM_SOUNDFONTS))
    .catch(error => { soundfontCatalog = null; throw error; });
}

/** Load a sound into the live worklet. Assumes the engine has started (no init guard: startup calls it). */
async function prewarmCore(soundName: string, tolerateFailures = false): Promise<void> {
  const resolved = resolveLiveSoundName(soundName);
  if (resolved.startsWith("gm_")) await ensureSoundfontCatalog();
  const sound = getCatalogSound(resolved);
  // Resolve the sound before treating it as ready, so typos and pre-init
  // callers are never reported as playable.
  if (!sound && !oscillators.has(resolved)) {
    if (tolerateFailures) return;
    throw new Error(`Unknown sound: ${soundName}`);
  }
  await prepareLivePlayback(getAudioContext(), getMasterGain(), resolved);
  // The worklet is the only renderer: a sound it does not hold cannot play
  // (its data failed to load, there is no AudioWorklet, or every bank is held).
  const failure = getLivePlaybackFailure(resolved);
  if (failure) {
    if (tolerateFailures) return;
    throw new Error(failure.reason);
  }
  prewarmedSounds.add(resolved);
}

/**
 * Warm the default synth at startup. Its own load failures are tolerated (a
 * later selection retries), but a worklet that cannot run at all (no
 * AudioWorklet, as on a page that is not a secure context, or its module
 * failed to load) would refuse every note: startup fails, and says why.
 */
async function prewarmDefaultInstrument(): Promise<void> {
  await prewarmCore(DEFAULT_INSTRUMENT, true);
  const failure = getLivePlaybackFailure(DEFAULT_INSTRUMENT);
  if (failure?.kind === "unavailable" && !failure.budget) {
    throw new Error(`Audio engine failed to start: ${failure.reason}`);
  }
}

/**
 * Loads an instrument into the live worklet. Safe to call at any time:
 * starts the engine if needed, then fetches and decodes the bank so the
 * first keypress is never dropped.
 */
export async function prewarmSoundSamples(soundName: string): Promise<void> {
  await initAudioEngine();
  await prewarmCore(soundName);
}

/**
 * Whether a sound can play without a download. Sample and soundfont banks
 * must already be loaded; the oscillator synths need none.
 */
export function isPrewarmed(soundName: string): boolean {
  const resolved = resolveLiveSoundName(soundName);
  return prewarmedSounds.has(resolved) || (!getCatalogSound(resolved) && oscillators.has(resolved));
}

/** Every registered sound that can currently play without a warmup. */
export function getReadySounds(): string[] {
  return getRegisteredSounds().filter(isPrewarmed);
}

/**
 * Every playable sound name: the oscillator synths, then the catalog's sample
 * and soundfont instruments (GM names after ensureSoundfontCatalog()).
 */
export function getRegisteredSounds(): string[] {
  return [...new Set([...OSCILLATOR_SOUNDS, ...catalogSoundNames()])];
}

/**
 * One-time setup: loads every sample-pack map and starts the audio graph,
 * then prepares the default instrument. Safe to call more than once.
 *
 * @param progressCallback  Receives (0-100, message) as each sample pack
 *                          resolves, so a loading UI can show real steps.
 */
export async function initAudioEngine(
  progressCallback?: (progress: number, message: string) => void,
): Promise<void> {
  if (initialized) return;
  // A replacement loading generation takes over reports from the shared load.
  if (progressCallback) initProgressCallback = progressCallback;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    let settled = false;
    try {
      startupStage = "samples";
      initProgressCallback?.(3, "Synth sounds registered");
      const total = SAMPLE_PACKS.length;
      let done = 0;
      const reportPack = (label: string) => {
        if (settled) return;
        done++;
        initProgressCallback?.(Math.round(5 + (done / total) * 70), `${label} loaded (${done}/${total})`);
      };
      try {
        await Promise.all(SAMPLE_PACKS.map(({ key, label }) => loadSamplePack(key).then(() => reportPack(label))));
      } catch (error) {
        // Tagged so the loading screen can offer the synths, which need no download.
        throw new SampleLoadError(error instanceof Error ? error.message : String(error), { cause: error });
      }

      startupStage = "engine";
      initProgressCallback?.(79, "Starting audio context…");
      await initializeAudio();
      // Only the default instrument is decoded eagerly; others warm on selection.
      initProgressCallback?.(80, `Preparing ${DEFAULT_INSTRUMENT}…`);
      await prewarmDefaultInstrument();
      initProgressCallback?.(98, `${DEFAULT_INSTRUMENT} ready`);
      initProgressCallback?.(100, "Audio engine ready");
      initialized = true;
      startupStage = "ready";
    } catch (error) {
      startupStage = "idle";
      console.error("[audioEngine] init error:", error);
      // Reset so callers can retry after a user gesture.
      initPromise = null;
      throw error;
    } finally {
      settled = true;
      initProgressCallback = undefined;
    }
  })();
  return initPromise;
}

/**
 * Degraded start for when the sample packs cannot load: starts the shared
 * audio graph and prepares the default synth, then marks the engine started
 * so notes stop retrying the download. Sampled instruments stay unavailable
 * until a reload.
 */
export async function initSynthOnlyAudio(): Promise<void> {
  if (initialized) return;
  // Never queue behind an engine start that is still pending: if it hung, the
  // synths would hang with it. That is an engine fault, not a sample one.
  if (startupStage === "engine") throw new Error("The audio engine is still starting");
  const resumeStage = startupStage;
  startupStage = "engine";
  try {
    await initializeAudio();
    await prewarmDefaultInstrument();
  } catch (error) {
    startupStage = resumeStage;
    throw error;
  }
  initialized = true;
  startupStage = "ready";
}
