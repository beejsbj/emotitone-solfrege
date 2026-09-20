import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ create: vi.fn(), prepare: vi.fn() }))
vi.mock('@/audio/live/bridge', () => ({ createLiveWorklet: mocks.create }))
vi.mock('@/services/preparedLiveInstrument', () => ({ prepareLiveInstrument: mocks.prepare }))
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
  return { engine, manager: await import('@/services/livePlayback'), context: context() }
}
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); vi.stubGlobal('AudioWorkletNode', vi.fn()) })
afterEach(() => vi.unstubAllGlobals())

describe('live playback instrument manager', () => {
  it('deduplicates preparation, waits for acknowledgement and reports zero-lead readiness', async () => {
    const { manager, engine, context } = await setup()
    let acknowledge!: () => void
    engine.prepare.mockImplementation(() => new Promise<void>(resolve => { acknowledge = resolve }))
    const first = manager.prepareLivePlayback(context, destination, 'piano')
    const second = manager.prepareLivePlayback(context, destination, 'piano')
    await vi.waitFor(() => expect(engine.prepare).toHaveBeenCalledOnce())
    expect(manager.getLivePlayback('piano')).toBeUndefined()
    acknowledge(); await Promise.all([first, second])
    expect(mocks.prepare).toHaveBeenCalledOnce()
    expect(manager.needsLivePlaybackPreparation('piano')).toBe(false)
    expect(manager.getLivePlaybackDiagnostics('piano')).toMatchObject({ backend: 'audio-worklet', preparationLeadMs: 0 })
  })

  it('serializes concurrent installations and enforces the four-bank LRU', async () => {
    const { manager, engine, context } = await setup()
    let simultaneous = 0, maximum = 0
    engine.prepare.mockImplementation(async () => {
      maximum = Math.max(maximum, ++simultaneous)
      await Promise.resolve()
      simultaneous--
    })
    await Promise.all(['a', 'b', 'c', 'd', 'e', 'f'].map(name => manager.prepareLivePlayback(context, destination, name)))
    expect(maximum).toBe(1)
    expect(manager.getLivePlaybackDiagnostics('f').installedBanks, JSON.stringify(manager.getLivePlaybackDiagnostics('f'))).toBe(4)
    expect(engine.forget.mock.calls).toEqual([['a'], ['b']])
    manager.getLivePlayback('c')
    await manager.prepareLivePlayback(context, destination, 'g')
    expect(engine.forget).toHaveBeenLastCalledWith('d')
  })

  it('pins held banks until release and temporarily falls back when all four are held', async () => {
    const { manager, engine, context } = await setup()
    for (const name of ['a', 'b', 'c', 'd']) {
      await manager.prepareLivePlayback(context, destination, name)
      manager.getLivePlayback(name)!.press(name, [{ pitch: 60, instrumentId: name }])
    }
    await manager.prepareLivePlayback(context, destination, 'e')
    expect(manager.getLivePlayback('e')).toBeUndefined()
    expect(engine.forget).not.toHaveBeenCalled()
    expect(manager.needsLivePlaybackPreparation('e')).toBe(true)
    manager.getLivePlayback('a')!.release('a')
    await manager.prepareLivePlayback(context, destination, 'e')
    expect(engine.forget).toHaveBeenCalledWith('a')
    expect(manager.getLivePlayback('e')).toBeDefined()
  })

  it('includes resampling pyramids in the192MiB installed PCM budget', async () => {
    const { manager, engine, context } = await setup()
    const original = new Float32Array(10 * 1024 * 1024)
    const lowerRate = new Float32Array(5 * 1024 * 1024)
    mocks.prepare.mockImplementation(async (_context, instrumentId) => ({
      ...bank(instrumentId), kind: 'sample-bank', zoneSelection: 'nearest-root',
      zones: [{ id: 'z', rootMidi: 60, sampleRate: 48000, channels: [original], mipmaps: [[lowerRate]] }],
    }))
    for (const name of ['a', 'b', 'c', 'd']) await manager.prepareLivePlayback(context, destination, name)
    expect(engine.forget).toHaveBeenCalledWith('a')
    expect(manager.getLivePlaybackDiagnostics('d')).toMatchObject({ installedBanks: 3, installedPcmBytes: 180 * 1024 * 1024 })
  })

  it('counts retiring banks until acknowledgement and prevents new attacks from using them', async () => {
    const { manager, engine, context } = await setup()
    for (const name of ['a', 'b', 'c', 'd']) await manager.prepareLivePlayback(context, destination, name)
    let retired!: () => void
    engine.forget.mockImplementation(() => new Promise<void>(resolve => { retired = resolve }))
    const installing = manager.prepareLivePlayback(context, destination, 'e')
    await vi.waitFor(() => expect(engine.forget).toHaveBeenCalledWith('a'))
    expect(manager.getLivePlaybackDiagnostics('e').installedBanks).toBe(4)
    expect(manager.getLivePlayback('a')).toBeUndefined()
    expect(engine.prepare).toHaveBeenCalledTimes(4)
    retired(); await installing
    expect(engine.prepare).toHaveBeenCalledTimes(5)
    expect(manager.getLivePlaybackDiagnostics('e').installedBanks).toBe(4)
  })

  it('avoids retrying unsupported instruments or unavailable worklets on every note', async () => {
    const { manager, context } = await setup()
    mocks.prepare.mockResolvedValue({ kind: 'unsupported', instrumentId: 'noise', reason: 'Unsupported source' })
    await manager.prepareLivePlayback(context, destination, 'noise')
    expect(manager.needsLivePlaybackPreparation('noise')).toBe(false)
    expect(manager.getLivePlaybackDiagnostics('noise')).toMatchObject({ backend: 'superdough', reason: 'Unsupported source' })
    vi.stubGlobal('AudioWorkletNode', undefined)
    expect(manager.needsLivePlaybackPreparation('piano')).toBe(false)
  })

  it('retries temporary preparation failure without invalidating an already playing bank', async () => {
    const { manager, context, engine } = await setup()
    await manager.prepareLivePlayback(context, destination, 'sine')
    mocks.prepare.mockResolvedValueOnce({ kind: 'unsupported', retryable: true, instrumentId: 'piano', reason: 'offline' })
    await manager.prepareLivePlayback(context, destination, 'piano')
    expect(manager.getLivePlayback('piano')).toBeUndefined()
    expect(manager.needsLivePlaybackPreparation('piano')).toBe(true)
    expect(manager.getLivePlaybackDiagnostics('piano').reason).toBe('offline')
    expect(engine.dispose).not.toHaveBeenCalled()
    expect(manager.getLivePlayback('sine')).toBeDefined()
    await manager.prepareLivePlayback(context, destination, 'piano')
    expect(manager.getLivePlayback('piano')).toBeDefined()
  })

  it('invalidates failed processors and forwards lifecycle acknowledgements', async () => {
    const { manager, context, engine } = await setup()
    const listener = { onEvent: vi.fn(), onPlan: vi.fn(), onError: vi.fn(), onOwnerEnded: vi.fn() }
    const unsubscribe = manager.subscribeLivePlayback(listener)
    await manager.prepareLivePlayback(context, destination, 'piano')
    const callbacks = mocks.create.mock.calls[0][2]
    callbacks.onOwnerEnded('finger')
    expect(listener.onOwnerEnded).toHaveBeenCalledWith('finger')
    callbacks.onError(new Error('render failed'))
    expect(manager.getLivePlayback('piano')).toBeUndefined()
    expect(engine.dispose).toHaveBeenCalledOnce()
    expect(listener.onError).toHaveBeenCalledOnce()
    unsubscribe()
  })

  it('discards installation results from a replaced audio context', async () => {
    const { manager, context: oldContext } = await setup()
    let resolveOld!: (value: any) => void
    mocks.prepare.mockImplementationOnce(() => new Promise(resolve => { resolveOld = resolve }))
    const old = manager.prepareLivePlayback(oldContext, destination, 'old')
    await manager.prepareLivePlayback(context(), destination, 'new')
    resolveOld(bank('old')); await old
    expect(manager.getLivePlayback('old')).toBeUndefined()
    expect(manager.getLivePlayback('new'), JSON.stringify(manager.getLivePlaybackDiagnostics('new'))).toBeDefined()
  })
})
