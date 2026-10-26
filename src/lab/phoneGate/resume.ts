/**
 * The resume step of the phone gate (BJS-494, carried from #198): suspend the
 * app's context mid-loop, resume it, and judge the first two bars that follow.
 *
 * A stale `getOutputTimestamp()` after a resume places the first notes decoded
 * a whole pause in the past, so the pattern player drops them before they
 * light. Those notes are the earliest ones after the resume, so the window
 * starts at the bar the context resumed on, past only the onsets the transport
 * announced before the pause (its lookahead). The clock is watched while that
 * window plays, never before it.
 *
 * The browser, the loop and the ledgers come in through `ResumeIO`, so the
 * whole sequence runs on a simulated clock in the tests.
 */
import { TRANSPORT_LOOKAHEAD_SECONDS } from "@/audio/live/transport";
import type { LightLedgerResult } from "./ledger";
import type { GateResults } from "./report";

/** Bars judged after a resume. */
export const RESUME_BARS = 2;
/** How long the output clock is watched for a fresh reading after a resume (ms). */
export const RESUME_WATCH_MS = 1500;

export type ResumeResult = NonNullable<GateResults["resume"]>;

/**
 * The bars a resume is judged on: from the bar the context resumed on, past
 * the onsets the transport had already announced before the pause.
 */
export function resumeWindow(barAtRunning: number, bpm: number, lookaheadSeconds = TRANSPORT_LOOKAHEAD_SECONDS) {
  // Four beats a bar: the gate's loop is in 4/4.
  const fromBar = barAtRunning + lookaheadSeconds * bpm / 240;
  return { fromBar, toBar: fromBar + RESUME_BARS };
}

export interface ResumeIO {
  bpm: number;
  pauseMs: number;
  /** Wall clock, ms (performance.now in the browser). */
  now(): number;
  sleep(ms: number): Promise<void>;
  nextFrame(): Promise<void>;
  /** Audio time, seconds. */
  currentTime(): number;
  outputTimestamp(): { contextTime?: number; performanceTime?: number } | undefined;
  suspend(): Promise<void>;
  /** Resume the context, asking for a tap if the browser wants one; true when a tap was needed. */
  resume(): Promise<boolean>;
  /** The loop's rendered bar at an audio time; null while it cannot say. */
  barAt(audioTime: number): number | null | undefined;
  untilBar(bar: number): Promise<void>;
  /** The resume's records, judged on a window chosen once the window is known. */
  judge(fromBar: number, toBar: number, staleMs: number): { light: LightLedgerResult; expected: number; sounded: number };
  check?(): void;
  onProgress?(fraction: number): void;
  onStatus?(status: string): void;
}

export async function measureResume(io: ResumeIO): Promise<ResumeResult> {
  const before = io.outputTimestamp();
  // Audio time stands still while suspended: this is the bar it resumes on too.
  const barBefore = io.barAt(io.currentTime());
  const suspendedAt = io.now();
  await io.suspend();
  const deadline = suspendedAt + io.pauseMs;
  while (io.now() < deadline) {
    io.check?.();
    io.onProgress?.((io.now() - suspendedAt) / io.pauseMs);
    await io.sleep(100);
  }
  const neededTap = await io.resume();
  io.check?.();
  const runningAt = io.now();
  const barAtRunning = io.barAt(io.currentTime()) ?? barBefore;
  if (typeof barAtRunning !== "number" || !Number.isFinite(barAtRunning)) throw new Error("The loop was not playing at the resume");
  const { fromBar, toBar } = resumeWindow(barAtRunning, io.bpm);
  const pausedMs = runningAt - suspendedAt;
  io.onStatus?.("Listening to the first two bars after the resume…");
  // Watch the output clock while the window plays: how stale is it, and when is it fresh?
  let firstReadAgeMs: number | null = null;
  let freshAfterMs: number | null = null;
  const beforeContext = before?.contextTime ?? io.currentTime();
  const watchUntil = runningAt + RESUME_WATCH_MS;
  while (io.now() < watchUntil) {
    await io.nextFrame();
    const stamp = io.outputTimestamp();
    const now = io.now();
    if (!stamp || !Number.isFinite(stamp.performanceTime) || !Number.isFinite(stamp.contextTime)) continue;
    if (firstReadAgeMs === null) firstReadAgeMs = now - stamp.performanceTime!;
    if (freshAfterMs === null && stamp.performanceTime! >= runningAt && stamp.contextTime! > beforeContext) {
      freshAfterMs = now - runningAt;
    }
  }
  await io.untilBar(toBar + .05);
  // Let the last quantum's records cross the port.
  await io.sleep(200);
  io.check?.();
  // A note the stale clock placed a pause early ended at least half a pause ago.
  const { light, expected, sounded } = io.judge(fromBar, toBar, pausedMs / 2);
  return { ...light, pausedMs, firstReadAgeMs, freshAfterMs, expected, sounded, neededTap };
}
