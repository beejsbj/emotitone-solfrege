// @ts-ignore — superdough ships no TypeScript declarations.
import { getSound } from "superdough";
import type { LiveSampleZone, PreparedLiveInstrument } from "../audio/live/types";
import { prepareSampleMipmapsAsync } from "../audio/live/resampler";
import { prepareNativeInstrument, UnsupportedLiveInstrumentError } from "./preparedNativeInstrument";
import type { UnsupportedLiveInstrument, RetryableLiveInstrument } from "./preparedNativeInstrument";
export type { UnsupportedLiveInstrument } from "./preparedNativeInstrument";
export type LiveInstrumentPreparation = PreparedLiveInstrument | UnsupportedLiveInstrument | RetryableLiveInstrument;
interface CacheEntry { registration: object; pending: Promise<LiveInstrumentPreparation>; additionalPcmBytes: number; result?: LiveInstrumentPreparation }
const caches = new WeakMap<AudioContext, Map<string, CacheEntry>>();
const queues = new WeakMap<AudioContext, Promise<void>>();
const preparingBytes = new WeakMap<AudioContext, number>();
const MAX_CACHED_BANKS = 8;
const MAX_BANK_BYTES = 192 * 1024 * 1024;
export const MAX_PREPARATION_PCM_BYTES = 192 * 1024 * 1024;

export function getPreparedLiveInstrumentDiagnostics(context: AudioContext) {
  return {
    cachedPreparationPcmBytes: [...(caches.get(context)?.values() ?? [])].reduce((sum, entry) => sum + entry.additionalPcmBytes, 0),
    preparingPcmBytes: preparingBytes.get(context) ?? 0,
    preparationPcmBudgetBytes: MAX_PREPARATION_PCM_BYTES,
  };
}

/** Release only our descriptor/pyramids. Superdough owns the borrowed source PCM. */
export function releasePreparedLiveInstrument(context: AudioContext, instrumentId: string, expected: LiveInstrumentPreparation) {
  const cache = caches.get(context);
  if (cache?.get(instrumentId)?.result === expected) cache.delete(instrumentId);
}

async function prepare(context: AudioContext, instrumentId: string, reserve: (bytes: number) => void): Promise<LiveInstrumentPreparation> {
  const raw = await prepareNativeInstrument(context, instrumentId);
  if (raw.kind !== "sample-bank") return raw;
  const { zoneSelection } = raw;
  const zones: LiveSampleZone[] = raw.zones.map(({ buffer, ...zone }) => ({
    ...zone, sampleRate: buffer.sampleRate,
    // Borrow read-only views. The bridge clones once and never detaches them.
    channels: Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel)),
  }));
  // Only prepare octaves this zone can actually play across MIDI 0..127.
  // Dense piano banks need no pyramid for nearly every root; preparing every
  // possible octave would double a 138 MiB bank for no audible benefit.
  const needed = new Map<LiveSampleZone, number>(zones.map(zone => [zone, 0]));
  for (let pitch = 0; pitch <= 127; pitch++) {
    const selected = zoneSelection === "first-range"
      ? zones.find(zone => pitch >= zone.lowMidi! && pitch <= zone.highMidi!)
      : zones.reduce((best, zone) => Math.abs(zone.rootMidi - pitch) < Math.abs(best.rootMidi - pitch) ? zone : best);
    if (!selected) continue;
    const ratio = 2 ** ((pitch - selected.rootMidi) / 12) * selected.sampleRate / (context.sampleRate || selected.sampleRate);
    needed.set(selected, Math.max(needed.get(selected)!, Math.max(0, Math.floor(Math.log2(ratio)))));
  }
  const originalBuffers = new Set(zones.flatMap(zone => zone.channels.map(channel => channel.buffer)));
  let preparedBytes = [...originalBuffers].reduce((total, buffer) => total + buffer.byteLength, 0);
  const borrowedBytes = preparedBytes;
  const assertBudget = () => {
    if (preparedBytes > MAX_BANK_BYTES) throw new UnsupportedLiveInstrumentError(`Prepared bank requires ${preparedBytes} bytes; worklet budget is ${MAX_BANK_BYTES} bytes (192 MiB)`);
  };
  assertBudget();
  // Preflight every required level before allocating/filtering. Identical
  // source/loop zones share a pyramid covering their combined pitch range.
  const pyramids = new Map<Float32Array, Map<string, { levels: number; mipmaps?: Float32Array[][] }>>();
  for (const zone of zones) {
    const loops = `${zone.loopStartFrame ?? 0}:${zone.loopEndFrame ?? 0}`;
    let cached = pyramids.get(zone.channels[0]);
    if (!cached) { cached = new Map(); pyramids.set(zone.channels[0], cached); }
    const levels = Math.max(needed.get(zone)!, cached.get(loops)?.levels ?? 0);
    cached.set(loops, { levels });
  }
  for (const [source, loops] of pyramids) for (const entry of loops.values()) {
    const channelCount = zones.find(zone => zone.channels[0] === source)!.channels.length;
    let frames = source.length;
    for (let level = 0; frames > 1 && level < Math.min(16, entry.levels); level++) {
      frames = Math.ceil(frames / 2);
      preparedBytes += frames * Float32Array.BYTES_PER_ELEMENT * channelCount;
    }
  }
  assertBudget();
  // Charge only new filtering PCM. Source channels remain Superdough-owned.
  reserve(preparedBytes - borrowedBytes);
  for (const zone of zones) {
    const loops = `${zone.loopStartFrame ?? 0}:${zone.loopEndFrame ?? 0}`;
    const entry = pyramids.get(zone.channels[0])!.get(loops)!;
    entry.mipmaps ??= await prepareSampleMipmapsAsync(zone.channels, zone.loopStartFrame, zone.loopEndFrame, entry.levels);
    zone.mipmaps = entry.mipmaps;
  }
  return { ...raw, zones };
}

