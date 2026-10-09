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
    dough.registerSynthSounds();
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

    // A held oscillator voice has no materialized buffer; it must stay open
    // rather than hit the package's former 60 s safety end.
    await dough.superdough(
      { s: "sawtooth", note: 60, voiceId: "held-synth", sustainUntilRelease: true, release: 0.03 },
      1,
      0.25,
      1
    );

    audio.advance(70);
    expect(dough.hasVoice(voiceId)).toBe(true);
    expect(dough.hasVoice("held-synth")).toBe(true);

    // The held voice loops a materialized ~1 s buffer, not a 60 s one.
    const voice = audio.voices.find((source) => !source.ended);
    expect(voice?.loop).toBe(true);
    expect((voice?.buffer as { duration: number }).duration).toBeGreaterThan(0);
    expect((voice?.buffer as { duration: number }).duration).toBeLessThanOrEqual(1.1);

    dough.releaseVoice(voiceId);
    dough.releaseVoice("held-synth");
    audio.advance(70.05);
    expect(dough.hasVoice(voiceId)).toBe(false);
    expect(dough.hasVoice("held-synth")).toBe(false);

    // Verify the voice source was disconnected
    const releasedVoice = audio.voices.find((s) => s.ended);
    expect(releasedVoice).toBeDefined();
    expect(releasedVoice?.disconnected).toBe(true);

    dough.resetGlobalEffects();
  });
});
