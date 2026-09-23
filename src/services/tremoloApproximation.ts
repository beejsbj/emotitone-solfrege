import type { GainExpressionPoint } from "@/types/expression";

export interface TremoloApproximation {
  /** LFO rate in hertz, for Strudel's `tremolo` control. */
  tremolo: number;
  /** Downward amplitude modulation depth, for Strudel's `tremolodepth` control. */
  tremolodepth: number;
}

const DEADZONE_GAIN = 0.025;
const MIN_RANGE_GAIN = 0.1;
const MIN_HZ = 0.25;
const MAX_HZ = 12;
const MIN_FULL_CYCLES = 2;
const MAX_DEPTH = 0.5;

/**
 * Reduces a gain curve to Strudel's note-local tremolo. Superdough multiplies
 * the voice by a unipolar LFO from `1 - depth` to `1`; therefore the recorded
 * low/high ratio maps directly to depth, capped conservatively at 0.5.
 * Drags, constant gain, and sensor jitter deliberately remain unexported.
 */
export function approximateTremolo(
  expression: readonly GainExpressionPoint[] | undefined,
): TremoloApproximation | undefined {
  if (!expression?.length) return undefined;
  const points = expression.filter((point) => Number.isFinite(point.timeMs) && Number.isFinite(point.gain))
    .sort((a, b) => a.timeMs - b.timeMs)
    .reduce<GainExpressionPoint[]>((all, point) => {
      const last = all[all.length - 1];
      if (last?.timeMs === point.timeMs) all[all.length - 1] = point;
      else all.push(point);
      return all;
    }, []);
  if (points.length < 5) return undefined;

  const gains = points.map((point) => point.gain);
  const low = Math.min(...gains); const high = Math.max(...gains);
  // An odd number of alternating peaks can put the median at one extreme.
  // Center the excursion so a note starting away from neutral still oscillates.
  const baseline = (low + high) / 2;
  const signed = points.flatMap((point) => Math.abs(point.gain - baseline) <= DEADZONE_GAIN
    ? [] : [{ ...point, sign: (point.gain < baseline ? -1 : 1) as -1 | 1 }]);
  if (signed.length < 5) return undefined;
  const crossings: Array<{ timeMs: number; direction: -1 | 1 }> = [];
  for (let index = 1; index < signed.length; index++) {
    const previous = signed[index - 1]; const current = signed[index];
    if (previous.sign === current.sign || current.timeMs <= previous.timeMs) continue;
    const previousDistance = Math.abs(previous.gain - baseline);
    const currentDistance = Math.abs(current.gain - baseline);
    crossings.push({ timeMs: previous.timeMs + (current.timeMs - previous.timeMs) * previousDistance / (previousDistance + currentDistance), direction: current.sign });
  }
  const cycles = crossings.flatMap((crossing, index) => {
    const next = crossings[index + 2];
    return next?.direction === crossing.direction && next.timeMs > crossing.timeMs ? [next.timeMs - crossing.timeMs] : [];
  });
  if (cycles.length < MIN_FULL_CYCLES) return undefined;
  const tremolo = 1000 / median(cycles);
  if (!Number.isFinite(tremolo) || tremolo < MIN_HZ || tremolo > MAX_HZ || high - low < MIN_RANGE_GAIN || high <= 0) return undefined;
  return { tremolo: round(tremolo, 2), tremolodepth: round(Math.min(1 - low / high, MAX_DEPTH), 3) };
}

function median(values: readonly number[]) { const sorted = [...values].sort((a, b) => a - b); const middle = Math.floor(sorted.length / 2); return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2; }
function round(value: number, precision: number) { const multiplier = 10 ** precision; return Math.round(value * multiplier) / multiplier; }
