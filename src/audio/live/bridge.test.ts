import { afterEach, describe, expect, it, vi } from 'vitest'
import { nextTick, reactive, watch } from 'vue'
import { createLiveWorklet } from './bridge'
import type { LiveResponse, LiveVoiceEvent, PreparedLiveInstrument } from './types'

const instrument: PreparedLiveInstrument = { kind: 'oscillator', instrumentId: 'sine', waveform: 'sine',
  gain: .2, attack: 0, decay: 0, sustain: 1, release: .01 }
function setup() {
  // The worklet receive tasks and the inbox drain task are deliberately
  // distinct. No timer, RAF, or microtask stands in for MessageChannel.
  const tasks: (() => void)[] = []
  const channels: any[] = []
  vi.stubGlobal('MessageChannel', class {
    port1 = { onmessage: null as any, close: vi.fn(() => { this.port1.onmessage = null }) }
    port2 = { postMessage: vi.fn((data: unknown) => {
      tasks.push(() => this.port1.onmessage?.({ data }))
    }), close: vi.fn() }
    constructor() { channels.push(this) }
  })
  const node = { port: { postMessage: vi.fn(), close: vi.fn(), onmessage: null as any, onmessageerror: null as any },
    connect: vi.fn(), disconnect: vi.fn(), onprocessorerror: null as any }
  vi.stubGlobal('AudioWorkletNode', vi.fn(() => node))
  const context = { audioWorklet: { addModule: vi.fn().mockResolvedValue(undefined) }, state: 'suspended' } as any
  const callbacks = { onEvent: vi.fn(), onPlan: vi.fn(), onExpressionOwner: vi.fn(), onOwnerEnded: vi.fn(), onError: vi.fn() }
  const drain = () => { tasks.shift()?.() }
  return { node, context, callbacks, tasks, channels, drain }
}
afterEach(() => { vi.unstubAllGlobals(); vi.useRealTimers() })
describe('production live worklet bridge', () => {
  it('waits for instrument receipt, including with a suspended context, without transferring source buffers', async () => {
    const { node, context, callbacks, drain } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const ready = vi.fn()
    const pending = bridge.prepare(instrument).then(ready)
    await Promise.resolve()
    expect(ready).not.toHaveBeenCalled()
    expect(node.port.postMessage).toHaveBeenCalledWith({ type: 'prepare', requestId: 1, instrument })
    node.port.onmessage({ data: { type: 'prepared', requestId: 1 } })
    drain()
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
    const { context, callbacks, node, drain } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const event = { phase: 'attack', noteId: '1', ownerId: 'a', instrumentId: 'sine', pitch: 60, at: .125 }
    node.port.onmessage({ data: { type: 'event', event } })
    node.port.onmessage({ data: { type: 'plan', events: [event] } })
    drain()
    expect(callbacks.onEvent).toHaveBeenCalledWith(event)
    expect(callbacks.onPlan).toHaveBeenCalledWith([event])
    const pending = expect(bridge.prepare(instrument)).rejects.toThrow('processor failed')
    node.onprocessorerror()
    await pending
    expect(callbacks.onError).toHaveBeenCalledOnce()
    bridge.dispose()
  })

  it('transports bounded pitch expression commands to the worklet', async () => {
    const { context, callbacks, node } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    bridge.setPitchBend?.('finger', 37.5)
    expect(node.port.postMessage).toHaveBeenCalledWith({ type: 'pitch-bend', ownerId: 'finger', cents: 37.5 })
    bridge.dispose()
  })

  it('transports per-owner gain expression commands to the worklet', async () => {
    const { context, callbacks, node } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    bridge.setGain?.('finger', .75)
    expect(node.port.postMessage).toHaveBeenCalledWith({ type: 'gain-expression', ownerId: 'finger', gain: .75 })
    bridge.dispose()
  })

  it('delivers a shared voice expression handoff through the ordered worklet drain', async () => {
    const { context, callbacks, node, drain } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const change = { type: 'expression-owner' as const, noteId: 'voice', ownerId: 'second',
      at: .011, cents: -30, gain: 1.5 }
    node.port.onmessage({ data: change })
    expect(callbacks.onExpressionOwner).not.toHaveBeenCalled()
    drain()
    expect(callbacks.onExpressionOwner).toHaveBeenCalledWith(change)
    bridge.dispose()
  })

  it('waits for retired PCM acknowledgement and requests instant removal while suspended', async () => {
    const { context, callbacks, node, drain } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const done = vi.fn()
    const forgotten = bridge.forget('sine').then(done)
    expect(node.port.postMessage).toHaveBeenCalledWith({ type: 'forget', requestId: 1, instrumentId: 'sine', instant: true })
    await Promise.resolve()
    expect(done).not.toHaveBeenCalled()
    node.port.onmessage({ data: { type: 'forgotten', requestId: 1 } })
    drain()
    await forgotten
    expect(done).toHaveBeenCalledOnce()
    bridge.dispose()
  })

  it('finishes a pending retirement if the context suspends before its fade renders', async () => {
    const { context, callbacks, node, drain } = setup()
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
    drain()
    await forgotten
    bridge.dispose()
    expect(context.removeEventListener).toHaveBeenCalledOnce()
  })

  it('delivers separately received lifecycle edges in one queued task and one Vue flush', async () => {
    const { context, callbacks, node, tasks, drain } = setup()
    const state = reactive({ events: [] as LiveVoiceEvent[] })
    const flushes: number[] = []
    const stop = watch(() => state.events.length, count => flushes.push(count))
    callbacks.onEvent.mockImplementation(event => state.events.push(event))
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const events: LiveVoiceEvent[] = ['attack', 'release', 'attack'].map((phase, index) => ({
      phase: phase as LiveVoiceEvent['phase'], noteId: String(index), ownerId: 'owner',
      instrumentId: 'sine', pitch: 60 + index, style: 'repeat', at: 1 + index / 8,
    }))
    try {
      for (const event of events) {
        node.port.onmessage({ data: { type: 'event', event } })
        // A microtask checkpoint follows each separate incoming port task.
        await nextTick()
      }
      expect(state.events).toEqual([])
      expect(flushes).toEqual([])
      expect(tasks).toHaveLength(1)
      drain()
      expect(state.events).toEqual(events)
      expect(callbacks.onEvent.mock.calls.map(([event]) => event)).toEqual(events)
      await nextTick()
      expect(flushes).toEqual([3])
      expect(tasks).toHaveLength(0)
    } finally { stop(); bridge.dispose() }
  })

  it('preserves lifecycle, plan, owner, and acknowledgement order while context is suspended', async () => {
    const { context, callbacks, node, tasks, drain } = setup()
    vi.stubGlobal('requestAnimationFrame', vi.fn(() => { throw new Error('No frame clock while suspended') }))
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const order: string[] = []
    let resolved = false
    const prepared = bridge.prepare(instrument).then(() => { resolved = true; order.push('prepared') })
    const forgotten = bridge.forget('sine').then(() => order.push('forgotten'))
    callbacks.onEvent.mockImplementation(event => { expect(resolved).toBe(false); order.push(event.phase) })
    callbacks.onPlan.mockImplementation(() => order.push('plan'))
    callbacks.onOwnerEnded.mockImplementation(ownerId => order.push(ownerId))
    const event: LiveVoiceEvent = { phase: 'attack', noteId: '1', ownerId: 'owner',
      instrumentId: 'sine', pitch: 60, style: 'together', at: 12.345 }
    const responses: LiveResponse[] = [
      { type: 'event', event }, { type: 'plan', events: [event] },
      { type: 'event', event: { ...event, phase: 'release', at: 12.5 } },
      { type: 'owner-ended', ownerId: 'owner' },
      { type: 'prepared', requestId: 1 }, { type: 'forgotten', requestId: 2 },
    ]
    // Old singleton and new processor-boundary arrays can be interleaved.
    for (const data of [responses.slice(0, 2), responses[2], responses.slice(3)]) node.port.onmessage({ data })
    await Promise.resolve()
    expect(order).toEqual([])
    expect(tasks).toHaveLength(1)
    drain()
    expect(order).toEqual(['attack', 'plan', 'release', 'owner'])
    await Promise.all([prepared, forgotten])
    expect(order).toEqual(['attack', 'plan', 'release', 'owner', 'prepared', 'forgotten'])
    expect(callbacks.onEvent.mock.calls[0][0]).toBe(event)
    expect(callbacks.onPlan.mock.calls[0][0]).toBe(responses[1].type === 'plan' ? responses[1].events : null)
    bridge.dispose()
  })

  it('closes both drain ports and drops queued responses when disposed before delivery', async () => {
    const { context, callbacks, node, channels, drain } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const pending = expect(bridge.prepare(instrument)).rejects.toThrow('disposed')
    node.port.onmessage({ data: { type: 'owner-ended', ownerId: 'queued' } })
    node.port.onmessage({ data: [{ type: 'prepared', requestId: 1 }] })
    bridge.dispose()
    drain()
    await pending
    expect(callbacks.onOwnerEnded).not.toHaveBeenCalled()
    expect(channels).toHaveLength(1)
    expect(channels[0].port1.close).toHaveBeenCalledOnce()
    expect(channels[0].port2.close).toHaveBeenCalledOnce()
  })

  it('does not time out an acknowledgement already received while its ordered drain is pending', async () => {
    vi.useFakeTimers()
    const { context, callbacks, node, drain } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const ready = vi.fn()
    const failed = vi.fn()
    const pending = Promise.all([
      bridge.prepare(instrument).then(ready, failed),
      bridge.forget('sine').then(ready, failed),
    ])
    node.port.onmessage({ data: [{ type: 'prepared', requestId: 1 }, { type: 'forgotten', requestId: 2 }] })
    await vi.advanceTimersByTimeAsync(5000)
    expect(ready).not.toHaveBeenCalled()
    expect(failed).not.toHaveBeenCalled()
    drain()
    await pending
    expect(ready).toHaveBeenCalledTimes(2)
    bridge.dispose()
  })

  it('invalidates on a listener error and does not deliver the remaining batch or acknowledgements', async () => {
    const { context, callbacks, node, channels, drain } = setup()
    const bridge = await createLiveWorklet(context, {} as AudioNode, callbacks)
    const failure = new Error('listener failed')
    callbacks.onOwnerEnded.mockImplementation(() => { throw failure })
    const pending = expect(bridge.prepare(instrument)).rejects.toBe(failure)
    node.port.onmessage({ data: { type: 'owner-ended', ownerId: 'first' } })
    node.port.onmessage({ data: { type: 'owner-ended', ownerId: 'later' } })
    node.port.onmessage({ data: { type: 'prepared', requestId: 1 } })
    drain()
    await pending
    expect(callbacks.onOwnerEnded).toHaveBeenCalledTimes(1)
    expect(callbacks.onError).toHaveBeenCalledWith(failure)
    expect(node.port.close).toHaveBeenCalledOnce()
    expect(node.disconnect).toHaveBeenCalledOnce()
    expect(channels[0].port1.close).toHaveBeenCalledOnce()
    expect(channels[0].port2.close).toHaveBeenCalledOnce()
    expect(node.port.postMessage).toHaveBeenLastCalledWith({ type: 'clear' })
    bridge.dispose()
  })
})
