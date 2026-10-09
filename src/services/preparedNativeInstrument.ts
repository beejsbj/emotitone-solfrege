// @ts-ignore — superdough ships no TypeScript declarations.
import { getSound, getSampleInfo, getLoadedBuffer, loadBuffer } from "superdough";
// @ts-ignore — this export is supplied by the checked-in soundfonts patch.
import { getPreparedSoundfont } from "@strudel/soundfonts";
import type { LiveEnvelope } from "../audio/live/types";
import { getLiveArticulation } from "./liveArticulation";

export interface UnsupportedLiveInstrument {
  kind: "unsupported";
  instrumentId: string;
  reason: string;
}
export interface RetryableLiveInstrument {
  kind: "retryable";
  instrumentId: string;
  reason: string;
}
/** Structural catalog failures are permanent; loading/decoding failures may retry. */
export class UnsupportedLiveInstrumentError extends Error {}
export interface NativeSampleZone {
  id: string;
  rootMidi: number;
  lowMidi?: number;
  highMidi?: number;
  buffer: AudioBuffer;
  loopStartFrame?: number;
  loopEndFrame?: number;
}
export type PreparedNativeInstrument = LiveEnvelope & { instrumentId: string } & (
  | { kind: "sample-bank"; zoneSelection: "first-range" | "nearest-root"; zones: NativeSampleZone[] }
  | { kind: "oscillator"; waveform: "sine" | "triangle" | "square" | "sawtooth" }
);
export type NativeInstrumentPreparation = PreparedNativeInstrument | UnsupportedLiveInstrument | RetryableLiveInstrument;

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
interface CacheEntry { registration: SoundRegistration; pending: Promise<NativeInstrumentPreparation> }
const caches = new WeakMap<AudioContext, Map<string, CacheEntry>>();
const MAX_CACHED_BANKS = 8;
const OSCILLATORS = new Set(["sine", "triangle", "square", "sawtooth"]);

function validatedBuffer(buffer: AudioBuffer): AudioBuffer {
  if (!(buffer.sampleRate > 0) || !Number.isFinite(buffer.sampleRate) || buffer.length < 1 ||
      buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) {
    throw new UnsupportedLiveInstrumentError("Only valid mono/stereo PCM is supported");
  }
  return buffer;
}

async function prepare(context: AudioContext, instrumentId: string, sound: SoundRegistration): Promise<PreparedNativeInstrument> {
  const articulation = getLiveArticulation(instrumentId);
  const envelope = { ...articulation };
  const data = sound.data;
  if (data?.type === "synth" && OSCILLATORS.has(instrumentId)) {
    return { kind: "oscillator", instrumentId, waveform: instrumentId as "sine" | "triangle" | "square" | "sawtooth",
      gain: 0.8 * 0.3, ...envelope };
  }
  let zones: NativeSampleZone[];
  let zoneSelection: "first-range" | "nearest-root";
  let gain: number;
  if (data?.type === "soundfont" && data.fonts?.[0]) {
    const fonts: FontZone[] = await getPreparedSoundfont(data.fonts[0], context);
    zones = fonts.map((zone, index) => {
      const rootMidi = (zone.originalPitch - 100 * zone.coarseTune - zone.fineTune) / 100;
      if (![rootMidi, zone.keyRangeLow, zone.keyRangeHigh].every(Number.isFinite)) {
        throw new UnsupportedLiveInstrumentError("Invalid soundfont tuning or key range");
      }
      const prepared: NativeSampleZone = {
        id: `${instrumentId}:${index}`, rootMidi, lowMidi: zone.keyRangeLow,
        // Match upstream findZone exactly, including its overlapping upper edge.
        highMidi: zone.keyRangeHigh + 1, buffer: validatedBuffer(zone.buffer),
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
      return { id: `${instrumentId}:${index}`, rootMidi, buffer: validatedBuffer(buffer) };
    }));
    zoneSelection = "nearest-root";
    gain = 0.8;
  } else {
    throw new UnsupportedLiveInstrumentError(`Unsupported live renderer: ${data?.type ?? "unregistered"} (${instrumentId})`);
  }
  if (!zones.length) throw new UnsupportedLiveInstrumentError("Instrument contains no playable sample zones");
  return { kind: "sample-bank", instrumentId, gain, ...envelope, zoneSelection, zones };
}

/** Resolve original decoded AudioBuffers at selection time. No PCM copy or DSP pyramid.
 * Unsupported/failed preparations preserve the existing renderer.
 * The bounded cache shares concurrent requests and follows sound re-registration.
 * Rejections are evicted so a transient download/decode failure can retry.
 */
export function prepareNativeInstrument(context: AudioContext, instrumentId: string): Promise<NativeInstrumentPreparation> {
  const sound = getSound(instrumentId) as SoundRegistration | undefined;
  if (!sound) return Promise.resolve({ kind: "retryable", instrumentId, reason: "Sound is not registered" });
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
    return { kind: error instanceof UnsupportedLiveInstrumentError ? "unsupported" : "retryable",
      instrumentId, reason: error instanceof Error ? error.message : String(error) } as const;
  });
  cache.set(instrumentId, entry);
  while (cache.size > MAX_CACHED_BANKS) cache.delete(cache.keys().next().value!);
  return entry.pending;
}
