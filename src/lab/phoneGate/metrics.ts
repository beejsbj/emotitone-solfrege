/**
 * The phone gate's calculations (BJS-494), pure so they can be checked with
 * injected timings. The device run supplies the real ones.
 */

/** Nearest-rank percentile of `values` (0 for none). */
export function percentile(values: readonly number[], fraction: number): number {
  const finite = values.filter(Number.isFinite).sort((a, b) => a - b);
  if (!finite.length) return 0;
  const rank = Math.min(finite.length, Math.max(1, Math.ceil(fraction * finite.length)));
  return finite[rank - 1];
}

export interface LatencySummary {
  count: number;
  p50: number;
  p95: number;
  max: number;
  mean: number;
  /** Samples at or over the mark, when one was given. */
  over: number;
}

export function summarizeLatencies(values: readonly number[], markMs = Infinity): LatencySummary {
  const finite = values.filter(Number.isFinite);
  return {
    count: finite.length,
    p50: percentile(finite, .5),
    p95: percentile(finite, .95),
    max: finite.length ? Math.max(...finite) : 0,
    mean: finite.length ? finite.reduce((sum, value) => sum + value, 0) / finite.length : 0,
    over: finite.filter(value => value >= markMs).length,
  };
}

export interface FramePacing {
  frames: number;
  /** Estimated display refresh, from the fastest typical frames. */
  refreshHz: number;
  p50Ms: number;
  p95Ms: number;
  p99Ms: number;
  maxMs: number;
  /** Refreshes that passed without a new frame. */
  dropped: number;
  /** Dropped refreshes as a share of all refreshes in the span. */
  droppedShare: number;
  /** Frames that took 50 ms or more. */
  longFrames: number;
}

/**
 * Frame pacing from requestAnimationFrame timestamps (ms). The refresh
 * interval is the 10th-percentile interval, so a run with many drops still
 * finds the display's own rate; an interval of n refreshes dropped n − 1.
 */
export function summarizeFrames(timestamps: readonly number[]): FramePacing {
  const intervals: number[] = [];
  for (let index = 1; index < timestamps.length; index++) {
    const interval = timestamps[index] - timestamps[index - 1];
    if (Number.isFinite(interval) && interval > 0) intervals.push(interval);
  }
  const refresh = percentile(intervals, .1);
  let dropped = 0;
  for (const interval of intervals) dropped += Math.max(0, Math.round(interval / refresh) - 1);
  const refreshes = intervals.length + dropped;
  return {
    frames: intervals.length,
    refreshHz: refresh ? 1000 / refresh : 0,
    p50Ms: percentile(intervals, .5),
    p95Ms: percentile(intervals, .95),
    p99Ms: percentile(intervals, .99),
    maxMs: intervals.length ? Math.max(...intervals) : 0,
    dropped,
    droppedShare: refreshes ? dropped / refreshes : 0,
    longFrames: intervals.filter(interval => interval >= 50).length,
  };
}

export interface ClockSlip {
  samples: number;
  /** Wall time covered, ms. */
  spanMs: number;
  /** Wall time minus audio time over the span: audio the output never played. */
  slipMs: number;
  /** Steps where the audio clock fell behind by more than the gap threshold. */
  gaps: number;
  worstStepMs: number;
  /** Times the context changed state (an OS interruption, a suspend): each starts a fresh baseline. */
  stateChanges: number;
}

/**
 * The whole graph's deadline, estimated from the output clock: while the
 * device plays, audio time and wall time advance together; an underrun plays
 * silence the graph never rendered, so wall time runs ahead. Feed it each
 * fresh `getOutputTimestamp()` (contextTime in seconds, performanceTime in
 * ms). An estimate: browsers smooth these clocks, so the ear check decides.
 *
 * A context that stops running (an OS interruption: a call, Siri, another
 * app taking the audio session) also lets wall time run ahead, but that is
 * not an underrun. Given the context, the meter listens for its
 * `statechange`: the span so far is kept, and a fresh baseline starts with
 * the first reading taken after the change, so the interruption itself is
 * never booked.
 */
