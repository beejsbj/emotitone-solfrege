import { describe, expect, it } from "vitest";
import { RenderCostMeter, summarizeRenderCost } from "@/audio/live/renderCost";
import { formatGateSummary, gateRows, type GateResults } from "./report";

const environment: GateResults["environment"] = {
  device: "iPhone", os: "iOS 18.1", browser: "Safari 18.1", userAgent: "UA", sampleRate: 48000,
  baseLatencyMs: 5.3, outputLatencyMs: 12, devicePixelRatio: 3, cores: 6, deviceMemoryGb: null,
};
const base = (extra: Partial<GateResults> = {}): GateResults => ({
  startedAt: "2026-10-26T12:00:00.000Z", url: "https://preview.example/lab/phone-gate", build: "abc12345",
  environment, bpm: 100, ...extra,
});
const row = (results: GateResults, id: string) => gateRows(results).find(entry => entry.id === id)!;
const ledger = { expected: 384, rendered: 384, lost: 0, doubled: 0, extra: 0, cancelled: 0, cutShort: 0, stolenAtOnset: 0,
  overflows: 0, bars: 12 };
/** The rest of the mute step's eight taps: four unmutes. */
const unmute = [90, 95, 100, 105];

function cost(costs: number[], clock: "performance" | "date" = "performance") {
  const meter = new RenderCostMeter(clock);
  costs.forEach(value => meter.record(value));
  return summarizeRenderCost(meter.snapshot(), 48000);
}

