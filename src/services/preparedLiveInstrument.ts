// @ts-ignore — superdough ships no TypeScript declarations.
import { getSound, getSampleInfo, getLoadedBuffer, loadBuffer } from "superdough";
// @ts-ignore — this export is supplied by the checked-in soundfonts patch.
import { getPreparedSoundfont } from "@strudel/soundfonts";
import type { LiveSampleZone, PreparedLiveInstrument } from "../audio/live/types";
import { getLiveArticulation } from "./liveArticulation";
import { prepareSampleMipmapsAsync } from "../audio/live/resampler";

export interface UnsupportedLiveInstrument {
  kind: "unsupported";
  instrumentId: string;
  reason: string;
  /** Loading/decoding failures may retry; catalog incompatibility is permanent. */
  retryable?: boolean;
}
export type LiveInstrumentPreparation = PreparedLiveInstrument | UnsupportedLiveInstrument;

interface SoundRegistration {
  data?: { type?: string; samples?: string[] | Record<string, string[]>; fonts?: string[] };
}
interface FontZone {
  buffer: AudioBuffer;
  originalPitch: number;
  coarseTune: number;
  fineTune: number;
  keyRangeLow: number;
  keyRangeHigh: number;
  sampleRate: number;
  loopStart: number;
  loopEnd: number;
}
interface CacheEntry { registration: SoundRegistration; pending: Promise<LiveInstrumentPreparation> }
const caches = new WeakMap<AudioContext, Map<string, CacheEntry>>();
const MAX_CACHED_BANKS = 8;
const MAX_BANK_BYTES = 192 * 1024 * 1024;
class UnsupportedLiveInstrumentError extends Error {}
const OSCILLATORS = new Set(["sine", "triangle", "square", "sawtooth"]);

function channels(buffer: AudioBuffer): Float32Array[] {
  if (!(buffer.sampleRate > 0) || !Number.isFinite(buffer.sampleRate) || buffer.length < 1 ||
      buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) {
    throw new UnsupportedLiveInstrumentError("Only valid mono/stereo PCM is supported");
  }
  // Borrow read-only views. The bridge clones once, never transfers these buffers:
  // detaching them would damage both the sample cache and the fallback renderer.
  return Array.from({ length: buffer.numberOfChannels }, (_, channel) => buffer.getChannelData(channel));
}

