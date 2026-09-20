import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sounds: new Map<string, object>(), loaded: new Map<string, AudioBuffer>(), load: vi.fn(), font: vi.fn(), mipmaps: vi.fn() }));
vi.mock("superdough", async importOriginal => ({
  ...await importOriginal<typeof import("superdough")>(),
  getSound: (name: string) => mocks.sounds.get(name),
  getLoadedBuffer: (url: string) => mocks.loaded.get(url),
  loadBuffer: mocks.load,
}));
vi.mock("@strudel/soundfonts", () => ({ getPreparedSoundfont: mocks.font }));
vi.mock("@/audio/live/resampler", async importOriginal => {
  const actual = await importOriginal<typeof import("@/audio/live/resampler")>();
  return { ...actual, prepareSampleMipmapsAsync: (...args: Parameters<typeof actual.prepareSampleMipmapsAsync>) =>
    mocks.mipmaps.getMockImplementation() ? mocks.mipmaps(...args) : actual.prepareSampleMipmapsAsync(...args) };
});
import { prepareLiveInstrument, releasePreparedLiveInstrument, getPreparedLiveInstrumentDiagnostics } from "../../services/preparedLiveInstrument";
import { prepareNativeInstrument } from "../../services/preparedNativeInstrument";

function buffer(sampleRate = 48000, stereo = false) {
  const data = [new Float32Array(480), ...(stereo ? [new Float32Array(480)] : [])];
  return { sampleRate, length: 480, numberOfChannels: data.length,
    getChannelData: (channel: number) => data[channel] } as AudioBuffer;
}
const context = () => ({}) as AudioContext;

beforeEach(() => { mocks.sounds.clear(); mocks.loaded.clear(); mocks.load.mockReset(); mocks.font.mockReset(); mocks.mipmaps.mockReset(); });

