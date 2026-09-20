import { LiveAudioCore } from './core'
import type { LiveCommand, LiveResponse } from './types'

// Worklet globals are not part of TypeScript's DOM declarations.
declare const sampleRate: number
declare const currentFrame: number
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void

class LivePlaybackProcessor extends AudioWorkletProcessor {
  private core: LiveAudioCore
  private responses: LiveResponse[] = []
  constructor(options?: { processorOptions?: { instanceId?: string } }) {
    super()
    this.core = new LiveAudioCore(sampleRate, message => this.responses.push(message), options?.processorOptions?.instanceId)
    this.port.onmessage = ({ data }: MessageEvent<LiveCommand>) => {
      try { this.core.command(data, currentFrame) } finally { this.flushResponses() }
    }
  }
  private flushResponses() {
    if (!this.responses.length) return
    const batch = this.responses
    this.responses = []
    // Preserve each exact response while sharing its existing synchronous
    // command/render boundary. Quiet quanta create no replacement batch.
    this.port.postMessage(batch)
  }
  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    try {
      if (outputs[0]) this.core.render(outputs[0], currentFrame)
    } finally { this.flushResponses() }
    return true
  }
}

registerProcessor('emotitone-live', LivePlaybackProcessor)
