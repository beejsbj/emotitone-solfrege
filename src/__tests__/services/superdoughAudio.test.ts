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
}));

vi.mock("@/services/music", () => ({
  CHROMATIC_NOTES: ["C", "D", "E", "F", "G", "A", "B"],
  musicTheory: {
    getCurrentScaleNotes: vi.fn(() => ["C", "D", "E", "F", "G", "A", "B"]),
    getCurrentKey: vi.fn(() => "C"),
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
});
