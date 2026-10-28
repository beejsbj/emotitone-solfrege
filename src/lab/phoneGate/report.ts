/**
 * The phone gate's results (BJS-494): one verdict per measurement against the
 * spec's marks, and one plain-text summary Burooj can paste into the issue.
 *
 * Marks, from docs/retrospective-spec.md and docs/research/worklet-engine.md:
 * zero lost or doubled attacks (the desktop spike's bar); no skipped onsets;
 * the worklet's render cost within one quantum's budget at the measured rate;
 * mute and solo silent within 150 ms of the tap; the first pass after a
 * resume both sounds and lights (BJS-494, carried from #198). Memory, frame
 * pacing and tap-to-sound have no number in the spec: they are recorded.
 */
import type { RenderCostSummary } from "@/audio/live/renderCost";
import type { LatencyHint } from "@/services/audioRuntime";
import type { AttackLedgerResult, LightLedgerResult } from "./ledger";
import {
  formatBytes, summarizeLatencies, type ClockSlip, type DeviceDescription, type FramePacing, type JsMemory,
  type PlaybackStats,
} from "./metrics";

export const MUTE_MARK_MS = 150;
/** Dial taps the mute step asks for; each mutes or unmutes, and each must be measured. */
export const MUTE_TAPS = 8;
/** Solo holds the dial step asks for; each must be measured. */
export const SOLO_HOLDS = 3;

/** `partial`: measured until a Stop, with no failure in what was measured. */
export type Verdict = "pass" | "fail" | "record" | "partial" | "not-run";

/** Steps whose measurements can be cut short by a Stop, and the rows they feed. */
export type GateStep = "soak" | "resume";
const STEP_ROWS: Record<GateStep, readonly string[]> = {
  soak: ["attacks", "live", "pads", "skips", "render-cost", "underruns", "frames", "stage"],
  resume: ["resume"],
};

export interface GateRow {
  id: string;
  label: string;
  verdict: Verdict;
  value: string;
  mark: string;
}

export interface BankMemory {
  installedPcmBytes: number;
  sourcePcmBytes: number;
  derivedPcmBytes: number;
  budgetBytes: number;
  /** Preparation copies still held (decode cache, pyramids being built). */
  preparationPcmBytes: number;
}

export interface GateResults {
  startedAt: string;
  url: string;
  build: string | null;
  environment: DeviceDescription & {
    userAgent: string;
    sampleRate: number | null;
    baseLatencyMs: number | null;
    outputLatencyMs: number | null;
    devicePixelRatio: number | null;
    cores: number | null;
    deviceMemoryGb: number | null;
  };
  bpm: number;
  /**
   * The output buffer under test (BJS-590): the link's `?latencyHint=` text,
   * what it was read as (null: absent or unreadable), and what the context was
   * created with (null: the browser's default; undefined: not known).
   */
  latencyHint?: { link: string | null; asked: LatencyHint | null; created: LatencyHint | null | undefined };
  loadMs?: number;
  attacks?: AttackLedgerResult & { bars: number };
  /** The soak's automated chords: each note pressed, and each that sounded. */
  live?: { pressed: number; sounded: number };
  /** Burooj's pad taps (soak and tap steps), recorded apart from the chords (BJS-590). */
  pads?: { pressed: number; sounded: number };
  renderCost?: RenderCostSummary | null;
  clockSlip?: ClockSlip | null;
  playbackStats?: PlaybackStats | null;
  /** True when Burooj heard clicks or dropouts; null when not answered. */
  heardDropouts?: boolean | null;
  mute?: number[];
  unmute?: number[];
  /** Dial taps whose change was refused or cancelled: nothing measured. */
  muteRefused?: number;
  solo?: number[];
  soloRelease?: number[];
  /** Solo holds or releases whose change was refused or cancelled: nothing measured. */
  soloRefused?: number;
  memory?: {
    idle: JsMemory;
    loaded: JsMemory;
    peakDuringLoadBytes: number | null;
    afterLoop: JsMemory | null;
    bank: BankMemory | null;
  };
  frames?: FramePacing | null;
  /** Which of the soak's rendered loop notes reached the Stage. */
  stage?: LightLedgerResult | null;
  resume?: (LightLedgerResult & {
    pausedMs: number;
    /** Age of the first output timestamp read once running again (ms). */
    firstReadAgeMs: number | null;
    /** From running again to a timestamp newer than the resume (ms); null if none came. */
    freshAfterMs: number | null;
    /** Onsets the oracle expects in the two bars after the resume. */
    expected: number;
    /** The context had to be resumed by a tap. */
    neededTap: boolean;
  }) | null;
  tapToSound?: number[];
  route?: { works: boolean | null; observations: string[] } | null;
  /** Anything that stopped the run early. */
  error?: string | null;
  /** The step a Stop cut short; its rows hold what was measured until then. */
  stoppedDuring?: GateStep | null;
}

