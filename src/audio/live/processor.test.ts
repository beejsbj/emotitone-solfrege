import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiveAudioCore } from './core'
import type { LiveCommand, LiveResponse, PreparedLiveInstrument } from './types'

const instrument: PreparedLiveInstrument = { kind: 'oscillator', instrumentId: 'sine', waveform: 'sine',
  gain: .2, attack: 0, decay: 0, sustain: 1, release: .01 }

async function setup() {
  vi.resetModules()
  vi.stubGlobal('sampleRate', 1000)
  vi.stubGlobal('currentFrame', 0)
  const register = vi.fn()
  vi.stubGlobal('registerProcessor', register)
  vi.stubGlobal('AudioWorkletProcessor', class {
    port = { onmessage: null as any, postMessage: vi.fn() }
  })
  await import('./processor')
  expect(register).toHaveBeenCalledWith('emotitone-live', expect.any(Function))
  const Processor = register.mock.calls[0][1]
  const processor = new Processor({ processorOptions: { instanceId: 'boundary' } })
  const expected: LiveResponse[] = []
  // The previous singleton port cloned immediately at emission. Snapshot the
  // reference there so later mutations cannot disguise a batching regression.
  const reference = new LiveAudioCore(1000, response => expected.push(structuredClone(response)), 'boundary')
  let frame = 0
  function expectBoundary(call: () => void) {
    const start = processor.port.postMessage.mock.calls.length
    call()
    const calls = processor.port.postMessage.mock.calls.slice(start).map(([value]: [unknown]) => value)
    expect(calls).toEqual(expected.length ? [[...expected]] : [])
    return expected.splice(0)
  }
  function command(command: LiveCommand) {
    reference.command(command, frame)
    return expectBoundary(() => processor.port.onmessage({ data: command }))
  }
  function render(length = 128) {
    const actualOutput = [new Float32Array(length), new Float32Array(length)]
    const expectedOutput = [new Float32Array(length), new Float32Array(length)]
    reference.render(expectedOutput, frame)
    const messages = expectBoundary(() => expect(processor.process([], [actualOutput])).toBe(true))
    expect(actualOutput).toEqual(expectedOutput)
    frame += length
    vi.stubGlobal('currentFrame', frame)
    return messages
  }
  return { processor, command, render }
}
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks() })

