import { onAudioRunning } from "@/services/audioLifecycle";
import type { LiveEnvelopeOverride, PreparedLiveInstrument, LiveWorklet } from "@/audio/live/types";
import type { LiveRenderer, LiveRendererCallbacks } from "@/audio/liveRenderer";
import { createLiveShapingChain, type LiveShaping } from "@/audio/liveShaping";
import { getLiveOrbit } from "@/services/audioRuntime";
import { resolveLiveSoundName } from "@/services/liveInstrumentNames";
import { preparedPcmBytes } from "@/audio/live/pcm";
import { getCatalogSound } from "@/audio/soundCatalog";
import type { TransportCommand } from "@/audio/live/transport";
import type { RenderCostSnapshot } from "@/audio/live/renderCost";

type Listener = LiveRendererCallbacks & {
  onLoadError?(instrumentId: string, reason: string): void;
  /** The renderer generation ended (failure, rebuild or a new context): its transport state is gone. */
  onRendererReset?(): void;
};

/** Commands for the pattern transport inside the current live worklet. */
export interface LiveTransportPort {
  send(command: TransportCommand): void;
  readonly sampleRate: number;
  /** The renderer generation this port belongs to; stale ports drop commands. */
  readonly generation: number;
}

const MAX_PCM_BYTES = 192 * 1024 * 1024;
// Memory is the only limit on loaded sounds; there is no count of instruments.
// Worklet-owned PCM (source plus derived pyramids, including a pending
// installation) is capped at 192 MiB, set from the Android phone-gate run
// (150.7 MiB of banks resident, tab healthy; iOS has not been measured). An
// oscillator instrument holds no PCM, so it takes none of that budget and is
// never evicted for it. The loader decodes into buffers it owns and the bridge
// transfers them, so after acknowledgement the worklet holds the only copy.
// One bank prepares at a time (at most 192 MiB), so the worst case while one
// more bank is being prepared is 384 MiB of owned PCM: 192 MiB installed plus
// 192 MiB preparing, before any eviction makes room. A decoded AudioBuffer
// awaiting garbage collection is outside this accounting; it is not a bound on
// total memory.
const listeners = new Set<Listener>();
const reasons = new Map<string, string>();
const unsupported = new Set<string>();
let context: AudioContext | undefined;
let output: AudioNode | undefined;
// Names only, never PCM. A formerly resident bank must recover before input
// can choose a renderer, including after processor failures at the same rate.
const workletInstruments = new Set<string>();
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
/** Instruments whose data could not be downloaded or decoded (retryable). */
const loadFailures = new Set<string>();
/**
 * Sampled instruments refused because the banks that held keys and Looper
 * members keep resident leave no room for them in the PCM budget. Live input
 * on one falls back to the main-thread renderer instead of being dropped; the
 * transport refuses the join instead.
 */
const budgetRefused = new Set<string>();
/**
 * Bytes each bank needed when last prepared, so a refused bank is not downloaded
 * again for nothing and a known one can make room before it downloads. An entry
 * belongs to the registration it was measured from: re-registering the sound
 * (new samples) makes it stale.
 */
const knownBankBytes = new Map<string, { registration: unknown; bytes: number }>();

function knownBytesOf(instrumentId: string): number | undefined {
  const known = knownBankBytes.get(instrumentId);
  if (!known) return undefined;
  if (known.registration === getCatalogSound(instrumentId)) return known.bytes;
  knownBankBytes.delete(instrumentId);
  return undefined;
}
const retiring = new Set<string>();
let installQueue: Promise<void> = Promise.resolve();
let preparationAbort = new AbortController();
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