const ms = (value: number | null | undefined, digits = 1) => {
  if (value === null || value === undefined || !Number.isFinite(value)) return "n/a";
  const text = value.toFixed(digits);
  // A reading that rounds to zero is zero, not "-0.0".
  return `${Number(text) === 0 ? (0).toFixed(digits) : text} ms`;
};

function latencyRow(id: string, label: string, samples: number[] | undefined, graded: boolean, what: string): GateRow {
  const mark = graded ? `< ${MUTE_MARK_MS} ms ${what}` : `record (${what})`;
  if (!samples?.length) return { id, label, verdict: "not-run", value: "not measured", mark };
  const summary = summarizeLatencies(samples, MUTE_MARK_MS);
  const value = `p50 ${ms(summary.p50, 0)} · p95 ${ms(summary.p95, 0)} · max ${ms(summary.max, 0)} over ${summary.count}`;
  return { id, label, verdict: !graded ? "record" : summary.over ? "fail" : "pass", value, mark };
}

/**
 * Mute is graded on every tap of its step: each mutes or unmutes, and a tap
 * whose change was refused or cancelled measured nothing. Fewer than
 * MUTE_TAPS measured taps fails, however fast the measured ones were.
 */
function muteRow(results: GateResults): GateRow {
  const row = latencyRow("mute", "Mute (tap to silent)", results.mute, true, "tap to silent");
  const measured = (results.mute?.length ?? 0) + (results.unmute?.length ?? 0);
  return completeStep(row, measured, MUTE_TAPS, results.muteRefused ?? 0, "taps");
}

/** Solo likewise: PASS only once all SOLO_HOLDS holds were measured. */
function soloRow(results: GateResults): GateRow {
  const row = latencyRow("solo", "Solo (hold to others silent)", results.solo, true, "hold threshold to silent");
  return completeStep(row, results.solo?.length ?? 0, SOLO_HOLDS, results.soloRefused ?? 0, "holds");
}

/** A graded dial step fails when fewer than its requested touches were measured. */
function completeStep(row: GateRow, measured: number, requested: number, refused: number, unit: string): GateRow {
  if (!measured && !refused) return row;
  const count = `${measured} of ${requested} ${unit} measured${refused ? `, ${refused} refused or cancelled` : ""}`;
  return { ...row, verdict: measured < requested ? "fail" : row.verdict,
    value: row.verdict === "not-run" ? `none measured; ${count}` : `${row.value}; ${count}`,
    mark: `${row.mark}, all ${requested} ${unit} measured` };
}

