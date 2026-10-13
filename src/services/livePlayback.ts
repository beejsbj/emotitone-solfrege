import { onAudioRunning } from "@/services/audioLifecycle";
import type { LiveEnvelopeOverride, PreparedLiveInstrument, LiveWorklet } from "@/audio/live/types";
import type { LiveRenderer, LiveRendererCallbacks } from "@/audio/liveRenderer";
import { createLiveShapingChain, type LiveShaping } from "@/audio/liveShaping";
import { getLiveOrbit } from "@/services/audioRuntime";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import { preparedPcmBytes } from "@/audio/live/pcm";

type Listener = LiveRendererCallbacks;

const MAX_BANKS = 4;
const MAX_PCM_BYTES = 192 * 1024 * 1024;
// Worklet-owned PCM (source plus derived pyramids, including a pending
// installation) is capped at 192 MiB. The loader decodes into buffers it owns
// and the bridge transfers them, so after acknowledgement the worklet holds the
// only copy. One bank prepares at a time (192 MiB), so the worst case while
// preparing is 384 MiB of owned PCM. A decoded AudioBuffer awaiting garbage
// collection is outside this accounting; it is not a bound on total memory.
const listeners = new Set<Listener>();
const reasons = new Map<string, string>();
const unsupported = new Set<string>();
let context: AudioContext | undefined;
let stopRecovery: (() => void) | undefined;
let engineSampleRate: number | undefined;
const builtSampleRates = new Set<number>();
let engine: ShapedLiveWorklet | undefined;
let managedEngine: LiveRenderer | undefined;
type LiveShapingState = LiveShaping & { envelope: LiveEnvelopeOverride };
type ShapedLiveWorklet = LiveWorklet & { applyShaping(next: LiveShapingState): void };
let shaping: LiveShapingState = { cutoff: 12000, resonance: 0, room: 0, delay: 0, envelope: {} };
let enginePromise: Promise<ShapedLiveWorklet> | undefined;
let generation = 0;
const installed = new Map<string, number>();
const preparing = new Map<string, Promise<void>>();
const pins = new Map<string, Set<string>>();
/** Holders (e.g. transport members) whose banks must stay resident while they rest. */
const leases = new Map<string, Set<string>>();
const installedPcm = new Map<string, { source: number; derived: number }>();
/** Instruments whose data could not be downloaded, decoded or parsed (retryable). */
const loadFailures = new Set<string>();
const retiring = new Set<string>();
let installQueue: Promise<void> = Promise.resolve();
let workletPreparation: Promise<typeof import("@/services/preparedLiveInstrument")> | undefined;
let workletCatalog: typeof import("@/services/preparedLiveInstrument") | undefined;
let installingPcmBytes = 0;

function byteSize(instrument: PreparedLiveInstrument): number {
  const { source, derived } = preparedPcmBytes(instrument);
  return source + derived;
}

function isPinned(instrumentId: string): boolean {
  return [...pins.values(), ...leases.values()].some(held => held.has(instrumentId));
}

/**
 * Keep banks resident for a holder that is not sounding them right now, such
 * as a looping member resting between notes while another bank loads. Pinned
 * banks are never evicted for cache pressure; release the pin on leave or
 * replacement. Pins survive renderer rebuilds (they name instruments, not PCM).
 */
export function pinLivePlayback(holderId: string, names: readonly string[]): () => void {
  const held = new Set(names.map(resolveLiveSoundName));
  leases.set(holderId, held);
  return () => { if (leases.get(holderId) === held) leases.delete(holderId); };
}

function invalidate(error?: unknown) {
  generation++;
  engine?.dispose();
  engine = undefined;
  managedEngine = undefined;
  enginePromise = undefined;
  installed.clear();
  installedPcm.clear();
  builtSampleRates.clear();
  preparing.clear();
  pins.clear();
  retiring.clear();
  installingPcmBytes = 0;
  unsupported.clear();
  installQueue = Promise.resolve();
  if (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    listeners.forEach(listener => listener.onError?.(failure));
  }
}

/** Prepare the selected sound before input is enabled. Unsupported sounds keep
 * the fallback renderer; a prepared bank's PCM moves into the worklet. */
