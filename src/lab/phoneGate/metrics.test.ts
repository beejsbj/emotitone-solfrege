import { describe, expect, it } from "vitest";
import {
  createClockSlipMeter, describeUserAgent, formatBytes, percentile, playbackStatsDelta, readJsMemory, readPlaybackStats,
  summarizeFrames, summarizeLatencies,
} from "./metrics";

const steady = (count: number, interval: number, start = 1000) => Array.from({ length: count }, (_, index) => start + index * interval);

describe("phone gate latencies", () => {
  it("reads nearest-rank percentiles and counts samples at or over the mark", () => {
    const samples = [40, 60, 80, 100, 120, 140, 149, 150, 200, 20];
    expect(percentile(samples, .5)).toBe(100);
    expect(percentile(samples, .95)).toBe(200);
    expect(percentile([], .5)).toBe(0);
    const summary = summarizeLatencies(samples, 150);
    expect(summary).toMatchObject({ count: 10, p50: 100, p95: 200, max: 200, over: 2 });
    expect(summary.mean).toBeCloseTo(105.9);
  });

  it("ignores non-finite samples instead of letting them pass or fail a mark", () => {
    expect(summarizeLatencies([Number.NaN, 30, Infinity], 150)).toMatchObject({ count: 1, max: 30, over: 0 });
  });
});

describe("phone gate frame pacing", () => {
  it("finds a steady 60 Hz display with nothing dropped", () => {
    const pacing = summarizeFrames(steady(301, 1000 / 60));
    expect(pacing.frames).toBe(300);
    expect(pacing.refreshHz).toBeCloseTo(60, 0);
    expect(pacing.dropped).toBe(0);
    expect(pacing.p99Ms).toBeCloseTo(16.67, 1);
  });

  it("counts the refreshes a long frame skipped, on a 120 Hz display", () => {
    const interval = 1000 / 120;
    const times = steady(200, interval);
    // One 60 ms hitch (about seven refreshes: six dropped) and one double-length frame.
    const hitched = [...times.slice(0, 100), ...times.slice(100).map(time => time + 60 - interval)];
    hitched.splice(150, 1);
    const pacing = summarizeFrames(hitched);
    expect(pacing.refreshHz).toBeCloseTo(120, 0);
    expect(pacing.dropped).toBe(7);
    expect(pacing.longFrames).toBe(1);
    expect(pacing.maxMs).toBeCloseTo(60);
    expect(pacing.droppedShare).toBeCloseTo(7 / (pacing.frames + 7));
  });

  it("reports an empty run as zeros", () => {
    expect(summarizeFrames([])).toMatchObject({ frames: 0, refreshHz: 0, dropped: 0 });
  });
});

describe("phone gate clock slip (the whole graph's deadline)", () => {
  it("finds no slip while audio and wall time advance together", () => {
    const meter = createClockSlipMeter();
    for (let step = 0; step <= 100; step++) meter.sample(10 + step * .016, 5000 + step * 16);
    expect(meter.result()).toMatchObject({ samples: 101, gaps: 0 });
    expect(meter.result().slipMs).toBeCloseTo(0);
    expect(meter.result().spanMs).toBeCloseTo(1600);
  });

  it("counts an underrun: wall time runs ahead of the audio the graph rendered", () => {
    const meter = createClockSlipMeter();
    let context = 10;
    let wall = 5000;
    for (let step = 0; step < 50; step++) {
      // The same reading twice (no new output callback yet) is not a sample.
      meter.sample(context, wall);
      meter.sample(context, wall);
      context += .016;
      wall += step === 20 ? 16 + 40 : 16;
    }
    const slip = meter.result();
    expect(slip.samples).toBe(50);
    expect(slip.gaps).toBe(1);
    expect(slip.slipMs).toBeCloseTo(40);
    expect(slip.worstStepMs).toBeCloseTo(40);
  });

  it("ignores readings the browser cannot give", () => {
    const meter = createClockSlipMeter();
    meter.sample(undefined, 10);
    meter.sample(1, 0);
    meter.sample(Number.NaN, 20);
    expect(meter.result()).toMatchObject({ samples: 0, slipMs: 0 });
  });
});

describe("phone gate browser counters", () => {
  it("reads the Web Audio playbackStats (seconds) and Chrome's earlier playoutStats (ms)", () => {
    expect(readPlaybackStats({ playbackStats: { underrunEvents: 3, underrunDuration: .012 } }))
      .toEqual({ api: "playbackStats", underrunEvents: 3, underrunMs: 12 });
    expect(readPlaybackStats({ playoutStats: { fallbackFramesEvents: 2, fallbackFramesDuration: 5.5 } }))
      .toEqual({ api: "playoutStats", underrunEvents: 2, underrunMs: 5.5 });
    expect(readPlaybackStats({})).toBeNull();
  });

  it("subtracts a reading taken before the soak", () => {
    const before = { api: "playbackStats" as const, underrunEvents: 4, underrunMs: 30 };
    const after = { api: "playbackStats" as const, underrunEvents: 5, underrunMs: 42 };
    expect(playbackStatsDelta(before, after)).toEqual({ api: "playbackStats", underrunEvents: 1, underrunMs: 12 });
    expect(playbackStatsDelta(null, null)).toBeNull();
  });

  it("reads Chrome's JS heap and says so plainly where it is not exposed", () => {
    expect(readJsMemory({ memory: { usedJSHeapSize: 50 * 1048576, totalJSHeapSize: 60 * 1048576, jsHeapSizeLimit: 4e9 } }))
      .toEqual({ usedBytes: 50 * 1048576, totalBytes: 60 * 1048576, limitBytes: 4e9 });
    expect(readJsMemory({})).toEqual({ usedBytes: null, totalBytes: null, limitBytes: null });
    expect(formatBytes(138 * 1048576)).toBe("138.0 MiB");
    expect(formatBytes(null)).toBe("n/a");
  });
});

describe("phone gate device description", () => {
  it.each([
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1", 5,
      { device: "iPhone", os: "iOS 18.1", browser: "Safari 18.1" }],
    ["Mozilla/5.0 (iPhone; CPU iPhone OS 17_6_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/129.0.6668.69 Mobile/15E148 Safari/604.1", 5,
      { device: "iPhone", os: "iOS 17.6.1", browser: "Chrome (iOS, WebKit) 129.0" }],
    ["Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", 5,
      { device: "Pixel 8", os: "Android 14", browser: "Chrome 130.0" }],
    ["Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Mobile Safari/537.36", 5,
      { device: "Android phone", os: "Android 10", browser: "Chrome 130.0" }],
    ["Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15", 5,
      { device: "iPad (desktop mode)", os: "iPadOS 18.0", browser: "Safari 18.0" }],
    ["Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) HeadlessChrome/131.0.0.0 Safari/537.36", 0,
      { device: "Linux machine", os: "Linux", browser: "Headless Chrome 131.0" }],
  ])("describes %s", (userAgent, touchPoints, expected) => {
    expect(describeUserAgent(userAgent, touchPoints)).toEqual(expected);
  });
});
