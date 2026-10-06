import type { LiveAudioClock } from "@/services/liveAudioClock";

export interface LooperTempoSegment {
  readonly audioTime: number;
  readonly bar: number;
  readonly cps: number;
}

function finite(value: number, name: string): void {
  if (!Number.isFinite(value)) throw new RangeError(`${name} must be finite`);
}

function anchor(audioTime: number, bar: number, cps: number): LooperTempoSegment {
  finite(audioTime, "audioTime");
  finite(bar, "bar");
  finite(cps, "cps");
  if (cps <= 0) throw new RangeError("cps must be positive");
  return { audioTime, bar, cps };
}

/** One cycle is one bar. Audio times are seconds in the AudioContext domain. */
export class LooperTempoMap {
  private anchors: LooperTempoSegment[] = [];

  get segments(): readonly LooperTempoSegment[] {
    return this.anchors.map(segment => ({ ...segment }));
  }

  reset(audioTime: number, bar: number, cps: number): void {
    this.anchors = [anchor(audioTime, bar, cps)];
  }

  /** Supply the scheduler's continuous boundary bar and its audio deadline.
   * A newer decision supersedes all queued anchors at or after that deadline.
   * Earlier anchors remain available for delayed recording timestamps.
   */
  retime(audioTime: number, bar: number, cps: number): void {
    const next = anchor(audioTime, bar, cps);
    this.anchors = this.anchors.filter(segment => segment.audioTime < audioTime);
    this.anchors.push(next);
  }

  barAt(audioTime: number): number {
    finite(audioTime, "audioTime");
    const segment = this.segmentAt(audioTime, "audioTime");
    return segment.bar + (audioTime - segment.audioTime) * segment.cps;
  }

  timeAt(bar: number): number {
    finite(bar, "bar");
    const segment = this.segmentAt(bar, "bar");
    return segment.audioTime + (bar - segment.bar) / segment.cps;
  }

  private segmentAt(value: number, key: "audioTime" | "bar"): LooperTempoSegment {
    if (!this.anchors.length) throw new Error("LooperTempoMap requires an initial anchor");
    // Upper bound selects the new rate at an exact boundary. The first rate
    // extrapolates backwards, preserving negative positions before playback.
    let low = 0;
    let high = this.anchors.length;
    while (low < high) {
      const middle = Math.floor((low + high) / 2);
      if (this.anchors[middle][key] <= value) low = middle + 1;
      else high = middle;
    }
    return this.anchors[Math.max(0, low - 1)];
  }
}

/** Positive calibration means the player's timestamp is late.
 * LiveAudioClock returns milliseconds; compensate there, then use seconds.
 */
export function eventBarPosition(
  map: LooperTempoMap,
  clock: Pick<LiveAudioClock, "fromEpochTime">,
  epochMs: number,
  outputLatencyMs: number,
  calibrationMs: number,
): number {
  finite(epochMs, "epochMs");
  finite(outputLatencyMs, "outputLatencyMs");
  finite(calibrationMs, "calibrationMs");
  return map.barAt((clock.fromEpochTime(epochMs) - outputLatencyMs - calibrationMs) / 1000);
}
