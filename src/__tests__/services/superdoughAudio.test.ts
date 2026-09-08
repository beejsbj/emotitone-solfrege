import { beforeEach, describe, expect, it, vi } from "vitest";

const hoisted = vi.hoisted(() => {
  const mockAudioContext = {
    state: "running",
    currentTime: 12,
    resume: vi.fn().mockResolvedValue(undefined),
  };

  return {
    mockAudioContext,
    mockSuperdough: vi.fn().mockResolvedValue(undefined),
    mockInitAudio: vi.fn().mockResolvedValue(undefined),
    mockRegisterSynthSounds: vi.fn(),
    mockSamples: vi.fn().mockResolvedValue(undefined),
    mockGetSuperdoughAudioController: vi.fn(() => ({
      output: {
        destinationGain: { id: "master-gain" },
      },
    })),
    mockLoadBuffer: vi.fn().mockResolvedValue(undefined),
    mockGetSound: vi.fn(() => ({ data: {} })),
    mockHasVoice: vi.fn().mockReturnValue(false),
    mockStopVoice: vi.fn(),
    mockReleaseVoice: vi.fn(),
    mockReleaseAllVoices: vi.fn(),
    mockInitStrudel: vi.fn().mockResolvedValue(undefined),
    mockEvaluateStrudel: vi.fn().mockResolvedValue(undefined),
    mockHushStrudel: vi.fn(),
    mockWebaudioOutput: vi.fn().mockResolvedValue(undefined),
    mockRegisterSoundfonts: vi.fn().mockResolvedValue(undefined),
    mockPrewarmSoundfont: vi.fn().mockResolvedValue(undefined),
  };
});

vi.mock("superdough", () => ({
  superdough: hoisted.mockSuperdough,
  initAudio: hoisted.mockInitAudio,
  registerSynthSounds: hoisted.mockRegisterSynthSounds,
  samples: hoisted.mockSamples,
  getAudioContext: () => hoisted.mockAudioContext,
  getSuperdoughAudioController: hoisted.mockGetSuperdoughAudioController,
  loadBuffer: hoisted.mockLoadBuffer,
  getSound: hoisted.mockGetSound,
  soundMap: {
    get: () => ({}),
  },
  hasVoice: hoisted.mockHasVoice,
  stopVoice: hoisted.mockStopVoice,
  releaseVoice: hoisted.mockReleaseVoice,
  releaseAllVoices: hoisted.mockReleaseAllVoices,
}));

vi.mock("@strudel/web", () => ({
  initStrudel: hoisted.mockInitStrudel,
  evaluate: hoisted.mockEvaluateStrudel,
  hush: hoisted.mockHushStrudel,
}));

vi.mock("@strudel/webaudio", () => ({
  webaudioOutput: hoisted.mockWebaudioOutput,
}));

vi.mock("@strudel/soundfonts", () => ({
  registerSoundfonts: hoisted.mockRegisterSoundfonts,
  prewarmSoundfont: hoisted.mockPrewarmSoundfont,
}));

vi.mock("@/services/music", () => ({
  CHROMATIC_NOTES: ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"],
  musicTheory: {
    getCurrentScaleNotes: vi.fn(() => ["C", "D", "E", "F", "G", "A", "B"]),
    getCurrentKey: vi.fn(() => "C"),
    getCurrentMode: vi.fn(() => "major"),
    getCurrentScale: vi.fn(() => ({
      solfege: [
        { name: "Do" },
        { name: "Re" },
        { name: "Mi" },
        { name: "Fa" },
        { name: "Sol" },
        { name: "La" },
        { name: "Ti" },
      ],
    })),
  },
}));

vi.unmock("@/services/superdoughAudio");

