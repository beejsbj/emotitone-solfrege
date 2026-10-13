/**
 * General MIDI sounds for the renderers that still run through superdough:
 * Strudel pattern playback (until BJS-485) and the live fallback for sounds
 * the worklet cannot hold. It registers the same names and voice behaviour as
 * @strudel/soundfonts 1.3.0 (as patched), but reads presets with the app's
 * parser, so no remote JavaScript is evaluated. Decoded AudioBuffers here are
 * that renderer's own copy, made only when a pattern or fallback voice needs
 * a GM sound; the live worklet never reads them.
 */
// @ts-ignore — superdough ships no TypeScript declarations.
import { registerSound, getAudioContext, getADSRValues, getParamADSR, getVibratoOscillator, getPitchEnvelope, onceEnded, releaseAudioNode } from "superdough";
import { parseSoundfontPreset, type SoundfontZone } from "@/audio/soundfontPreset";
import { sampleKeyToMidi } from "@/audio/soundCatalog";
import { soundfontUrl } from "@/audio/sampleSources";

const presets = new Map<string, Promise<SoundfontZone[]>>();
const buffers = new WeakMap<SoundfontZone, WeakMap<BaseAudioContext, Promise<AudioBuffer>>>();

function loadPreset(font: string): Promise<SoundfontZone[]> {
  let preset = presets.get(font);
  if (!preset) {
    preset = fetch(soundfontUrl(font))
      .then(response => {
        if (!response.ok) throw new Error(`Could not download soundfont ${font} (HTTP ${response.status})`);
        return response.text();
      })
      .then(parseSoundfontPreset);
    presets.set(font, preset);
    preset.catch(() => { if (presets.get(font) === preset) presets.delete(font); });
  }
  return preset;
}

function base64Bytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

function zoneBuffer(zone: SoundfontZone, context: BaseAudioContext): Promise<AudioBuffer> {
  let perContext = buffers.get(zone);
  if (!perContext) { perContext = new WeakMap(); buffers.set(zone, perContext); }
  let buffer = perContext.get(context);
  if (!buffer) {
    buffer = (async () => {
      if (zone.file) return context.decodeAudioData(base64Bytes(zone.file).buffer as ArrayBuffer);
      const bytes = base64Bytes(zone.sample!);
      const decoded = context.createBuffer(1, bytes.length >> 1, zone.sampleRate);
      const data = decoded.getChannelData(0);
      for (let index = 0; index < data.length; index++) {
        let value = bytes[index * 2] + bytes[index * 2 + 1] * 256;
        if (value >= 32768) value -= 65536;
        data[index] = value / 65536;
      }
      return decoded;
    })();
    perContext.set(context, buffer);
    const owned = perContext;
    buffer.catch(() => owned.delete(context));
  }
  return buffer;
}

/** Decode every zone of a font for the fallback renderer, so its first note is not late. */
export async function prewarmFallbackSoundfont(font: string, context: BaseAudioContext): Promise<void> {
  const preset = await loadPreset(font);
  await Promise.all(preset.map(zone => zoneBuffer(zone, context)));
}

function midiOf(value: { note?: unknown; freq?: unknown }): number {
  if (typeof value.freq === "number") return 12 * Math.log2(value.freq / 440) + 69;
  if (typeof value.note === "number") return value.note;
  if (typeof value.note === "string") return sampleKeyToMidi(value.note);
  if (value.note === undefined) return sampleKeyToMidi("c3");
  throw new Error(`unexpected "note" type "${typeof value.note}"`);
}

function soundIndex(n: unknown, count: number): number {
  const index = Math.round(Number.isNaN(Number(n)) ? 0 : Number(n ?? 0));
  return ((index % count) + count) % count;
}

interface PatternValue {
  note?: unknown; freq?: unknown; n?: unknown; duration: number;
  attack?: number; decay?: number; sustain?: number; release?: number;
}

/** Register every GM name with superdough's sound map, voiced as @strudel/soundfonts voices it. */
export function registerFallbackSoundfonts(fonts: Readonly<Record<string, readonly string[]>>): void {
  for (const [name, list] of Object.entries(fonts)) {
    registerSound(name, async (time: number, value: PatternValue, onended: () => void) => {
      const [attack, decay, sustain, release] = getADSRValues([value.attack, value.decay, value.sustain, value.release]);
      const font = list[soundIndex(value.n, list.length)];
      const context: AudioContext = getAudioContext();
      const midi = midiOf(value);
      const preset = await loadPreset(font);
      const zone = preset.find(candidate => candidate.keyRangeLow <= midi && candidate.keyRangeHigh + 1 >= midi);
      if (!zone) throw new Error(`no soundfont zone found for preset ${font}, pitch ${midi}`);
      const source = context.createBufferSource();
      source.buffer = await zoneBuffer(zone, context);
      const baseDetune = zone.originalPitch - 100 * zone.coarseTune - zone.fineTune;
      source.playbackRate.value = 2 ** ((100 * midi - baseDetune) / 1200);
      if (zone.loopStart > 1 && zone.loopStart < zone.loopEnd) {
        source.loop = true;
        source.loopStart = zone.loopStart / zone.sampleRate;
        source.loopEnd = zone.loopEnd / zone.sampleRate;
      }
      source.start(time);
      const envelope = context.createGain();
      const node = source.connect(envelope) as GainNode;
      const holdEnd = time + value.duration;
      getParamADSR(node.gain, attack, decay, sustain, release, 0, 0.3, time, holdEnd, "linear");
      let envelopeEnd = holdEnd + release + 0.01;
      const vibrato = getVibratoOscillator(source.detune, value, time);
      getPitchEnvelope(source.detune, value, time, holdEnd);
      source.stop(envelopeEnd);
      const stop = (releaseTime: number) => {
        // Live voices shorten their original duration when a key or pulse
        // releases. Keep the earliest stop so a later request cannot extend it.
        envelopeEnd = Math.min(envelopeEnd, releaseTime);
        source.stop(envelopeEnd);
      };
      onceEnded(source, () => {
        releaseAudioNode(source);
        vibrato?.stop();
        onended();
      });
      return { node, stop, nodes: { source: [source], ...vibrato?.nodes }, releaseAt: holdEnd, endAt: holdEnd + release };
    }, { type: "soundfont", prebake: true, fonts: list });
  }
}