export function createClockSlipMeter(options: {
  gapMs?: number;
  context?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
  /** Wall clock, ms: readings older than a state change belong to the time before it. */
  now?: () => number;
} = {}) {
  const gapMs = options.gapMs ?? 10;
  const now = options.now ?? (() => performance.now());
  type Reading = { context: number; performance: number };
  let first: Reading | undefined;
  let previous: Reading | undefined;
  let samples = 0;
  let gaps = 0;
  let worstStepMs = 0;
  let stateChanges = 0;
  /** Span and slip of the segments before the last state change. */
  let closedSpanMs = 0;
  let closedSlipMs = 0;
  let notBefore = -Infinity;
  const segment = () => first && previous
    ? { spanMs: previous.performance - first.performance,
      slipMs: (previous.performance - first.performance) - (previous.context - first.context) * 1000 }
    : { spanMs: 0, slipMs: 0 };
  const onStateChange = () => {
    const closed = segment();
    closedSpanMs += closed.spanMs;
    closedSlipMs += closed.slipMs;
    first = previous = undefined;
    notBefore = now();
    stateChanges++;
  };
  options.context?.addEventListener("statechange", onStateChange);
  return {
    sample(contextTime: number | undefined, performanceTime: number | undefined) {
      if (!Number.isFinite(contextTime) || !Number.isFinite(performanceTime) || !(performanceTime! > 0)) return;
      // A reading from before the state change is the old clock, held over.
      if (performanceTime! < notBefore) return;
      if (previous && contextTime === previous.context && performanceTime === previous.performance) return;
      const reading = { context: contextTime!, performance: performanceTime! };
      if (previous) {
        const step = (reading.performance - previous.performance) - (reading.context - previous.context) * 1000;
        if (step > gapMs) gaps++;
        worstStepMs = Math.max(worstStepMs, step);
      }
      first ??= reading;
      previous = reading;
      samples++;
    },
    result(): ClockSlip {
      const open = segment();
      return { samples, spanMs: closedSpanMs + open.spanMs, slipMs: closedSlipMs + open.slipMs, gaps, worstStepMs,
        stateChanges };
    },
    dispose() { options.context?.removeEventListener("statechange", onStateChange); },
  };
}

export interface MuteTally {
  /** Tap to silent at the speaker (the change applied, then its fade), ms. */
  mute: number[];
  /** Tap to the change at the speaker, ms. */
  unmute: number[];
  /** Taps whose change was refused, cancelled or never answered: nothing measured. */
  refused: number;
}

export interface DialReceipt {
  appliedFrame: number;
  cancelled?: boolean;
  refused?: boolean;
}

/**
 * One mute-dial tap, added to the tally. A change is heard at its applied
 * frame on the output clock; a mute is silent once its fade ends. A tap whose
 * change was refused or cancelled (or that has no usable clock) measured
 * nothing: it is counted, never dropped, so a step cannot pass on its good
 * taps alone.
 */
export function tallyMuteTap(tally: MuteTally, tap: { muted: boolean; tapAtMs: number },
  receipt: DialReceipt | undefined, speaker: DialSpeaker): MuteTally {
  const latency = dialChangeLatency(tap.tapAtMs, receipt, speaker, tap.muted);
  if (latency === null) return { ...tally, refused: tally.refused + 1 };
  return tap.muted ? { ...tally, mute: [...tally.mute, latency] } : { ...tally, unmute: [...tally.unmute, latency] };
}

export interface SoloTally {
  /** Hold threshold to the other members silent at the speaker, ms. */
  solo: number[];
  /** Lift to the others back at the speaker, ms. */
  release: number[];
  /** Holds or lifts whose change was refused, cancelled or never answered. */
  refused: number;
}

