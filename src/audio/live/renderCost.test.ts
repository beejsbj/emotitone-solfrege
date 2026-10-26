import { describe, expect, it } from 'vitest'
import { RENDER_COST_BUCKETS, RenderCostMeter, renderCostClock, summarizeRenderCost } from './renderCost'

function meterWith(costs: number[]) {
  const meter = new RenderCostMeter('performance')
  for (const cost of costs) meter.record(cost)
  return meter
}

describe('render cost per quantum', () => {
  it('summarises injected costs against the budget at the measured sample rate', () => {
    // 98 cheap quanta, one near the budget, one well over it.
    const costs = [...Array(98).fill(.25), 2.55, 4.05]
    const summary = summarizeRenderCost(meterWith(costs).snapshot(), 48000)
    expect(summary.budgetMs).toBeCloseTo(2.667, 3)
    expect(summary.quanta).toBe(100)
    expect(summary.p50Ms).toBeCloseTo(.3)
    // p99 is the 99th quantum: the 2.55 ms one, read as its bucket's upper edge.
    expect(summary.p99Ms).toBeCloseTo(2.6)
    expect(summary.maxMs).toBeCloseTo(4.05)
    expect(summary.overBudget).toBe(1)
    expect(summary.meanMs).toBeCloseTo((98 * .25 + 2.55 + 4.05) / 100)
    expect(summary.load).toBeCloseTo(summary.meanMs / summary.budgetMs)
  })

  it('uses the 44.1 kHz budget and counts every quantum at or past it', () => {
    const summary = summarizeRenderCost(meterWith([2.95, 3.05, .15]).snapshot(), 44100)
    expect(summary.budgetMs).toBeCloseTo(2.902, 3)
    expect(summary.overBudget).toBe(2)
  })

  it('keeps an extreme quantum in the last bucket and its true maximum', () => {
    const snapshot = meterWith([250, -1, Number.NaN]).snapshot()
    expect(snapshot.histogram[RENDER_COST_BUCKETS - 1]).toBe(1)
    // A clock that steps backwards or fails reads as free, never as negative.
    expect(snapshot.histogram[0]).toBe(2)
    expect(snapshot.maxMs).toBe(250)
    expect(summarizeRenderCost(snapshot, 48000).p99Ms).toBe(250)
  })

  it('reports an empty window as zeros', () => {
    const summary = summarizeRenderCost(new RenderCostMeter('date').snapshot(), 48000)
    expect(summary).toMatchObject({ clock: 'date', quanta: 0, p50Ms: 0, p99Ms: 0, maxMs: 0, overBudget: 0, load: 0 })
  })

  it('falls back to whole-millisecond Date time where the worklet scope has no performance clock', () => {
    expect(renderCostClock({}).name).toBe('date')
    const clock = renderCostClock({ performance: { now: () => 12.5 } })
    expect(clock.name).toBe('performance')
    expect(clock.now()).toBe(12.5)
  })
})
