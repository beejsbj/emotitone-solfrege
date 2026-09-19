import processorUrl from './processor.ts?worker&url'
import type { LiveCommand, LiveResponse, LiveWorklet } from './types'

let engineSerial = 0

export type { LiveRendererCallbacks as LiveWorkletCallbacks } from '../liveRenderer'
import type { LiveRendererCallbacks as LiveWorkletCallbacks } from '../liveRenderer'

/** Installs one persistent mixer. Input messages never wait for a beat timer. */
export async function createLiveWorklet(context: AudioContext, destination: AudioNode,
  callbacks: LiveWorkletCallbacks): Promise<LiveWorklet> {
  await context.audioWorklet.addModule(processorUrl)
  const node = new AudioWorkletNode(context, 'emotitone-live', {
    numberOfInputs: 0, numberOfOutputs: 1, outputChannelCount: [2], channelCount: 2,
    processorOptions: { instanceId: `worklet-${Date.now()}-${++engineSerial}` },
  })
  node.connect(destination)
  let disposed = false
  let requestId = 0
  const pending = new Map<number, { resolve(): void; reject(error: Error): void;
    timer: ReturnType<typeof setTimeout>; retiringInstrument?: string }>()
  function rejectPending(error: Error) {
    for (const entry of pending.values()) { clearTimeout(entry.timer); entry.reject(error) }
    pending.clear()
  }
  function fail(error: Error) {
    if (disposed) return
    rejectPending(error)
    callbacks.onError?.(error)
  }
  function post(command: LiveCommand) {
    if (disposed) return
    try { node.port.postMessage(command) } catch (error) {
      fail(error instanceof Error ? error : new Error(String(error)))
    }
  }
  node.port.onmessage = ({ data }: MessageEvent<LiveResponse>) => {
    if (disposed) return
    if (data.type === 'event') callbacks.onEvent(data.event)
    else if (data.type === 'plan') callbacks.onPlan?.(data.events)
    else if (data.type === 'owner-ended') callbacks.onOwnerEnded?.(data.ownerId)
    else if (data.type === 'prepared' || data.type === 'forgotten') {
      const entry = pending.get(data.requestId)
      if (entry) { clearTimeout(entry.timer); pending.delete(data.requestId); entry.resolve() }
    }
  }
  node.port.onmessageerror = () => fail(new Error('Live audio worklet message could not be decoded'))
  node.onprocessorerror = () => fail(new Error('Live audio worklet processor failed'))
  const onStateChange = () => {
    if (context.state === 'running') return
    if (context.state === 'closed') { fail(new Error('Live audio context closed')); return }
    // A suspend halfway through a retirement fade stops render callbacks.
    // Finish its bookkeeping immediately instead of waiting for a dead clock.
    for (const [id, entry] of pending) if (entry.retiringInstrument) {
      post({ type: 'forget', requestId: id, instrumentId: entry.retiringInstrument, instant: true })
    }
  }
  context.addEventListener?.('statechange', onStateChange)

  return {
    prepare(instrument) {
      if (disposed) return Promise.reject(new Error('Live audio worklet has been disposed'))
      const id = ++requestId
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error('Live audio instrument preparation was not acknowledged'))
        }, 5000)
        pending.set(id, { resolve, reject, timer })
        // Structured cloning preserves borrowed AudioBuffer memory used by
        // the fallback renderer and by the prepared instrument cache.
        post({ type: 'prepare', requestId: id, instrument })
      })
    },
    forget(instrumentId) {
      if (disposed) return Promise.reject(new Error('Live audio worklet has been disposed'))
      const id = ++requestId
      return new Promise<void>((resolve, reject) => {
        const timer = setTimeout(() => {
          pending.delete(id)
          reject(new Error('Live audio instrument retirement was not acknowledged'))
        }, 5000)
        pending.set(id, { resolve, reject, timer, retiringInstrument: instrumentId })
        post({ type: 'forget', requestId: id, instrumentId, instant: context.state !== 'running' })
      })
    },
    press: (ownerId, notes) => post({ type: 'press', ownerId, notes }),
    release: ownerId => post({ type: 'release', ownerId }),
    configure: config => post({ type: 'configure', config }),
    clear: () => post({ type: 'clear' }),
    dispose() {
      if (disposed) return
      post({ type: 'clear' })
      disposed = true
      rejectPending(new Error('Live audio worklet has been disposed'))
      node.port.onmessage = node.port.onmessageerror = null
      node.onprocessorerror = null
      context.removeEventListener?.('statechange', onStateChange)
      node.port.close()
      node.disconnect()
    },
  }
}