/** Prepare selection-time PCM; unsupported/failed preparations preserve the existing renderer.
 * The bounded cache shares concurrent requests and follows sound re-registration.
 * Rejections are evicted so a transient download/decode failure can retry.
 */
export function prepareLiveInstrument(context: AudioContext, instrumentId: string): Promise<LiveInstrumentPreparation> {
  const sound = getSound(instrumentId) as object | undefined;
  if (!sound) return Promise.resolve({ kind: "retryable", instrumentId, reason: "Sound is not registered" });
  const cache = caches.get(context) ?? new Map<string, CacheEntry>();
  caches.set(context, cache);
  const existing = cache.get(instrumentId);
  if (existing?.registration === sound) {
    cache.delete(instrumentId); cache.set(instrumentId, existing);
    return existing.pending;
  }
  const entry: CacheEntry = { registration: sound, pending: undefined!, additionalPcmBytes: 0 };
  const reserve = (bytes: number) => {
    // Preparation is serialized per context; evict before allocating so
    // cached plus currently-being-built pyramids share this byte budget.
    for (const [id, candidate] of cache) {
      if (getPreparedLiveInstrumentDiagnostics(context).cachedPreparationPcmBytes + bytes <= MAX_PREPARATION_PCM_BYTES) break;
      if (candidate !== entry) cache.delete(id);
    }
    preparingBytes.set(context, bytes);
  };
  entry.pending = (queues.get(context) ?? Promise.resolve()).then(() => prepare(context, instrumentId, reserve)).then(result => {
    entry.result = result;
    entry.additionalPcmBytes = preparingBytes.get(context) ?? 0;
    preparingBytes.delete(context);
    if ((result.kind === "unsupported" || result.kind === "retryable") && cache.get(instrumentId) === entry) cache.delete(instrumentId);
    return result;
  }).catch(error => {
    if (cache.get(instrumentId) === entry) cache.delete(instrumentId);
    return { kind: error instanceof UnsupportedLiveInstrumentError ? "unsupported" : "retryable",
      instrumentId, reason: error instanceof Error ? error.message : String(error) } as const;
  }).finally(() => { preparingBytes.delete(context); });
  queues.set(context, entry.pending.then(() => {}));
  cache.set(instrumentId, entry);
  while (cache.size > MAX_CACHED_BANKS) cache.delete(cache.keys().next().value!);
  return entry.pending;
}
