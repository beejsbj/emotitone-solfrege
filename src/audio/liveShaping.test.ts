import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createLiveShapingChain, LIVE_DELAY_FEEDBACK, LIVE_DELAY_TIME_SECONDS, type LiveOrbitSends } from './liveShaping'

class FakeParam {
  value: number
  constructor(value: number) { this.value = value }
  setTargetAtTime = vi.fn((value: number) => { this.value = value })
}
class FakeNode {
  targets = new Set<FakeNode>()
  connect = vi.fn((node: FakeNode) => { this.targets.add(node); return node })
  disconnect = vi.fn(() => this.targets.clear())
}
class FakeGain extends FakeNode {
  gain: FakeParam
  constructor(_context?: unknown, options?: { gain?: number }) { super(); this.gain = new FakeParam(options?.gain ?? 1) }
}
class FakeFilter extends FakeNode {
  frequency: FakeParam
  Q: FakeParam
  constructor(_context: unknown, options: { frequency: number; Q: number }) {
    super()
    this.frequency = new FakeParam(options.frequency)
    this.Q = new FakeParam(options.Q)
  }
}

const open = { cutoff: 12000, resonance: 0, room: 0, delay: 0 }
const context = { currentTime: 3 } as BaseAudioContext

function setup() {
  const destination = new FakeNode()
  const orbit = {
    getDelay: vi.fn(() => new FakeNode()),
    getReverb: vi.fn(() => new FakeNode()),
    sendDelay: vi.fn((from: FakeNode, amount: number) => { const send = new FakeGain(undefined, { gain: amount }); from.connect(send); return send }),
    sendReverb: vi.fn((from: FakeNode, amount: number) => { const send = new FakeGain(undefined, { gain: amount }); from.connect(send); return send }),
  }
  const chain = createLiveShapingChain(context, destination as unknown as AudioNode,
    () => orbit as unknown as LiveOrbitSends)
  const input = chain.input as unknown as FakeGain
  const [next] = [...input.targets]
  return { chain, orbit, destination, input, post: next as FakeGain }
}

beforeEach(() => {
  vi.stubGlobal('GainNode', FakeGain)
  vi.stubGlobal('BiquadFilterNode', FakeFilter)
})
afterEach(() => vi.unstubAllGlobals())

describe('live Shape chain', () => {
  it('passes the worklet straight to the master output when untouched', () => {
    const { chain, orbit, destination, input, post } = setup()
    chain.apply(open)
    expect(input.targets).toEqual(new Set([post]))
    expect(post.targets).toEqual(new Set([destination]))
    expect(orbit.getReverb).not.toHaveBeenCalled()
    expect(orbit.getDelay).not.toHaveBeenCalled()
  })

  it('inserts the lowpass below the open cutoff, with Superdough resonance rules', () => {
    const { chain, input, post } = setup()
    chain.apply({ ...open, cutoff: 800, resonance: 4 })
    const [filter] = [...input.targets] as unknown as FakeFilter[]
    expect(filter).toBeInstanceOf(FakeFilter)
    expect(filter.targets).toEqual(new Set([post]))
    expect(filter.frequency.value).toBe(800)
    expect(filter.Q.value).toBe(4)
    chain.apply({ ...open, cutoff: 800, resonance: 0 })
    expect(filter.Q.value).toBe(1)
    chain.apply(open)
    expect(input.targets).toEqual(new Set([post]))
  })

  it('sends into the orbit reverb and echo, created once and faded to zero when off', () => {
    const { chain, orbit, post } = setup()
    chain.apply({ ...open, room: .5, delay: .3 })
    expect(orbit.getReverb).toHaveBeenCalledOnce()
    expect(orbit.getDelay).toHaveBeenCalledWith(LIVE_DELAY_TIME_SECONDS, LIVE_DELAY_FEEDBACK, 3)
    expect(orbit.sendReverb).toHaveBeenCalledWith(post, 0)
    const reverbSend = orbit.sendReverb.mock.results[0].value as FakeGain
    const delaySend = orbit.sendDelay.mock.results[0].value as FakeGain
    expect(reverbSend.gain.value).toBe(.5)
    expect(delaySend.gain.value).toBe(.3)
    chain.apply(open)
    expect(reverbSend.gain.value).toBe(0)
    expect(delaySend.gain.value).toBe(0)
    chain.apply({ ...open, room: .2 })
    expect(orbit.sendReverb).toHaveBeenCalledOnce()
    expect(reverbSend.gain.value).toBe(.2)
  })

  it('disconnects every node it owns on dispose', () => {
    const { chain, orbit, input, post } = setup()
    chain.apply({ ...open, cutoff: 500, room: .5 })
    chain.dispose()
    expect(input.disconnect).toHaveBeenCalled()
    expect(post.disconnect).toHaveBeenCalled()
    expect((orbit.sendReverb.mock.results[0].value as FakeGain).disconnect).toHaveBeenCalled()
  })
})
