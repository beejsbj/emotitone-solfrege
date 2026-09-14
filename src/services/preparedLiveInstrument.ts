// @ts-ignore — superdough ships no TypeScript declarations.
import { getSound, getSampleInfo, getLoadedBuffer, loadBuffer } from "superdough";
// @ts-ignore — this export is supplied by the checked-in soundfonts patch.
import { getPreparedSoundfont } from "@strudel/soundfonts";
import type { LiveSampleZone, PreparedLiveInstrument } from "../audio/live/types";
import { getLiveArticulation } from "./liveArticulation";

export interface UnsupportedLiveInstrument {
  kind: "unsupported";
  instrumentId: string;
  reason: string;
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
const MAX_BANK_BYTES = 64 * 1024 * 1024;
const OSCILLATORS = new Set(["sine", "triangle", "square", "sawtooth"]);

function channels(buffer: AudioBuffer): Float32Array[] {
  if (!(buffer.sampleRate > 0) || !Number.isFinite(buffer.sampleRate) || buffer.length < 1 ||
      buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) {
    throw new Error("Only valid mono/stereo PCM is supported");
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
        throw new Error("Invalid soundfont tuning or key range");
      }
      const prepared: LiveSampleZone = {
        id: `${instrumentId}:${index}`, rootMidi, lowMidi: zone.keyRangeLow,
        // Match upstream findZone exactly, including its overlapping upper edge.
        highMidi: zone.keyRangeHigh + 1, sampleRate: zone.buffer.sampleRate, channels: channels(zone.buffer),
      };
      if (zone.loopStart > 1 && zone.loopStart < zone.loopEnd) {
        if (!(zone.sampleRate > 0) || !Number.isFinite(zone.loopEnd)) throw new Error("Invalid soundfont loop");
        // Source loop offsets use the preset rate, while decodeAudioData can resample.
        prepared.loopStartFrame = zone.loopStart / zone.sampleRate * zone.buffer.sampleRate;
        prepared.loopEndFrame = zone.loopEnd / zone.sampleRate * zone.buffer.sampleRate;
        if (prepared.loopEndFrame > zone.buffer.length) throw new Error("Soundfont loop exceeds decoded PCM");
      }
      return prepared;
    });
    zoneSelection = "first-range";
    gain = 0.8 * 0.3;
  } else if (data?.type === "sample" && data.samples) {
    const bank = data.samples;
    const entries = Array.isArray(bank) ? [["default", bank] as const] : Object.entries(bank).filter(([key]) => !key.startsWith("_"));
    zones = await Promise.all(entries.map(async ([key, samples], index) => {
      if (!Array.isArray(samples) || typeof samples[0] !== "string") throw new Error("Unsupported sample bank entry");
      // Use the installed sampler's pitch parser and n=0 selection. Array banks
      // have root MIDI 36; keyed banks keep insertion-order nearest-root ties.
      const info = getSampleInfo({ s: instrumentId, note: 0 }, Array.isArray(bank) ? samples : { [key]: samples });
      const rootMidi = -info.transpose;
      if (!Number.isFinite(rootMidi)) throw new Error("Invalid sample root pitch");
      const buffer: AudioBuffer = getLoadedBuffer(info.url.replace("#", "%23")) ?? await loadBuffer(info.url, context, instrumentId);
      return { id: `${instrumentId}:${index}`, rootMidi, sampleRate: buffer.sampleRate, channels: channels(buffer) };
    }));
    zoneSelection = "nearest-root";
    gain = 0.8;
  } else {
    throw new Error(`Unsupported live renderer: ${data?.type ?? "unregistered"} (${instrumentId})`);
  }
  if (!zones.length) throw new Error("Instrument contains no playable sample zones");
  const buffers = new Set(zones.flatMap(zone => zone.channels.map(channel => channel.buffer)));
  if ([...buffers].reduce((total, buffer) => total + buffer.byteLength, 0) > MAX_BANK_BYTES) {
    throw new Error("Prepared bank exceeds the 64 MiB worklet budget");
  }
  return { kind: "sample-bank", instrumentId, gain, ...envelope, zoneSelection, zones };
}

/** Prepare selection-time PCM; unsupported/failed preparations preserve the existing renderer.
 * The bounded cache shares concurrent requests and follows sound re-registration.
 * Rejections are evicted so a transient download/decode failure can retry.
 */
export function prepareLiveInstrument(context: AudioContext, instrumentId: string): Promise<LiveInstrumentPreparation> {
  const sound = getSound(instrumentId) as SoundRegistration | undefined;
  if (!sound) return Promise.resolve({ kind: "unsupported", instrumentId, reason: "Sound is not registered" });
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
    return { kind: "unsupported", instrumentId, reason: error instanceof Error ? error.message : String(error) } as const;
  });
  cache.set(instrumentId, entry);
  while (cache.size > MAX_CACHED_BANKS) cache.delete(cache.keys().next().value!);
  return entry.pending;
}
