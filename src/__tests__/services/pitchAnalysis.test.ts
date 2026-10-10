import { describe, expect, it, vi } from "vitest";
import capturedAnalysis from "../fixtures/pitch-analysis/melograph-two-level-sine.json";
import {
  analyzePitchRecording,
  encodeMonoPcmWav,
  pitchAnalysisToPatternCandidates,
  type PitchAnalysisResult,
} from "@/services/pitchAnalysis";

function analysis(overrides: Partial<PitchAnalysisResult> = {}): PitchAnalysisResult {
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

describe("pitch analysis", () => {
  it("posts normalized WAV bytes to the configured analysis adapter", async () => {
    const payload = analysis();
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(payload),
    });
    const wav = new Blob(["wav"], { type: "audio/wav" });

    await expect(analyzePitchRecording(wav, {
      fetcher: fetcher as typeof fetch,
    })).resolves.toBe(payload);

    expect(fetcher).toHaveBeenCalledWith(
      "/api/pitch-analysis/analyze",
      expect.objectContaining({
        method: "POST",
        body: wav,
        headers: { "Content-Type": "audio/wav" },
        cache: "no-store",
      }),
    );
  });

  it("surfaces analyser errors and rejects incompatible contracts", async () => {
    const failedFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 422,
      json: vi.fn().mockResolvedValue({ error: "no voiced frames" }),
    });
    await expect(analyzePitchRecording(new Blob(), {
      fetcher: failedFetch as typeof fetch,
    })).rejects.toThrow("no voiced frames");

    const incompatibleFetch = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: vi.fn().mockResolvedValue(analysis({ tracker: "pyin" })),
    });
    await expect(analyzePitchRecording(new Blob(), {
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
    const candidates = pitchAnalysisToPatternCandidates(
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
      id: "pitch-analysis-capture-1-1",
      note: "D4",
      octave: 4,
      scaleIndex: 1,
      pressTime: 100,
      releaseTime: 550,
      duration: 450,
      frequency: 294,
      velocity: 0.7,
    }));
    expect(candidates[1].notes).toHaveLength(1);
    expect(candidates[1].source?.takeNumber).toBe(2);
  });

  it("surfaces analyzed pitches outside the selected scale", () => {
    expect(() => pitchAnalysisToPatternCandidates(
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
    )).toThrow("Pitch analysis detected C#4, which is outside C major.");
  });
});

describe("recorded voice dynamics", () => {
  function take(rmsDb: number, confidence: number) {
    return pitchAnalysisToPatternCandidates(analysis({
      frames: [
        { time_seconds: 0.5, rms_db: rmsDb, confidence, voiced: true,
          f0_hz_raw: 440, midi_raw: 69, midi_processed: 69 },
        // Excluded: unvoiced and end-exclusive frames must not change loudness.
        { time_seconds: 0.75, rms_db: 0, confidence: 1, voiced: false,
          f0_hz_raw: null, midi_raw: null, midi_processed: null },
        { time_seconds: 1, rms_db: 0, confidence: 1, voiced: true,
          f0_hz_raw: 440, midi_raw: 69, midi_processed: 69 },
        { time_seconds: 0.49, rms_db: 0, confidence: 1, voiced: true,
          f0_hz_raw: 440, midi_raw: 69, midi_processed: 69 },
      ],
      phrases: [{ number: 1, start_seconds: 0, end_seconds: 1, duration_seconds: 1,
        events: [{ type: "note", midi: 69, note: "A4", start_seconds: 0.5,
          end_seconds: 1, duration_seconds: 0.5, confidence }],
      }],
    }), { key: "C", mode: "major" })[0].notes[0];
  }

  it("preserves different loudness at equal confidence in the captured Melograph response", () => {
    const captured = capturedAnalysis as PitchAnalysisResult;
    const notes = pitchAnalysisToPatternCandidates(captured, { key: "C", mode: "major" })[0].notes;
    expect(notes).toHaveLength(2);
    expect(notes.map((note) => note.note)).toEqual(["C4", "C4"]);
    // Known PCM amplitudes give RMS amplitude / sqrt(2). The second note's
    // window includes the short amplitude transition, hence the 0.01 tolerance.
    expect(notes[0].velocity).toBeCloseTo(0.205, 2);
    expect(notes[1].velocity).toBeCloseTo(0.578, 2);
    expect(notes[0].velocity).toBeLessThan(notes[1].velocity!);
    expect(notes[1].velocity).toBeLessThan(1);

    const lowConfidence = structuredClone(captured);
    lowConfidence.frames.forEach((frame) => { frame.confidence = 0.1; });
    lowConfidence.phrases.forEach((phrase) => phrase.events.forEach((event) => {
      if (event.type === "note") event.confidence = 0.1;
    }));
    expect(pitchAnalysisToPatternCandidates(lowConfidence, { key: "C", mode: "major" })[0].notes
      .map((note) => note.velocity)).toEqual(notes.map((note) => note.velocity));
  });

  it("excludes unvoiced and out-of-window frames from note energy", () => {
    const quiet = take(-40, 0.95);
    const loud = take(-20, 0.95);
    expect(quiet.velocity).toBeCloseTo(Math.sqrt((0.01 - 0.003) / 0.097));
    expect(loud.velocity).toBe(1);
    expect(quiet.velocity).toBeLessThan(loud.velocity!);
    expect(take(-40, 0.1).velocity).toBe(quiet.velocity);
  });

  it("combines frame energy before mapping velocity", () => {
    const candidate = pitchAnalysisToPatternCandidates(analysis({
      frames: [0.01, 0.04].map((rms, index) => ({
        time_seconds: index / 2, rms_db: 20 * Math.log10(rms),
        confidence: 0.9, voiced: true, f0_hz_raw: 440, midi_raw: 69, midi_processed: 69,
      })),
      phrases: [{ number: 1, start_seconds: 0, end_seconds: 1, duration_seconds: 1,
        events: [{ type: "note", midi: 69, note: "A4", start_seconds: 0,
          end_seconds: 1, duration_seconds: 1 }],
      }],
    }), { key: "C", mode: "major" })[0].notes[0];
    expect(candidate.velocity).toBeCloseTo(Math.sqrt((Math.sqrt((0.01 ** 2 + 0.04 ** 2) / 2) - 0.003) / 0.097));
  });
});

describe("pitch recording duration", () => {
  it.each([3, 65])("retains the first min(%i, 60) seconds even after a delayed recorder stop", async (duration) => {
    const close = vi.fn();
    vi.stubGlobal("AudioContext", class {
      decodeAudioData = async () => ({ duration });
      close = close;
    });
    vi.stubGlobal("OfflineAudioContext", class {
      destination = {};
      constructor(_channels: number, private length: number, _sampleRate: number) {}
      createBufferSource() { return { buffer: null, connect() {}, start() {} }; }
      async startRendering() {
        const pcm = new Float32Array(this.length).fill(0.25);
        return { getChannelData: () => pcm };
      }
    });
    try {
      const { preparePitchAnalysisAudio } = await import("@/services/pitchAnalysis");
      const wav = await preparePitchAnalysisAudio(new Blob(["recorded audio"]), 60);
      const data = new DataView(await wav.arrayBuffer());
      const sampleRate = data.getUint32(24, true);
      const sampleCount = data.getUint32(40, true) / 2;
      expect(sampleCount / sampleRate).toBe(Math.min(duration, 60));
      expect(data.getInt16(44, true)).toBe(8192);
      expect(data.getInt16(wav.size - 2, true)).toBe(8192);
      expect(close).toHaveBeenCalledOnce();
    } finally {
      vi.unstubAllGlobals();
    }
  });
});
