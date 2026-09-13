import { describe, expect, it } from "vitest";
import { audioTimeToOutputTime } from "@/services/liveAudioTiming";

describe("audio output clock mapping", () => {
  it("uses the device timeline without adding its latency twice", () => {
    expect(audioTimeToOutputTime({
      currentTime: 10, baseLatency: 0.01, outputLatency: 0.04,
      getOutputTimestamp: () => ({ contextTime: 9.96, performanceTime: 1000 }),
    }, 10.02, 1000)).toBeCloseTo(1060);
  });

  it("falls back to valid latency estimates before timestamps are available", () => {
    expect(audioTimeToOutputTime({
      currentTime: 10, baseLatency: 0.01, outputLatency: 0.04,
      getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }),
    }, 10.02, 1000)).toBeCloseTo(1070);
    expect(audioTimeToOutputTime({ currentTime: 10, baseLatency: NaN, outputLatency: -1 }, 10.02, 1000))
      .toBeCloseTo(1020);
  });
});
