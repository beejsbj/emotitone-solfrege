import { getAudioContext } from '@/services/superdoughAudio'
import { getLivePlaybackDiagnostics } from '@/services/livePlayback'
import { LIVE_AUDIO_SCHEDULING_LEAD_MS } from '@/services/liveAudioTiming'
// @ts-ignore superdough does not publish declarations
import { maxPolyphony } from 'superdough'

type DiagnosticContext = Pick<AudioContext, 'state' | 'currentTime' | 'sampleRate'>
  & Partial<Pick<AudioContext, 'baseLatency' | 'outputLatency' | 'getOutputTimestamp'>>
type Availability = 'available' | 'unavailable' | 'unsupported'

interface LatencyEstimate {
  status: Availability
  seconds: number | null
}

function nonnegative(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
}

function latency(context: DiagnosticContext, key: 'baseLatency' | 'outputLatency'): LatencyEstimate {
  if (!(key in context)) return { status: 'unsupported', seconds: null }
  const value = context[key]
  return nonnegative(value)
    ? { status: 'available', seconds: value }
    : { status: 'unavailable', seconds: null }
}

/** A read-only snapshot. Latency fields are browser estimates, not measured
 * input-to-speaker delay; unavailable values deliberately remain null. */
export function createAudioDiagnostics(context: DiagnosticContext, voiceLimit: number, sampledAtPerformanceMs: number) {
  const outputClock: {
    status: Availability
    contextTimeSeconds: number | null
    performanceTimeMs: number | null
  } = { status: 'unsupported', contextTimeSeconds: null, performanceTimeMs: null }
  if (typeof context.getOutputTimestamp === 'function') {
    outputClock.status = 'unavailable'
    try {
      const timestamp = context.getOutputTimestamp()
      if (nonnegative(timestamp.contextTime) && nonnegative(timestamp.performanceTime) && timestamp.performanceTime > 0) {
        outputClock.status = 'available'
        outputClock.contextTimeSeconds = timestamp.contextTime
        outputClock.performanceTimeMs = timestamp.performanceTime
      }
    } catch {
      // A supported API may not have an output clock while suspended/closed.
    }
  }
  return {
    sampledAtPerformanceMs,
    state: context.state,
    sampleRateHz: nonnegative(context.sampleRate) && context.sampleRate > 0 ? context.sampleRate : null,
    contextTimeSeconds: nonnegative(context.currentTime) ? context.currentTime : null,
    fallbackSchedulingLeadMs: LIVE_AUDIO_SCHEDULING_LEAD_MS,
    maxPolyphony: Number.isSafeInteger(voiceLimit) && voiceLimit > 0 ? voiceLimit : null,
    latencyBasis: 'browser-estimates-not-measured-device-latency' as const,
    baseLatency: latency(context, 'baseLatency'),
    outputLatency: latency(context, 'outputLatency'),
    outputClock,
  }
}

/** Call after audio initialization when inspecting the application's context. */
export function getAudioDiagnostics(instrument?: string) {
  const live = instrument ? getLivePlaybackDiagnostics(instrument) : null
  return {
    ...createAudioDiagnostics(getAudioContext(), live?.backend === 'audio-worklet' ? 128 : maxPolyphony, performance.now()),
    live,
    liveSchedulingLeadMs: live?.preparationLeadMs ?? null,
  }
}
