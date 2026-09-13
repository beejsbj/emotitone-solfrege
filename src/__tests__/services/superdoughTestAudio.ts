import { vi } from 'vitest'

/** Minimal Web Audio boundary: scheduled stops are replaceable, but an ended
 * source cannot emit a second ended event. The actual package owns lifecycle. */
export function createSuperdoughTestAudio() {
  const sources: Source[] = []
  const buffers: object[] = []
  const context: {
    currentTime: number
    sampleRate: number
    state: string
    destination: unknown
    createGain: () => Gain
    createBufferSource: () => Source
    createOscillator: () => Source
    createBuffer: (channels: number, length: number, sampleRate: number) => {
      length: number; duration: number; sampleRate: number; getChannelData: () => Float32Array
    }
  } = {
    currentTime: 0,
    sampleRate: 8000,
    state: 'running',
    destination: null as unknown,
    createGain: () => new Gain(context),
    createBufferSource: () => new Source(context),
    createOscillator: () => new Source(context),
    createBuffer: (_channels: number, length: number, sampleRate: number) => {
      const samples = new Float32Array(length)
      const buffer = { length, duration: length / sampleRate, sampleRate, getChannelData: () => samples }
      buffers.push(buffer)
      return buffer
    },
  }
  class Param {
    value = 1
    setValueAtTime() {}
    linearRampToValueAtTime() {}
    exponentialRampToValueAtTime() {}
    cancelScheduledValues() {}
    cancelAndHoldAtTime() {}
  }
  class Node {
    disconnected = false
    constructor(public context: typeof context) {}
    connect(node: unknown) { return node }
    disconnect() { this.disconnected = true }
  }
  class Gain extends Node { gain = new Param() }
  class Source extends Node {
    stopAt = Infinity
    naturalEnd = Infinity
    ended = false
    onended: (() => void) | null = null
    buffer: unknown
    playbackRate = new Param()
    frequency = new Param()
    detune = new Param()
    constructor(ctx: typeof context) { super(ctx); sources.push(this) }
    start(_at: number) {}
    stop(at = context.currentTime) { if (!this.ended) this.stopAt = at }
  }
  class Constant extends Source {}
  class Shaper extends Node { curve: unknown }
  context.destination = new Node(context)
  for (const [name, value] of Object.entries({
    AudioNode: Node, AudioParam: Param, GainNode: Gain,
    AudioScheduledSourceNode: Source, ConstantSourceNode: Constant,
    WaveShaperNode: Shaper, BaseAudioContext: class {},
    OfflineAudioContext: class {}, AudioWorkletNode: class {},
  })) vi.stubGlobal(name, value)

  function advance(at: number) {
    context.currentTime = at
    let changed: boolean
    do {
      changed = false
      for (const source of sources) {
        if (!source.ended && Math.min(source.stopAt, source.naturalEnd) <= at) {
          source.ended = true
          source.onended?.()
          changed = true
        }
      }
    } while (changed)
  }
  return { context, sources, buffers, Source, Constant, Shaper, advance }
}
