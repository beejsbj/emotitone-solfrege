import { describe, expect, it } from "vitest";
import {
  createClockSlipMeter, describeUserAgent, formatBytes, percentile, playbackStatsDelta, readJsMemory, readPlaybackStats,
  summarizeFrames, summarizeLatencies, tallyMuteTap, tallySoloHold, type MuteTally, type SoloTally,
} from "./metrics";
import { formatGateSummary, gateRows, MUTE_TAPS, SOLO_HOLDS, type GateResults } from "./report";
import { createRouteLog } from "./route";

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

  it("does not book an OS interruption as underrun: a statechange starts a fresh baseline", () => {
    const context = new EventTarget();
    let wall = 5000;
    const meter = createClockSlipMeter({ context, now: () => wall });
    let audio = 10;
    const play = (steps: number) => {
      for (let step = 0; step < steps; step++) { meter.sample(audio, wall); audio += .016; wall += 16; }
    };
    play(50);
    // A call takes the audio session for 4 s: audio time stands still, wall time runs on.
    context.dispatchEvent(new Event("statechange"));
    const heldAudio = audio - .016;
    const heldWall = wall - 16;
    wall += 4000;
    // The browser hands back its last reading from before the interruption a few times.
    meter.sample(heldAudio, heldWall);
    context.dispatchEvent(new Event("statechange"));
    meter.sample(heldAudio, heldWall);
    play(50);
    const slip = meter.result();
    expect(slip.stateChanges).toBe(2);
    expect(slip.gaps).toBe(0);
    expect(slip.slipMs).toBeCloseTo(0);
    expect(slip.spanMs).toBeCloseTo(49 * 16 * 2);
    // A real underrun after the interruption still counts.
    audio += .016; wall += 16 + 30;
    meter.sample(audio, wall);
    expect(meter.result().gaps).toBe(1);
    expect(meter.result().slipMs).toBeCloseTo(30);
    meter.dispose();
    context.dispatchEvent(new Event("statechange"));
    expect(meter.result().stateChanges).toBe(2);
    expect(gateRows({ ...gateResults(), clockSlip: slip }).find(row => row.id === "underruns")!.value)
      .toContain("baseline reset after 2 audio state changes");
  });
});

function gateResults(): GateResults {
  return { startedAt: "", url: "", build: null, bpm: 100, environment: { device: "", os: "", browser: "", userAgent: "",
    sampleRate: 48000, baseLatencyMs: null, outputLatencyMs: null, devicePixelRatio: null, cores: null, deviceMemoryGb: null } };
}

describe("phone gate mute taps", () => {
  const speaker = { sampleRate: 48000, fadeMs: 30, outputTimeMs: (audioTime: number) => 1000 + audioTime * 1000 + 12 };
  const empty: MuteTally = { mute: [], unmute: [], refused: 0 };
  const applied = (seconds: number) => ({ appliedFrame: seconds * 48000 });

  it("measures a mute to silent at the speaker (applied, then faded) and an unmute to applied", () => {
    // Applied at audio 2.0 s: heard at 3012 ms; the tap was at 2950 ms.
    let tally = tallyMuteTap(empty, { muted: true, tapAtMs: 2950 }, applied(2), speaker);
    tally = tallyMuteTap(tally, { muted: false, tapAtMs: 3950 }, applied(3), speaker);
    expect(tally.mute).toHaveLength(1);
    expect(tally.mute[0]).toBeCloseTo(62 + 30);
    expect(tally.unmute[0]).toBeCloseTo(62);
    expect(tally.refused).toBe(0);
    expect(empty).toEqual({ mute: [], unmute: [], refused: 0 });
  });

  it("counts refused, cancelled and unanswered taps instead of dropping them", () => {
    let tally = tallyMuteTap(empty, { muted: true, tapAtMs: 0 }, { ...applied(1), refused: true }, speaker);
    tally = tallyMuteTap(tally, { muted: false, tapAtMs: 0 }, { ...applied(1), cancelled: true }, speaker);
    tally = tallyMuteTap(tally, { muted: true, tapAtMs: 0 }, undefined, speaker);
    tally = tallyMuteTap(tally, { muted: true, tapAtMs: 0 }, applied(1), { ...speaker, sampleRate: 0 });
    expect(tally).toEqual({ mute: [], unmute: [], refused: 4 });
  });

  it("fails the mute row when fewer than all its taps were measured, however fast they were", () => {
    let tally = empty;
    for (let tap = 0; tap < MUTE_TAPS; tap++) {
      tally = tallyMuteTap(tally, { muted: tap % 2 === 0, tapAtMs: 1000 * tap + 2970 }, applied(tap + 2),
        tap === 3 ? { ...speaker, outputTimeMs: () => Number.NaN } : speaker);
    }
    const row = (results: Partial<GateResults>) => gateRows({ ...gateResults(), ...results }).find(entry => entry.id === "mute")!;
    const short = row({ mute: tally.mute, unmute: tally.unmute, muteRefused: tally.refused });
    expect(tally.refused).toBe(1);
    expect(short.verdict).toBe("fail");
    expect(short.value).toContain(`${MUTE_TAPS - 1} of ${MUTE_TAPS} taps measured, 1 refused or cancelled`);
    const full = tallyMuteTap(tally, { muted: false, tapAtMs: 20_970 }, applied(20), speaker);
    expect(row({ mute: full.mute, unmute: full.unmute, muteRefused: full.refused }).verdict).toBe("pass");
    expect(row({ mute: [70, 80, 90] }).verdict).toBe("fail");
  });
});

