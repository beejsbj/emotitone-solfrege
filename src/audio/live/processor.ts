import { LiveAudioCore } from './core'
import { RenderCostMeter, renderCostClock } from './renderCost'
import type { LiveProcessorCommand, LiveResponse } from './types'

// Worklet globals are not part of TypeScript's DOM declarations.
declare const sampleRate: number
declare const currentFrame: number
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void

const clock = renderCostClock()

class LivePlaybackProcessor extends AudioWorkletProcessor {
  private core: LiveAudioCore | undefined
  private responses: LiveResponse[] = []
  /** Render cost per quantum, measured only once asked for (the phone gate). */
  private cost: RenderCostMeter | undefined
  constructor(options?: { processorOptions?: { instanceId?: string } }) {
    super()
    this.core = new LiveAudioCore(sampleRate, message => this.responses.push(message), options?.processorOptions?.instanceId)
    this.port.onmessage = ({ data }: MessageEvent<LiveProcessorCommand>) => {
      if (data.type === 'dispose') {
        this.core = undefined
        this.responses = []
        this.port.onmessage = null
        this.port.postMessage({ type: 'disposed' } satisfies LiveResponse)
        return
      }
      if (data.type === 'render-cost') {
        // Read-only: answered here, never seen by the core.
        this.cost ??= new RenderCostMeter(clock.name)
        this.responses.push({ type: 'render-cost', requestId: data.requestId, cost: this.cost.snapshot() })
        if (data.reset) this.cost.reset()
        this.flushResponses()
        return
      }
      try { this.core?.command(data, currentFrame) } finally { this.flushResponses() }
    }
  }
  private flushResponses() {
    if (!this.responses.length) return
    const batch = this.responses
    this.responses = []
    // Preserve each exact response while sharing its existing synchronous
    // command/render boundary. Quiet quanta create no replacement batch.
    // Transport event batches move, never copy; the main thread returns them.
    let transfer: ArrayBuffer[] | undefined
    for (const response of batch) if (response.type === 'transport-events') (transfer ??= []).push(response.buffer)
    if (transfer) this.port.postMessage(batch, transfer)
    else this.port.postMessage(batch)
  }
  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    if (!this.core) return false
    // The whole callback is the quantum's cost: rendering and posting its responses.
    const cost = this.cost
    const start = cost ? clock.now() : 0
    try {
      if (outputs[0]) this.core.render(outputs[0], currentFrame, outputs[1], outputs[2])
    } finally {
      this.flushResponses()
      cost?.record(clock.now() - start)
    }
    return true
  }
}

registerProcessor('emotitone-live', LivePlaybackProcessor)
