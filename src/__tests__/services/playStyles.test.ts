import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlayStyleEngine, type PlayStyle } from '@/services/playStyles'

function setup(style: PlayStyle = 'together') {
  let clockOffset = 0
  const calls: { pitch: number; at: number; style: PlayStyle; release: ReturnType<typeof vi.fn> }[] = []
  const engine = createPlayStyleEngine<number>({
    now: () => Date.now() + clockOffset,
    start: (pitch, at, style) => {
      const release = vi.fn()
      calls.push({ pitch, at, style, release })
      return { release }
    },
  })
  engine.configure({ style })
  return { engine, calls, jumpClock: (ms: number) => { clockOffset += ms } }
}

const notes = (...pitches: number[]) => pitches.map(pitch => ({ pitch, value: pitch }))

describe('live play styles', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
  })
  afterEach(() => vi.useRealTimers())

  it('plays Together immediately and releases duplicate pitches by owner', () => {
    const { engine, calls } = setup()
    engine.press('first', notes(60))
    engine.press('second', notes(60))
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 0], [60, 0]])
    vi.advanceTimersByTime(25)
    engine.release('first')
    expect(calls[0].release).toHaveBeenCalledWith(25)
    expect(calls[1].release).not.toHaveBeenCalled()
    engine.release('second')
    expect(calls[1].release).toHaveBeenCalledWith(25)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each([
    ['strum-up', [60, 64, 67]],
    ['strum-down', [67, 64, 60]],
  ] as const)('batches separate held keys into a pitch-ordered %s', (style, expected) => {
    const { engine, calls } = setup(style)
    engine.press('e', notes(64))
    engine.press('c', notes(60))
    engine.press('g', notes(67))
    expect(calls).toHaveLength(0)
    vi.advanceTimersByTime(100)
    expect(calls.map(call => call.pitch)).toEqual(expected)
    expect(calls.map(call => call.at)).toEqual([0, 35, 70])
    expect(calls.every(call => !call.release.mock.calls.length)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    engine.clear()
    expect(calls.every(call => call.release.mock.calls[0][0] === 100)).toBe(true)
  })

  it('cancels both scheduled and queued strum onsets on release', () => {
    const { engine, calls } = setup('strum-up')
    engine.press('chord', notes(60, 64, 67, 72))
    vi.advanceTimersByTime(0)
    expect(calls.map(call => call.at)).toEqual([0, 35])
    vi.advanceTimersByTime(10)
    engine.release('chord')
    expect(calls.every(call => call.release.mock.calls[0][0] === 10)).toBe(true)
    vi.advanceTimersByTime(1000)
    expect(calls).toHaveLength(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('schedules an up arp at eighth-note intervals with gates and shared unisons', () => {
    const { engine, calls } = setup('arp-up')
    engine.press('c1', notes(60))
    engine.press('chord', notes(60, 64, 67))
    vi.advanceTimersByTime(0)
    engine.release('c1')
    expect(calls[0].release.mock.calls).toEqual([[200]])
    vi.advanceTimersByTime(750)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([
      [60, 0], [64, 250], [67, 500], [60, 750],
    ])
    expect(calls.map(call => call.release.mock.calls[0][0])).toEqual([200, 450, 700, 950])
    engine.release('chord')
    expect(calls[3].release).toHaveBeenLastCalledWith(750)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('walks an up/down arp without repeating the endpoints', () => {
    const { engine, calls } = setup('arp-up-down')
    engine.press('chord', notes(67, 60, 64))
    vi.advanceTimersByTime(1250)
    expect(calls.map(call => call.pitch)).toEqual([60, 64, 67, 64, 60, 64])
    engine.clear()
  })

  it('repeats a single note and pulses a chord simultaneously at the selected rate', () => {
    const { engine, calls } = setup('repeat')
    engine.configure({ bpm: 60, rate: 16 })
    engine.press('c', notes(60))
    vi.advanceTimersByTime(0)
    engine.press('e', notes(64))
    vi.advanceTimersByTime(250)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 0], [60, 250], [64, 250]])
    engine.clear()
  })

  it('preserves held inputs while rebuilding voices after style and tempo changes', () => {
    const { engine, calls } = setup()
    engine.press('chord', notes(60, 64))
    vi.advanceTimersByTime(100)
    engine.configure({ style: 'arp-up', bpm: 60, rate: 4 })
    expect(calls.slice(0, 2).every(call => call.release.mock.calls[0][0] === 100)).toBe(true)
    vi.advanceTimersByTime(1000)
    expect(calls.slice(2).map(call => [call.pitch, call.at])).toEqual([[60, 100], [64, 1100]])
    engine.configure({ rate: 8 })
    vi.advanceTimersByTime(500)
    expect(calls.slice(4).map(call => [call.pitch, call.at])).toEqual([[60, 1100], [64, 1600]])
    engine.release('chord')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels a future rhythmic onset and its later gate when the key is released', () => {
    const { engine, calls } = setup('repeat')
    engine.press('c', notes(60))
    vi.advanceTimersByTime(200)
    expect(calls.map(call => call.at)).toEqual([0, 250])
    engine.release('c')
    expect(calls[1].release.mock.calls).toEqual([[450], [200]])
    vi.advanceTimersByTime(1000)
    expect(calls).toHaveLength(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it.each(['together', 'strum-up'] as const)('keeps held %s voices through rate and tempo changes', (style) => {
    const { engine, calls } = setup(style)
    engine.press('chord', notes(60, 64, 67))
    vi.advanceTimersByTime(10)
    engine.configure({ bpm: 60, rate: 4 })
    vi.advanceTimersByTime(90)
    expect(calls.map(call => call.pitch)).toEqual([60, 64, 67])
    expect(calls.map(call => call.at)).toEqual(style === 'together' ? [0, 0, 0] : [0, 35, 70])
    expect(calls.every(call => !call.release.mock.calls.length)).toBe(true)
    engine.configure({ style: 'arp-up' })
    vi.advanceTimersByTime(1000)
    expect(calls.slice(3).map(call => call.at)).toEqual([100, 1100])
    engine.clear()
  })

  it('drops missed pulses after a background stall while preserving the grid', () => {
    const { engine, calls, jumpClock } = setup('arp-up')
    engine.press('chord', notes(60, 64, 67))
    vi.advanceTimersByTime(0)
    jumpClock(990)
    vi.advanceTimersByTime(20)
    expect(calls).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 0], [67, 1250]])
    engine.clear()
  })

  it('clears an unflushed press and allows a fresh performance', () => {
    const { engine, calls } = setup('strum-down')
    engine.press('old', notes(60, 64, 67))
    engine.clear()
    vi.advanceTimersByTime(100)
    expect(calls).toHaveLength(0)
    expect(vi.getTimerCount()).toBe(0)
    engine.press('new', notes(72))
    vi.advanceTimersByTime(0)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[72, 100]])
    engine.clear()
  })
})