export async function prepareLivePlayback(nextContext: AudioContext, destination: AudioNode | null, name: string): Promise<void> {
  const instrumentId = resolveLiveSoundName(name);
  if (!destination || (!nextContext.audioWorklet || typeof AudioWorkletNode === "undefined")) {
    reasons.set(instrumentId, !destination ? "Audio output is unavailable" : "AudioWorklet is unavailable");
    unsupported.add(instrumentId);
    loadFailures.delete(instrumentId);
    return;
  }
  if (context !== nextContext) {
    invalidate();
    context = nextContext;
    engineSampleRate = nextContext.sampleRate;
    stopRecovery?.();
    stopRecovery = onAudioRunning(nextContext, function recover(): void | Promise<void> {
      if (engineSampleRate === nextContext.sampleRate
        && [...builtSampleRates].every(rate => rate === nextContext.sampleRate)) return;
      engineSampleRate = nextContext.sampleRate;
      const names = [...new Set([...installed.keys(), ...preparing.keys()])];
      // The processor's frame clock and oscillator increments use its original
      // sample rate. Retire that generation before accepting another input.
      const previousInstall = installQueue;
      invalidate(new Error("Audio sample rate changed; rebuilding live renderer"));
      // Let the retired generation drop its preparation ownership first.
      installQueue = previousInstall;
      // Preparation can run at a transient rate even when the route returns
      // to its starting rate. Check the actual build rates before opening input.
      return Promise.all(names.map(id => prepareLivePlayback(nextContext, destination, id))).then(recover);
    });
  }
  if (retiring.has(instrumentId)) {
    await installQueue;
    return prepareLivePlayback(nextContext, destination, name);
  }
  if (installed.has(instrumentId)) {
    const bytes = installed.get(instrumentId)!;
    installed.delete(instrumentId);
    installed.set(instrumentId, bytes);
    return;
  }
  if (preparing.has(instrumentId)) return preparing.get(instrumentId);
  const run = generation;
  let preparedResult: import("@/services/preparedLiveInstrument").LiveInstrumentPreparation | undefined;
  const promise = installQueue.then(async () => {
    if (run !== generation) return;
    workletCatalog = await (workletPreparation ??= import("@/services/preparedLiveInstrument"));
    if (run !== generation) return;
    const preparationSampleRate = nextContext.sampleRate;
    const prepared = await workletCatalog.prepareLiveInstrument(nextContext, instrumentId);
    preparedResult = prepared;
    if (run !== generation) return;
    builtSampleRates.add(preparationSampleRate);
    if (prepared.kind === "unsupported" || prepared.kind === "retryable") {
      reasons.set(instrumentId, prepared.reason);
      if (prepared.kind === "retryable") loadFailures.add(instrumentId);
      else loadFailures.delete(instrumentId);
      if (prepared.kind === "unsupported") unsupported.add(instrumentId);
      else unsupported.delete(instrumentId);
      return;
    }
    const bytes = byteSize(prepared);
    if (bytes > MAX_PCM_BYTES) {
      reasons.set(instrumentId, "Sample bank exceeds the 192 MiB live renderer budget");
      unsupported.add(instrumentId);
      return;
    }
    const install = async () => {
      if (run !== generation) return;
      const callbacks: LiveRendererCallbacks = {
        onEvent: event => { if (run === generation) listeners.forEach(listener => listener.onEvent(event)); },
        onPlan: events => { if (run === generation) listeners.forEach(listener => listener.onPlan?.(events)); },
        onExpressionOwner: change => { if (run === generation) listeners.forEach(listener => listener.onExpressionOwner?.(change)); },
        onError: error => { if (run === generation) invalidate(error); },
        onOwnerEnded: ownerId => { if (run === generation) listeners.forEach(listener => listener.onOwnerEnded?.(ownerId)); },
      };
      enginePromise ??= (async () => {
        const { createLiveWorklet } = await import("@/audio/live/bridge");
        // The chain lives and dies with its worklet, so a stale build can
        // never tear down the effects of a newer one.
        const chain = createLiveShapingChain(nextContext, destination, getLiveOrbit);
        let worklet: LiveWorklet;
        try {
          const rendererSampleRate = nextContext.sampleRate;
          worklet = await createLiveWorklet(nextContext, chain.input, callbacks, chain);
          if (run === generation) {
            builtSampleRates.add(rendererSampleRate);
            builtSampleRates.add(nextContext.sampleRate);
          }
        } catch (error) {
          chain.dispose();
          throw error;
        }
        worklet.shape(shaping.envelope);
        worklet.effects(shaping);
        const disposeWorklet = worklet.dispose;
        return {
          ...worklet,
          dispose() { disposeWorklet(); chain.dispose(); },
          applyShaping(next: LiveShapingState) { worklet.shape(next.envelope); worklet.effects(next); },
        };
      })();
      const ready = await enginePromise;
      if (run !== generation) { ready.dispose(); return; }
      if (engine !== ready) ready.applyShaping(shaping);
      engine = ready;
      managedEngine ??= {
        ...ready,
        press(ownerId, notes) {
          if (run !== generation) return;
          pins.set(ownerId, new Set(notes.map(note => note.instrumentId)));
          ready.press(ownerId, notes);
        },
        release(ownerId) { if (run === generation) { pins.delete(ownerId); ready.release(ownerId); } },
        clear() { if (run === generation) { pins.clear(); ready.clear(); } },
        dispose() { if (run === generation) invalidate(); },
      };
      // Held and pinned banks stay resident. Released voices retire with a
      // bounded fade; their PCM remains charged until the adapter acknowledges it.
      while (installed.size >= MAX_BANKS || [...installed.values()].reduce((sum, size) => sum + size, bytes) > MAX_PCM_BYTES) {
        const oldest = [...installed.keys()].find(id => !isPinned(id));
        if (oldest === undefined) {
          reasons.set(instrumentId, "Live renderer instrument budget is occupied by held or pinned instruments");
          return;
        }
        // The budget includes retiring PCM: wait for its bounded fade and
        // processor acknowledgement before installing another bank.
        retiring.add(oldest);
        await ready.forget(oldest);
        if (run !== generation) return;
        installed.delete(oldest);
        installedPcm.delete(oldest);
        retiring.delete(oldest);
      }
      installingPcmBytes = bytes;
      const split = preparedPcmBytes(prepared);
      // Transfers the PCM: from here the worklet owns the bank's only copy.
      await ready.prepare(prepared);
      if (run === generation) {
        installed.set(instrumentId, bytes);
        installedPcm.set(instrumentId, split);
        loadFailures.delete(instrumentId);
        installingPcmBytes = 0;
        unsupported.delete(instrumentId);
        reasons.delete(instrumentId);
      }
    };
    await install();
  }).catch(error => {
    if (run === generation) {
      reasons.set(instrumentId, error instanceof Error ? error.message : "Live renderer preparation failed");
      loadFailures.delete(instrumentId);
      invalidate(error);
    }
  }).finally(() => {
    if (preparedResult) workletCatalog?.releasePreparedLiveInstrument(nextContext, instrumentId, preparedResult);
    if (run === generation) installingPcmBytes = 0;
    if (preparing.get(instrumentId) === promise) preparing.delete(instrumentId);
  });
  // Serialize the entire preparation/installation transaction: only one new
  // bank can coexist with the installed banks. Drop the preparer's reference
  // after acknowledgement (or fallback); a transferred bank is detached here.
  installQueue = promise;
  preparing.set(instrumentId, promise);
  return promise;
}

