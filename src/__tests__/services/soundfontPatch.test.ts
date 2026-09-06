import { afterEach, describe, expect, it, vi } from "vitest";

vi.unmock("@strudel/soundfonts");

vi.mock("@strudel/core", () => ({
  Pattern: class Pattern {},
  freqToMidi: (frequency: number) => frequency,
  noteToMidi: (note: number) => note,
  getSoundIndex: () => 0,
  getPlayableNoteValue: (value: unknown) => value,
}));

vi.mock("@strudel/webaudio", () => ({
  registerSound: vi.fn(),
  getADSRValues: vi.fn(() => [0, 0, 1, 0]),
  getAudioContext: vi.fn(),
  getParamADSR: vi.fn(),
  getVibratoOscillator: vi.fn(),
  getPitchEnvelope: vi.fn(),
  onceEnded: vi.fn(),
  releaseAudioNode: vi.fn(),
}));

vi.mock("sfumato", () => ({
  startPresetNote: vi.fn(),
  loadSoundfont: vi.fn(),
}));

const presetSource = (name: string) => `var ${name}={zones:[{
  originalPitch:6000,
  coarseTune:0,
  fineTune:0,
  keyRangeLow:0,
  keyRangeHigh:127,
  loopStart:0,
  loopEnd:0,
  sampleRate:44100,
  file:'AAE='
}]};`;

function createAudioContext(decodeAudioData: ReturnType<typeof vi.fn>) {
  return {
    decodeAudioData,
    createBufferSource: vi.fn(() => ({
      buffer: null,
      loop: false,
      loopStart: 0,
      loopEnd: 0,
      playbackRate: { value: 1 },
    })),
  };
}

describe("patched Strudel soundfont loading", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("warms every zone and retries a transient preset fetch", async () => {
    const font = `test_font_fetch_${crypto.randomUUID().replaceAll("-", "")}`;
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce({
        text: vi.fn().mockResolvedValue(presetSource(font)),
      });
    vi.stubGlobal("fetch", fetchMock);
    const decodedBuffer = { duration: 1 };
    const decodeAudioData = vi.fn(
      (_data: ArrayBuffer, resolve: (buffer: object) => void) =>
        resolve(decodedBuffer)
    );
    const audioContext = createAudioContext(decodeAudioData);
    const { prewarmSoundfont } = await import("@strudel/soundfonts");

    await expect(prewarmSoundfont(font, audioContext)).rejects.toThrow(
      "temporary network failure"
    );
    await expect(prewarmSoundfont(font, audioContext)).resolves.toBeUndefined();
    await prewarmSoundfont(font, audioContext);

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(decodeAudioData).toHaveBeenCalledTimes(1);
  });

  it("evicts failed pitch decodes so the next attack can retry", async () => {
    const font = `test_font_decode_${crypto.randomUUID().replaceAll("-", "")}`;
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        text: vi.fn().mockResolvedValue(presetSource(font)),
      })
    );
    const decodedBuffer = { duration: 1 };
    const decodeAudioData = vi
      .fn()
      .mockImplementationOnce(
        (
          _data: ArrayBuffer,
          _resolve: (buffer: object) => void,
          reject: (error: Error) => void
        ) => reject(new Error("decode failed"))
      )
      .mockImplementationOnce(
        (_data: ArrayBuffer, resolve: (buffer: object) => void) =>
          resolve(decodedBuffer)
      );
    const audioContext = createAudioContext(decodeAudioData);
    const { getFontBufferSource } = await import("@strudel/soundfonts");

    await expect(
      getFontBufferSource(font, { note: 60 }, audioContext)
    ).rejects.toThrow("decode failed");
    await expect(
      getFontBufferSource(font, { note: 60 }, audioContext)
    ).resolves.toMatchObject({ buffer: decodedBuffer });

    expect(decodeAudioData).toHaveBeenCalledTimes(2);
  });
});
