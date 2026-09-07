import { describe, expect, it, vi } from "vitest";
import {
  analyzeWithMelograph,
  encodeMonoPcmWav,
  melographAnalysisToPatternCandidates,
  type MelographAnalysis,
} from "@/services/melograph";

function analysis(overrides: Partial<MelographAnalysis> = {}): MelographAnalysis {
  return {
    schema_version: 1,
    product: "Melograph",
    tracker: "praat-ac",
    duration_seconds: 2,
    frames: [],
    phrases: [],
    strudel: "",
    strudel_midi: "",
    takes: [],
    warnings: [],
    ...overrides,
  };
}

describe("Melograph service", () => {
  it("posts normalized WAV bytes to the same-origin Melograph proxy", async () => {
    const payload = analysis();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(payload),
    });
    const wav = new Blob(["wav"], { type: "audio/wav" });

    await expect(analyzeWithMelograph(wav, {
      fetcher: fetcher as typeof fetch,
    })).resolves.toBe(payload);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/melograph/analyze",
      expect.objectContaining({
        method: "POST",
        body: wav,
        headers: { "Content-Type": "audio/wav" },
        cache: "no-store",
      }),
    );
  });

  it("surfaces Melograph errors and rejects incompatible contracts", async () => {
    const failedFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({ error: "no voiced frames" }),
    });
    await expect(analyzeWithMelograph(new Blob(), {
      fetcher: failedFetch as typeof fetch,
    })).rejects.toThrow("no voiced frames");

    const incompatibleFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(analysis({ tracker: "pyin" })),
    });
    await expect(analyzeWithMelograph(new Blob(), {
      fetcher: incompatibleFetch as typeof fetch,
    })).rejects.toThrow("unsupported analysis response");
  });

  it("writes mono 16-bit PCM WAV headers and clamped samples", async () => {
    const wav = encodeMonoPcmWav(new Float32Array([-2, 0, 2]), 22_050);
    const view = new DataView(await wav.arrayBuffer());

    expect(wav.type).toBe("audio/wav");
    expect(String.fromCharCode(...new Uint8Array(view.buffer, 0, 4))).toBe("RIFF");
    expect(view.getUint16(22, true)).toBe(1);
    expect(view.getUint32(24, true)).toBe(22_050);
    expect(view.getUint16(34, true)).toBe(16);
    expect(view.getInt16(44, true)).toBe(-32_768);
    expect(view.getInt16(48, true)).toBe(32_767);
  });

  it("keeps finalized phrases separate and maps authoritative event timing", () => {
    const candidates = melographAnalysisToPatternCandidates(
      analysis({
        phrases: [
          {
            number: 1,
            start_seconds: 0.2,
            end_seconds: 0.9,
            duration_seconds: 0.7,
            events: [
              {
                type: "rest",
                start_seconds: 0.2,
                end_seconds: 0.3,
                duration_seconds: 0.1,
              },
              {
                type: "note",
                start_seconds: 0.3,
                end_seconds: 0.75,
                duration_seconds: 99,
                midi: 62.2,
                note: "D4",
                pitch_hz: 294,
                confidence: 0.75,
              },
            ],
          },
          {
            number: 2,
            start_seconds: 1.2,
            end_seconds: 1.8,
            duration_seconds: 0.6,
            events: [{
              type: "note",
              start_seconds: 1.2,
              end_seconds: 1.8,
              duration_seconds: 0.6,
              midi: 69,
              note: "A4",
            }],
          },
        ],
      }),
      { key: "C", mode: "major" },
      "capture",
    );

    expect(candidates.map((candidate) => candidate.name)).toEqual([
      "Hummed take 1",
      "Hummed take 2",
    ]);
    expect(candidates[0].notes[0]).toEqual(expect.objectContaining({
      id: "melograph-capture-1-1",
      note: "D4",
      octave: 4,
      scaleIndex: 1,
      pressTime: 100,
      releaseTime: 550,
      duration: 450,
      frequency: 294,
      velocity: 0.75,
    }));
    expect(candidates[1].notes).toHaveLength(1);
    expect(candidates[1].source?.takeNumber).toBe(2);
  });

  it("surfaces analyzed pitches outside the selected scale", () => {
    expect(() => melographAnalysisToPatternCandidates(
      analysis({
        phrases: [{
          number: 1,
          start_seconds: 0,
          end_seconds: 1,
          duration_seconds: 1,
          events: [{
            type: "note",
            start_seconds: 0,
            end_seconds: 1,
            duration_seconds: 1,
            midi: 61,
            note: "C#4",
          }],
        }],
      }),
      { key: "C", mode: "major" },
    )).toThrow("Melograph detected C#4, which is outside C major.");
  });
});
