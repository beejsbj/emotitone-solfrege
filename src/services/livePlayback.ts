import type { PreparedLiveInstrument } from "@/audio/live/types";
import type { LiveRenderer, LiveRendererCallbacks } from "@/audio/liveRenderer";
import type { PreparedNativeInstrument } from "@/services/preparedNativeInstrument";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";

type Listener = LiveRendererCallbacks;
const backend = import.meta.env.VITE_LIVE_AUDIO_BACKEND === "native" ? "native" : "worklet";
type Instrument = PreparedLiveInstrument | PreparedNativeInstrument;
interface Driver {
  renderer: LiveRenderer;
  install(instrument: Instrument): Promise<void>;
}

const MAX_BANKS = 4;
const MAX_PCM_BYTES = 192 * 1024 * 1024;
const listeners = new Set<Listener>();
const reasons = new Map<string, string>();
const unsupported = new Set<string>();
let context: AudioContext | undefined;
let engine: LiveRenderer | undefined;
let managedEngine: LiveRenderer | undefined;
let enginePromise: Promise<Driver> | undefined;
let generation = 0;
const installed = new Map<string, number>();
const preparing = new Map<string, Promise<void>>();
const pins = new Map<string, Set<string>>();
const retiring = new Set<string>();
let installQueue: Promise<void> = Promise.resolve();
let workletPreparation: Promise<typeof import("@/services/preparedLiveInstrument")> | undefined;
let nativePreparation: Promise<typeof import("@/services/preparedNativeInstrument")> | undefined;


function byteSize(instrument: Instrument): number {
  if (instrument.kind !== "sample-bank") return 0;
  const buffers = new Set<ArrayBufferLike | AudioBuffer>();
  instrument.zones.forEach(zone => {
    if ("buffer" in zone) { buffers.add(zone.buffer); return; }
    zone.channels.forEach(channel => buffers.add(channel.buffer));
    zone.mipmaps?.forEach(level => level.forEach(channel => buffers.add(channel.buffer)));
  });
  return [...buffers].reduce((size, buffer) => size + ("byteLength" in buffer ? buffer.byteLength : buffer.length * buffer.numberOfChannels * 4), 0);
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
  unsupported.clear();
  installQueue = Promise.resolve();
  if (error) {
    const failure = error instanceof Error ? error : new Error(String(error));
    listeners.forEach(listener => listener.onError?.(failure));
  }
}

/** Prepare the selected adapter before input is enabled. Unsupported sounds
 * retain their original renderer. Native buffers are borrowed; worklet PCM is cloned. */
export async function prepareLivePlayback(nextContext: AudioContext, destination: AudioNode | null, name: string): Promise<void> {
  const instrumentId = resolveLiveSoundName(name);
  if (!destination || (backend === "worklet" && (!nextContext.audioWorklet || typeof AudioWorkletNode === "undefined"))) {
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
  const promise = (async () => {
    const prepared = backend === "native"
      ? await (await (nativePreparation ??= import("@/services/preparedNativeInstrument"))).prepareNativeInstrument(nextContext, instrumentId)
      : await (await (workletPreparation ??= import("@/services/preparedLiveInstrument"))).prepareLiveInstrument(nextContext, instrumentId);
    if (run !== generation) return;
    if (prepared.kind === "unsupported") {
      reasons.set(instrumentId, prepared.reason);
      unsupported.add(instrumentId);
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
      enginePromise ??= (async (): Promise<Driver> => {
        if (backend === "native") {
          const { createPreparedNativeRenderer } = await import("@/audio/native/renderer");
          const renderer = createPreparedNativeRenderer(nextContext, destination, callbacks);
          return { renderer, install: instrument => renderer.prepare(instrument as PreparedNativeInstrument) };
        }
        const { createLiveWorklet } = await import("@/audio/live/bridge");
        const renderer = await createLiveWorklet(nextContext, destination, callbacks);
        return { renderer, install: instrument => renderer.prepare(instrument as PreparedLiveInstrument) };
      })();
      const driver = await enginePromise;
      const ready = driver.renderer;
      if (run !== generation) { ready.dispose(); return; }
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
      await driver.install(prepared);
      if (run === generation) {
        installed.set(instrumentId, bytes);
        reasons.delete(instrumentId);
      }
    };
    // Decoding can overlap, but eviction, cloning and the acknowledgement are
    // one transaction so concurrent selections cannot exceed the bank budget.
    const queued = installQueue.then(install);
    installQueue = queued.catch(() => {});
    await queued;
  })().catch(error => {
    if (run === generation) {
      reasons.set(instrumentId, error instanceof Error ? error.message : "Live renderer preparation failed");
      invalidate(error);
    }
  }).finally(() => {
    if (preparing.get(instrumentId) === promise) preparing.delete(instrumentId);
  });
  preparing.set(instrumentId, promise);
  return promise;
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
  return (backend === "native" || typeof AudioWorkletNode !== "undefined") && !unsupported.has(instrumentId)
    && (!installed.has(instrumentId) || retiring.has(instrumentId));
}

export function subscribeLivePlayback(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getLivePlaybackDiagnostics(name: string) {
  const instrumentId = resolveLiveSoundName(name);
  const ready = Boolean(managedEngine && installed.has(instrumentId) && !retiring.has(instrumentId));
  return {
    backend: ready ? (backend === "native" ? "native-web-audio" : "audio-worklet") : "superdough",
    requestedBackend: backend,
    reason: reasons.get(instrumentId) ?? null,
    installedBanks: installed.size,
    installedPcmBytes: [...installed.values()].reduce((sum, bytes) => sum + bytes, 0),
    additionalPcmBytes: backend === "native" ? 0 : [...installed.values()].reduce((sum, bytes) => sum + bytes, 0),
    lookaheadMs: backend === "native" ? 400 : null,
    preparationLeadMs: ready ? 0 : 5,
  };
}
