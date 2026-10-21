import { afterEach, expect, it, vi } from 'vitest'
import { createLiveShapingChain, type LiveOrbitSends } from './liveShaping'

class Node {
  targets = new Set<Node>()
  connect(target: Node) { this.targets.add(target); return target }
  disconnect() { this.targets.clear() }
}
afterEach(() => vi.unstubAllGlobals())
it('connects separate dry/room/delay worklet outputs and disconnects its edges on disposal', () => {
  vi.stubGlobal('GainNode', Node)
  const destination = new Node(), roomBus = new Node(), delayBus = new Node()
  const orbit = { getReverb: () => roomBus, getDelay: () => delayBus } as unknown as LiveOrbitSends
  const chain = createLiveShapingChain({ currentTime: 0 } as BaseAudioContext, destination as unknown as AudioNode, () => orbit)
  expect((chain.input as unknown as Node).targets).toEqual(new Set([destination]))
  expect((chain.room as unknown as Node).targets).toEqual(new Set([roomBus]))
  expect((chain.delay as unknown as Node).targets).toEqual(new Set([delayBus]))
  chain.dispose()
  for (const node of [chain.input, chain.room, chain.delay]) expect((node as unknown as Node).targets.size).toBe(0)
})
