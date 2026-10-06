import { describe, expect, it, vi } from "vitest";
import { eventBarPosition, LooperTempoMap } from "@/audio/looper/tempoMap";
import { createLiveAudioClock } from "@/services/liveAudioClock";

describe("LooperTempoMap", () => {
  it("maps a nonzero origin in both directions, including pre-start positions", () => {
    const map = new LooperTempoMap();
    map.reset(10, 0, 0.5);
    expect(map.barAt(10)).toBe(0);
    expect(map.barAt(14)).toBe(2);
    expect(map.timeAt(2)).toBe(14);
    expect(map.barAt(8)).toBe(-1);
    expect(map.timeAt(-1)).toBe(8);
    map.reset(20, 7, 0.25);
    expect(map.barAt(24)).toBe(8);
    expect(map.timeAt(6)).toBe(16);
    expect(map.segments).toEqual([{ audioTime: 20, bar: 7, cps: 0.25 }]);
  });

  it.each([
    [0.375, 0.625],
    [0.625, 0.375],
  ])("keeps the boundary continuous when retiming from %s to %s cps", (before, after) => {
    const map = new LooperTempoMap();
    map.reset(10, 0, before);
    const boundaryBar = 4 * before;
    map.retime(14, boundaryBar, after);
    expect(map.barAt(13)).toBe(3 * before);
    expect(map.barAt(14)).toBe(boundaryBar);
    expect(map.barAt(15)).toBe(boundaryBar + after);
    expect(map.timeAt(boundaryBar - before)).toBe(13);
    expect(map.timeAt(boundaryBar)).toBe(14);
    expect(map.timeAt(boundaryBar + after)).toBe(15);
    const positions = [13.99, 14, 14.01].map(time => map.barAt(time));
    expect(positions[0]).toBeLessThan(positions[1]);
    expect(positions[1]).toBeLessThan(positions[2]);
  });

  it("coalesces rapid changes at the same boundary without rewriting history", () => {
    const map = new LooperTempoMap();
    map.reset(10, 0, 0.5);
    map.retime(14, 2, 1);
    map.retime(14, 2, 0.25);
    map.retime(14, 2, 0.75);
    expect(map.segments).toEqual([
      { audioTime: 10, bar: 0, cps: 0.5 },
      { audioTime: 14, bar: 2, cps: 0.75 },
    ]);
    expect(map.barAt(12)).toBe(1);
    expect(map.barAt(16)).toBe(3.5);
    expect(map.timeAt(3.5)).toBe(16);
  });

  it("replaces obsolete future anchors while preserving earlier tempo history", () => {
    const map = new LooperTempoMap();
    map.reset(0, 0, 0.5);
    map.retime(4, 2, 1);
    map.retime(8, 6, 0.25);
    map.retime(12, 7, 0.5);
    map.retime(6, 4, 0.75);
    expect(map.segments).toEqual([
      { audioTime: 0, bar: 0, cps: 0.5 },
      { audioTime: 4, bar: 2, cps: 1 },
      { audioTime: 6, bar: 4, cps: 0.75 },
    ]);
    expect(map.barAt(2)).toBe(1);
    expect(map.barAt(5)).toBe(3);
    expect(map.barAt(12)).toBe(8.5);
    expect(map.timeAt(8.5)).toBe(12);
  });

  it("does not accumulate cursor drift across repeated reads and tempo changes", () => {
    const map = new LooperTempoMap();
    map.reset(100, 0, 0.375);
    map.retime(108, 3, 0.625);
    map.retime(116, 8, 0.375);
    for (let i = 0; i <= 1000; i++) {
      const time = 96 + i * 3.125;
      const expected = time < 108 ? (time - 100) * 0.375
        : time < 116 ? 3 + (time - 108) * 0.625
          : 8 + (time - 116) * 0.375;
      expect(map.barAt(time)).toBeCloseTo(expected, 12);
      expect(map.timeAt(expected)).toBeCloseTo(time, 12);
    }
    // Earlier lookups still use their original rate after long-running reads.
    expect(map.barAt(104)).toBe(1.5);
  });

  it("returns detached segment copies", () => {
    const map = new LooperTempoMap();
    map.reset(10, 0, 0.5);
    const snapshot = map.segments;
    // Even a JavaScript consumer bypassing readonly types cannot alter the map.
    Object.assign(snapshot[0], { audioTime: 0, bar: 100, cps: 2 });
    map.retime(14, 2, 1);
    expect(snapshot).toHaveLength(1);
    expect(map.barAt(12)).toBe(1);
    expect(map.segments[0]).toEqual({ audioTime: 10, bar: 0, cps: 0.5 });
  });

  it.each([0, -0.5, NaN, Infinity, -Infinity])("rejects invalid cps %s without mutating anchors", cps => {
    const map = new LooperTempoMap();
    map.reset(10, 0, 0.5);
    expect(() => map.reset(0, 0, cps)).toThrow(RangeError);
    expect(() => map.retime(14, 2, cps)).toThrow(RangeError);
    expect(map.segments).toEqual([{ audioTime: 10, bar: 0, cps: 0.5 }]);
  });

  it("requires an anchor for lookups and rejects nonfinite coordinates", () => {
    const map = new LooperTempoMap();
    expect(() => map.barAt(0)).toThrow("initial anchor");
    expect(() => map.timeAt(0)).toThrow("initial anchor");
    expect(() => map.reset(NaN, 0, 0.5)).toThrow(RangeError);
    expect(() => map.retime(0, Infinity, 0.5)).toThrow(RangeError);
    map.reset(0, 0, 0.5);
    expect(() => map.barAt(Infinity)).toThrow(RangeError);
    expect(() => map.timeAt(NaN)).toThrow(RangeError);
  });
});

