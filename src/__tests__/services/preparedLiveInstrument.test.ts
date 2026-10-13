import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
// superdough is still installed: its sampler is the reference for zone roots.
// @ts-ignore — superdough ships no TypeScript declarations.
import { getSampleInfo } from "superdough";

const mocks = vi.hoisted(() => ({ mipmaps: vi.fn() }));
vi.mock("@/audio/live/resampler", async importOriginal => {
  const actual = await importOriginal<typeof import("@/audio/live/resampler")>();
  return { ...actual, prepareSampleMipmapsAsync: (...args: Parameters<typeof actual.prepareSampleMipmapsAsync>) =>
    mocks.mipmaps.getMockImplementation() ? mocks.mipmaps(...args) : actual.prepareSampleMipmapsAsync(...args) };
});
import { prepareLiveInstrument, releasePreparedLiveInstrument, getPreparedLiveInstrumentDiagnostics } from "../../services/preparedLiveInstrument";
import { clearSoundCatalog, registerSampleMap, registerSoundfonts } from "../../audio/soundCatalog";
import type { PreparedLiveInstrument } from "../../audio/live/types";

/** A decoded buffer; the loader must copy out of it and keep no reference. */
class DecodedBuffer {
  readonly channels: Float32Array[];
  constructor(readonly sampleRate: number, readonly length: number, readonly numberOfChannels: number) {
    this.channels = Array.from({ length: numberOfChannels }, (_, channel) =>
      Float32Array.from({ length }, (_, frame) => (channel + 1) * 0.001 * (frame % 100)));
  }
  getChannelData(channel: number) { return this.channels[channel]; }
  copyFromChannel(target: Float32Array, channel: number) { target.set(this.channels[channel]); }
}

interface Decode { url: string; buffer: DecodedBuffer }
let decoded: Decode[] = [];
let decoding = 0, maxDecoding = 0;
let shapes = new Map<string, () => DecodedBuffer>();
const fetchMock = vi.fn(async (url: string) => {
  if (url.endsWith(".js")) return new Response(fonts.get(url.split("/").pop()!.replace(/\.js$/, "")) ?? "", { status: fonts.has(url.split("/").pop()!.replace(/\.js$/, "")) ? 200 : 404 });
  return new Response(new TextEncoder().encode(url));
});
const fonts = new Map<string, string>();
function context(sampleRate = 48000) {
  return { sampleRate, decodeAudioData: vi.fn(async (bytes: ArrayBuffer) => {
    const url = new TextDecoder().decode(bytes);
    maxDecoding = Math.max(maxDecoding, ++decoding);
    await new Promise(resolve => setTimeout(resolve, 1));
    decoding--;
    const buffer = (shapes.get(url) ?? (() => new DecodedBuffer(48000, 480, 1)))();
    decoded.push({ url, buffer });
    return buffer;
  }) } as unknown as AudioContext;
}
function font(zones: string) {
  return `console.log('load');\nvar _tone_font={zones:[${zones}]};\n`;
}
function bank(result: Awaited<ReturnType<typeof prepareLiveInstrument>>) {
  if (result.kind !== "sample-bank") throw new Error(`Expected a sample bank, got ${JSON.stringify(result)}`);
  return result;
}

