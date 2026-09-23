import type { LiveEnvelopeOverride, PreparedLiveInstrument, LiveWorklet } from "@/audio/live/types";
import type { LiveRenderer, LiveRendererCallbacks } from "@/audio/liveRenderer";
import { createLiveShapingChain, type LiveShaping } from "@/audio/liveShaping";
import { getLiveOrbit } from "@/services/audioRuntime";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";

type Listener = LiveRendererCallbacks;

const MAX_BANKS = 4;
const MAX_PCM_BYTES = 192 * 1024 * 1024;
// Worklet-owned PCM (including pending installation) is capped at 192 MiB.
// Main-thread cached/building pyramids have a separate 192 MiB reservation:
// 384 MiB worst-case owned PCM during preparation, 192 MiB after acknowledgement.
// Borrowed Superdough source buffers and garbage-collector lag are outside this
// ownership accounting; it is not a bound on total application memory.
const listeners = new Set<Listener>();
const reasons = new Map<string, string>();
const unsupported = new Set<string>();
let context: AudioContext | undefined;
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
const retiring = new Set<string>();
let installQueue: Promise<void> = Promise.resolve();
let workletPreparation: Promise<typeof import("@/services/preparedLiveInstrument")> | undefined;
let workletCatalog: typeof import("@/services/preparedLiveInstrument") | undefined;
let installingPcmBytes = 0;

function byteSize(instrument: PreparedLiveInstrument): number {
  if (instrument.kind !== "sample-bank") return 0;
  const buffers = new Set<ArrayBufferLike>();
  instrument.zones.forEach(zone => {
    zone.channels.forEach(channel => buffers.add(channel.buffer));
    zone.mipmaps?.forEach(level => level.forEach(channel => buffers.add(channel.buffer)));
  });
  return [...buffers].reduce((size, buffer) => size + buffer.byteLength, 0);
}

function invalidate(error?: unknown) {
  generation++;
  engine?.dispose();
  engine = undefined;
  managedEngine = undefined;
  enginePromise = undefined;
  installed.clear();
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

/** Prepare the selected sound before input is enabled. Unsupported sounds
 * retain Superdough output; prepared worklet PCM preserves its source buffers. */
export async function prepareLivePlayback(nextContext: AudioContext, destination: AudioNode | null, name: string): Promise<void> {
  const instrumentId = resolveLiveSoundName(name);
  if (!destination || (!nextContext.audioWorklet || typeof AudioWorkletNode === "undefined")) {
    reasons.set(instrumentId, !destination ? "Audio output is unavailable" : "AudioWorklet is unavailable");
    unsupported.add(instrumentId);
    return;
  }
  if (context !== nextContext) {
    invalidate();
    context = nextContext;
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
    const prepared = await (workletCatalog = await (workletPreparation ??= import("@/services/preparedLiveInstrument"))).prepareLiveInstrument(nextContext, instrumentId);
    preparedResult = prepared;
    if (run !== generation) return;
    if (prepared.kind === "unsupported" || prepared.kind === "retryable") {
      reasons.set(instrumentId, prepared.reason);
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
        onError: error => { if (run === generation) invalidate(error); },
        onOwnerEnded: ownerId => { if (run === generation) listeners.forEach(listener => listener.onOwnerEnded?.(ownerId)); },
      };
      enginePromise ??= (async () => {
        const { createLiveWorklet } = await import("@/audio/live/bridge");
        // The chain lives and dies with its worklet, so a stale build can
        // never tear down the effects of a newer one.
        const chain = createLiveShapingChain(nextContext, destination, getLiveOrbit);
        chain.apply(shaping);
        let worklet: LiveWorklet;
        try {
          worklet = await createLiveWorklet(nextContext, chain.input, callbacks);
        } catch (error) {
          chain.dispose();
          throw error;
        }
        worklet.shape(shaping.envelope);
        const disposeWorklet = worklet.dispose;
        return {
          ...worklet,
          dispose() { disposeWorklet(); chain.dispose(); },
          applyShaping(next: LiveShapingState) { chain.apply(next); worklet.shape(next.envelope); },
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
      // Held banks stay pinned. Released voices retire with a bounded fade;
      // their retained PCM remains charged until the adapter acknowledges it.
      while (installed.size >= MAX_BANKS || [...installed.values()].reduce((sum, size) => sum + size, bytes) > MAX_PCM_BYTES) {
        const oldest = [...installed.keys()].find(id => ![...pins.values()].some(held => held.has(id)));
        if (oldest === undefined) {
          reasons.set(instrumentId, "Live renderer instrument budget is occupied by held notes");
          return;
        }
        // The budget includes retiring PCM: wait for its bounded fade and
        // processor acknowledgement before installing another bank.
        retiring.add(oldest);
        await ready.forget(oldest);
        if (run !== generation) return;
        installed.delete(oldest);
        retiring.delete(oldest);
      }
      installingPcmBytes = bytes;
      await ready.prepare(prepared);
      if (run === generation) {
        installed.set(instrumentId, bytes);
        installingPcmBytes = 0;
        unsupported.delete(instrumentId);
        reasons.delete(instrumentId);
      }
    };
    await install();
  }).catch(error => {
    if (run === generation) {
      reasons.set(instrumentId, error instanceof Error ? error.message : "Live renderer preparation failed");
      invalidate(error);
    }
  }).finally(() => {
    if (preparedResult) workletCatalog?.releasePreparedLiveInstrument(nextContext, instrumentId, preparedResult);
    if (run === generation) installingPcmBytes = 0;
    if (preparing.get(instrumentId) === promise) preparing.delete(instrumentId);
  });
  // Serialize the entire preparation/installation transaction: only one new
  // pyramid can coexist with the installed banks. Drop its cache ownership
  // after acknowledgement (or fallback); source PCM still belongs to Superdough.
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

export function subscribeLivePlayback(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLivePlaybackDiagnostics(name: string) {
  const instrumentId = resolveLiveSoundName(name);
  const ready = Boolean(managedEngine && installed.has(instrumentId) && !retiring.has(instrumentId));
  const installedPcmBytes = [...installed.values()].reduce((sum, bytes) => sum + bytes, 0);
  const preparation = context ? workletCatalog?.getPreparedLiveInstrumentDiagnostics(context) : undefined;
  const cachedPreparationPcmBytes = preparation?.cachedPreparationPcmBytes ?? 0;
  const preparingPcmBytes = preparation?.preparingPcmBytes ?? 0;
  return {
    backend: ready ? "audio-worklet" : "superdough",
    requestedBackend: "worklet",
    reason: reasons.get(instrumentId) ?? null,
    installedBanks: installed.size,
    installedPcmBytes,
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
