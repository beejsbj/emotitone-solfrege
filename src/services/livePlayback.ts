import type { LiveVoiceEvent, LiveWorklet, PreparedLiveInstrument } from "@/audio/live/types";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";

interface Listener {
  onEvent(event: LiveVoiceEvent): void;
  onPlan(events: LiveVoiceEvent[]): void;
  onError?(error: unknown): void;
  onOwnerEnded?(ownerId: string): void;
}

const MAX_BANKS = 4;
const MAX_PCM_BYTES = 192 * 1024 * 1024;
const listeners = new Set<Listener>();
const reasons = new Map<string, string>();
const unsupported = new Set<string>();
let context: AudioContext | undefined;
let engine: LiveWorklet | undefined;
let managedEngine: LiveWorklet | undefined;
let enginePromise: Promise<LiveWorklet> | undefined;
let generation = 0;
const installed = new Map<string, number>();
const preparing = new Map<string, Promise<void>>();
const pins = new Map<string, Set<string>>();
const retiring = new Set<string>();
let installQueue: Promise<void> = Promise.resolve();
let preparationModule: Promise<typeof import("@/services/preparedLiveInstrument")> | undefined;

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
  unsupported.clear();
  installQueue = Promise.resolve();
  if (error) listeners.forEach(listener => listener.onError?.(error));
}

/** Prepares the persistent render-thread instrument before input is enabled.
 * Unsupported sounds retain their original renderer and a diagnostic reason.
 * AudioBuffer views are cloned by MessagePort; never detach the shared cache.
 */
export async function prepareLivePlayback(nextContext: AudioContext, destination: AudioNode | null, name: string): Promise<void> {
  const instrumentId = resolveLiveSoundName(name);
  if (!nextContext.audioWorklet || !destination || typeof AudioWorkletNode === "undefined") {
    reasons.set(instrumentId, "AudioWorklet is unavailable");
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
    preparationModule ??= import("@/services/preparedLiveInstrument");
    const { prepareLiveInstrument } = await preparationModule;
    const prepared = await prepareLiveInstrument(nextContext, instrumentId);
    if (run !== generation) return;
    if (prepared.kind === "unsupported") {
      reasons.set(instrumentId, prepared.reason);
      unsupported.add(instrumentId);
      return;
    }
    const bytes = byteSize(prepared);
    if (bytes > MAX_PCM_BYTES) {
      reasons.set(instrumentId, "Sample bank exceeds the 192 MiB live worklet budget");
      unsupported.add(instrumentId);
      return;
    }
    const install = async () => {
      if (run !== generation) return;
      const { createLiveWorklet } = await import("@/audio/live/bridge");
      if (run !== generation) return;
      enginePromise ??= createLiveWorklet(nextContext, destination, {
        onEvent: event => { if (run === generation) listeners.forEach(listener => listener.onEvent(event)); },
        onPlan: events => { if (run === generation) listeners.forEach(listener => listener.onPlan(events)); },
        onError: error => { if (run === generation) invalidate(error); },
        onOwnerEnded: ownerId => { if (run === generation) listeners.forEach(listener => listener.onOwnerEnded?.(ownerId)); },
      });
      const ready = await enginePromise;
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
      // Eviction removes bank lookup only. Sounding voices retain their data
      // until their envelopes finish, so selection never truncates a release.
      while (installed.size >= MAX_BANKS || [...installed.values()].reduce((sum, size) => sum + size, bytes) > MAX_PCM_BYTES) {
        const oldest = [...installed.keys()].find(id => ![...pins.values()].some(held => held.has(id)));
        if (oldest === undefined) {
          reasons.set(instrumentId, "Live worklet instrument budget is occupied by held notes");
          return;
        }
        // The budget includes retiring PCM: wait for its bounded fade and
        // processor acknowledgement before cloning another bank.
        retiring.add(oldest);
        await ready.forget(oldest);
        if (run !== generation) return;
        installed.delete(oldest);
        retiring.delete(oldest);
      }
      await ready.prepare(prepared);
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
      reasons.set(instrumentId, error instanceof Error ? error.message : "Live worklet preparation failed");
      invalidate(error);
    }
  }).finally(() => {
    if (preparing.get(instrumentId) === promise) preparing.delete(instrumentId);
  });
  preparing.set(instrumentId, promise);
  return promise;
}

export function getLivePlayback(name: string): LiveWorklet | undefined {
  const instrumentId = resolveLiveSoundName(name);
  if (!installed.has(instrumentId) || retiring.has(instrumentId)) return undefined;
  const bytes = installed.get(instrumentId)!;
  installed.delete(instrumentId);
  installed.set(instrumentId, bytes);
  return managedEngine;
}

export function needsLivePlaybackPreparation(name: string): boolean {
  const instrumentId = resolveLiveSoundName(name);
  return typeof AudioWorkletNode !== "undefined" && !unsupported.has(instrumentId)
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
    backend: ready ? "audio-worklet" : "superdough",
    reason: reasons.get(instrumentId) ?? null,
    installedBanks: installed.size,
    installedPcmBytes: [...installed.values()].reduce((sum, bytes) => sum + bytes, 0),
    preparationLeadMs: ready ? 0 : 5,
  };
}
