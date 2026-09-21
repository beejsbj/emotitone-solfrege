import type { PitchExpressionPoint } from "@/types/expression";

/** The portable subset of a recorded pitch curve that Strudel can replay. */
export interface VibratoApproximation {
  /** LFO rate in hertz, for Strudel's `vib` control. */
  vib: number;
  /** LFO depth in semitones, for Strudel's `vibmod` control. */
  vibmod: number;
}

const DEADZONE_CENTS = 5;
const MIN_DEPTH_CENTS = 12;
const MIN_VIB_HZ = 0.25;
const MAX_VIB_HZ = 12;
const MAX_DEPTH_SEMITONES = 0.5;
const MIN_FULL_CYCLES = 2;

type SignedPoint = PitchExpressionPoint & { sign: -1 | 1 };

/**
 * Reduces a finger pitch curve to the steady oscillation Strudel can express.
 * A curve needs two complete, direction-matched zero-crossing cycles before it
 * is considered vibrato; a drag and small sensor jitter intentionally return
 * undefined instead of becoming an invented LFO.
 */
export function approximateVibrato(
  expression: readonly PitchExpressionPoint[] | undefined,
): VibratoApproximation | undefined {
  if (!expression?.length) return undefined;

  const points = expression
    .filter((point) => Number.isFinite(point.timeMs) && Number.isFinite(point.cents))
    .sort((left, right) => left.timeMs - right.timeMs)
    .reduce<PitchExpressionPoint[]>((unique, point) => {
      const previous = unique[unique.length - 1];
      if (previous?.timeMs === point.timeMs) unique[unique.length - 1] = point;
      else unique.push(point);
      return unique;
    }, []);

  const signed: SignedPoint[] = points.flatMap((point) => {
    if (Math.abs(point.cents) <= DEADZONE_CENTS) return [];
    return [{ ...point, sign: point.cents < 0 ? -1 : 1 }];
  });
  if (signed.length < 5) return undefined;

  const crossings: Array<{ timeMs: number; direction: "up" | "down" }> = [];
  for (let index = 1; index < signed.length; index++) {
    const previous = signed[index - 1];
    const current = signed[index];
    if (previous.sign === current.sign || current.timeMs <= previous.timeMs) continue;

    // Interpolate the zero crossing; this avoids timestamp quantization bias.
    const fraction = Math.abs(previous.cents) / (Math.abs(previous.cents) + Math.abs(current.cents));
    crossings.push({
      timeMs: previous.timeMs + (current.timeMs - previous.timeMs) * fraction,
      direction: previous.sign < current.sign ? "up" : "down",
    });
  }

  const fullCycles = crossings.flatMap((crossing, index) => {
    const next = crossings[index + 2];
    if (!next || next.direction !== crossing.direction) return [];
    const durationMs = next.timeMs - crossing.timeMs;
    return durationMs > 0 ? [durationMs] : [];
  });
  if (fullCycles.length < MIN_FULL_CYCLES) return undefined;

  const medianCycleMs = median(fullCycles);
  const vib = 1000 / medianCycleMs;
  if (!Number.isFinite(vib) || vib < MIN_VIB_HZ || vib > MAX_VIB_HZ) return undefined;

  // One peak per lobe is less biased by uneven curve sample density than an
  // average of every point. The median rejects an occasional overshoot.
  const lobePeaks: number[] = [];
  let pointIndex = 0;
  for (let index = 0; index < crossings.length - 1; index++) {
    const start = crossings[index].timeMs;
    const end = crossings[index + 1].timeMs;
    while (pointIndex < points.length && points[pointIndex].timeMs < start) pointIndex++;
    let peak = 0;
    while (pointIndex < points.length && points[pointIndex].timeMs <= end) {
      peak = Math.max(peak, Math.abs(points[pointIndex++].cents));
    }
    if (peak > 0) lobePeaks.push(peak);
  }
  const depthCents = median(lobePeaks);
  if (!Number.isFinite(depthCents) || depthCents < MIN_DEPTH_CENTS) return undefined;

  return {
    vib: round(vib, 2),
    vibmod: round(Math.min(depthCents / 100, MAX_DEPTH_SEMITONES), 3),
  };
}

function median(values: readonly number[]): number {
  if (!values.length) return Number.NaN;
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function round(value: number, precision: number): number {
  const multiplier = 10 ** precision;
  return Math.round(value * multiplier) / multiplier;
}