describe("phone gate verdicts", () => {
  it("leaves every measurement 'not run' before anything is measured", () => {
    expect(gateRows(base()).every(entry => entry.verdict === "not-run")).toBe(true);
  });

  it("passes a clean loop and fails any lost, doubled, extra or refused onset", () => {
    expect(row(base({ attacks: ledger }), "attacks").verdict).toBe("pass");
    expect(row(base({ attacks: ledger }), "skips").verdict).toBe("pass");
    expect(row(base({ attacks: { ...ledger, lost: 1, rendered: 383 } }), "attacks").verdict).toBe("fail");
    expect(row(base({ attacks: { ...ledger, doubled: 1 } }), "attacks").verdict).toBe("fail");
    expect(row(base({ attacks: { ...ledger, extra: 2 } }), "attacks").verdict).toBe("fail");
    expect(row(base({ attacks: { ...ledger, cancelled: 1 } }), "skips").verdict).toBe("fail");
    expect(row(base({ attacks: { ...ledger, overflows: 1 } }), "attacks").value).toContain("unreliable");
    // Records were dropped: a clean count is no evidence, so an overflow never passes.
    expect(row(base({ attacks: { ...ledger, overflows: 1 } }), "attacks").verdict).toBe("fail");
    expect(row(base({ attacks: { ...ledger, overflows: 1 } }), "attacks").value).toContain("cannot pass");
    expect(row(base({ live: { pressed: 144, sounded: 143 } }), "live").verdict).toBe("fail");
  });

  it("holds mute and solo to 150 ms from the tap, and only records unmute and tap-to-sound", () => {
    expect(row(base({ mute: [62, 80, 149.9, 70], unmute }), "mute").verdict).toBe("pass");
    expect(row(base({ mute: [62, 80, 150, 70], unmute }), "mute").verdict).toBe("fail");
    expect(row(base({ solo: [40, 155] }), "solo").verdict).toBe("fail");
    expect(row(base({ unmute: [400] }), "unmute").verdict).toBe("record");
    expect(row(base({ tapToSound: [35, 41] }), "tap").verdict).toBe("record");
    expect(row(base({ mute: [62, 80, 120, 70], unmute }), "mute").value)
      .toBe("p50 70 ms · p95 120 ms · max 120 ms over 4; 8 of 8 taps measured");
  });

  it("grades render cost against the quantum budget only with a sub-millisecond clock", () => {
    expect(row(base({ renderCost: cost(Array(1000).fill(.6)) }), "render-cost").verdict).toBe("pass");
    // One quantum past 2.67 ms at 48 kHz fails the maximum.
    expect(row(base({ renderCost: cost([...Array(999).fill(.6), 3.1]) }), "render-cost").verdict).toBe("fail");
    expect(row(base({ renderCost: cost([...Array(999).fill(0), 3], "date") }), "render-cost").verdict).toBe("record");
    // 2.66 ms is within the 2.667 ms budget, though its 0.1 ms bucket reaches past it: graded on the exact maximum.
    const close = row(base({ renderCost: cost([...Array(999).fill(.6), 2.66]) }), "render-cost");
    expect(close.verdict).toBe("pass");
    expect(close.value).toContain("1 of 1000 quanta over");
  });

  it("uses the browser's underrun counter where there is one, and the clock estimate otherwise", () => {
    const clockSlip = { samples: 1800, spanMs: 28800, slipMs: 1.2, gaps: 0, worstStepMs: 3, stateChanges: 0 };
    expect(row(base({ clockSlip, playbackStats: null }), "underruns").verdict).toBe("record");
    expect(row(base({ clockSlip, playbackStats: { api: "playbackStats", underrunEvents: 0, underrunMs: 0 } }), "underruns").verdict).toBe("pass");
    expect(row(base({ clockSlip, playbackStats: { api: "playbackStats", underrunEvents: 2, underrunMs: 6 } }), "underruns").verdict).toBe("fail");
    expect(row(base({ heardDropouts: true }), "ear").verdict).toBe("fail");
    expect(row(base({ heardDropouts: false }), "ear").verdict).toBe("pass");
  });

  it("passes a resume when the first pass sounds and no note is dropped a pause early", () => {
    const resume = { pausedMs: 5100, firstReadAgeMs: 4, freshAfterMs: 16, expected: 64, sounded: 64, lit: 64,
      late: 0, stale: 0, missing: 0, earliestLeadMs: 20, neededTap: false };
    expect(row(base({ resume }), "resume").verdict).toBe("pass");
    // A stale output timestamp: notes sound but are dropped as a pause old before they light.
    expect(row(base({ resume: { ...resume, lit: 50, stale: 14 } }), "resume").verdict).toBe("fail");
    expect(row(base({ resume: { ...resume, sounded: 63 } }), "resume").verdict).toBe("fail");
    expect(row(base({ resume: { ...resume, freshAfterMs: null } }), "resume").verdict).toBe("fail");
    // A busy main thread drops short notes it decodes after they ended: that is the soak's story, not the clock's.
    const busy = row(base({ resume: { ...resume, lit: 37, late: 27 } }), "resume");
    expect(busy.verdict).toBe("pass");
    expect(busy.value).toContain("27 dropped late (main thread behind)");
  });

  it("records how many of the soak's loop notes reached the Stage", () => {
    const stage = { sounded: 384, lit: 380, late: 4, stale: 0, missing: 0, earliestLeadMs: -40 };
    expect(row(base({ stage }), "stage")).toMatchObject({ verdict: "record",
      value: "380 of 384 lit; 4 dropped late (main thread behind); earliest lead -40 ms" });
  });

  it("takes Burooj's word on the route change, and says when it was skipped", () => {
    expect(row(base({ route: { works: true, observations: ["2.1 s sample rate 48000 → 44100 Hz"] } }), "route").verdict).toBe("pass");
    expect(row(base({ route: { works: false, observations: [] } }), "route").verdict).toBe("fail");
    expect(row(base({ route: { works: null, observations: [] } }), "route")).toMatchObject({ verdict: "not-run", value: "skipped" });
  });

  it("says plainly when the browser exposes no JS heap", () => {
    const none = { usedBytes: null, totalBytes: null, limitBytes: null };
    const bank = { installedPcmBytes: 138 * 1048576, sourcePcmBytes: 92 * 1048576, derivedPcmBytes: 46 * 1048576,
      budgetBytes: 192 * 1048576, preparationPcmBytes: 0 };
    const memory = row(base({ memory: { idle: none, loaded: none, peakDuringLoadBytes: null, afterLoop: none, bank } }), "memory");
    expect(memory.verdict).toBe("record");
    expect(memory.value).toContain("worklet banks 138.0 MiB");
    expect(memory.value).toContain("JS heap: not exposed by this browser");
  });
});

describe("phone gate summary", () => {
  it("is one plain text with the device, audio settings, a tally and a line per measurement", () => {
    const text = formatGateSummary(base({ attacks: ledger, mute: [70, 70, 70, 70], unmute, heardDropouts: false }));
    const lines = text.split("\n");
    expect(lines[0]).toBe("EmotiTone phone gate (BJS-494), 2026-10-26T12:00:00.000Z");
    expect(text).toContain("Device: iPhone · iOS 18.1 · Safari 18.1");
    expect(text).toContain("Audio: 48000 Hz · base latency 5.3 ms · output latency 12.0 ms");
    expect(text).toContain("Result: 4 pass · 0 fail · 1 recorded · 11 not run");
    expect(text).toContain("[PASS] Attacks lost: 0 lost of 384 over 12 bars");
    expect(text).toContain("[PASS] Mute (tap to silent): p50 70 ms");
    expect(lines.filter(line => /^\[(PASS|FAIL|RECORD|NOT RUN)\]/.test(line))).toHaveLength(gateRows(base()).length);
  });

  it("says when a run stopped early", () => {
    expect(formatGateSummary(base({ error: "The piano is not in the worklet: offline" })))
      .toContain("Stopped early: The piano is not in the worklet: offline");
  });
});