describe("prepared live instrument catalog", () => {
  it("prepares native banks using only original AudioBuffer references and shares catalog resolution with the worklet", async () => {
    const pcm = buffer(48000, true);
    const read = vi.spyOn(pcm, "getChannelData");
    mocks.sounds.set("piano", { data: { type: "sample", samples: { C4: ["shared.wav"] } } });
    mocks.loaded.set("shared.wav", pcm);
    const ctx = context();
    const pending = prepareNativeInstrument(ctx, "piano");
    expect(prepareNativeInstrument(ctx, "piano")).toBe(pending);
    const native = await pending;
    expect(native).toMatchObject({ kind: "sample-bank", zoneSelection: "nearest-root", zones: [{ rootMidi: 60 }] });
    if (native.kind !== "sample-bank") throw new Error("Expected samples");
    expect(native.zones[0].buffer).toBe(pcm);
    expect(read).not.toHaveBeenCalled();
    const worklet = await prepareLiveInstrument(ctx, "piano");
    if (worklet.kind !== "sample-bank") throw new Error("Expected worklet samples");
    expect(worklet.zones[0].channels[0]).toBe(pcm.getChannelData(0));
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("preserves keyed piano roots, stereo PCM, insertion order and warm cache without allocation or loading", async () => {
    const a = buffer(48000, true), b = buffer(44100);
    mocks.sounds.set("piano", { data: { type: "sample", samples: { C4: ["c.wav", "unused.wav"], E4: ["e.wav"], _base: "ignored" } } });
    mocks.loaded.set("c.wav", a); mocks.loaded.set("e.wav", b);
    const ctx = context();
    const pending = prepareLiveInstrument(ctx, "piano");
    expect(prepareLiveInstrument(ctx, "piano")).toBe(pending);
    const result = await pending;
    expect(result).toMatchObject({ kind: "sample-bank", zoneSelection: "nearest-root", gain: 0.8, attack: 0.001, release: 0.2,
      zones: [{ rootMidi: 60, sampleRate: 48000 }, { rootMidi: 64, sampleRate: 44100 }] });
    if (result.kind !== "sample-bank") throw new Error("Expected samples");
    expect(result.zones[0].channels).toHaveLength(2);
    expect(result.zones[0].channels[0]).toBe(a.getChannelData(0));
    expect(result.zones[0].channels[1]).toBe(a.getChannelData(1));
    expect(result.zones[0].loopStartFrame).toBeUndefined();
    expect(result.zones[0].mipmaps).toEqual([]);
    expect(result.zones[1].mipmaps?.[0][0].length).toBe(240);
    expect(result.zones[1].mipmaps?.[0]).toHaveLength(1);
    expect(result.zones[1].mipmaps?.[0][0].buffer).not.toBe(b.getChannelData(0).buffer);
    expect(mocks.load).not.toHaveBeenCalled();
  });

  it("matches the installed sampler's array-bank root and n=0 selection", async () => {
    mocks.sounds.set("kalimba", { data: { type: "sample", samples: ["one#1.wav", "two.wav"] } });
    mocks.load.mockResolvedValue(buffer());
    expect(await prepareLiveInstrument(context(), "kalimba")).toMatchObject({ kind: "sample-bank", zones: [{ rootMidi: 36 }] });
    expect(mocks.load).toHaveBeenCalledTimes(1);
    expect(mocks.load.mock.calls[0][0]).toBe("one#1.wav");
  });

  it("preserves soundfont ordering, tuning, overlapping ranges and loop seconds after decoding resamples", async () => {
    mocks.sounds.set("gm_violin", { data: { type: "soundfont", fonts: ["violin-default", "unused"] } });
    const pcm = buffer(48000, true);
    const zone = { buffer: pcm, originalPitch: 6050, coarseTune: 1, fineTune: 25,
      keyRangeLow: 48, keyRangeHigh: 60, loopStart: 44.1, loopEnd: 220.5, sampleRate: 44100 };
    mocks.font.mockResolvedValue([zone, { ...zone, keyRangeLow: 60, keyRangeHigh: 72, loopStart: 0 }]);
    const ctx = context();
    const result = await prepareLiveInstrument(ctx, "gm_violin");
    expect(mocks.font).toHaveBeenCalledWith("violin-default", ctx);
    expect(result).toMatchObject({ kind: "sample-bank", zoneSelection: "first-range", gain: 0.24, attack: 0.01, release: 0.4,
      zones: [{ rootMidi: 59.25, lowMidi: 48, highMidi: 61, loopStartFrame: 48, loopEndFrame: 240 },
        { rootMidi: 59.25, lowMidi: 60, highMidi: 73 }] });
  });

  it.each(["sine", "square", "triangle", "sawtooth"])("prepares %s without sample work and keeps the explicit live envelope", async name => {
    mocks.sounds.set(name, { data: { type: "synth" } });
    expect(await prepareLiveInstrument(context(), name)).toEqual({ kind: "oscillator", instrumentId: name, waveform: name,
      gain: 0.24, attack: 0.003, decay: 0.001, sustain: 1, release: 0.12 });
    expect(mocks.font).not.toHaveBeenCalled(); expect(mocks.load).not.toHaveBeenCalled();
  });

  it("prepares only octave levels reachable through each root's actual MIDI selection range", async () => {
    const samples = Object.fromEntries(["C4", "C5", "C6", "C7", "C8"].map(root => {
      mocks.loaded.set(`${root}.wav`, buffer());
      return [root, [`${root}.wav`]];
    }));
    mocks.sounds.set("piano", { data: { type: "sample", samples } });
    const result = await prepareLiveInstrument(context(), "piano");
    expect(result.kind).toBe("sample-bank");
    if (result.kind !== "sample-bank") return;
    expect(result.zones.map(zone => zone.mipmaps?.length)).toEqual([0, 0, 0, 0, 1]);
  });

  it("includes decoded/context sample-rate differences when selecting required filter octaves", async () => {
    mocks.sounds.set("gm_test", { data: { type: "soundfont", fonts: ["rate-test"] } });
    mocks.font.mockResolvedValue([{ buffer: buffer(48000), originalPitch: 11600, coarseTune: 0, fineTune: 0,
      keyRangeLow: 116, keyRangeHigh: 127, sampleRate: 48000, loopStart: 0, loopEnd: 0 }]);
    const result = await prepareLiveInstrument({ sampleRate: 44100 } as AudioContext, "gm_test");
    expect(result.kind).toBe("sample-bank");
    if (result.kind === "sample-bank") expect(result.zones[0].mipmaps).toHaveLength(1);
  });

  it("reports unsupported synthesis and invalid samples instead of substituting an instrument", async () => {
    mocks.sounds.set("supersaw", { data: { type: "synth" } });
    expect(await prepareLiveInstrument(context(), "supersaw")).toMatchObject({ kind: "unsupported", reason: expect.stringContaining("supersaw") });
    mocks.sounds.set("bad", { data: { type: "sample", samples: ["bad.wav"] } });
    mocks.load.mockResolvedValue({ ...buffer(), numberOfChannels: 6 });
    expect(await prepareLiveInstrument(context(), "bad")).toMatchObject({ kind: "unsupported", reason: expect.stringContaining("mono/stereo") });
  });

  it("retries transient failures and follows re-registration and context changes", async () => {
    const register = (url: string) => mocks.sounds.set("piano", { data: { type: "sample", samples: [url] } });
    register("old.wav");
    mocks.load.mockRejectedValueOnce(new Error("offline")).mockResolvedValue(buffer());
    const ctx = context();
    expect(await prepareLiveInstrument(ctx, "piano")).toMatchObject({ kind: "retryable", reason: "offline" });
    const first = await prepareLiveInstrument(ctx, "piano");
    expect(first.kind).toBe("sample-bank");
    expect(await prepareLiveInstrument(ctx, "piano")).toBe(first);
    register("new.wav");
    expect(await prepareLiveInstrument(ctx, "piano")).not.toBe(first);
    expect(mocks.load.mock.calls.at(-1)?.[0]).toBe("new.wav");
    await prepareLiveInstrument(context(), "piano");
    expect(mocks.load).toHaveBeenCalledTimes(4);
  });

  it("evicts the least recently used descriptor after eight selections", async () => {
    const ctx = context(); mocks.load.mockResolvedValue(buffer());
    for (let i = 0; i < 9; i++) {
      mocks.sounds.set(`bank${i}`, { data: { type: "sample", samples: [`${i}.wav`] } });
      await prepareLiveInstrument(ctx, `bank${i}`);
    }
    await prepareLiveInstrument(ctx, "bank0");
    expect(mocks.load).toHaveBeenCalledTimes(10);
  });

  it("charges new pyramids, releases them after installation, and leaves borrowed source PCM attached", async () => {
    const pcm = buffer();
    mocks.sounds.set("piano", { data: { type: "sample", samples: ["one.wav"] } });
    mocks.loaded.set("one.wav", pcm);
    const ctx = context();
    const prepared = await prepareLiveInstrument(ctx, "piano");
    if (prepared.kind !== "sample-bank") throw new Error("Expected sample bank");
    const bytes = prepared.zones[0].mipmaps!.flat().reduce((sum, channel) => sum + channel.byteLength, 0);
    expect(bytes).toBeGreaterThan(0);
    expect(getPreparedLiveInstrumentDiagnostics(ctx)).toMatchObject({ cachedPreparationPcmBytes: bytes, preparingPcmBytes: 0 });
    releasePreparedLiveInstrument(ctx, "piano", prepared);
    expect(getPreparedLiveInstrumentDiagnostics(ctx).cachedPreparationPcmBytes).toBe(0);
    expect(pcm.getChannelData(0).byteLength).toBe(480 * 4);
    expect((await prepareNativeInstrument(ctx, "piano"))).toMatchObject({ zones: [{ buffer: pcm }] });
  });

  it("evicts retained pyramids by bytes before allocating another large bank", async () => {
    // Metadata-only sample buffers exercise the preflight reservation without
    // allocating hundreds of MiB or filtering them in the unit-test process.
    const channel = { length: 2 ** 24, buffer: { byteLength: 2 ** 26 } } as Float32Array;
    const pcm = { length: channel.length, numberOfChannels: 1, sampleRate: 48000, getChannelData: () => channel } as AudioBuffer;
    const ctx = context();
    mocks.mipmaps.mockImplementation(async () => {
      if (typeof getPreparedLiveInstrumentDiagnostics === "function") {
        const diagnostics = getPreparedLiveInstrumentDiagnostics(ctx);
        expect(diagnostics.cachedPreparationPcmBytes + diagnostics.preparingPcmBytes).toBeLessThanOrEqual(diagnostics.preparationPcmBudgetBytes);
      }
      return [];
    });
    for (let i = 0; i < 4; i++) {
      mocks.sounds.set(`large${i}`, { data: { type: "sample", samples: [`${i}.wav`] } });
      mocks.loaded.set(`${i}.wav`, pcm);
      await prepareLiveInstrument(ctx, `large${i}`);
    }
    expect(mocks.mipmaps).toHaveBeenCalledTimes(4);
    await prepareLiveInstrument(ctx, "large0");
    expect(mocks.mipmaps).toHaveBeenCalledTimes(5);
    expect(getPreparedLiveInstrumentDiagnostics(ctx).cachedPreparationPcmBytes).toBeLessThanOrEqual(192 * 1024 * 1024);
  });
});
