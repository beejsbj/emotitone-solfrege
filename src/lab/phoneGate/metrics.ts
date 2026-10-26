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
}

/**
 * The whole graph's deadline, estimated from the output clock: while the
 * device plays, audio time and wall time advance together; an underrun plays
 * silence the graph never rendered, so wall time runs ahead. Feed it each
 * fresh `getOutputTimestamp()` (contextTime in seconds, performanceTime in
 * ms). An estimate: browsers smooth these clocks, so the ear check decides.
 */
export function createClockSlipMeter(gapMs = 10) {
  let first: { context: number; performance: number } | undefined;
  let previous: { context: number; performance: number } | undefined;
  let samples = 0;
  let gaps = 0;
  let worstStepMs = 0;
  return {
    sample(contextTime: number | undefined, performanceTime: number | undefined) {
      if (!Number.isFinite(contextTime) || !Number.isFinite(performanceTime) || !(performanceTime! > 0)) return;
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
      if (!first || !previous) return { samples, spanMs: 0, slipMs: 0, gaps, worstStepMs };
      const spanMs = previous.performance - first.performance;
      return { samples, spanMs, slipMs: spanMs - (previous.context - first.context) * 1000, gaps, worstStepMs };
    },
  };
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