const mib = (bytes: number) => `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;

/** A resident bank that eviction can free: unpinned, and holding PCM (an oscillator holds none). */
function isEvictable(instrumentId: string): boolean {
  return (installed.get(instrumentId) ?? 0) > 0 && !isPinned(instrumentId);
}

/** PCM held by banks that held keys or Looper members keep resident, which eviction cannot free. */
function pinnedPcmBytes(): number {
  let total = 0;
  for (const [instrumentId, bytes] of installed) if (isPinned(instrumentId)) total += bytes;
  return total;
}

/**
 * Why a bank cannot be loaded: the sounds that playing loops and held keys keep
 * resident already use too much of the budget. `needed` is unknown before the
 * bank has been prepared once.
 */
function budgetReason(needed: number | undefined, pinned: number): string {
  const inUse = `${mib(pinned)} of the ${mib(MAX_PCM_BYTES)} sample memory is held by playing loops and keys`;
  return needed === undefined ? `Sample memory is full: ${inUse}` : `Sample memory is full: this sound needs ${mib(needed)}, but ${inUse}`;
}

/**
 * Retire the least recently used evictable banks until `bytes` more fits in the
 * budget. Every victim is chosen, and marked retiring so no new attack can use
 * or pin it, in one synchronous step; only then are they forgotten. Choosing
 * one at a time across the awaited fades let a key pressed meanwhile pin a
 * later victim, and the install was refused after a bank had already gone.
 * Returns false, having evicted nothing, when the pinned banks leave no room.
 * The budget includes retiring PCM, so the banks leave `installed` only once
 * the processor has acknowledged them. If the generation changes while they
 * fade, the new generation has already cleared this bookkeeping.
 */
async function makeRoom(forget: (instrumentId: string) => Promise<void>, bytes: number, run: number): Promise<boolean> {
  if (pinnedPcmBytes() + bytes > MAX_PCM_BYTES) return false;
  let total = bytes;
  for (const size of installed.values()) total += size;
  const victims: string[] = [];
  for (const instrumentId of installed.keys()) {
    if (total <= MAX_PCM_BYTES) break;
    if (!isEvictable(instrumentId)) continue;
    victims.push(instrumentId);
    total -= installed.get(instrumentId)!;
  }
  if (total > MAX_PCM_BYTES) return false;
  for (const instrumentId of victims) retiring.add(instrumentId);
  await Promise.all(victims.map(forget));
  if (run !== generation) return true;
  for (const instrumentId of victims) {
    installed.delete(instrumentId);
    installedPcm.delete(instrumentId);
    retiring.delete(instrumentId);
  }
  return true;
}

function refuseForBudget(instrumentId: string, needed: number | undefined, pinned: number) {
  reasons.set(instrumentId, budgetReason(needed, pinned));
  budgetRefused.add(instrumentId);
  loadFailures.delete(instrumentId);
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
  knownBankBytes.clear();
  listeners.forEach(listener => listener.onRendererReset?.());
  // Allow five seconds to drain, then unwind stalled native fetch/decode waits.
  // Keep the queue serialized: bypassing it could leave retired owned PCM alive.
  const retired = preparationAbort;
  preparationAbort = new AbortController();
  const deadline = setTimeout(() => retired.abort(new Error("Live renderer recovery drain timed out")), 5000);
  void installQueue.then(() => clearTimeout(deadline));
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
      invalidate(new Error("Audio sample rate changed; rebuilding live renderer"));
      // Preparation can run at a transient rate even when the route returns
      // to its starting rate. Check the actual build rates before opening input.
      return Promise.all(names.map(id => prepareLivePlayback(nextContext, destination, id))).then(recover);
    });
  }
  output = destination;
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
  // Each attempt decides afresh: a pin released since the refusal may make room.
  budgetRefused.delete(instrumentId);
  let preparedResult: import("@/services/preparedLiveInstrument").LiveInstrumentPreparation | undefined;
  const promise = installQueue.then(async () => {
    if (run !== generation) return;
    workletCatalog = await (workletPreparation ??= import("@/services/preparedLiveInstrument"));
    if (run !== generation) return;
    const knownBytes = knownBytesOf(instrumentId);
    // A bank larger than the whole budget can never fit, however little is pinned:
    // it stays unsupported, with the reason it was given, rather than "memory full".
    if (knownBytes !== undefined && knownBytes > MAX_PCM_BYTES) return;
    // With the size this bank had last time (an oscillator's is 0), refuse before
    // downloading anything when the pinned banks leave no room for it. Nothing is
    // evicted until the bank has downloaded: room made earlier would take banks
    // from a Looper member whose pin has not landed yet, and would leave the
    // keyboard's sound unavailable for the whole download. A bank not prepared
    // before has no known size and so no early decision: it may be an oscillator,
    // which needs no memory however full the pinned banks are.
    if (knownBytes !== undefined) {
      const pinnedBefore = pinnedPcmBytes();
      if (pinnedBefore + knownBytes > MAX_PCM_BYTES) {
        refuseForBudget(instrumentId, knownBytes, pinnedBefore);
        return;
      }
    }
    const preparationSampleRate = nextContext.sampleRate;
    // Read before the download: a sound registered again while it downloads must not
    // inherit the size of the samples it replaced.
    const registration = getCatalogSound(instrumentId);
    const prepared = await workletCatalog.prepareLiveInstrument(nextContext, instrumentId, preparationAbort.signal);
    preparedResult = prepared;
    if (run !== generation) return;
    builtSampleRates.add(preparationSampleRate);
    if (prepared.kind === "unsupported" || prepared.kind === "retryable") {
      reasons.set(instrumentId, prepared.reason);
      if (prepared.kind === "retryable") loadFailures.add(instrumentId);
      else loadFailures.delete(instrumentId);
      if (prepared.kind === "unsupported") unsupported.add(instrumentId);
      else unsupported.delete(instrumentId);
      if (prepared.kind === "retryable") listeners.forEach(listener => listener.onLoadError?.(instrumentId, prepared.reason));
      return;
    }
    const bytes = byteSize(prepared);
    knownBankBytes.set(instrumentId, { registration, bytes });
    if (bytes > MAX_PCM_BYTES) {
      reasons.set(instrumentId, `Sample bank needs ${mib(bytes)}, more than the ${mib(MAX_PCM_BYTES)} sample memory`);
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
        onTransport: response => { if (run === generation) listeners.forEach(listener => listener.onTransport?.(response)); },
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
      // Held and pinned banks stay resident. If they leave no room, refuse before
      // evicting anything: freeing other banks would not help. Otherwise retire the
      // least recently used banks that hold PCM until this one fits. This runs only
      // after the download, so a bank is never evicted for one that then fails.
      if (!await makeRoom(id => ready.forget(id), bytes, run)) {
        refuseForBudget(instrumentId, bytes, pinnedPcmBytes());
        return;
      }
      if (run !== generation) return;
      installingPcmBytes = bytes;
      const split = preparedPcmBytes(prepared);
      // Transfers the PCM: from here the worklet owns the bank's only copy.
      const acknowledgement = ready.prepare(prepared);
      workletCatalog?.releasePreparedLiveInstrument(nextContext, instrumentId, prepared);
      preparedResult = undefined;
      await acknowledgement;
      if (run === generation) {
        installed.set(instrumentId, bytes);
        workletInstruments.add(instrumentId);
        installedPcm.set(instrumentId, split);
        loadFailures.delete(instrumentId);
        budgetRefused.delete(instrumentId);
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
  // bank can coexist with the installed banks. Release its preparation entry
  // immediately after posting, or in finally when installation is refused.
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

/** Undefined preserves synchronous input when ready (or intentionally on the
 * fallback). Otherwise wait for the worklet, never warming a second PCM copy.
 * A failed recovery drops this input and reports through onLoadError. A bank
 * refused for budget (held keys and Looper members keep too much sample
 * memory resident) is not a failure: the input plays on the fallback renderer. */
export function waitForLivePlayback(name: string): Promise<void> | undefined {
  const instrumentId = resolveLiveSoundName(name);
  if (!workletInstruments.has(instrumentId) || getLivePlayback(name) || unsupported.has(instrumentId)) return;
  if (!context || !output) return;
  const nextContext = context, destination = output;
  return (async () => {
    let run: number;
    do {
      run = generation;
      await prepareLivePlayback(nextContext, destination, instrumentId);
    } while (run !== generation && preparing.has(instrumentId) && context === nextContext);
    if (!getLivePlayback(instrumentId) && !budgetRefused.has(instrumentId)) {
      const reason = reasons.get(instrumentId) ?? "Live renderer recovery failed";
      listeners.forEach(listener => listener.onLoadError?.(instrumentId, reason));
      throw new Error(reason);
    }
  })();
}

/**
 * The pattern transport of the live worklet that holds `name`, once that
 * instrument is installed. Undefined while it is not (prepare it first).
 */
export function getLiveTransport(name: string): LiveTransportPort | undefined {
  const instrumentId = resolveLiveSoundName(name);
  if (!engine || !context || !installed.has(instrumentId) || retiring.has(instrumentId)) return undefined;
  const ready = engine, run = generation, sampleRate = context.sampleRate;
  return {
    send(command) { if (run === generation) ready.transport(command); },
    sampleRate,
    generation: run,
  };
}

/**
 * The live worklet's render cost per quantum (a read-only measurement for the
 * phone gate). The first read starts measuring; `reset` starts a new window.
 * Undefined while no worklet is built.
 */
export function readLiveRenderCost(reset = false): Promise<RenderCostSnapshot> | undefined {
  return engine?.renderCost(reset);
}

export function needsLivePlaybackPreparation(name: string): boolean {
  const instrumentId = resolveLiveSoundName(name);
  return (typeof AudioWorkletNode !== "undefined") && !unsupported.has(instrumentId)
    && (!installed.has(instrumentId) || retiring.has(instrumentId));
}

/** Why the worklet does not hold a sound: its data failed to load (retry may help),
 * or the worklet cannot or will not hold it (the fallback renderer plays it).
 * `budget` is set when it was refused because pinned banks leave no sample memory for it. */
export function getLivePlaybackFailure(name: string): { kind: "load" | "fallback"; reason: string; budget?: true } | undefined {
  const instrumentId = resolveLiveSoundName(name);
  if (installed.has(instrumentId) && !retiring.has(instrumentId)) return undefined;
  const reason = reasons.get(instrumentId) ?? (typeof AudioWorkletNode === "undefined" ? "AudioWorklet is unavailable" : "Live renderer is not prepared");
  return { kind: loadFailures.has(instrumentId) ? "load" : "fallback", reason,
    ...(budgetRefused.has(instrumentId) ? { budget: true as const } : {}) };
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
