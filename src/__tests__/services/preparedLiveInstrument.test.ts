import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ sounds: new Map<string, object>(), loaded: new Map<string, AudioBuffer>(), load: vi.fn(), font: vi.fn() }));
vi.mock("superdough", async importOriginal => ({
  ...await importOriginal<typeof import("superdough")>(),
  getSound: (name: string) => mocks.sounds.get(name),
  getLoadedBuffer: (url: string) => mocks.loaded.get(url),
  loadBuffer: mocks.load,
}));
vi.mock("@strudel/soundfonts", () => ({ getPreparedSoundfont: mocks.font }));
import { prepareLiveInstrument } from "../../services/preparedLiveInstrument";

function buffer(sampleRate = 48000, stereo = false) {
  const data = [new Float32Array(480), ...(stereo ? [new Float32Array(480)] : [])];
  return { sampleRate, length: 480, numberOfChannels: data.length,
    getChannelData: (channel: number) => data[channel] } as AudioBuffer;
}
const context = () => ({}) as AudioContext;

beforeEach(() => { mocks.sounds.clear(); mocks.loaded.clear(); mocks.load.mockReset(); mocks.font.mockReset(); });

describe("prepared live instrument catalog", () => {
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
    expect(await prepareLiveInstrument(ctx, "piano")).toMatchObject({ kind: "unsupported", reason: "offline" });
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
});
