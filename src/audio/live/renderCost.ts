/**
 * Render cost per quantum (BJS-494; docs/research/worklet-engine.md §4).
 *
 * A read-only measurement of the live processor: how long each `render` call
 * takes, as a histogram the main thread asks for. It is off until the first
 * request, never allocates while recording, and never changes what renders.
 * The phone gate compares its p99 and maximum with the quantum's budget at
 * the measured sample rate (128 frames: 2.67 ms at 48 kHz).
 *
 * It times the worklet only. Native effects and output mixing run outside it,
 * so the whole graph's deadline is checked separately (clock slip, by ear).
 */

/** Bucket width of the histogram, in milliseconds. */
export const RENDER_COST_BUCKET_MS = .1
/** Buckets 0–19.9 ms; the last one also holds every longer quantum. */
export const RENDER_COST_BUCKETS = 200
export const RENDER_QUANTUM_FRAMES = 128

/** Which clock the processor could read: `performance` is sub-millisecond, `date` is whole milliseconds. */
export type RenderCostClock = 'performance' | 'date'

export interface RenderCostSnapshot {
  clock: RenderCostClock
  quanta: number
  totalMs: number
  maxMs: number
  /** Count per RENDER_COST_BUCKET_MS bucket, from 0 ms. */
  histogram: number[]
}

export type RenderCostCommand = { type: 'render-cost'; requestId: number; reset?: boolean }
export type RenderCostResponse = { type: 'render-cost'; requestId: number; cost: RenderCostSnapshot }

export class RenderCostMeter {
  private counts = new Uint32Array(RENDER_COST_BUCKETS)
  private quanta = 0
  private totalMs = 0
  private maxMs = 0

  constructor(readonly clock: RenderCostClock) {}

  record(ms: number) {
    const cost = Number.isFinite(ms) && ms > 0 ? ms : 0
    this.counts[Math.min(RENDER_COST_BUCKETS - 1, Math.floor(cost / RENDER_COST_BUCKET_MS))]++
    this.quanta++
    this.totalMs += cost
    if (cost > this.maxMs) this.maxMs = cost
  }

  snapshot(): RenderCostSnapshot {
    return { clock: this.clock, quanta: this.quanta, totalMs: this.totalMs, maxMs: this.maxMs,
      histogram: Array.from(this.counts) }
  }

  reset() {
    this.counts.fill(0)
    this.quanta = 0
    this.totalMs = 0
    this.maxMs = 0
  }
}

/** The best clock this scope offers. AudioWorkletGlobalScope may have no `performance`. */
export function renderCostClock(scope: { performance?: { now?: () => number } } = globalThis as never):
  { name: RenderCostClock; now: () => number } {
  const performance = scope.performance
  if (performance && typeof performance.now === 'function') return { name: 'performance', now: () => performance.now!() }
  return { name: 'date', now: () => Date.now() }
}

export interface RenderCostSummary {
  clock: RenderCostClock
  quanta: number
  /** One quantum's real-time budget at this sample rate. */
  budgetMs: number
  meanMs: number
  p50Ms: number
  p95Ms: number
  p99Ms: number
  maxMs: number
  /** Quanta whose bucket reaches past the budget: pessimistic by under one bucket (0.1 ms). */
  overBudget: number
  /** Mean cost as a share of the budget: how much of the render thread the worklet uses. */
  load: number
}

/** Percentiles read from the histogram are each bucket's upper edge (never optimistic), capped at the maximum. */
export function summarizeRenderCost(cost: RenderCostSnapshot, sampleRate: number,
  quantumFrames = RENDER_QUANTUM_FRAMES): RenderCostSummary {
  const budgetMs = quantumFrames / sampleRate * 1000
  const percentile = (fraction: number) => {
    if (!cost.quanta) return 0
    const rank = Math.ceil(fraction * cost.quanta)
    let seen = 0
    for (let bucket = 0; bucket < cost.histogram.length; bucket++) {
      seen += cost.histogram[bucket]
      // The last bucket is open-ended: only the maximum bounds it.
      if (seen >= rank) return bucket === cost.histogram.length - 1 ? cost.maxMs
        : Math.min(cost.maxMs, (bucket + 1) * RENDER_COST_BUCKET_MS)
    }
    return cost.maxMs
  }
  let overBudget = 0
  cost.histogram.forEach((count, bucket) => {
    if ((bucket + 1) * RENDER_COST_BUCKET_MS > budgetMs + 1e-9) overBudget += count
  })
  const meanMs = cost.quanta ? cost.totalMs / cost.quanta : 0
  return { clock: cost.clock, quanta: cost.quanta, budgetMs, meanMs, p50Ms: percentile(.5), p95Ms: percentile(.95),
    p99Ms: percentile(.99), maxMs: cost.maxMs, overBudget, load: budgetMs ? meanMs / budgetMs : 0 }
}
