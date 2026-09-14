import { describe, expect, it, vi } from 'vitest'
import { createAudioDiagnostics, getAudioDiagnostics } from '@/services/audioDiagnostics'

vi.mock('@/services/livePlayback', () => ({
  getLivePlaybackDiagnostics: () => ({ backend: 'audio-worklet', preparationLeadMs: 0 }),
}))

vi.mock('superdough', () => ({ maxPolyphony: 32 }))
vi.mock('@/services/superdoughAudio', () => ({
  getAudioContext: () => ({ state: 'running', currentTime: 2, sampleRate: 48000 }),
}))

const clock = { state: 'running' as const, currentTime: 10, sampleRate: 48000 }

describe('audio diagnostics snapshots', () => {
  it('distinguishes unsupported latency APIs from a supported zero estimate', () => {
    const absent = createAudioDiagnostics(clock, 128, 1000)
    expect(absent.baseLatency).toEqual({ status: 'unsupported', seconds: null })
    expect(absent.outputLatency).toEqual({ status: 'unsupported', seconds: null })
    expect(absent.outputClock.status).toBe('unsupported')
    expect(createAudioDiagnostics({ ...clock, baseLatency: 0 }, 128, 1000).baseLatency)
      .toEqual({ status: 'available', seconds: 0 })
  })

  it('preserves valid device clock fields and identifies estimates explicitly', () => {
    const snapshot = createAudioDiagnostics({
      ...clock, baseLatency: .01, outputLatency: .04,
      getOutputTimestamp: () => ({ contextTime: 9.96, performanceTime: 1000 }),
    }, 128, 1010)
    expect(snapshot).toMatchObject({
      sampledAtPerformanceMs: 1010, state: 'running', sampleRateHz: 48000,
      contextTimeSeconds: 10, maxPolyphony: 128,
      latencyBasis: 'browser-estimates-not-measured-device-latency',
      baseLatency: { status: 'available', seconds: .01 },
      outputLatency: { status: 'available', seconds: .04 },
      outputClock: { status: 'available', contextTimeSeconds: 9.96, performanceTimeMs: 1000 },
    })
  })

  it('reports invalid or not-yet-running clocks as unavailable without inventing zeros', () => {
    const snapshot = createAudioDiagnostics({
      ...clock, currentTime: NaN, sampleRate: 0, baseLatency: NaN, outputLatency: -1,
      getOutputTimestamp: () => ({ contextTime: 0, performanceTime: 0 }),
    }, NaN, 1000)
    expect(snapshot.contextTimeSeconds).toBeNull()
    expect(snapshot.sampleRateHz).toBeNull()
    expect(snapshot.maxPolyphony).toBeNull()
    expect(snapshot.baseLatency).toEqual({ status: 'unavailable', seconds: null })
    expect(snapshot.outputLatency).toEqual({ status: 'unavailable', seconds: null })
    expect(snapshot.outputClock).toEqual({ status: 'unavailable', contextTimeSeconds: null, performanceTimeMs: null })
  })

  it('tolerates a supported output clock that cannot currently be read', () => {
    expect(createAudioDiagnostics({
      ...clock, getOutputTimestamp() { throw new Error('context closed') },
    }, 128, 1000).outputClock.status).toBe('unavailable')
  })

  it('reports the selected renderer lead without confusing fallback or device latency', () => {
    expect(getAudioDiagnostics()).toMatchObject({ live: null, liveSchedulingLeadMs: null, fallbackSchedulingLeadMs: 5 })
    expect(getAudioDiagnostics('piano')).toMatchObject({
      live: { backend: 'audio-worklet' }, liveSchedulingLeadMs: 0, maxPolyphony: 64,
    })
  })

  it('reads the application context and engine limit through the exported getter', () => {
    expect(getAudioDiagnostics()).toMatchObject({ state: 'running', contextTimeSeconds: 2, maxPolyphony: 32 })
  })
})
