import { afterEach, describe, expect, it, vi } from 'vitest'
import { createLiveWorklet } from './bridge'
import type { PreparedLiveInstrument } from './types'

const instrument: PreparedLiveInstrument = { kind: 'oscillator', instrumentId: 'sine', waveform: 'sine',
  gain: .2, attack: 0, decay: 0, sustain: 1, release: .01 }
function setup() {
  const node = { port: { postMessage: vi.fn(), close: vi.fn(), onmessage: null as any, onmessageerror: null as any },
    connect: vi.fn(), disconnect: vi.fn(), onprocessorerror: null as any }
  vi.stubGlobal('AudioWorkletNode', vi.fn(() => node))
  const context = { audioWorklet: { addModule: vi.fn().mockResolvedValue(undefined) }, state: 'suspended' } as any
  const callbacks = { onEvent: vi.fn(), onPlan: vi.fn(), onError: vi.fn() }
  return { node, context, callbacks }
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
describe('production live worklet bridge', () => {
  it('waits for instrument receipt, including with a suspended context, without transferring source buffers', async () => {
    const { node, context, callbacks } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const ready = vi.fn()
    const pending = bridge.prepare(instrument).then(ready)
    await Promise.resolve()
    expect(ready).not.toHaveBeenCalled()
    expect(node.port.postMessage).toHaveBeenCalledWith({ type: 'prepare', requestId: 1, instrument })
    node.port.onmessage({ data: { type: 'prepared', requestId: 1 } })
    await pending
    expect(ready).toHaveBeenCalledOnce()
    bridge.dispose()
  })
  it('rejects missing acknowledgements and pending preparation on disposal', async () => {
    vi.useFakeTimers()
    const { context, callbacks, node } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const first = expect(bridge.prepare(instrument)).rejects.toThrow('not acknowledged')
    await vi.advanceTimersByTimeAsync(5000)
    await first
    const second = expect(bridge.prepare(instrument)).rejects.toThrow('disposed')
    bridge.dispose(); bridge.dispose()
    await second
    expect(node.disconnect).toHaveBeenCalledOnce()
    expect(node.port.close).toHaveBeenCalledOnce()
    expect(vi.getTimerCount()).toBe(0)
  })
  it('reports processor failure and relays timing events without a main-thread scheduler', async () => {
    const { context, callbacks, node } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const event = { phase: 'attack', noteId: '1', ownerId: 'a', instrumentId: 'sine', pitch: 60, at: .125 }
    node.port.onmessage({ data: { type: 'event', event } })
    node.port.onmessage({ data: { type: 'plan', events: [event] } })
    expect(callbacks.onEvent).toHaveBeenCalledWith(event)
    expect(callbacks.onPlan).toHaveBeenCalledWith([event])
    const pending = expect(bridge.prepare(instrument)).rejects.toThrow('processor failed')
    node.onprocessorerror()
    await pending
    expect(callbacks.onError).toHaveBeenCalledOnce()
    bridge.dispose()
  })

  it('waits for retired PCM acknowledgement and requests instant removal while suspended', async () => {
    const { context, callbacks, node } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const done = vi.fn()
    const forgotten = bridge.forget('sine').then(done)
    expect(node.port.postMessage).toHaveBeenCalledWith({ type: 'forget', requestId: 1, instrumentId: 'sine', instant: true })
    await Promise.resolve()
    expect(done).not.toHaveBeenCalled()
    node.port.onmessage({ data: { type: 'forgotten', requestId: 1 } })
    await forgotten
    expect(done).toHaveBeenCalledOnce()
    bridge.dispose()
  })

  it('finishes a pending retirement if the context suspends before its fade renders', async () => {
    const { context, callbacks, node } = setup()
    context.state = 'running'
    context.addEventListener = vi.fn()
    context.removeEventListener = vi.fn()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const forgotten = bridge.forget('sine')
    expect(node.port.postMessage).toHaveBeenLastCalledWith({ type: 'forget', requestId: 1, instrumentId: 'sine', instant: false })
    context.state = 'suspended'
    context.addEventListener.mock.calls[0][1]()
    expect(node.port.postMessage).toHaveBeenLastCalledWith({ type: 'forget', requestId: 1, instrumentId: 'sine', instant: true })
    node.port.onmessage({ data: { type: 'forgotten', requestId: 1 } })
    await forgotten
    bridge.dispose()
    expect(context.removeEventListener).toHaveBeenCalledOnce()
  })
})
