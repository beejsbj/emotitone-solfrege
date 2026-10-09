import { describe, expect, it } from "vitest";
import { LiveMpmTracker } from "@/services/livePitch";

const SAMPLE_RATE = 48_000;
const FRAME_SIZE = 2_048;

describe("LivePitch", () => {
  it("recognizes a clear A4 frame without treating silence as voiced", () => {
    const tracker = new LiveMpmTracker();
    const a4 = new Float32Array(FRAME_SIZE);
    for (let index = 0; index < a4.length; index += 1) {
      a4[index] = Math.sin(2 * Math.PI * 440 * index / SAMPLE_RATE) * 0.5;
    }

    const voiced = tracker.analyze(a4, SAMPLE_RATE, 0.1);
    const silent = tracker.analyze(new Float32Array(FRAME_SIZE), SAMPLE_RATE, 0.2);

    expect(voiced.voiced).toBe(true);
    expect(voiced.frequencyHz).toBeCloseTo(440, 0);
    expect(voiced.midi).toBeCloseTo(69, 0);
    expect(silent).toEqual(expect.objectContaining({
      voiced: false,
      frequencyHz: null,
      midi: null,
    }));
  });
});

describe("voice dynamics", () => {
  it("measures real buffer RMS and gives louder voices higher velocity at equal clarity", async () => {
    const { voiceRmsToVelocity } = await import("@/services/voiceDynamics");
    const tracker = new LiveMpmTracker();
    const frames = [0.01, 0.04, 0.2].map((amplitude) => {
      const samples = Float32Array.from({ length: FRAME_SIZE }, (_, i) =>
        amplitude * Math.sin(2 * Math.PI * 440 * i / SAMPLE_RATE));
      return tracker.analyze(samples, SAMPLE_RATE, 0);
    });
    expect(frames.every((frame) => frame.voiced)).toBe(true);
    expect(frames[0].rms).toBeCloseTo(0.01 / Math.sqrt(2), 3);
    expect(frames[0].clarity).toBeCloseTo(frames[1].clarity, 3);
    const velocities = frames.map((frame) => voiceRmsToVelocity(frame.rms));
    expect(velocities[0]).toBeGreaterThan(0);
    expect(velocities[0]).toBeLessThan(velocities[1]);
    expect(velocities[2]).toBe(1);
    expect(voiceRmsToVelocity(tracker.analyze(new Float32Array(FRAME_SIZE), SAMPLE_RATE, 0).rms)).toBe(0);
    expect(voiceRmsToVelocity(-1)).toBe(0);
    expect(voiceRmsToVelocity(Number.NaN)).toBe(0);
  });
});