describe('live processor response boundaries', () => {
  it('releases the old bank and its voices on disposal and stops render callbacks', async () => {
    const { processor, command, render } = await setup()
    command({ type: 'prepare', requestId: 1, instrument: { ...instrument, kind: 'sample-bank',
      zoneSelection: 'nearest-root', zones: [{ id: 'z', rootMidi: 60, sampleRate: 1000, channels: [new Float32Array(1024).fill(.5)] }] } })
    command({ type: 'press', ownerId: 'finger', notes: [{ pitch: 60, instrumentId: 'sine' }] })
    render()
    processor.port.onmessage({ data: { type: 'dispose' } })
    // The core owns both the instrument map and active voice references to PCM.
    expect(processor.core).toBeUndefined()
    const output = [new Float32Array(128)]
    expect(processor.process([], [output])).toBe(false)
    expect(output[0].every(value => value === 0)).toBe(true)
    expect(processor.port.onmessage).toBeNull()
  })

  it('posts exact command receipts and each quantum chord lifecycle/plan as one ordered array', async () => {
    const { command, render } = await setup()
    command({ type: 'prepare', requestId: 1, instrument })
    command({ type: 'configure', config: { style: 'repeat', bpm: 120, rate: 16 } })
    command({ type: 'press', ownerId: 'chord', notes: [60, 64, 67].map(pitch => ({ pitch, instrumentId: 'sine' })) })
    const first = render()
    expect(first.filter(response => response.type === 'event').length).toBeGreaterThan(3)
    expect(first.some(response => response.type === 'plan')).toBe(true)
    render()
    command({ type: 'release', ownerId: 'chord' })
    render()
    command({ type: 'forget', requestId: 2, instrumentId: 'sine', instant: true })
  })

  it('does not post empty messages during quiet render quanta', async () => {
    const { processor, render } = await setup()
    render(); render(); render()
    expect(processor.port.postMessage).not.toHaveBeenCalled()
  })

  it('flushes emitted command responses before propagating a core failure', async () => {
    const { processor } = await setup()
    const original = processor.core.command.bind(processor.core)
    vi.spyOn(processor.core, 'command').mockImplementation((command: unknown, frame: unknown) => {
      original(command, frame)
      throw new Error('core command failed')
    })
    expect(() => processor.port.onmessage({ data: { type: 'prepare', requestId: 1, instrument } }))
      .toThrow('core command failed')
    expect(processor.port.postMessage).toHaveBeenCalledExactlyOnceWith([{ type: 'prepared', requestId: 1 }])
  })

  it('measures render cost per quantum only once asked, without changing what renders', async () => {
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const { processor, command, render } = await setup()
    command({ type: 'prepare', requestId: 1, instrument })
    command({ type: 'press', ownerId: 'finger', notes: [{ pitch: 60, instrumentId: 'sine' }] })
    const read = (reset = false) => {
      const before = processor.port.postMessage.mock.calls.length
      processor.port.onmessage({ data: { type: 'render-cost', requestId: 7, reset } })
      const posted = processor.port.postMessage.mock.calls.slice(before).map(([value]: [unknown]) => value)
      expect(posted).toHaveLength(1)
      return (posted[0] as LiveResponse[])[0] as Extract<LiveResponse, { type: 'render-cost' }>
    }
    // Off until the first read: nothing was timed before it.
    render()
    expect(read(true).cost).toMatchObject({ clock: 'performance', quanta: 0, maxMs: 0 })
    // Each quantum's cost is the clock's advance across render (the core's work).
    const spy = vi.spyOn(processor.core, 'render')
    const costs = [.45, 1.25, .45]
    let quantum = 0
    spy.mockImplementation(function (this: LiveAudioCore, ...args: Parameters<LiveAudioCore['render']>) {
      now += costs[quantum++]
      return LiveAudioCore.prototype.render.apply(this, args)
    })
    // `render` still checks every rendered sample against the unmeasured reference core.
    render(); render(); render()
    const { cost } = read(true)
    expect(cost.quanta).toBe(3)
    expect(cost.totalMs).toBeCloseTo(2.15)
    expect(cost.maxMs).toBeCloseTo(1.25)
    expect(cost.histogram[4]).toBe(2)
    expect(cost.histogram[12]).toBe(1)
    // The reset starts a fresh window.
    expect(read().cost.quanta).toBe(0)
  })

  it('counts posting a quantum’s responses in its cost, not only the core’s render', async () => {
    let now = 0
    vi.spyOn(performance, 'now').mockImplementation(() => now)
    const { processor, command, render } = await setup()
    command({ type: 'prepare', requestId: 1, instrument })
    processor.port.onmessage({ data: { type: 'render-cost', requestId: 7, reset: true } })
    // Rendering costs .4 ms; posting a batch across the port costs .9 ms more.
    vi.spyOn(processor.core, 'render').mockImplementation(function (this: LiveAudioCore,
      ...args: Parameters<LiveAudioCore['render']>) {
      now += .4
      return LiveAudioCore.prototype.render.apply(this, args)
    })
    const post = processor.port.postMessage.getMockImplementation()
    processor.port.postMessage.mockImplementation((...args: unknown[]) => { now += .9; return post?.(...args) })
    // The press's attack is posted in the next quantum; the one after is quiet.
    command({ type: 'press', ownerId: 'finger', notes: [{ pitch: 60, instrumentId: 'sine' }] })
    const posted = render()
    expect(posted.length).toBeGreaterThan(0)
    expect(render()).toEqual([])
    processor.port.postMessage.mockImplementation(post ?? (() => {}))
    processor.port.onmessage({ data: { type: 'render-cost', requestId: 8 } })
    const reply = processor.port.postMessage.mock.calls.at(-1)![0] as LiveResponse[]
    const { cost } = reply[0] as Extract<LiveResponse, { type: 'render-cost' }>
    expect(cost.quanta).toBe(2)
    expect(cost.maxMs).toBeCloseTo(1.3)
    expect(cost.totalMs).toBeCloseTo(1.7)
  })
})