export function gateRows(results: GateResults): GateRow[] {
  const rows: GateRow[] = [];
  const attacks = results.attacks;
  rows.push(attacks
    // An overflowed event pool dropped records: a clean count proves nothing, so it cannot pass.
    ? { id: "attacks", label: "Attacks lost",
      verdict: attacks.lost || attacks.doubled || attacks.extra || attacks.overflows ? "fail" : "pass",
      value: `${attacks.lost} lost of ${attacks.expected} over ${Number(attacks.bars.toFixed(1))} bars (doubled ${attacks.doubled}, extra ${attacks.extra}, cut short ${attacks.cutShort}`
        + `${attacks.stolenAtOnset ? `, ${attacks.stolenAtOnset} of them stolen at onset and counted lost` : ""})`
        + (attacks.overflows ? `; event pool overflowed ${attacks.overflows}×: records were dropped, so the count is unreliable and cannot pass` : ""),
      mark: "0 lost, 0 doubled" }
    : { id: "attacks", label: "Attacks lost", verdict: "not-run", value: "not measured", mark: "0 lost, 0 doubled" });
  const live = results.live;
  rows.push(live
    ? { id: "live", label: "Live notes on top", verdict: live.sounded < live.pressed ? "fail" : "pass",
      value: `${live.sounded} of ${live.pressed} chord notes sounded`, mark: "every press sounds" }
    : { id: "live", label: "Live notes on top", verdict: "not-run", value: "not measured", mark: "every press sounds" });
  // Recorded, not graded: the taps are a hand's, not a controlled count. Since BJS-597 a tap
  // let go before its note starts still plays it, so a tap that did not sound is news.
  const pads = results.pads;
  const padMark = "record (every tap should sound; one let go before its note starts still plays it, briefly)";
  rows.push(pads
    ? { id: "pads", label: "Pad taps", verdict: "record", value: `${pads.sounded} of ${pads.pressed} sounded`, mark: padMark }
    : { id: "pads", label: "Pad taps", verdict: "not-run", value: "no taps", mark: padMark });
  rows.push(attacks
    ? { id: "skips", label: "Scheduler skips", verdict: attacks.cancelled || attacks.overflows ? "fail" : "pass",
      value: `${attacks.cancelled} onsets refused at render, ${attacks.overflows} event overflows`, mark: "0" }
    : { id: "skips", label: "Scheduler skips", verdict: "not-run", value: "not measured", mark: "0" });
  const cost = results.renderCost;
  if (cost && cost.quanta) {
    const value = `p50 ${ms(cost.p50Ms, 2)} · p99 ${ms(cost.p99Ms, 2)} · max ${ms(cost.maxMs, 2)}; budget ${ms(cost.budgetMs, 2)}; `
      + `${cost.overBudget} of ${cost.quanta} quanta over; load ${(cost.load * 100).toFixed(0)}% (${cost.clock} clock)`;
    // A whole-millisecond clock cannot place a 2.7 ms budget: record, don't grade.
    const verdict: Verdict = cost.clock !== "performance" ? "record"
      // Graded on the exact maximum: the bucketed over-budget count can include a quantum just under the budget.
      : cost.p99Ms > cost.budgetMs || cost.maxMs > cost.budgetMs ? "fail" : "pass";
    rows.push({ id: "render-cost", label: "Worklet render cost per quantum", verdict, value,
      mark: cost.clock === "performance" ? "p99 and max within budget" : "record (Date clock, 1 ms steps)" });
  } else {
    rows.push({ id: "render-cost", label: "Worklet render cost per quantum", verdict: "not-run", value: "not measured",
      mark: "p99 and max within budget" });
  }
  const stats = results.playbackStats;
  const slip = results.clockSlip;
  const underrunParts: string[] = [];
  if (slip && slip.samples > 1) {
    underrunParts.push(`clock slip ${ms(slip.slipMs)} over ${(slip.spanMs / 1000).toFixed(1)} s, ${slip.gaps} gaps over 10 ms (worst step ${ms(slip.worstStepMs)})`
      + (slip.stateChanges ? `, baseline reset after ${slip.stateChanges} audio state change${slip.stateChanges === 1 ? "" : "s"}` : ""));
  } else underrunParts.push("output clock not readable");
  underrunParts.push(stats
    ? `${stats.api}: ${stats.underrunEvents ?? "n/a"} underruns, ${ms(stats.underrunMs)}`
    : "browser underrun counter: not exposed");
  rows.push({ id: "underruns", label: "Underruns (whole graph)", verdict: stats && stats.underrunEvents !== null
    ? stats.underrunEvents > 0 ? "fail" : "pass"
    : slip && slip.samples > 1 ? "record" : "not-run",
  value: underrunParts.join("; "), mark: stats ? "0 underruns" : "record (estimate; ear decides)" });
  rows.push({ id: "ear", label: "Dropouts by ear", verdict: results.heardDropouts === undefined || results.heardDropouts === null
    ? "not-run" : results.heardDropouts ? "fail" : "pass",
  value: results.heardDropouts === undefined || results.heardDropouts === null ? "not answered"
    : results.heardDropouts ? "clicks or gaps heard" : "none heard", mark: "none heard" });
  rows.push(muteRow(results));
  rows.push(soloRow(results));
  rows.push(latencyRow("unmute", "Unmute (tap to applied)", results.unmute, false, "tap to change at the speaker"));
  rows.push(latencyRow("solo-release", "Solo release (lift to applied)", results.soloRelease, false, "lift to change at the speaker"));
  const memory = results.memory;
  if (memory) {
    const heap = (reading: JsMemory | null) => reading?.usedBytes === null || reading?.usedBytes === undefined ? "n/a" : formatBytes(reading.usedBytes);
    const bank = memory.bank;
    const heapExposed = memory.loaded.usedBytes !== null;
    rows.push({ id: "memory", label: "Memory with the piano", verdict: "record",
      value: (bank ? `worklet banks ${formatBytes(bank.installedPcmBytes)} (source ${formatBytes(bank.sourcePcmBytes)}, derived ${formatBytes(bank.derivedPcmBytes)}; budget ${formatBytes(bank.budgetBytes)}), preparation copies ${formatBytes(bank.preparationPcmBytes)}`
        : "worklet banks n/a")
        + (heapExposed
          ? `; JS heap idle ${heap(memory.idle)}, loaded ${heap(memory.loaded)}, peak while loading ${formatBytes(memory.peakDuringLoadBytes)}, after loop ${heap(memory.afterLoop)} (limit ${formatBytes(memory.loaded.limitBytes)})`
          : "; JS heap: not exposed by this browser"),
      mark: "record (the tab survived)" });
  } else rows.push({ id: "memory", label: "Memory with the piano", verdict: "not-run", value: "not measured", mark: "record" });
  const frames = results.frames;
  rows.push(frames && frames.frames
    ? { id: "frames", label: "Stage frame pacing (loop playing)", verdict: "record",
      value: `p50 ${ms(frames.p50Ms)} · p95 ${ms(frames.p95Ms)} · p99 ${ms(frames.p99Ms)} · max ${ms(frames.maxMs)}; ${frames.dropped} dropped (${(frames.droppedShare * 100).toFixed(1)}%) at ~${frames.refreshHz.toFixed(0)} Hz; ${frames.longFrames} frames ≥ 50 ms`,
      mark: "record (S144)" }
    : { id: "frames", label: "Stage frame pacing (loop playing)", verdict: "not-run", value: "not measured", mark: "record (S144)" });
  const stage = results.stage;
  const stageMark = "record (the sound stays right; the picture may lag)";
  rows.push(stage && stage.sounded
    ? { id: "stage", label: "Loop notes lit on the Stage", verdict: "record",
      value: `${stage.lit} of ${stage.sounded} lit; ${stage.late} dropped late (main thread behind)`
        + `${stage.missing ? `, ${stage.missing} unexplained` : ""}; earliest lead ${ms(stage.earliestLeadMs, 0)}`,
      mark: stageMark }
    : { id: "stage", label: "Loop notes lit on the Stage", verdict: "not-run", value: "not measured", mark: stageMark });
  const resume = results.resume;
  const resumeMark = "first pass after resume sounds; no note lit or dropped a pause early";
  rows.push(resume
    ? { id: "resume", label: "Output timestamp after resume",
      verdict: resume.sounded === resume.expected && resume.stale === 0 && resume.missing === 0 && resume.freshAfterMs !== null
        ? "pass" : "fail",
      value: `paused ${(resume.pausedMs / 1000).toFixed(1)} s${resume.neededTap ? " (resumed by tap)" : ""}; first read ${ms(resume.firstReadAgeMs, 0)} old, fresh after ${ms(resume.freshAfterMs, 0)}; `
        + `first two bars: ${resume.sounded}/${resume.expected} sounded, ${resume.lit}/${resume.sounded} lit, ${resume.stale} dropped as stale, `
        + `${resume.late} dropped late (main thread behind)${resume.missing ? `, ${resume.missing} unexplained` : ""}; earliest lead ${ms(resume.earliestLeadMs, 0)}`,
      mark: resumeMark }
    : { id: "resume", label: "Output timestamp after resume", verdict: "not-run", value: "not measured", mark: resumeMark });
  rows.push(latencyRow("tap", "Tap to sound", results.tapToSound, false, "touch to the speaker, browser clock"));
  const route = results.route;
  rows.push(route && route.works !== null
    ? { id: "route", label: "Route change (headphones/Bluetooth)", verdict: route.works ? "pass" : "fail",
      value: `${route.works ? "kept playing" : "did not recover"}${route.observations.length ? `; ${route.observations.join("; ")}` : "; nothing observed"}`,
      mark: "loop keeps playing (Burooj's ear)" }
    : { id: "route", label: "Route change (headphones/Bluetooth)", verdict: "not-run",
      value: route?.observations.length ? `skipped; ${route.observations.join("; ")}` : "skipped", mark: "loop keeps playing (Burooj's ear)" });
  const cut = results.stoppedDuring;
  if (!cut) return rows;
  // A failure already measured stands; anything else is partial, not a pass.
  return rows.map(row => !STEP_ROWS[cut].includes(row.id) || row.verdict === "fail" || row.verdict === "not-run" ? row
    : { ...row, verdict: "partial", value: `${row.value}; partial: stopped during the ${cut}` });
}