describe("superdoughAudio live note handling", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    hoisted.mockAudioContext.state = "running";
    hoisted.mockAudioContext.currentTime = 12;
    hoisted.mockHasVoice.mockReturnValue(false);
    hoisted.mockGetSound.mockReturnValue({ data: {} });
    hoisted.mockLoadBuffer.mockResolvedValue(undefined);
    hoisted.mockPrewarmSoundfont.mockResolvedValue(undefined);
  });

  it("attacks a live note as a held voice with voice ownership", async () => {
    const audio = await import("@/services/superdoughAudio");

    await audio.attackNote("note-1", "C4", "synth");

    expect(hoisted.mockSuperdough).toHaveBeenCalledWith(
      expect.objectContaining({
        s: "triangle",
        note: "C4",
        gain: 0.8,
        attack: 0.01,
        release: 1.5,
        voiceId: "note-1",
        sustainUntilRelease: true,
      }),
      12.01,
      0.25,
      1,
    );
    expect(hoisted.mockReleaseVoice).not.toHaveBeenCalled();
  });

  it("stops a stale live voice before reusing the same note id", async () => {
    const audio = await import("@/services/superdoughAudio");
    hoisted.mockHasVoice.mockReturnValue(true);

    await audio.attackNote("note-1", "C4", "synth");

    expect(hoisted.mockStopVoice).toHaveBeenCalledWith("note-1", 12);
  });

  it("delegates releaseNote and releaseAll to the patched voice API", async () => {
    const audio = await import("@/services/superdoughAudio");

    audio.releaseNote("note-2");
    audio.releaseAll();

    expect(hoisted.mockReleaseVoice).toHaveBeenCalledWith("note-2");
    expect(hoisted.mockReleaseAllVoices).toHaveBeenCalledTimes(1);
  });

  it("keeps duration-based playback on the old one-shot path", async () => {
    const audio = await import("@/services/superdoughAudio");

    await audio.playNoteWithDuration("C4", 500, "synth");

    expect(hoisted.mockSuperdough).toHaveBeenCalledWith(
      expect.not.objectContaining({
        sustainUntilRelease: true,
        voiceId: expect.any(String),
      }),
      12.01,
      0.5,
      1,
    );
  });

  it("treats synths and registered no-sample sounds as immediately ready", async () => {
    const audio = await import("@/services/superdoughAudio");

    expect(audio.isPrewarmed("triangle")).toBe(true);
    expect(audio.isPrewarmed("custom-oscillator")).toBe(true);
  });

  it("does not report unregistered or unknown sounds as ready", async () => {
    hoisted.mockGetSound.mockImplementation(() => undefined as never);
    const audio = await import("@/services/superdoughAudio");

    expect(audio.isPrewarmed("triangle")).toBe(false);
    await expect(audio.prewarmSoundSamples("not-a-sound")).rejects.toThrow(
      "Unknown sound: not-a-sound"
    );
    expect(audio.isPrewarmed("not-a-sound")).toBe(false);
  });

  it("warms real soundfont metadata before reporting a GM instrument ready", async () => {
    const audio = await import("@/services/superdoughAudio");
    await audio.initSuperdoughAudio();
    hoisted.mockPrewarmSoundfont.mockClear();
    hoisted.mockGetSound.mockReturnValue({
      data: { type: "soundfont", fonts: ["0080_JCLive_sf2_file"] },
    });

    expect(audio.isPrewarmed("gm_celesta")).toBe(false);
    await audio.prewarmSoundSamples("gm_celesta");

    expect(hoisted.mockPrewarmSoundfont).toHaveBeenCalledWith(
      "0080_JCLive_sf2_file",
      hoisted.mockAudioContext
    );
    expect(audio.isPrewarmed("gm_celesta")).toBe(true);
  });

  it("decodes only the default piano during startup", async () => {
    hoisted.mockGetSound.mockImplementation((name: string) =>
      name === "piano"
        ? { data: { samples: ["https://example.test/piano.wav"] } }
        : {
            data: {
              type: "soundfont",
              fonts: [`${name}_font`],
            },
          }
    );
    const audio = await import("@/services/superdoughAudio");

    await audio.initSuperdoughAudio();

    expect(hoisted.mockLoadBuffer).toHaveBeenCalledTimes(1);
    expect(hoisted.mockLoadBuffer).toHaveBeenCalledWith(
      "https://example.test/piano.wav",
      hoisted.mockAudioContext
    );
    expect(hoisted.mockPrewarmSoundfont).not.toHaveBeenCalled();
  });

  it("leaves a soundfont cold when its preset fails to warm", async () => {
    const audio = await import("@/services/superdoughAudio");
    await audio.initSuperdoughAudio();
    hoisted.mockGetSound.mockReturnValue({
      data: { type: "soundfont", fonts: ["0080_JCLive_sf2_file"] },
    });
    hoisted.mockPrewarmSoundfont.mockRejectedValue(new Error("Font unavailable"));

    await expect(audio.prewarmSoundSamples("gm_celesta")).rejects.toThrow(
      "Font unavailable"
    );
    expect(audio.isPrewarmed("gm_celesta")).toBe(false);
  });

  it("emits exact borrowed-pitch lifecycle events during Strudel playback", async () => {
    vi.useFakeTimers();
    const dispatchEvent = vi.spyOn(window, "dispatchEvent");
    const audio = await import("@/services/superdoughAudio");

    await audio.emotitoneStrudelOutput(
      { value: { note: "D#4", freq: 311.13, s: "piano" } },
      12,
      0.25,
      1,
      0,
    );

    const played = dispatchEvent.mock.calls
      .map(([event]) => event)
      .find((event) => event.type === "note-played") as CustomEvent;
    expect(played.detail).toMatchObject({
      note: expect.objectContaining({
        name: "D#",
        emotion: "Borrowed harmony tone",
      }),
      noteName: "D#4",
      octave: 4,
      keyboardOctave: 4,
      solfegeIndex: -1,
      pitchClassIndex: 3,
      isBorrowed: true,
      source: "strudel-playback",
    });

    await vi.advanceTimersByTimeAsync(250);
    const released = dispatchEvent.mock.calls
      .map(([event]) => event)
      .find((event) => event.type === "note-released") as CustomEvent;
    expect(released.detail).toMatchObject({
      note: "D#",
      noteName: "D#4",
      solfegeIndex: -1,
      pitchClassIndex: 3,
      isBorrowed: true,
      source: "strudel-playback",
    });

    vi.useRealTimers();
  });

  it("surfaces explicit warmup failures and leaves the sound cold", async () => {
    hoisted.mockGetSound.mockReturnValue({
      data: { samples: ["https://example.test/sample.wav"] },
    });
    hoisted.mockLoadBuffer.mockRejectedValue(new Error("Network down"));
    const audio = await import("@/services/superdoughAudio");

    await expect(audio.prewarmSoundSamples("cold-bank")).rejects.toThrow(
      "Network down"
    );
    expect(audio.isPrewarmed("cold-bank")).toBe(false);
  });
});