/** Apply Shape-tab controls to prepared live instruments, now and after rebuilds. */
export function setLivePlaybackShaping(next: LiveShapingState): void {
  shaping = { ...next, envelope: { ...next.envelope } };
  engine?.applyShaping(shaping);
}

export function getLivePlayback(name: string): LiveRenderer | undefined {
  const instrumentId = resolveLiveSoundName(name);
  if (!installed.has(instrumentId) || retiring.has(instrumentId)) return undefined;
  const bytes = installed.get(instrumentId)!;
  installed.delete(instrumentId);
  installed.set(instrumentId, bytes);
  return managedEngine;
}

export function needsLivePlaybackPreparation(name: string): boolean {
  const instrumentId = resolveLiveSoundName(name);
  return (typeof AudioWorkletNode !== "undefined") && !unsupported.has(instrumentId)
    && (!installed.has(instrumentId) || retiring.has(instrumentId));
}

/** Why the worklet does not hold a sound: its data failed to load (retry may help),
 * or the worklet cannot or will not hold it (the fallback renderer plays it). */
export function getLivePlaybackFailure(name: string): { kind: "load" | "fallback"; reason: string } | undefined {
  const instrumentId = resolveLiveSoundName(name);
  if (installed.has(instrumentId) && !retiring.has(instrumentId)) return undefined;
  const reason = reasons.get(instrumentId) ?? (typeof AudioWorkletNode === "undefined" ? "AudioWorklet is unavailable" : "Live renderer is not prepared");
  return { kind: loadFailures.has(instrumentId) ? "load" : "fallback", reason };
}

export function subscribeLivePlayback(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLivePlaybackDiagnostics(name: string) {
  const instrumentId = resolveLiveSoundName(name);
  const ready = Boolean(managedEngine && installed.has(instrumentId) && !retiring.has(instrumentId));
  const installedPcmBytes = [...installed.values()].reduce((sum, bytes) => sum + bytes, 0);
  const installedSourcePcmBytes = [...installedPcm.values()].reduce((sum, bytes) => sum + bytes.source, 0);
  const preparation = context ? workletCatalog?.getPreparedLiveInstrumentDiagnostics(context) : undefined;
  const cachedPreparationPcmBytes = preparation?.cachedPreparationPcmBytes ?? 0;
  const preparingPcmBytes = preparation?.preparingPcmBytes ?? 0;
  return {
    backend: ready ? "audio-worklet" : "superdough",
    requestedBackend: "worklet",
    reason: reasons.get(instrumentId) ?? null,
    installedBanks: installed.size,
    installedPcmBytes,
    installedSourcePcmBytes,
    installedDerivedPcmBytes: installedPcmBytes - installedSourcePcmBytes,
    installingPcmBytes,
    installedPcmBudgetBytes: MAX_PCM_BYTES,
    cachedPreparationPcmBytes,
    preparingPcmBytes,
    preparationPcmBudgetBytes: preparation?.preparationPcmBudgetBytes ?? MAX_PCM_BYTES,
    additionalPcmBytes: installedPcmBytes + installingPcmBytes + cachedPreparationPcmBytes + preparingPcmBytes,
    lookaheadMs: null,
    preparationLeadMs: ready ? 0 : 5,
  };
}
