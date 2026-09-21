import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ create: vi.fn(), prepare: vi.fn(), nativeCreate: vi.fn(), nativePrepare: vi.fn(), releasePrepared: vi.fn(), preparationDiagnostics: vi.fn() }))
vi.mock('@/audio/live/bridge', () => ({ createLiveWorklet: mocks.create }))
vi.mock('@/services/preparedLiveInstrument', () => ({ prepareLiveInstrument: mocks.prepare,
  releasePreparedLiveInstrument: mocks.releasePrepared, getPreparedLiveInstrumentDiagnostics: mocks.preparationDiagnostics }))
vi.mock('./native/renderer', () => ({ createPreparedNativeRenderer: mocks.nativeCreate }))
vi.mock('@/services/preparedNativeInstrument', () => ({ prepareNativeInstrument: mocks.nativePrepare }))
vi.mock('@/services/liveInstrumentNames', () => ({ resolveLiveSoundName: (name: string) => name }))

const bank = (instrumentId: string) => ({ kind: 'oscillator', instrumentId, waveform: 'sine',
  gain: .3, attack: 0, decay: 0, sustain: 1, release: .01 })
const context = () => ({ audioWorklet: {}, state: 'running' }) as AudioContext
const destination = {} as AudioNode
async function setup() {
  const engine = { prepare: vi.fn().mockResolvedValue(undefined), forget: vi.fn(), press: vi.fn(),
    release: vi.fn(), clear: vi.fn(), configure: vi.fn(), dispose: vi.fn() }
  mocks.create.mockResolvedValue(engine)
  mocks.prepare.mockImplementation(async (_context, name) => bank(name))
  mocks.preparationDiagnostics.mockReturnValue({ cachedPreparationPcmBytes: 0, preparingPcmBytes: 0, preparationPcmBudgetBytes: 192 * 1024 * 1024 })
  return { engine, manager: await import('./livePlayback'), context: context() }
}
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubGlobal('AudioWorkletNode', vi.fn()) })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('native playback adapter selection', () => {
  it('prepares without AudioWorklet and counts borrowed PCM without allocating worklet data', async () => {
    vi.stubEnv('VITE_LIVE_AUDIO_BACKEND', 'native')
    vi.stubGlobal('AudioWorkletNode', undefined)
    const { manager, engine, context } = await setup()
    mocks.nativeCreate.mockReturnValue(engine)
    const buffer = { length: 48000, numberOfChannels: 2 } as AudioBuffer
    mocks.nativePrepare.mockResolvedValue({ ...bank('piano'), kind: 'sample-bank', zoneSelection: 'nearest-root',
      zones: [{ id: 'a', rootMidi: 60, buffer }, { id: 'b', rootMidi: 72, buffer }] })
    await manager.prepareLivePlayback(context, destination, 'piano')
    expect(mocks.prepare).not.toHaveBeenCalled()
    expect(mocks.create).not.toHaveBeenCalled()
    expect(engine.prepare.mock.calls[0][0].zones[0].buffer).toBe(buffer)
    expect(manager.getLivePlaybackDiagnostics('piano')).toMatchObject({ backend: 'native-web-audio',
      requestedBackend: 'native', installedPcmBytes: 48000 * 2 * 4, additionalPcmBytes: 0,
      preparationLeadMs: 0, lookaheadMs: 400 })
    expect(manager.needsLivePlaybackPreparation('piano')).toBe(false)
    expect(manager.needsLivePlaybackPreparation('other')).toBe(true)
  })

  it('preserves fallback reasons for native catalog gaps', async () => {
    vi.stubEnv('VITE_LIVE_AUDIO_BACKEND', 'native')
    const { manager, context } = await setup()
    mocks.nativePrepare.mockResolvedValue({ kind: 'unsupported', instrumentId: 'noise', reason: 'Unsupported source' })
    await manager.prepareLivePlayback(context, destination, 'noise')
    expect(manager.getLivePlayback('noise')).toBeUndefined()
    expect(manager.needsLivePlaybackPreparation('noise')).toBe(false)
    expect(manager.getLivePlaybackDiagnostics('noise')).toMatchObject({ backend: 'superdough', reason: 'Unsupported source' })
    expect(mocks.nativeCreate).not.toHaveBeenCalled()
  })
})
