import type { LiveSampleZone, PreparedLiveInstrument } from "../audio/live/types";
import { getCatalogSound, sampleZoneSources, type SampleBank, type SampleZoneSource } from "../audio/soundCatalog";
import { parseSoundfontPreset, SoundfontParseError, type SoundfontZone } from "../audio/soundfontPreset";
import { soundfontUrl } from "../audio/sampleSources";
import { fetchInstrumentFile } from "../audio/instrumentAssetCache";
import { getLiveArticulation } from "./liveArticulation";

/**
 * The instrument loader: catalog entry → owned PCM zones for the live worklet.
 *
 * It fetches and decodes sample and soundfont data itself (no superdough, no
 * @strudel/soundfonts, no `eval`). Each zone is decoded, copied into its own
 * freshly allocated Float32Array per channel, and the AudioBuffer is dropped
 * before the next zone decodes, so at most one decoded zone coexists with the
 * owned copy. Nothing is cached here: the bridge transfers the owned buffers
 * to the worklet, which then holds the only copy.
 */

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
export type NativeInstrumentPreparation = PreparedLiveInstrument | UnsupportedLiveInstrument | RetryableLiveInstrument;

const OSCILLATORS = new Set(["sine", "triangle", "square", "sawtooth"]);
/** Encoded files fetched ahead of the zone being decoded. Bounds encoded bytes held at once. */
const PREFETCH_WINDOW = 4;

/** Let queued input (key presses, pointer events) run between zones. */
export function yieldToInput(): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, 0));
}

async function fetchOk(url: string): Promise<Response> {
  const response = await fetchInstrumentFile(url);
  if (!response.ok) throw new Error(`Could not download ${url} (HTTP ${response.status})`);
  return response;
}

/** Copy decoded PCM into buffers this app owns, one independent ArrayBuffer per channel. */
function ownedChannels(buffer: AudioBuffer): Float32Array[] {
  if (!(buffer.sampleRate > 0) || !Number.isFinite(buffer.sampleRate) || buffer.length < 1 ||
      buffer.numberOfChannels < 1 || buffer.numberOfChannels > 2) {
    throw new UnsupportedLiveInstrumentError("Only valid mono/stereo PCM is supported");
  }
  return Array.from({ length: buffer.numberOfChannels }, (_, channel) => {
    const owned = new Float32Array(buffer.length);
    if (typeof buffer.copyFromChannel === "function") buffer.copyFromChannel(owned, channel);
    else owned.set(buffer.getChannelData(channel));
    return owned;
  });
}

// A retired context may never settle decodeAudioData. Unwind its loader at
// the drain deadline; a late browser result must not allocate owned channels.
async function interruptible<T>(pending: Promise<T>, signal?: AbortSignal): Promise<T> {
  if (!signal) return pending;
  let abort!: () => void;
  const interrupted = new Promise<never>((_, reject) => {
    abort = () => reject(signal.reason);
    if (signal.aborted) abort();
    else signal.addEventListener("abort", abort, { once: true });
  });
  try { return await Promise.race([interrupted, pending]); }
  finally { signal.removeEventListener("abort", abort); }
}

async function loadSampleZones(context: AudioContext, instrumentId: string, bank: SampleBank, signal?: AbortSignal): Promise<LiveSampleZone[]> {
  let sources: SampleZoneSource[];
  try { sources = sampleZoneSources(bank); } catch (error) {
    throw new UnsupportedLiveInstrumentError(error instanceof Error ? error.message : "Invalid sample root pitch");
  }
  const downloads = new Map<number, Promise<ArrayBuffer>>();
  let requested = 0;
  const request = (index: number) => {
    if (index >= sources.length || index < requested) return;
    requested = index + 1;
    const download = fetchOk(sources[index].url).then(response => response.arrayBuffer());
    // A later failure is reported when its zone is reached; never as unhandled.
    download.catch(() => {});
    downloads.set(index, download);
  };
  const zones: LiveSampleZone[] = [];
  for (let index = 0; index < sources.length; index++) {
    for (let ahead = index; ahead < index + PREFETCH_WINDOW; ahead++) request(ahead);
    const decoded = await interruptible(context.decodeAudioData(await interruptible(downloads.get(index)!, signal)), signal);
    const channels = ownedChannels(decoded);
    zones.push({ id: `${instrumentId}:${index}`, rootMidi: sources[index].rootMidi, sampleRate: decoded.sampleRate, channels });
    downloads.delete(index);
    await yieldToInput();
  }
  return zones;
}

function base64Bytes(base64: string, length = 0): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(Math.max(length, binary.length));
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

/**
 * An encoded zone, zero-padded to its base64 length exactly as webaudiofont
 * (and so @strudel/soundfonts) sized it. The decoder then flushes the final
 * MP3 frame; without the padding that frame is lost and some loops end past
 * the decoded PCM. Keeps the PCM identical to what the app played before.
 */