describe("phone gate solo holds", () => {
  const speaker = { sampleRate: 48000, fadeMs: 30, outputTimeMs: (audioTime: number) => 1000 + audioTime * 1000 + 12 };
  const empty: SoloTally = { solo: [], release: [], refused: 0 };
  const applied = (seconds: number) => ({ appliedFrame: seconds * 48000 });
  const row = (tally: SoloTally) => gateRows({ ...gateResults(), solo: tally.solo, soloRelease: tally.release,
    soloRefused: tally.refused }).find(entry => entry.id === "solo")!;
  /** A hold at `second` (wall) heard 62 ms later unless another receipt is given, and its lift a second later. */
  const holdAndLift = (tally: SoloTally, second: number, receipt = applied(second - .95)) => {
    const held = tallySoloHold(tally, { held: true, atMs: second * 1000 }, receipt, speaker);
    return tallySoloHold(held, { held: false, atMs: second * 1000 + 1000 }, applied(second + .05), speaker);
  };

  it("measures a hold to the others silent (applied, then faded), and a lift to applied", () => {
    const tally = holdAndLift(empty, 5);
    expect(tally.solo[0]).toBeCloseTo(62 + 30);
    expect(tally.release[0]).toBeCloseTo(62);
    expect(tally.refused).toBe(0);
  });

  it("passes Solo only once all three requested holds were measured", () => {
    // One fast hold, then the step was left: incomplete, however fast.
    const one = holdAndLift(empty, 5);
    expect(row(one).verdict).toBe("fail");
    expect(row(one).value).toContain(`1 of ${SOLO_HOLDS} holds measured`);
    // Three holds, one refused: counted, and still incomplete.
    let refused = holdAndLift(one, 7, { ...applied(6.05), refused: true });
    refused = holdAndLift(refused, 9);
    expect(refused.refused).toBe(1);
    expect(row(refused).verdict).toBe("fail");
    expect(row(refused).value).toContain(`2 of ${SOLO_HOLDS} holds measured, 1 refused or cancelled`);
    // A third measured hold completes the step.
    expect(row(holdAndLift(refused, 11)).verdict).toBe("pass");
    // A slow hold still fails the mark.
    const slow = holdAndLift(holdAndLift(holdAndLift(empty, 5), 7), 9, applied(8.2));
    expect(row(slow).verdict).toBe("fail");
  });
});

describe("phone gate route step", () => {
  it("keeps what the page saw in the summary when the run stops before the answer", () => {
    let now = 1000;
    const results = gateResults();
    const log = createRouteLog(results, () => now);
    now += 2500;
    log.note("audio interrupted");
    now += 1000;
    log.note("output latency 182.0 ms");
    // Stopped here: the summary is formatted before any answer comes.
    const summary = formatGateSummary(results);
    expect(summary).toContain("[NOT RUN] Route change (headphones/Bluetooth): skipped; 2.5 s audio interrupted; 3.5 s output latency 182.0 ms");
    log.answer(true);
    expect(results.route).toEqual({ works: true, observations: ["2.5 s audio interrupted", "3.5 s output latency 182.0 ms"] });
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
