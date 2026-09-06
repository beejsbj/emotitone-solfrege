import { describe, expect, it } from "vitest";
import { LiveMpmTracker } from "@/services/melographLivePitch";

const SAMPLE_RATE = 48_000;
const FRAME_SIZE = 2_048;

describe("Melograph provisional live pitch", () => {
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