describe("eventBarPosition", () => {
  const epochOrigin = 1_800_000_000_000;

  it("converts epoch milliseconds through the real clock on both sides of a tempo change", () => {
    const clock = createLiveAudioClock(() => ({ currentTime: 10 }), {
      epochNow: () => epochOrigin,
      performanceNow: () => 0,
    });
    const map = new LooperTempoMap();
    map.reset(10, 0, 0.5);
    map.retime(14, 2, 1);
    for (const [elapsedMs, expectedBar] of [[2000, 1], [4000, 2], [5000, 3]]) {
      expect(eventBarPosition(map, clock, epochOrigin + elapsedMs + 80, 50, 30))
        .toBe(expectedBar);
    }
    clock.dispose();
  });

  it("applies both corrections before choosing the segment, including signed calibration", () => {
    const fromEpochTime = vi.fn((epochMs: number) => epochMs - epochOrigin + 10_000);
    const map = new LooperTempoMap();
    map.reset(10, 0, 0.5);
    map.retime(14, 2, 1);
    // The uncorrected stamp is after the bend; its musical onset is before it.
    expect(eventBarPosition(map, { fromEpochTime }, epochOrigin + 4050, 100, 50))
      .toBeCloseTo(1.95, 12);
    expect(fromEpochTime).toHaveBeenCalledWith(epochOrigin + 4050);
    expect(eventBarPosition(map, { fromEpochTime }, epochOrigin + 4050, 100, -100))
      .toBeCloseTo(2.05, 12);
    expect(eventBarPosition(map, { fromEpochTime }, epochOrigin, 50, 30))
      .toBeCloseTo(-0.04, 12);
  });

  it("rejects nonfinite event timestamps and corrections", () => {
    const map = new LooperTempoMap();
    map.reset(0, 0, 0.5);
    const clock = { fromEpochTime: (timestamp: number) => timestamp };
    expect(() => eventBarPosition(map, clock, NaN, 0, 0)).toThrow(RangeError);
    expect(() => eventBarPosition(map, clock, 0, Infinity, 0)).toThrow(RangeError);
    expect(() => eventBarPosition(map, clock, 0, 0, NaN)).toThrow(RangeError);
  });
});
