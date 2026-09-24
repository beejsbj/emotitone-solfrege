import { describe, expect, it } from "vitest";
import { approximateTremolo } from "@/services/tremoloApproximation";

describe("approximateTremolo", () => {
  it("maps repeated vertical movement conservatively", () => {
    expect(approximateTremolo([
      { timeMs: 0, gain: 1 }, { timeMs: 50, gain: 1.3 }, { timeMs: 100, gain: 0.8 },
      { timeMs: 150, gain: 1.3 }, { timeMs: 200, gain: 0.8 }, { timeMs: 250, gain: 1.3 }, { timeMs: 300, gain: 0.8 },
    ])).toEqual({ tremolo: 10, tremolodepth: 0.385 });
  });

  it("does not invent tremolo from a constant curve, jitter, or one-way drag", () => {
    expect(approximateTremolo([{ timeMs: 0, gain: 1 }, { timeMs: 100, gain: 1 }])).toBeUndefined();
    expect(approximateTremolo([{ timeMs: 0, gain: 1 }, { timeMs: 50, gain: 1.01 }, { timeMs: 100, gain: 0.99 }, { timeMs: 150, gain: 1.01 }, { timeMs: 200, gain: 0.99 }])).toBeUndefined();
    expect(approximateTremolo([{ timeMs: 0, gain: 1 }, { timeMs: 50, gain: 1.1 }, { timeMs: 100, gain: 1.2 }, { timeMs: 150, gain: 1.3 }, { timeMs: 200, gain: 1.4 }])).toBeUndefined();
  });

  it("recognizes alternating peaks when a delayed note starts at a non-neutral gain", () => {
    const curve = [1.3, 0.8, 1.3, 0.8, 1.3, 0.8, 1.3]
      .map((gain, index) => ({ timeMs: index * 50, gain }));
    expect(approximateTremolo(curve)).toEqual({ tremolo: 10, tremolodepth: 0.385 });
  });
});
