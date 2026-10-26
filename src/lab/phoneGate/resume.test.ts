import { describe, expect, it } from "vitest";
import { TRANSPORT_LOOKAHEAD_SECONDS } from "@/audio/live/transport";
import { TransportEventKind } from "@/audio/live/transportEvents";
import { GATE_RENDER_RATE as RATE, playGateLoop } from "@/__tests__/helpers/phoneGateLoop";
import { GATE_BPM } from "./fixtures";
import { createAttackLedger, createLightLedger } from "./ledger";
import { expectedOnsets } from "./oracle";
import { gateRows, type GateResults } from "./report";
import { measureResume, resumeWindow, type ResumeIO, type ResumeResult } from "./resume";

const BAR_SECONDS = 240 / GATE_BPM;
const PAUSE_MS = 5000;
const SUSPENDED_AT = 10_000;

/**
 * The resume step on a simulated clock, with the real core's records of the
 * gate loop. The browser's output clock may stay stale for `staleForMs` after
 * the resume (the #198 bug): it keeps returning the last reading from before
 * the pause. Each record is decoded a lookahead before its onset, and lit
 * unless its end already looks past on that clock, as the pattern player does.
 */
async function simulateResume(resumeBar: number, staleForMs: number, stopAtBar = Infinity) {
  const { records, memberOf, tables } = playGateLoop(resumeBar + 3);
  const pausedAt = resumeBar * BAR_SECONDS;
  let wall = SUSPENDED_AT;
  let runningAt = Number.NaN;
  const audioTime = () => Number.isFinite(runningAt) ? pausedAt + (wall - runningAt) / 1000 : pausedAt;
  /** The output timestamp the browser gives at wall time `at`. */
  const stampAt = (at: number) => {
    if (at <= SUSPENDED_AT) return { contextTime: pausedAt - (SUSPENDED_AT - at) / 1000, performanceTime: at };
    if (!Number.isFinite(runningAt) || at < runningAt + staleForMs) return { contextTime: pausedAt, performanceTime: SUSPENDED_AT };
    return { contextTime: pausedAt + (at - runningAt) / 1000, performanceTime: at };
  };
  /** Wall time at which the render reached an audio time. */
  const wallAt = (time: number) => time <= pausedAt ? SUSPENDED_AT - (pausedAt - time) * 1000 : runningAt + (time - pausedAt) * 1000;

  const judge: ResumeIO["judge"] = (fromBar, toBar, staleMs) => {
    const light = createLightLedger({ memberOf, fromBar, toBar, staleMs });
    for (const event of records) {
      if (event.kind === TransportEventKind.Cancel) light.record(event, 0);
      if (event.kind !== TransportEventKind.Attack && event.kind !== TransportEventKind.Active) continue;
      const decodedAt = wallAt(event.frame / RATE - TRANSPORT_LOOKAHEAD_SECONDS);
      const stamp = stampAt(decodedAt);
      const toOutput = (time: number) => stamp.performanceTime + (time - stamp.contextTime) * 1000;
      const endLead = toOutput((event.frame + event.length) / RATE) - decodedAt;
      light.record(event, endLead);
      // "History, not news": a note whose end has passed is not sent to the Stage.
      if (endLead > 0) light.lit(event.serial, toOutput(event.frame / RATE) - decodedAt);
    }
    const attacks = createAttackLedger({ expected: expectedOnsets(tables, fromBar, toBar), memberOf, fromBar, toBar,
      sampleRate: RATE });
    records.forEach(attacks.record);
    const sounded = attacks.result();
    return { light: light.result(), expected: sounded.expected, sounded: sounded.rendered };
  };

  let snapshot: (() => ResumeResult | null) | undefined;
  let stopped: ResumeResult | null | undefined;
  const run = measureResume({
    bpm: GATE_BPM,
    pauseMs: PAUSE_MS,
    now: () => wall,
    sleep: async ms => { wall += ms; },
    nextFrame: async () => { wall += 16; },
    currentTime: audioTime,
    outputTimestamp: () => stampAt(wall),
    suspend: async () => {},
    resume: async () => { runningAt = wall; return false; },
    barAt: time => time / BAR_SECONDS,
    untilBar: async bar => {
      while (audioTime() / BAR_SECONDS < bar) {
        wall += 16;
        // Stop is tapped: the summary reads the step's snapshot before anything else runs.
        if (audioTime() / BAR_SECONDS >= stopAtBar) { stopped = snapshot!(); throw new Error("Stopped"); }
      }
    },
    judge,
    expose: read => { snapshot = read; },
  });
  const resume = stopAtBar === Infinity ? await run : await run.then(() => { throw new Error("not stopped"); }, () => stopped!);
  const results: GateResults = { startedAt: "", url: "", build: null, bpm: GATE_BPM, resume,
    stoppedDuring: stopAtBar === Infinity ? null : "resume",
    environment: { device: "", os: "", browser: "", userAgent: "", sampleRate: RATE, baseLatencyMs: null,
      outputLatencyMs: null, devicePixelRatio: null, cores: null, deviceMemoryGb: null } };
  return { resume, row: gateRows(results).find(entry => entry.id === "resume")! };
}

describe("phone gate resume check (carried from #198)", () => {
  it("judges from the bar the context resumed on, past only the transport lookahead", () => {
    const { fromBar, toBar } = resumeWindow(2.3, GATE_BPM);
    expect(fromBar - 2.3).toBeCloseTo(TRANSPORT_LOOKAHEAD_SECONDS * GATE_BPM / 240);
    expect(toBar - fromBar).toBeCloseTo(2);
  });

  it("passes a resume whose output clock is fresh at once", async () => {
    const { resume, row } = await simulateResume(2.3, 0);
    expect(resume.expected).toBeGreaterThan(50);
    expect(resume).toMatchObject({ sounded: resume.expected, lit: resume.expected, stale: 0, missing: 0 });
    expect(resume.freshAfterMs).not.toBeNull();
    expect(row.verdict).toBe("pass");
  });

  it("fails when a stale output clock drops the first notes after the resume", async () => {
    // Stale for 400 ms: only the notes in the first fifth of a bar are hurt,
    // well inside the time the output clock is watched.
    const { resume, row } = await simulateResume(2.3, 400);
    expect(resume.stale).toBeGreaterThan(0);
    expect(resume.lit).toBe(resume.sounded - resume.stale - resume.late);
    expect(row.verdict).toBe("fail");
    expect(row.value).toContain(`${resume.stale} dropped as stale`);
  });

  it("keeps what a Stop mid-window already measured: PARTIAL when clean, FAIL when the clock was stale", async () => {
    // Stopped half a bar into the two-bar window.
    const clean = await simulateResume(2.3, 0, 2.85);
    expect(clean.resume.expected).toBeGreaterThan(10);
    expect(clean.resume.expected).toBeLessThan(40);
    expect(clean.resume).toMatchObject({ sounded: clean.resume.expected, stale: 0 });
    expect(clean.row.verdict).toBe("partial");
    expect(clean.row.value).toContain("partial: stopped during the resume");
    const stale = await simulateResume(2.3, 400, 2.85);
    expect(stale.resume.stale).toBeGreaterThan(0);
    expect(stale.row.verdict).toBe("fail");
  });
});