/** One latencyHint as the summary writes it. */
export function formatLatencyHint(hint: LatencyHint | null | undefined): string {
  if (hint === undefined) return "not recorded";
  if (hint === null) return "browser default (interactive)";
  return typeof hint === "number" ? `${hint} s` : hint;
}

/** The buffer the context was created with, and whether the link's ask was applied. */
export function describeLatencyHint(hint: GateResults["latencyHint"]): string {
  if (!hint) return "not recorded";
  const created = formatLatencyHint(hint.created);
  if (hint.link === null) return created;
  if (hint.asked === null) return `${created}; ?latencyHint=${hint.link} not understood (interactive, balanced, playback or seconds)`;
  return hint.created === hint.asked ? created : `${created}; asked for ${formatLatencyHint(hint.asked)}, not applied`;
}

const VERDICT_TEXT: Record<Verdict, string> = { pass: "PASS", fail: "FAIL", record: "RECORD", partial: "PARTIAL",
  "not-run": "NOT RUN" };

/** One plain-text summary: environment, the tally, then a line per measurement. */
export function formatGateSummary(results: GateResults): string {
  const rows = gateRows(results);
  const tally = (verdict: Verdict) => rows.filter(row => row.verdict === verdict).length;
  const env = results.environment;
  const lines = [
    `EmotiTone phone gate (BJS-494), ${results.startedAt}`,
    `Device: ${env.device} · ${env.os} · ${env.browser}`,
    `Audio: ${env.sampleRate ?? "n/a"} Hz · latencyHint ${describeLatencyHint(results.latencyHint)} · base latency ${ms(env.baseLatencyMs)} · output latency ${ms(env.outputLatencyMs)}`,
    `Screen: DPR ${env.devicePixelRatio ?? "n/a"} · cores ${env.cores ?? "n/a"} · device memory ${env.deviceMemoryGb === null ? "not exposed" : `${env.deviceMemoryGb} GB`}`,
    `Loop: 4 piano members at ${results.bpm} BPM${results.loadMs === undefined ? "" : ` · piano loaded in ${(results.loadMs / 1000).toFixed(1)} s`}`,
    `Page: ${results.url}${results.build ? ` · build ${results.build}` : ""}`,
    `UA: ${env.userAgent}`,
    "",
    `Result: ${tally("pass")} pass · ${tally("fail")} fail · ${tally("record")} recorded`
      + `${tally("partial") ? ` · ${tally("partial")} partial` : ""} · ${tally("not-run")} not run`,
    ...(results.error ? [`Stopped early: ${results.error}`] : []),
    "",
    ...rows.map(row => `[${VERDICT_TEXT[row.verdict]}] ${row.label}: ${row.value} (mark: ${row.mark})`),
  ];
  return lines.join("\n");
}
