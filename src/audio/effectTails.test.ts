import { afterEach, beforeEach, expect, it, vi } from 'vitest'

/**
 * The Looper's "cut" tail policy (BJS-491) at the Web Audio graph seam: a
 * minimal graph that records connections and automation, since node has no
 * Web Audio. The default policy ("ring") never calls this.
 */
class Param {
  events: [string, number, number][] = []
  constructor(public value: number) {}
  setValueAtTime(value: number, at: number) { this.events.push(['set', value, at]); this.value = value }
  linearRampToValueAtTime(value: number, at: number) { this.events.push(['ramp', value, at]) }
}
class Node {
  outputs = new Set<Node>()
  connect<T extends Node>(node: T) { this.outputs.add(node); return node }
  disconnect(node?: Node) { if (node) this.outputs.delete(node); else this.outputs.clear() }
}
class FakeGain extends Node { gain: Param; constructor(_: unknown, options?: { gain?: number }) { super(); this.gain = new Param(options?.gain ?? 1) } }
class FakeDelay extends Node { delayTime: Param; constructor(_: unknown, options?: { delayTime?: number }) { super(); this.delayTime = new Param(options?.delayTime ?? 0) } }
class FakeConvolver extends Node { buffer: unknown; constructor(_: unknown, options?: { buffer?: unknown }) { super(); this.buffer = options?.buffer ?? null } }
const impulse = { rendered: true }
class FakeOffline {
  destination = new Node()
  createBufferSource() { return Object.assign(new Node(), { buffer: null, start() {} }) }
  createBiquadFilter() { return Object.assign(new Node(), { type: '', Q: new Param(0), frequency: new Param(0) }) }
  async startRendering() { return impulse }
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.stubGlobal('GainNode', FakeGain)
  vi.stubGlobal('DelayNode', FakeDelay)
  vi.stubGlobal('ConvolverNode', FakeConvolver)
  vi.stubGlobal('OfflineAudioContext', FakeOffline)
})
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals() })

it('fades what the shared room and delay hold in 10 ms and continues on fresh nodes with the same settings', async () => {
  const { EffectOrbit } = await import('./effects')
  const context = { currentTime: 0, sampleRate: 100, createBuffer: (_: number, frames: number) => ({ getChannelData: () => new Float32Array(frames) }) }
  const orbit = new EffectOrbit(context as unknown as BaseAudioContext, new Node() as unknown as AudioNode)
  const internals = orbit as unknown as { delay: FakeDelay; feedback: FakeGain; wet: FakeGain; convolver: FakeConvolver; summingNode: Node; roomInput: Node; delayInput: Node }
  orbit.getDelay(.25, .3, 0)
  await orbit.ready()
  const old = { delay: internals.delay, feedback: internals.feedback, wet: internals.wet, convolver: internals.convolver }
  expect(old.convolver.buffer).toBe(impulse)

  orbit.cutTails(.01, 5)

  // The old returns now reach the output only through a gain falling from 1 to 0 over 10 ms.
  const fades = [...old.wet.outputs, ...old.convolver.outputs] as FakeGain[]
  expect(new Set(fades).size).toBe(1)
  const [fade] = fades
  expect(fade.outputs).toEqual(new Set([internals.summingNode]))
  expect(fade.gain.events).toEqual([['set', 1, 5], ['ramp', 0, 5.01]])
  expect(old.wet.outputs.has(internals.summingNode) || old.convolver.outputs.has(internals.summingNode)).toBe(false)
  // New sound goes into fresh nodes: same impulse, same delay time and feedback.
  expect([...internals.roomInput.outputs]).toEqual([internals.convolver])
  expect(internals.convolver).not.toBe(old.convolver)
  expect(internals.convolver.buffer).toBe(impulse)
  expect(internals.convolver.outputs).toEqual(new Set([internals.summingNode]))
  expect([...internals.delayInput.outputs]).toEqual([internals.delay])
  expect(internals.delay).not.toBe(old.delay)
  expect(internals.delay.delayTime.value).toBe(.25)
  expect(internals.feedback.gain.value).toBeCloseTo(.3)
  expect(internals.wet.outputs).toEqual(new Set([internals.summingNode]))
  // Once the fade is over, the old nodes are released.
  vi.advanceTimersByTime(100)
  for (const node of [...Object.values(old), fade]) expect(node.outputs.size).toBe(0)
})
