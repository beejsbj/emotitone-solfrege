import type { LiveSampleZone, PreparedLiveInstrument } from "../audio/live/types";
import { prepareSampleMipmapsAsync } from "../audio/live/resampler";
import { preparedPcmBytes } from "../audio/live/pcm";
import { getCatalogSound } from "../audio/soundCatalog";
import { prepareNativeInstrument, UnsupportedLiveInstrumentError } from "./preparedNativeInstrument";
import type { UnsupportedLiveInstrument, RetryableLiveInstrument } from "./preparedNativeInstrument";
export type { UnsupportedLiveInstrument } from "./preparedNativeInstrument";
export type LiveInstrumentPreparation = PreparedLiveInstrument | UnsupportedLiveInstrument | RetryableLiveInstrument;

/**
 * Selection-time preparation for the live worklet: load the owned source PCM,
 * then build the anti-alias pyramid (derived PCM) it needs. The result is
 * handed to the bridge, which transfers every buffer to the worklet, so this
 * module keeps a prepared bank only until its installer releases it.
 */
interface Entry {
  registration: object | undefined;
  sampleRate: number;
  pending: Promise<LiveInstrumentPreparation>;
  result?: LiveInstrumentPreparation;
  sourcePcmBytes: number;
  derivedPcmBytes: number;
}
const entries = new WeakMap<AudioContext, Map<string, Entry>>();
const queues = new WeakMap<AudioContext, Promise<void>>();
const preparing = new WeakMap<AudioContext, { source: number; derived: number }>();
const MAX_BANK_BYTES = 192 * 1024 * 1024;
export const MAX_PREPARATION_PCM_BYTES = 192 * 1024 * 1024;

export function getPreparedLiveInstrumentDiagnostics(context: AudioContext) {
  const held = [...(entries.get(context)?.values() ?? [])].filter(entry => entry.result);
  const inFlight = preparing.get(context) ?? { source: 0, derived: 0 };
  return {
    cachedPreparationPcmBytes: held.reduce((sum, entry) => sum + entry.sourcePcmBytes + entry.derivedPcmBytes, 0),
    preparingPcmBytes: inFlight.source + inFlight.derived,
    preparationPcmBudgetBytes: MAX_PREPARATION_PCM_BYTES,
  };
}

/** Drop a prepared bank once it has been transferred (or refused). Its buffers are no longer ours. */
export function releasePreparedLiveInstrument(context: AudioContext, instrumentId: string, expected: LiveInstrumentPreparation) {
  const map = entries.get(context);
  if (map?.get(instrumentId)?.result === expected) map.delete(instrumentId);
}

async function prepare(context: AudioContext, instrumentId: string, sampleRate: number, signal?: AbortSignal): Promise<LiveInstrumentPreparation> {
  const raw = await prepareNativeInstrument(context, instrumentId, signal);
  if (raw.kind !== "sample-bank") return raw;
  const { zoneSelection, zones } = raw;
  const sourceBytes = preparedPcmBytes(raw).source;
  if (sourceBytes > MAX_BANK_BYTES) {
    throw new UnsupportedLiveInstrumentError(`Prepared bank requires ${sourceBytes} bytes; worklet budget is ${MAX_BANK_BYTES} bytes (192 MiB)`);
  }
  // Only prepare octaves this zone can actually play across MIDI 0..127.
  // Dense piano banks need no pyramid for nearly every root; preparing every
  // possible octave would double a 138 MiB bank for no audible benefit.
  const needed = new Map<LiveSampleZone, number>(zones.map(zone => [zone, 0]));
  for (let pitch = 0; pitch <= 127; pitch++) {
    const selected = zoneSelection === "first-range"
      ? zones.find(zone => pitch >= zone.lowMidi! && pitch <= zone.highMidi!)
      : zones.reduce((best, zone) => Math.abs(zone.rootMidi - pitch) < Math.abs(best.rootMidi - pitch) ? zone : best);
    if (!selected) continue;
    const ratio = 2 ** ((pitch - selected.rootMidi) / 12) * selected.sampleRate / (sampleRate || selected.sampleRate);
    needed.set(selected, Math.max(needed.get(selected)!, Math.max(0, Math.floor(Math.log2(ratio)))));
  }
  let derivedBytes = 0;
  for (const zone of zones) {
    let frames = zone.channels[0].length;
    for (let level = 0; frames > 1 && level < Math.min(16, needed.get(zone)!); level++) {
      frames = Math.ceil(frames / 2);
      derivedBytes += frames * Float32Array.BYTES_PER_ELEMENT * zone.channels.length;
    }
  }
  // Preflight the pyramid before allocating it: source plus derived PCM is one bank's budget.
  if (sourceBytes + derivedBytes > MAX_BANK_BYTES) {
    throw new UnsupportedLiveInstrumentError(`Prepared bank requires ${sourceBytes + derivedBytes} bytes; worklet budget is ${MAX_BANK_BYTES} bytes (192 MiB)`);
  }
  preparing.set(context, { source: sourceBytes, derived: derivedBytes });
  for (const zone of zones) {
    zone.mipmaps = await prepareSampleMipmapsAsync(zone.channels, zone.loopStartFrame, zone.loopEndFrame, needed.get(zone));
  }
  return raw;
}

/**
 * Prepare one instrument for the worklet. Concurrent requests share one
 * preparation; preparations run one at a time per context, which bounds peak
 * loading memory to one bank. Failures are not kept, so a later call retries.
 */
export function prepareLiveInstrument(context: AudioContext, instrumentId: string, signal?: AbortSignal): Promise<LiveInstrumentPreparation> {
  const registration = getCatalogSound(instrumentId);
  const map = entries.get(context) ?? new Map<string, Entry>();
  entries.set(context, map);
  const existing = map.get(instrumentId);
  if (existing && existing.registration === registration && existing.sampleRate === context.sampleRate) return existing.pending;
  const entry: Entry = { registration, sampleRate: context.sampleRate, pending: undefined!, sourcePcmBytes: 0, derivedPcmBytes: 0 };
  entry.pending = (queues.get(context) ?? Promise.resolve())
    .then(() => prepare(context, instrumentId, entry.sampleRate, signal))
    .catch(error => ({ kind: error instanceof UnsupportedLiveInstrumentError ? "unsupported" : "retryable",
      instrumentId, reason: error instanceof Error ? error.message : String(error) }) as const)
    .then(result => {
      preparing.delete(context);
      if (result.kind === "sample-bank" || result.kind === "oscillator") {
        const bytes = preparedPcmBytes(result);
        Object.assign(entry, { result, sourcePcmBytes: bytes.source, derivedPcmBytes: bytes.derived });
      } else if (map.get(instrumentId) === entry) map.delete(instrumentId);
      return result;
    });
  queues.set(context, entry.pending.then(() => {}));
  map.set(instrumentId, entry);
  return entry.pending;
}