/** One solo hold (or its release), added to the tally; refused changes are counted, as for mute. */
export function tallySoloHold(tally: SoloTally, hold: { held: boolean; atMs: number },
  receipt: DialReceipt | undefined, speaker: DialSpeaker): SoloTally {
  const latency = dialChangeLatency(hold.atMs, receipt, speaker, hold.held);
  if (latency === null) return { ...tally, refused: tally.refused + 1 };
  return hold.held ? { ...tally, solo: [...tally.solo, latency] } : { ...tally, release: [...tally.release, latency] };
}

export interface DialSpeaker {
  sampleRate: number;
  /** The fade a silencing change takes once applied, ms. */
  fadeMs: number;
  /** An audio time (s) on the output clock (performance ms). */
  outputTimeMs(audioTime: number): number;
}

/**
 * The shortest touch-to-speaker time a real change can take (ms). Anything
 * less, a negative time above all, is a clock that placed the change before
 * the touch (a stale output timestamp), not a fast dial.
 */
export const MIN_DIAL_LATENCY_MS = 2;

/** From the touch to the change at the speaker (plus the fade when it silences); null when nothing usable applied. */
function dialChangeLatency(atMs: number, receipt: DialReceipt | undefined, speaker: DialSpeaker, silences: boolean):
  number | null {
  const atSpeaker = receipt && !receipt.cancelled && !receipt.refused && speaker.sampleRate > 0
    ? speaker.outputTimeMs(receipt.appliedFrame / speaker.sampleRate) : Number.NaN;
  if (!Number.isFinite(atSpeaker) || !Number.isFinite(atMs)) return null;
  // Judged before the fade: the change itself cannot land before the touch.
  if (atSpeaker - atMs < MIN_DIAL_LATENCY_MS) return null;
  return atSpeaker + (silences ? speaker.fadeMs : 0) - atMs;
}

/** An output timestamp older than this (ms) is held over (an OS interruption, a resume), not read. */
export const OUTPUT_STAMP_MAX_AGE_MS = 500;

/**
 * An audio time on the output clock (performance ms), from a fresh output
 * timestamp only: NaN when there is none or it is stale, so a dial change it
 * would misplace is counted as refused, never measured.
 */
export function freshOutputTimeMs(
  context: { getOutputTimestamp?(): { contextTime?: number; performanceTime?: number } },
  audioTime: number,
  nowMs: number,
  maxAgeMs = OUTPUT_STAMP_MAX_AGE_MS,
): number {
  const stamp = context.getOutputTimestamp?.();
  const contextTime = stamp?.contextTime;
  const performanceTime = stamp?.performanceTime;
  if (!Number.isFinite(contextTime) || !Number.isFinite(performanceTime) || !(performanceTime! > 0)) return Number.NaN;
  if (nowMs - performanceTime! > maxAgeMs) return Number.NaN;
  return performanceTime! + (audioTime - contextTime!) * 1000;
}

export interface PlaybackStats {
  /** Which browser API answered. */
  api: "playbackStats" | "playoutStats";
  underrunEvents: number | null;
  underrunMs: number | null;
}

const count = (value: unknown) => typeof value === "number" && Number.isFinite(value) ? value : null;

/**
 * The browser's own underrun counter, where one is exposed: the Web Audio
 * `playbackStats` (durations in seconds), or Chrome's earlier `playoutStats`
 * (fallback frames, durations in ms). Null where neither exists (iOS Safari).
 */
export function readPlaybackStats(context: object): PlaybackStats | null {
  const source = context as { playbackStats?: Record<string, unknown>; playoutStats?: Record<string, unknown> };
  const playback = source.playbackStats;
  if (playback && typeof playback === "object") {
    const seconds = count(playback.underrunDuration);
    return { api: "playbackStats", underrunEvents: count(playback.underrunEvents), underrunMs: seconds === null ? null : seconds * 1000 };
  }
  const playout = source.playoutStats;
  if (playout && typeof playout === "object") {
    return { api: "playoutStats", underrunEvents: count(playout.fallbackFramesEvents), underrunMs: count(playout.fallbackFramesDuration) };
  }
  return null;
}

