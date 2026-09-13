import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPlayStyleEngine, PLAY_STYLE_SCHEDULING_LEAD_MS, type PlayStyle } from '@/services/playStyles'

function setup(style: PlayStyle = 'together', schedulingLeadMs = 0) {
  let clockOffset = 0
  const calls: { pitch: number; at: number; scheduledAt: number; style: PlayStyle; release: ReturnType<typeof vi.fn> }[] = []
  const engine = createPlayStyleEngine<number>({
    now: () => Date.now() + clockOffset,
    schedulingLeadMs,
    start: (pitch, at, style) => {
      const release = vi.fn()
      calls.push({ pitch, at, scheduledAt: Date.now() + clockOffset, style, release })
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

  it.each(['repeat', 'arp-up', 'arp-up-down'] as const)(
    'submits the first %s attack in the input turn without collecting a chord', (style) => {
      const { engine, calls } = setup(style, 20)
      engine.press('e', notes(64))
      expect(calls.map(call => [call.pitch, call.at, call.scheduledAt])).toEqual([[64, 20, 0]])
      vi.advanceTimersByTime(5)
      engine.press('c', notes(60))
      expect(calls[0].release.mock.calls).toEqual([[220]])
      vi.advanceTimersByTime(250)
      expect(calls.filter(call => call.at === 270).map(call => call.pitch)).toEqual(
        style === 'repeat' ? [60, 64] : [64],
      )
      engine.clear()
    },
  )

  it('applies tempo and division changes at the next safe pulse without restarting the arp', () => {
    const { engine, calls } = setup('arp-up', 20)
    engine.press('chord', notes(60, 64, 67))
    vi.advanceTimersByTime(140)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 20], [64, 270]])
    engine.configure({ bpm: 60, rate: 16 }) // Same duration; preserve everything.
    expect(calls[0].release.mock.calls).toEqual([[220]])
    expect(calls[1].release.mock.calls).toEqual([[470]])
    engine.configure({ rate: 8 }) // 500 ms begins at the existing 270 ms boundary.
    vi.advanceTimersByTime(650)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 20], [64, 270], [67, 770]])
    engine.clear()
  })

  it('replaces only pulses beyond the change boundary while keeping the sounding note alive', () => {
    const { engine, calls } = setup('arp-up', 20)
    engine.configure({ bpm: 240, rate: 16 })
    engine.press('chord', notes(60, 64, 67))
    vi.advanceTimersByTime(40)
    expect(calls.map(call => call.at)).toEqual([20, 82.5, 145])
    engine.configure({ bpm: 120 })
    expect(calls[0].release.mock.calls).toEqual([[70]])
    expect(calls[1].release.mock.calls).toEqual([[132.5]])
    expect(calls[2].release).toHaveBeenLastCalledWith(40)
    vi.advanceTimersByTime(100)
    expect(calls.at(-1)).toMatchObject({ pitch: 67, at: 207.5 })
    engine.clear()
  })

  it('keeps imminent pulses and preserves boundary gates when its held pitch changes', () => {
    const { engine, calls } = setup('arp-up', 20)
    engine.configure({ bpm: 240, rate: 16 })
    engine.press('chord', notes(60, 67))
    vi.advanceTimersByTime(70)
    engine.configure({ bpm: 120 })
    // 82.5 is inside the safety margin, so 145 is the change boundary.
    expect(calls[1].release.mock.calls).toEqual([[132.5]])
    expect(calls[2].release.mock.calls).toEqual([[195]])
    engine.press('e', notes(64))
    const replacement = calls.find(call => call.pitch === 67 && call.at === 145)!
    expect(replacement.release.mock.calls).toEqual([[195]])
    vi.advanceTimersByTime(120)
    expect(calls.at(-1)).toMatchObject({ pitch: 60, at: 270 })
    engine.clear()
  })

  it('advances a stalled grid before applying a tempo change without catching up late notes', () => {
    const { engine, calls, jumpClock } = setup('arp-up', 20)
    engine.press('chord', notes(60, 64, 67))
    jumpClock(1000)
    engine.configure({ bpm: 240 })
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 20], [64, 1020], [67, 1145]])
    expect(calls.slice(1).every(call => call.at - call.scheduledAt >= 20)).toBe(true)
    engine.clear()
    expect(vi.getTimerCount()).toBe(0)
  })

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
    expect(calls.map(call => call.at)).toEqual([30, 65, 100])
    expect(calls.every(call => !call.release.mock.calls.length)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
    engine.clear()
    expect(calls.every(call => call.release.mock.calls[0][0] === 100)).toBe(true)
  })

  it('applies scheduling lead to the whole strum instead of compressing its first interval', () => {
    const { engine, calls } = setup('strum-up', 20)
    engine.press('chord', notes(60, 64, 67))
    vi.advanceTimersByTime(120)
    expect(calls.map(call => call.at)).toEqual([50, 85, 120])
    expect(calls.slice(1).map((call, index) => call.at - calls[index].at)).toEqual([35, 35])
    engine.clear()
  })

  it('shifts overdue strum notes together instead of collapsing their spacing', () => {
    const { engine, calls, jumpClock } = setup('strum-up')
    engine.press('chord', notes(60, 64, 67, 72))
    vi.advanceTimersByTime(30)
    expect(calls.map(call => call.at)).toEqual([30, 65])
    jumpClock(100)
    vi.advanceTimersByTime(20)
    expect(calls.map(call => call.at)).toEqual([30, 65, 150, 185])
    engine.clear()
  })

  it('collects chord notes that arrive in separate input-event turns', () => {
    const { engine, calls } = setup('strum-up')
    engine.press('e', notes(64))
    vi.advanceTimersByTime(10)
    engine.press('c', notes(60))
    vi.advanceTimersByTime(10)
    engine.press('g', notes(67))
    vi.advanceTimersByTime(100)
    expect(calls.map(call => call.pitch)).toEqual([60, 64, 67])
    expect(calls.map(call => call.at)).toEqual([30, 65, 100])
    engine.clear()
  })

  it('cancels both scheduled and queued strum onsets on release', () => {
    const { engine, calls } = setup('strum-up')
    engine.press('chord', notes(60, 64, 67, 72))
    vi.advanceTimersByTime(30)
    expect(calls.map(call => call.at)).toEqual([30, 65])
    vi.advanceTimersByTime(10)
    engine.release('chord')
    expect(calls.every(call => call.release.mock.calls[0][0] === 40)).toBe(true)
    vi.advanceTimersByTime(1000)
    expect(calls).toHaveLength(2)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('schedules an up arp at eighth-note intervals with gates and shared unisons', () => {
    const { engine, calls } = setup('arp-up')
    engine.press('c1', notes(60))
    engine.press('chord', notes(60, 64, 67))
    vi.advanceTimersByTime(30)
    engine.release('c1')
    expect(calls[0].release.mock.calls).toEqual([[200]])
    vi.advanceTimersByTime(750)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([
      [60, 0], [64, 250], [67, 500], [60, 750],
    ])
    expect(calls.map(call => call.release.mock.calls[0][0])).toEqual([200, 450, 700, 950])
    engine.release('chord')
    expect(calls[3].release).toHaveBeenLastCalledWith(780)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('walks an up/down arp without repeating the endpoints', () => {
    const { engine, calls } = setup('arp-up-down')
    engine.press('chord', notes(67, 60, 64))
    vi.advanceTimersByTime(1300)
    expect(calls.map(call => call.pitch)).toEqual([60, 64, 67, 64, 60, 64])
    engine.clear()
  })

  it('repeats a single note and pulses a chord simultaneously at the selected rate', () => {
    const { engine, calls } = setup('repeat')
    engine.configure({ bpm: 60, rate: 16 })
    engine.press('c', notes(60))
    vi.advanceTimersByTime(30)
    engine.press('e', notes(64))
    vi.advanceTimersByTime(250)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 0], [60, 250], [64, 250]])
    engine.clear()
  })

  it('adds a held pitch to the next repeat even when that pulse is already queued', () => {
    const { engine, calls } = setup('repeat', PLAY_STYLE_SCHEDULING_LEAD_MS)
    engine.configure({ rate: 16 })
    engine.press('c', notes(60))
    vi.advanceTimersByTime(60)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 20], [60, 145]])
    engine.press('e', notes(64))
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 20], [60, 145], [64, 145]])
    // Keep both the sounding C and its already prepared next pulse intact.
    expect(calls[0].release.mock.calls).toEqual([[120]])
    expect(calls[1].release.mock.calls).toEqual([[245]])
    engine.clear()
  })

  it.each(['arp-up', 'arp-up-down'] as const)(
    'revises all queued %s pitches on the existing grid when the chord grows', (style) => {
      const { engine, calls } = setup(style, PLAY_STYLE_SCHEDULING_LEAD_MS)
      engine.configure({ bpm: 240, rate: 16 })
      engine.press('chord', notes(60, 67))
      vi.advanceTimersByTime(40)
      expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 20], [67, 82.5], [60, 145]])
      engine.press('e', notes(64))
      expect(calls.slice(1, 3).map(call => call.release.mock.calls.at(-1)?.[0])).toEqual([40, 40])
      expect(calls.slice(3).map(call => [call.pitch, call.at])).toEqual([[64, 82.5], [67, 145]])
      expect(calls[0].release.mock.calls).toEqual([[70]])
      engine.clear()
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('fills a queued arpeggio slot when its pitch is released but other keys remain held', () => {
    const { engine, calls } = setup('arp-up', PLAY_STYLE_SCHEDULING_LEAD_MS)
    engine.configure({ rate: 16 })
    engine.press('c', notes(60))
    engine.press('e', notes(64))
    engine.press('g', notes(67))
    vi.advanceTimersByTime(60)
    engine.release('e')
    expect(calls[2].release).toHaveBeenLastCalledWith(60)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 20], [60, 145], [64, 145], [67, 145]])
    expect(calls[0].release.mock.calls).toEqual([[120]])
    engine.clear()
  })

  it('hands queued unisons to the remaining owner without canceling or duplicating them', () => {
    const { engine, calls } = setup('repeat', PLAY_STYLE_SCHEDULING_LEAD_MS)
    engine.configure({ rate: 16 })
    engine.press('first', notes(60))
    vi.advanceTimersByTime(60)
    engine.press('second', notes(60))
    engine.release('first')
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 20], [60, 145]])
    expect(calls.map(call => call.release.mock.calls)).toEqual([[[120]], [[245]]])
    engine.release('second')
    expect(calls.every(call => call.release.mock.calls.at(-1)?.[0] === 60)).toBe(true)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('leaves onsets inside the audio safety margin intact when adding a pitch', () => {
    const { engine, calls } = setup('arp-up', PLAY_STYLE_SCHEDULING_LEAD_MS)
    engine.configure({ rate: 16 })
    engine.press('chord', notes(60, 67))
    vi.advanceTimersByTime(135)
    engine.press('e', notes(64))
    expect(calls[1].release.mock.calls).toEqual([[245]])
    expect(calls[2].release).toHaveBeenLastCalledWith(135)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 20], [67, 145], [60, 270], [67, 270]])
    engine.clear()
  })

  it.each((['repeat', 'arp-up', 'arp-up-down'] as const).flatMap(style =>
    [60, 100].map(callbackMs => ({ style, callbackMs })),
  ))(
    'plays every sixteenth in $style when timer delivery takes $callbackMs ms', ({ style, callbackMs }) => {
      const { engine, calls, jumpClock } = setup(style, PLAY_STYLE_SCHEDULING_LEAD_MS)
      engine.configure({ bpm: 120, rate: 16 })
      engine.press('chord', notes(60, 64, 67))
      vi.advanceTimersByTime(30)
      // Deliver each 20 ms tick late, as when rendering occupies the
      // main thread. The audio clock continues advancing during that work.
      for (let i = 0; i < 16; i++) {
        jumpClock(callbackMs - 20)
        vi.advanceTimersByTime(20)
      }
      const endAt = 30 + 16 * callbackMs
      const sounded = calls.filter(call => call.at <= endAt)
      const pulseCount = Math.floor((endAt - 20) / 125) + 1
      const expectedTimes = Array.from({ length: pulseCount }, (_, i) => 20 + i * 125)
      expect([...new Set(sounded.map(call => call.at))]).toEqual(expectedTimes)
      const cycle = style === 'arp-up-down' ? [60, 64, 67, 64] : [60, 64, 67]
      expect(sounded.map(call => call.pitch)).toEqual(style === 'repeat'
        ? expectedTimes.flatMap(() => [60, 64, 67])
        : expectedTimes.map((_, i) => cycle[i % cycle.length]))
      for (const call of calls) {
        expect(call.at - call.scheduledAt).toBeGreaterThanOrEqual(PLAY_STYLE_SCHEDULING_LEAD_MS)
      }
      engine.clear()
      expect(vi.getTimerCount()).toBe(0)
    },
  )

  it('preserves held inputs through style changes and waits for a musical boundary on rate changes', () => {
    const { engine, calls } = setup()
    engine.press('chord', notes(60, 64))
    vi.advanceTimersByTime(100)
    engine.configure({ style: 'arp-up', bpm: 60, rate: 4 })
    expect(calls.slice(0, 2).every(call => call.release.mock.calls[0][0] === 100)).toBe(true)
    vi.advanceTimersByTime(1030)
    expect(calls.slice(2).map(call => [call.pitch, call.at])).toEqual([[60, 100], [64, 1100]])
    engine.configure({ rate: 8 })
    vi.advanceTimersByTime(1500)
    expect(calls.slice(4).map(call => [call.pitch, call.at])).toEqual([[60, 2100], [64, 2600]])
    engine.release('chord')
    expect(vi.getTimerCount()).toBe(0)
  })

  it('cancels a future rhythmic onset and its later gate when the key is released', () => {
    const { engine, calls } = setup('repeat')
    engine.press('c', notes(60))
    vi.advanceTimersByTime(230)
    expect(calls.map(call => call.at)).toEqual([0, 250])
    engine.release('c')
    expect(calls[1].release.mock.calls).toEqual([[450], [230]])
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
    expect(calls.map(call => call.at)).toEqual(style === 'together' ? [0, 0, 0] : [30, 65, 100])
    expect(calls.every(call => !call.release.mock.calls.length)).toBe(true)
    engine.configure({ style: 'arp-up' })
    vi.advanceTimersByTime(1030)
    expect(calls.slice(3).map(call => call.at)).toEqual([100, 1100])
    engine.clear()
  })

  it('drops missed pulses after a background stall while preserving the grid', () => {
    const { engine, calls, jumpClock } = setup('arp-up')
    engine.press('chord', notes(60, 64, 67))
    vi.advanceTimersByTime(30)
    jumpClock(990)
    vi.advanceTimersByTime(20)
    expect(calls).toHaveLength(1)
    vi.advanceTimersByTime(200)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 0], [67, 1250]])
    engine.clear()
  })

  it('drops rhythmic deadlines inside the production scheduling margin', () => {
    const { engine, calls, jumpClock } = setup('arp-up', 20)
    engine.press('chord', notes(60, 64, 67))
    vi.advanceTimersByTime(30)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[60, 20]])

    jumpClock(245)
    vi.advanceTimersByTime(240)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([
      [60, 20],
      [67, 520],
    ])
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
    vi.advanceTimersByTime(30)
    expect(calls.map(call => [call.pitch, call.at])).toEqual([[72, 130]])
    engine.clear()
  })
})
