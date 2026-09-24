import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createSuperdoughTestAudio } from "./superdoughTestAudio";

vi.unmock("superdough");
// @ts-ignore — exercise the installed, patched public entry.
type Dough = typeof import("superdough");

let dough: Dough;
let audio: ReturnType<typeof createSuperdoughTestAudio>;

describe("patched superdough behavior", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("evicts failed downloads so a transient failure can be retried", async () => {
    const fetchMock = vi
      .fn()
      .mockRejectedValueOnce(new Error("temporary network failure"))
      .mockResolvedValueOnce({
        arrayBuffer: vi.fn().mockResolvedValue(new ArrayBuffer(8)),
      });
    vi.stubGlobal("fetch", fetchMock);
    const audioContext = {
      decodeAudioData: vi.fn().mockResolvedValue({ duration: 1 }),
    };
    const { loadBuffer } = await import("superdough");
    const url = `https://example.test/retry-${crypto.randomUUID()}.wav`;

    await expect(loadBuffer(url, audioContext)).rejects.toThrow(
      "temporary network failure"
    );
    await expect(loadBuffer(url, audioContext)).resolves.toEqual({ duration: 1 });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  it("keeps held voices open while bounding materialized ZZFX buffers", async () => {
    audio = createSuperdoughTestAudio();
    dough = await vi.importActual("superdough");
    dough.setAudioContext(audio.context);
    dough.setSuperdoughAudioController({
      getOrbit: () => ({ connectToOutput() {} }),
      reset() {},
    });
    dough.registerZZFXSounds();
    audio.advance(0.99);

    // Start a held ZZFX voice with sustain until release
    const voiceId = "held-zzfx";
    await dough.superdough(
      {
        s: "z_sine",
        note: 60,
        voiceId,
        sustainUntilRelease: true,
        attack: 0.003,
        decay: 0.001,
        sustain: 1,
        release: 0.03,
      },
      1,
      0.25,
      1
    );

    // Verify voice exists at start
    expect(dough.hasVoice(voiceId)).toBe(true);
    const startingVoices = audio.voices.length;

    // Advance clock well beyond 60 seconds to verify materialized ZZFX doesn't
    // prematurely end. The buffer is bounded to ~1s, but sustainUntilRelease
    // keeps the voice open via looping.
    audio.advance(70);
    expect(dough.hasVoice(voiceId)).toBe(true);

    // Verify the voice uses a bounded buffer with loop behavior
    const voice = audio.voices.find((s) => !s.ended);
    expect(voice).toBeDefined();
    if (voice) {
      // Buffer should be bounded to ~1s not 60s
      expect(voice.buffer).toBeDefined();
      const buffer = voice.buffer as {
        duration: number;
        sampleRate: number;
      };
      expect(buffer.duration).toBeLessThanOrEqual(1.1);
      expect(buffer.duration).toBeGreaterThan(0);
      // Loop properties should be set
      expect(voice.loop).toBe(true);
      expect(typeof voice.loopStart).toBe("number");
      expect(typeof voice.loopEnd).toBe("number");
    }

    // Release and verify stop is called
    dough.releaseVoice(voiceId);
    audio.advance(70.05);
    expect(dough.hasVoice(voiceId)).toBe(false);

    // Verify the voice source was disconnected
    const releasedVoice = audio.voices.find((s) => s.ended);
    expect(releasedVoice).toBeDefined();
    expect(releasedVoice?.disconnected).toBe(true);

    dough.resetGlobalEffects();
  });
});