/** What happened between two readings of the same API. */
export function playbackStatsDelta(before: PlaybackStats | null, after: PlaybackStats | null): PlaybackStats | null {
  if (!before || !after || before.api !== after.api) return after;
  const minus = (a: number | null, b: number | null) => a === null || b === null ? null : Math.max(0, a - b);
  return { api: after.api, underrunEvents: minus(after.underrunEvents, before.underrunEvents),
    underrunMs: minus(after.underrunMs, before.underrunMs) };
}

export interface JsMemory {
  /** Chrome's `performance.memory`; null where the browser does not expose it (Safari, Firefox). */
  usedBytes: number | null;
  totalBytes: number | null;
  limitBytes: number | null;
}

export function readJsMemory(source: object = performance): JsMemory {
  const memory = (source as { memory?: Record<string, unknown> }).memory;
  if (!memory || typeof memory !== "object") return { usedBytes: null, totalBytes: null, limitBytes: null };
  return { usedBytes: count(memory.usedJSHeapSize), totalBytes: count(memory.totalJSHeapSize),
    limitBytes: count(memory.jsHeapSizeLimit) };
}

export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return "n/a";
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

export interface DeviceDescription {
  device: string;
  os: string;
  browser: string;
}

/**
 * Device, OS and browser from the user agent. An iPad asking for the desktop
 * site says "Macintosh"; touch points tell it apart. Every iOS browser is
 * WebKit underneath, whatever its name.
 */
export function describeUserAgent(userAgent: string, maxTouchPoints = 0): DeviceDescription {
  const ua = userAgent;
  const match = (pattern: RegExp) => ua.match(pattern);
  let device = "Unknown device";
  let os = "Unknown OS";
  const ios = match(/(iPhone|iPad|iPod).*? OS (\d+)[_.](\d+)(?:[_.](\d+))?/);
  const android = match(/Android (\d+(?:\.\d+)*)(?:; ([^;)]+))?/);
  if (ios) {
    device = ios[1];
    os = `iOS ${ios[2]}.${ios[3]}${ios[4] ? `.${ios[4]}` : ""}`;
  } else if (/Macintosh/.test(ua) && maxTouchPoints > 1) {
    device = "iPad (desktop mode)";
    const version = match(/Version\/(\d+(?:\.\d+)*)/);
    os = version ? `iPadOS ${version[1]}` : "iPadOS";
  } else if (android) {
    const model = android[2]?.trim();
    device = model && model !== "K" && !/^wv$/.test(model) ? model : "Android phone";
    os = `Android ${android[1]}`;
  } else if (/Macintosh/.test(ua)) {
    device = "Mac";
    os = "macOS";
  } else if (/Windows/.test(ua)) {
    device = "PC";
    os = "Windows";
  } else if (/Linux/.test(ua)) {
    device = "Linux machine";
    os = "Linux";
  }
  const browsers: [RegExp, string][] = [
    [/CriOS\/(\d+(?:\.\d+)?)/, "Chrome (iOS, WebKit)"],
    [/FxiOS\/(\d+(?:\.\d+)?)/, "Firefox (iOS, WebKit)"],
    [/EdgiOS\/(\d+(?:\.\d+)?)/, "Edge (iOS, WebKit)"],
    [/SamsungBrowser\/(\d+(?:\.\d+)?)/, "Samsung Internet"],
    [/EdgA?\/(\d+(?:\.\d+)?)/, "Edge"],
    [/Firefox\/(\d+(?:\.\d+)?)/, "Firefox"],
    [/HeadlessChrome\/(\d+(?:\.\d+)?)/, "Headless Chrome"],
    [/Chrome\/(\d+(?:\.\d+)?)/, "Chrome"],
    [/Version\/(\d+(?:\.\d+)*).*Safari\//, "Safari"],
  ];
  let browser = "Unknown browser";
  for (const [pattern, name] of browsers) {
    const found = match(pattern);
    if (found) { browser = `${name} ${found[1]}`; break; }
  }
  return { device, os, browser };
}