beforeEach(() => {
  clearSoundCatalog(); fonts.clear(); shapes = new Map(); decoded = []; decoding = maxDecoding = 0;
  mocks.mipmaps.mockReset(); fetchMock.mockClear();
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => { vi.unstubAllGlobals(); });

describe("instrument loader for the live worklet", () => {
  it("roots keyed banks exactly as superdough's sampler does, playing the first sample of each note", async () => {
    const map = { _base: "https://samples.test/piano/", piano: { A0: "A0v8.mp3", Ds1: ["Ds1v8.mp3", "alt.mp3"], Fs5: "Fs5v8.mp3", Bb2: "Bb2.mp3", C: "C.mp3" } };
    registerSampleMap(map);
    const result = bank(await prepareLiveInstrument(context(), "piano"));
    const reference = Object.entries(map.piano).map(([key, urls]) => -getSampleInfo({ s: "piano", note: 0 }, { [key]: [urls].flat() }).transpose);
    expect(result.zones.map(zone => zone.rootMidi)).toEqual(reference);
    expect(result).toMatchObject({ zoneSelection: "nearest-root", gain: 0.8, attack: 0.001, release: 0.2 });
    expect(fetchMock.mock.calls.map(([url]) => url)).toEqual(["A0v8.mp3", "Ds1v8.mp3", "Fs5v8.mp3", "Bb2.mp3", "C.mp3"]
      .map(file => `https://samples.test/piano/${file}`));
  });

  it("plays an array bank's first sample at superdough's root MIDI 36, escaping '#'", async () => {
    registerSampleMap({ _base: "https://samples.test/", kalimba: ["one#1.wav", "two.wav"] });
    const result = bank(await prepareLiveInstrument(context(), "kalimba"));
    expect(result.zones).toHaveLength(1);
    expect(result.zones[0].rootMidi).toBe(-getSampleInfo({ s: "kalimba", note: 0 }, ["one#1.wav", "two.wav"]).transpose);
    expect(fetchMock).toHaveBeenCalledWith("https://samples.test/one%231.wav");
  });

  it("holds one owned copy of each zone: its own ArrayBuffer per channel, and no decoded buffer kept", async () => {
    shapes.set("https://samples.test/c.wav", () => new DecodedBuffer(44100, 480, 2));
    registerSampleMap({ _base: "https://samples.test/", piano: { C4: "c.wav", E4: "e.wav" } });
    const result = bank(await prepareLiveInstrument(context(), "piano"));
    const channels = result.zones.flatMap(zone => zone.channels);
    expect(channels).toHaveLength(3);
    expect(new Set(channels.map(channel => channel.buffer)).size).toBe(3);
    for (const [index, zone] of result.zones.entries()) {
      const source = decoded.find(entry => entry.url.endsWith(index ? "e.wav" : "c.wav"))!.buffer;
      expect(zone.sampleRate).toBe(source.sampleRate);
      zone.channels.forEach((channel, number) => {
        expect(channel).toEqual(source.getChannelData(number));
        expect(channel.buffer).not.toBe(source.getChannelData(number).buffer);
      });
    }
    const seen = new Set<unknown>();
    const visit = (value: unknown): void => {
      if (!value || typeof value !== "object" || seen.has(value) || ArrayBuffer.isView(value)) return;
      seen.add(value);
      expect(value).not.toBeInstanceOf(DecodedBuffer);
      Object.values(value).forEach(visit);
    };
    visit(result);
  });

  it("decodes one zone at a time and lets queued input run between zones", async () => {
    registerSampleMap({ _base: "https://samples.test/", piano: Object.fromEntries(["C2", "C3", "C4", "C5", "C6", "C7"].map(key => [key, `${key}.mp3`])) });
    const pending = prepareLiveInstrument(context(), "piano");
    // A key press queued as a task while the bank loads.
    let decodedWhenInputRan = -1;
    await new Promise(resolve => setTimeout(resolve, 0));
    setTimeout(() => { decodedWhenInputRan = decoded.length; }, 0);
    await pending;
    expect(maxDecoding).toBe(1);
    expect(decodedWhenInputRan).toBeGreaterThanOrEqual(0);
    expect(decodedWhenInputRan).toBeLessThan(6);
    // Encoded files are fetched only a bounded window ahead of decoding.
    expect(fetchMock).toHaveBeenCalledTimes(6);
  });

  it("loads soundfont zones with their tuning, ranges and loops scaled to the decoded rate, without eval", async () => {
    const evaluate = vi.spyOn(globalThis, "eval");
    registerSoundfonts({ gm_violin: ["violin-default", "unused"] });
    fonts.set("violin-default", font(`
      {midi:40,originalPitch:6050,coarseTune:1,fineTune:25,keyRangeLow:48,keyRangeHigh:60,loopStart:44.1,loopEnd:220.5,sampleRate:44100,file:'${btoa("zone-a")}'}
      ,{midi:40,originalPitch:6050,coarseTune:1,fineTune:25,keyRangeLow:60,keyRangeHigh:72,loopStart:0,loopEnd:0,sampleRate:44100,file:'${btoa("zone-b")}'} // tail
    `));
    shapes.set("zone-a", () => new DecodedBuffer(48000, 480, 2));
    const result = bank(await prepareLiveInstrument(context(), "gm_violin"));
    expect(fetchMock).toHaveBeenCalledWith("https://felixroos.github.io/webaudiofontdata/sound/violin-default.js");
    expect(result).toMatchObject({ zoneSelection: "first-range", gain: 0.24, attack: 0.01, release: 0.4,
      zones: [{ rootMidi: 59.25, lowMidi: 48, highMidi: 61, loopStartFrame: 48, loopEndFrame: 240, sampleRate: 48000 },
        { rootMidi: 59.25, lowMidi: 60, highMidi: 73, sampleRate: 48000 }] });
    expect(result.zones[1].loopStartFrame).toBeUndefined();
    expect(evaluate).not.toHaveBeenCalled();
    evaluate.mockRestore();
  });

  it("reads raw 16-bit soundfont PCM at the preset rate, scaled as webaudiofont scaled it", async () => {
    registerSoundfonts({ gm_old: ["old"] });
    const pcm = new Uint8Array(new Int16Array([0, 16384, -32768]).buffer);
    fonts.set("old", font(`{originalPitch:6000,keyRangeLow:0,keyRangeHigh:127,sampleRate:22050,sample:'${btoa(String.fromCharCode(...pcm))}'}`));
    const result = bank(await prepareLiveInstrument(context(), "gm_old"));
    expect(result.zones[0]).toMatchObject({ sampleRate: 22050, rootMidi: 60 });
    expect([...result.zones[0].channels[0]]).toEqual([0, 0.25, -0.5]);
  });

  it("refuses a soundfont that contains code, and retries a failed download", async () => {
    registerSoundfonts({ gm_bad: ["bad"], gm_later: ["later"] });
    fonts.set("bad", font(`{originalPitch:6000,keyRangeLow:0,keyRangeHigh:127,sampleRate:1,file:(globalThis.__fontRan=1,'AAAA')}`));
    expect(await prepareLiveInstrument(context(), "gm_bad")).toMatchObject({ kind: "retryable" });
    expect((globalThis as Record<string, unknown>).__fontRan).toBeUndefined();

    const ctx = context();
    expect(await prepareLiveInstrument(ctx, "gm_later")).toMatchObject({ kind: "retryable", reason: expect.stringContaining("HTTP 404") });
    fonts.set("later", font(`{originalPitch:6000,keyRangeLow:0,keyRangeHigh:127,sampleRate:44100,file:'${btoa("later")}'}`));
    expect(await prepareLiveInstrument(ctx, "gm_later")).toMatchObject({ kind: "sample-bank" });
  });

  it.each(["sine", "triangle", "square", "sawtooth"])("prepares %s without sample work and keeps the explicit live envelope", async name => {
    expect(await prepareLiveInstrument(context(), name)).toEqual({ kind: "oscillator", instrumentId: name, waveform: name,
      gain: 0.24, attack: 0.003, decay: 0.001, sustain: 1, release: 0.12 });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("reports synthesis the worklet cannot render and invalid PCM as unsupported", async () => {
    for (const name of ["supersaw", "pulse", "z_square", "z_sawtooth"]) {
      expect(await prepareLiveInstrument(context(), name)).toMatchObject({ kind: "unsupported", reason: expect.stringContaining(name) });
    }
    registerSampleMap({ bad: ["bad.wav"] });
    shapes.set("bad.wav", () => new DecodedBuffer(48000, 480, 6));
    expect(await prepareLiveInstrument(context(), "bad")).toMatchObject({ kind: "unsupported", reason: expect.stringContaining("mono/stereo") });
  });

  it("prepares only octave levels reachable through each root's actual MIDI selection range", async () => {
    registerSampleMap({ piano: Object.fromEntries(["C4", "C5", "C6", "C7", "C8"].map(root => [root, `${root}.wav`])) });
    const result = bank(await prepareLiveInstrument(context(), "piano"));
    expect(result.zones.map(zone => zone.mipmaps?.length)).toEqual([0, 0, 0, 0, 1]);
    expect(result.zones[4].mipmaps![0][0].buffer).not.toBe(result.zones[4].channels[0].buffer);
  });

  it("recomputes filter octaves when the rate changes during a pending preparation", async () => {
    registerSampleMap({ piano: { C4: "pending.wav" } });
    const ctx = context(48000);
    const old = prepareLiveInstrument(ctx, "piano");
    Object.assign(ctx, { sampleRate: 24000 });
    const next = prepareLiveInstrument(ctx, "piano");
    expect(next).not.toBe(old);
    const [oldBank, newBank] = (await Promise.all([old, next])).map(bank);
    expect(oldBank.zones[0].mipmaps).toHaveLength(5);
    expect(newBank.zones[0].mipmaps).toHaveLength(6);
  });

  it("shares a pending preparation, and holds a prepared bank only until its installer releases it", async () => {
    registerSampleMap({ piano: { C8: "one.wav" } });
    const ctx = context();
    const pending = prepareLiveInstrument(ctx, "piano");
    expect(prepareLiveInstrument(ctx, "piano")).toBe(pending);
    const prepared = bank(await pending);
    const bytes = [...prepared.zones[0].channels, ...prepared.zones[0].mipmaps!.flat()].reduce((sum, channel) => sum + channel.byteLength, 0);
    expect(getPreparedLiveInstrumentDiagnostics(ctx)).toMatchObject({ cachedPreparationPcmBytes: bytes, preparingPcmBytes: 0 });
    releasePreparedLiveInstrument(ctx, "piano", prepared);
    expect(getPreparedLiveInstrumentDiagnostics(ctx).cachedPreparationPcmBytes).toBe(0);
    // Once released (transferred), the next selection loads again rather than reuse detached PCM.
    expect(prepareLiveInstrument(ctx, "piano")).not.toBe(pending);
  });

  it("refuses a bank whose source and pyramid exceed the 192 MiB worklet budget before building the pyramid", async () => {
    // A metadata-only buffer: the budget check must not need hundreds of MiB in the test process.
    const length = 2 ** 25;
    const huge = { sampleRate: 48000, length, numberOfChannels: 2, copyFromChannel() {}, getChannelData: () => new Float32Array(0) };
    shapes.set("huge.wav", () => huge as unknown as DecodedBuffer);
    registerSampleMap({ huge: { C8: "huge.wav" } });
    mocks.mipmaps.mockImplementation(async () => { throw new Error("pyramid must not be built"); });
    expect(await prepareLiveInstrument(context(), "huge")).toMatchObject({ kind: "unsupported", reason: expect.stringContaining("192 MiB") });
  });
});

describe("prepared bank shape", () => {
  it("is a plain PreparedLiveInstrument the bridge can transfer", async () => {
    registerSampleMap({ piano: { C4: "c.wav" } });
    const result: PreparedLiveInstrument = bank(await prepareLiveInstrument(context(), "piano"));
    expect(structuredClone(result)).toEqual(result);
  });
});