async function prepare(context: AudioContext, instrumentId: string, sound: SoundRegistration): Promise<PreparedLiveInstrument> {
  const articulation = getLiveArticulation(instrumentId);
  const envelope = { ...articulation, decay: 0.001, sustain: 1 };
  const data = sound.data;
  if (data?.type === "synth" && OSCILLATORS.has(instrumentId)) {
    return { kind: "oscillator", instrumentId, waveform: instrumentId as "sine" | "triangle" | "square" | "sawtooth",
      gain: 0.8 * 0.3, ...envelope };
  }
  let zones: LiveSampleZone[];
  let zoneSelection: "first-range" | "nearest-root";
  let gain: number;
  if (data?.type === "soundfont" && data.fonts?.[0]) {
    const fonts: FontZone[] = await getPreparedSoundfont(data.fonts[0], context);
    zones = fonts.map((zone, index) => {
      const rootMidi = (zone.originalPitch - 100 * zone.coarseTune - zone.fineTune) / 100;
      if (![rootMidi, zone.keyRangeLow, zone.keyRangeHigh].every(Number.isFinite)) {
        throw new UnsupportedLiveInstrumentError("Invalid soundfont tuning or key range");
      }
      const prepared: LiveSampleZone = {
        id: `${instrumentId}:${index}`, rootMidi, lowMidi: zone.keyRangeLow,
        // Match upstream findZone exactly, including its overlapping upper edge.
        highMidi: zone.keyRangeHigh + 1, sampleRate: zone.buffer.sampleRate, channels: channels(zone.buffer),
      };
      if (zone.loopStart > 1 && zone.loopStart < zone.loopEnd) {
        if (!(zone.sampleRate > 0) || !Number.isFinite(zone.loopEnd)) throw new UnsupportedLiveInstrumentError("Invalid soundfont loop");
        // Source loop offsets use the preset rate, while decodeAudioData can resample.
        prepared.loopStartFrame = zone.loopStart / zone.sampleRate * zone.buffer.sampleRate;
        prepared.loopEndFrame = zone.loopEnd / zone.sampleRate * zone.buffer.sampleRate;
        if (prepared.loopEndFrame > zone.buffer.length) throw new UnsupportedLiveInstrumentError("Soundfont loop exceeds decoded PCM");
      }
      return prepared;
    });
    zoneSelection = "first-range";
    gain = 0.8 * 0.3;
  } else if (data?.type === "sample" && data.samples) {
    const bank = data.samples;
    const entries = Array.isArray(bank) ? [["default", bank] as const] : Object.entries(bank).filter(([key]) => !key.startsWith("_"));
    zones = await Promise.all(entries.map(async ([key, samples], index) => {
      if (!Array.isArray(samples) || typeof samples[0] !== "string") throw new UnsupportedLiveInstrumentError("Unsupported sample bank entry");
      // Use the installed sampler's pitch parser and n=0 selection. Array banks
      // have root MIDI 36; keyed banks keep insertion-order nearest-root ties.
      const info = getSampleInfo({ s: instrumentId, note: 0 }, Array.isArray(bank) ? samples : { [key]: samples });
      const rootMidi = -info.transpose;
      if (!Number.isFinite(rootMidi)) throw new UnsupportedLiveInstrumentError("Invalid sample root pitch");
      const buffer: AudioBuffer = getLoadedBuffer(info.url.replace("#", "%23")) ?? await loadBuffer(info.url, context, instrumentId);
      return { id: `${instrumentId}:${index}`, rootMidi, sampleRate: buffer.sampleRate, channels: channels(buffer) };
    }));
    zoneSelection = "nearest-root";
    gain = 0.8;
  } else {
    throw new UnsupportedLiveInstrumentError(`Unsupported live renderer: ${data?.type ?? "unregistered"} (${instrumentId})`);
  }
  if (!zones.length) throw new UnsupportedLiveInstrumentError("Instrument contains no playable sample zones");
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
  for (const zone of zones) {
    const loops = `${zone.loopStartFrame ?? 0}:${zone.loopEndFrame ?? 0}`;
    const entry = pyramids.get(zone.channels[0])!.get(loops)!;
    entry.mipmaps ??= await prepareSampleMipmapsAsync(zone.channels, zone.loopStartFrame, zone.loopEndFrame, entry.levels);
    zone.mipmaps = entry.mipmaps;
  }
  return { kind: "sample-bank", instrumentId, gain, ...envelope, zoneSelection, zones };
}

/** Prepare selection-time PCM; unsupported/failed preparations preserve the existing renderer.
 * The bounded cache shares concurrent requests and follows sound re-registration.
 * Rejections are evicted so a transient download/decode failure can retry.
 */
export function prepareLiveInstrument(context: AudioContext, instrumentId: string): Promise<LiveInstrumentPreparation> {
  const sound = getSound(instrumentId) as SoundRegistration | undefined;
  if (!sound) return Promise.resolve({ kind: "unsupported", retryable: true, instrumentId, reason: "Sound is not registered" });
  const cache = caches.get(context) ?? new Map<string, CacheEntry>();
  caches.set(context, cache);
  const existing = cache.get(instrumentId);
  if (existing?.registration === sound) {
    cache.delete(instrumentId); cache.set(instrumentId, existing);
    return existing.pending;
  }
  const entry: CacheEntry = { registration: sound, pending: undefined! };
  entry.pending = prepare(context, instrumentId, sound).catch(error => {
    if (cache.get(instrumentId) === entry) cache.delete(instrumentId);
    return { kind: "unsupported", retryable: !(error instanceof UnsupportedLiveInstrumentError),
      instrumentId, reason: error instanceof Error ? error.message : String(error) } as const;
  });
  cache.set(instrumentId, entry);
  while (cache.size > MAX_CACHED_BANKS) cache.delete(cache.keys().next().value!);
  return entry.pending;
}