function encodedZone(file: string): ArrayBuffer {
  return base64Bytes(file, file.length).buffer as ArrayBuffer;
}

/** Older fonts carry raw 16-bit little-endian PCM, scaled exactly as webaudiofont did. */
function pcm16Channel(base64: string): Float32Array {
  const bytes = base64Bytes(base64);
  const output = new Float32Array(bytes.length >> 1);
  for (let index = 0; index < output.length; index++) {
    let value = bytes[index * 2] + bytes[index * 2 + 1] * 256;
    if (value >= 32768) value -= 65536;
    output[index] = value / 65536;
  }
  return output;
}

async function loadSoundfontZones(context: AudioContext, instrumentId: string, font: string, signal?: AbortSignal): Promise<LiveSampleZone[]> {
  const text = await interruptible(fetchOk(soundfontUrl(font)).then(response => response.text()), signal);
  const preset: SoundfontZone[] = parseSoundfontPreset(text);
  const zones: LiveSampleZone[] = [];
  for (const [index, zone] of preset.entries()) {
    const rootMidi = (zone.originalPitch - 100 * zone.coarseTune - zone.fineTune) / 100;
    if (![rootMidi, zone.keyRangeLow, zone.keyRangeHigh].every(Number.isFinite)) {
      throw new UnsupportedLiveInstrumentError("Invalid soundfont tuning or key range");
    }
    let channels: Float32Array[];
    let sampleRate: number;
    if (zone.file) {
      const decoded = await interruptible(context.decodeAudioData(encodedZone(zone.file)), signal);
      channels = ownedChannels(decoded);
      sampleRate = decoded.sampleRate;
    } else {
      channels = [pcm16Channel(zone.sample!)];
      sampleRate = zone.sampleRate;
      if (!(sampleRate > 0) || !channels[0].length) throw new UnsupportedLiveInstrumentError("Only valid mono/stereo PCM is supported");
    }
    const prepared: LiveSampleZone = {
      id: `${instrumentId}:${index}`, rootMidi, lowMidi: zone.keyRangeLow,
      // Match upstream findZone exactly, including its overlapping upper edge.
      highMidi: zone.keyRangeHigh + 1, sampleRate, channels,
    };
    if (zone.loopStart > 1 && zone.loopStart < zone.loopEnd) {
      if (!(zone.sampleRate > 0) || !Number.isFinite(zone.loopEnd)) throw new UnsupportedLiveInstrumentError("Invalid soundfont loop");
      // Source loop offsets use the preset rate, while decodeAudioData can resample.
      prepared.loopStartFrame = zone.loopStart / zone.sampleRate * sampleRate;
      prepared.loopEndFrame = zone.loopEnd / zone.sampleRate * sampleRate;
      if (prepared.loopEndFrame > channels[0].length) throw new UnsupportedLiveInstrumentError("Soundfont loop exceeds decoded PCM");
    }
    zones.push(prepared);
    await yieldToInput();
  }
  return zones;
}

async function load(context: AudioContext, instrumentId: string, signal?: AbortSignal): Promise<PreparedLiveInstrument> {
  const envelope = { ...getLiveArticulation(instrumentId) };
  if (OSCILLATORS.has(instrumentId)) {
    return { kind: "oscillator", instrumentId, waveform: instrumentId as "sine" | "triangle" | "square" | "sawtooth",
      gain: 0.8 * 0.3, ...envelope };
  }
  const sound = getCatalogSound(instrumentId);
  if (!sound) throw new UnsupportedLiveInstrumentError(`Unsupported live renderer: ${instrumentId}`);
  const zones = sound.kind === "soundfont"
    ? await loadSoundfontZones(context, instrumentId, sound.fonts[0], signal)
    : await loadSampleZones(context, instrumentId, sound.bank, signal);
  if (!zones.length) throw new UnsupportedLiveInstrumentError("Instrument contains no playable sample zones");
  return {
    kind: "sample-bank", instrumentId, gain: sound.kind === "soundfont" ? 0.8 * 0.3 : 0.8, ...envelope,
    zoneSelection: sound.kind === "soundfont" ? "first-range" : "nearest-root", zones,
  };
}

/**
 * Load an instrument's PCM from its catalog entry. Synthesis that the worklet
 * cannot render and malformed data are "unsupported" (the fallback renderer
 * keeps them); download and decode failures are "retryable".
 */
export async function prepareNativeInstrument(context: AudioContext, instrumentId: string, signal?: AbortSignal): Promise<NativeInstrumentPreparation> {
  try {
    return await load(context, instrumentId, signal);
  } catch (error) {
    return { kind: (error instanceof UnsupportedLiveInstrumentError || error instanceof SoundfontParseError) ? "unsupported" : "retryable",
      instrumentId, reason: error instanceof Error ? error.message : String(error) };
  }
}
