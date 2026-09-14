import { LiveAudioCore } from './core'
import type { LiveCommand } from './types'

// Worklet globals are not part of TypeScript's DOM declarations.
declare const sampleRate: number
declare const currentFrame: number
declare class AudioWorkletProcessor {
  readonly port: MessagePort
}
declare function registerProcessor(name: string, processor: typeof AudioWorkletProcessor): void

class LivePlaybackProcessor extends AudioWorkletProcessor {
  private core: LiveAudioCore
  constructor(options?: { processorOptions?: { instanceId?: string } }) {
    super()
    this.core = new LiveAudioCore(sampleRate, message => this.port.postMessage(message), options?.processorOptions?.instanceId)
    this.port.onmessage = ({ data }: MessageEvent<LiveCommand>) => this.core.command(data, currentFrame)
  }
  process(_inputs: Float32Array[][], outputs: Float32Array[][]) {
    if (outputs[0]) this.core.render(outputs[0], currentFrame)
    return true
  }
}

registerProcessor('emotitone-live', LivePlaybackProcessor)
