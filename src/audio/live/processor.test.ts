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
  const reference = new LiveAudioCore(1000, response => expected.push(response), 'boundary')
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
})
