import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises } from '@vue/test-utils'

const mocks = vi.hoisted(() => ({ create: vi.fn(), prepare: vi.fn(), releasePrepared: vi.fn(), preparationDiagnostics: vi.fn(),
  chains: [] as { input: object; apply: ReturnType<typeof vi.fn>; dispose: ReturnType<typeof vi.fn> }[] }))
vi.mock('@strudel/soundfonts', () => ({ getPreparedSoundfont: vi.fn() }))
vi.mock('@/audio/live/bridge', () => ({ createLiveWorklet: mocks.create }))
vi.mock('@/audio/liveShaping', () => ({ OPEN_CUTOFF_HZ: 12000, createLiveShapingChain: vi.fn(() => {
  const chain = { input: {}, room: {}, delay: {}, apply: vi.fn(), dispose: vi.fn() }
  mocks.chains.push(chain)
  return chain
}) }))
vi.mock('@/services/audioRuntime', () => ({ getLiveOrbit: vi.fn() }))
vi.mock('@/services/preparedLiveInstrument', () => ({ prepareLiveInstrument: mocks.prepare,
  releasePreparedLiveInstrument: mocks.releasePrepared, getPreparedLiveInstrumentDiagnostics: mocks.preparationDiagnostics }))

const bank = (instrumentId: string) => ({ kind: 'oscillator', instrumentId, waveform: 'sine',
  gain: .3, attack: 0, decay: 0, sustain: 1, release: .01 })
const MIB = 1024 * 1024
/** A sampled bank holding `size` MiB of source PCM. The buffer is never written, so it costs address space only. */
const sampled = (instrumentId: string, size: number) => ({ ...bank(instrumentId), kind: 'sample-bank', zoneSelection: 'nearest-root',
  zones: [{ id: 'z', rootMidi: 60, sampleRate: 48000, channels: [new Float32Array(size * MIB / 4)] }] })
/** Sizes in MiB for the named sampled banks; every other name prepares as an oscillator, which holds no PCM. */
const bankSizes = (sizes: Record<string, number>) => mocks.prepare.mockImplementation(async (_context, name) =>
  name in sizes ? sampled(name, sizes[name]) : bank(name))
const context = () => ({ audioWorklet: {}, state: 'running' }) as AudioContext
const destination = {} as AudioNode
async function setup() {
  const engine = { prepare: vi.fn().mockResolvedValue(undefined), forget: vi.fn(), press: vi.fn(),
    release: vi.fn(), clear: vi.fn(), configure: vi.fn(), shape: vi.fn(), effects: vi.fn(), dispose: vi.fn() }
  mocks.create.mockResolvedValue(engine)
  mocks.prepare.mockImplementation(async (_context, name) => bank(name))
  mocks.preparationDiagnostics.mockReturnValue({ cachedPreparationPcmBytes: 0, preparingPcmBytes: 0, preparationPcmBudgetBytes: 192 * 1024 * 1024 })
  return { engine, manager: await import('@/services/livePlayback'), context: context() }
}
beforeEach(() => { vi.resetModules(); vi.clearAllMocks(); mocks.chains.length = 0; vi.stubGlobal('AudioWorkletNode', vi.fn()) })
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs() })

describe('live playback instrument manager', () => {
  it.each([false, true])('rebuilds transient-rate banks (route returns before renderer creation: %s)', async returnBeforeRenderer => {
    const { manager, engine, context } = await setup()
    Object.assign(context, { sampleRate: 48000 })
    await manager.prepareLivePlayback(context, destination, 'piano')
    const renderedRates: number[] = []
    const preparedRates: number[] = []
    const rebuilt: Array<{ rate: number; acknowledge: () => void; dispose: ReturnType<typeof vi.fn> }> = []
    let finishPreparation!: () => void
    mocks.prepare.mockImplementation(async () => {
      preparedRates.push(context.sampleRate)
      if (preparedRates.length === 1) await new Promise<void>(resolve => { finishPreparation = resolve })
      return bank('piano')
    })
    mocks.create.mockImplementation(async () => {
      const rate = context.sampleRate
      const dispose = vi.fn()
      return { ...engine, dispose, press: () => { renderedRates.push(rate) },
        prepare: () => new Promise<void>(acknowledge => { rebuilt.push({ rate, acknowledge, dispose }) }) }
    })
    Object.assign(context, { sampleRate: 44100 })
    const { resumeAudioContext } = await import('@/services/audioLifecycle')
    const gate = resumeAudioContext(context)!
    const waiting = gate.then(() => manager.getLivePlayback('piano')!.press('waiting', [{ instrumentId: 'piano', pitch: 60 }]))
    Object.assign(context, { sampleRate: 32000 })
    await vi.waitFor(() => expect(preparedRates).toEqual([32000]))
    if (returnBeforeRenderer) Object.assign(context, { sampleRate: 44100 })
    finishPreparation()
    await vi.waitFor(() => expect(rebuilt).toHaveLength(1))
    Object.assign(context, { sampleRate: 44100 })
    rebuilt[0].acknowledge()
    await flushPromises()
    expect(renderedRates).toEqual([])
    await vi.waitFor(() => expect(rebuilt).toHaveLength(2))
    expect(preparedRates).toEqual([32000, 44100])
    rebuilt[1].acknowledge()
    await waiting
    expect(renderedRates).toEqual([44100])
    expect(rebuilt[0].dispose).toHaveBeenCalledOnce()
    expect(resumeAudioContext(context)).toBeUndefined()
  })

  it('keeps waiting input gated through successive rate changes during bank rebuilds', async () => {
    const { manager, engine, context } = await setup()
    Object.assign(context, { sampleRate: 48000 })
    await manager.prepareLivePlayback(context, destination, 'piano')
    const renderedRates: number[] = []
    const rebuilt: Array<{ rate: number; acknowledge: () => void; dispose: ReturnType<typeof vi.fn> }> = []
    mocks.create.mockImplementation(async () => {
      const rate = context.sampleRate
      const dispose = vi.fn()
      return { ...engine, dispose,
        press: () => { renderedRates.push(rate) },
        prepare: () => new Promise<void>(acknowledge => { rebuilt.push({ rate, acknowledge, dispose }) }),
      }
    })
    Object.assign(context, { sampleRate: 44100 })
    const { resumeAudioContext } = await import('@/services/audioLifecycle')
    const gate = resumeAudioContext(context)!
    const waiting = gate.then(() => manager.getLivePlayback('piano')!.press('waiting', [{ instrumentId: 'piano', pitch: 60 }]))
    for (const [index, nextRate] of [32000, 96000].entries()) {
      await vi.waitFor(() => expect(rebuilt).toHaveLength(index + 1))
      expect(resumeAudioContext(context)).toBe(gate)
      Object.assign(context, { sampleRate: nextRate })
      rebuilt[index].acknowledge()
      await flushPromises()
      expect(renderedRates).toEqual([])
    }
    await vi.waitFor(() => expect(rebuilt).toHaveLength(3))
    expect(rebuilt.map(build => build.rate)).toEqual([44100, 32000, 96000])
    rebuilt[2].acknowledge()
    await waiting
    expect(renderedRates).toEqual([96000])
    expect(engine.dispose).toHaveBeenCalledOnce()
    expect(rebuilt[0].dispose).toHaveBeenCalledOnce()
    expect(rebuilt[1].dispose).toHaveBeenCalledOnce()
    expect(rebuilt[2].dispose).not.toHaveBeenCalled()
    expect(resumeAudioContext(context)).toBeUndefined()
  })

  it('rebuilds a changed-rate worklet before a resumed input can use it', async () => {
    const { manager, engine, context } = await setup()
    Object.assign(context, { sampleRate: 48000, state: 'running' })
    await manager.prepareLivePlayback(context, destination, 'piano')
    const stale = manager.getLivePlayback('piano')!
    const next = { ...engine, prepare: vi.fn().mockResolvedValue(undefined), press: vi.fn(), dispose: vi.fn() }
    mocks.create.mockResolvedValueOnce(next)
    Object.assign(context, { state: 'interrupted', resume: vi.fn(async () => {
      Object.assign(context, { state: 'running', sampleRate: 44100 })
    }) })
    const { resumeAudioContext } = await import('@/services/audioLifecycle')
    await resumeAudioContext(context)
    expect(engine.dispose).toHaveBeenCalledOnce()
    expect(mocks.create).toHaveBeenCalledTimes(2)
    expect(next.prepare).toHaveBeenCalledWith(expect.objectContaining({ instrumentId: 'piano' }))
    stale.press('stale', [{ instrumentId: 'piano', pitch: 60 }])
    expect(engine.press).not.toHaveBeenCalled()
    manager.getLivePlayback('piano')!.press('new', [{ instrumentId: 'piano', pitch: 60 }])
    expect(next.press).toHaveBeenCalledOnce()
    expect(resumeAudioContext(context)).toBeUndefined()
    expect(mocks.create).toHaveBeenCalledTimes(2)
  })

  it('drains old-rate preparation before installing the rebuilt generation', async () => {
    const { manager, context } = await setup()
    Object.assign(context, { sampleRate: 48000 })
    let finish!: () => void
    mocks.prepare.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(bank('piano')) }))
    const original = manager.prepareLivePlayback(context, destination, 'piano')
    await vi.waitFor(() => expect(mocks.prepare).toHaveBeenCalledOnce())
    Object.assign(context, { sampleRate: 44100 })
    const { resumeAudioContext } = await import('@/services/audioLifecycle')
    const recovering = resumeAudioContext(context)
    await Promise.resolve()
    expect(mocks.prepare).toHaveBeenCalledOnce()
    finish()
    await Promise.all([original, recovering])
    expect(mocks.prepare).toHaveBeenCalledTimes(2)
    expect(mocks.create).toHaveBeenCalledOnce()
    expect(manager.getLivePlayback('piano')).toBeDefined()
  })

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

  it('serializes concurrent installations', async () => {
    const { manager, engine, context } = await setup()
    let simultaneous = 0, maximum = 0
    engine.prepare.mockImplementation(async () => {
      maximum = Math.max(maximum, ++simultaneous)
      await Promise.resolve()
      simultaneous--
    })
    await Promise.all(['a', 'b', 'c', 'd', 'e', 'f'].map(name => manager.prepareLivePlayback(context, destination, name)))
    expect(maximum).toBe(1)
  })

  it('has no instrument count limit: oscillators take no memory and are never evicted', async () => {
    const { manager, engine, context } = await setup()
    const names = ['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h', 'i', 'j', 'k', 'l']
    for (const name of names) {
      await manager.prepareLivePlayback(context, destination, name)
      manager.getLivePlayback(name)!.press(name, [{ instrumentId: name, pitch: 60 }])
    }
    expect(engine.forget).not.toHaveBeenCalled()
    expect(names.every(name => manager.getLivePlayback(name))).toBe(true)
    expect(manager.getLivePlaybackDiagnostics('a')).toMatchObject({ installedBanks: 12, installedPcmBytes: 0 })
    // Even with every one of them held, a sampled bank still loads.
    bankSizes({ piano: 100 })
    await manager.prepareLivePlayback(context, destination, 'piano')
    expect(manager.getLivePlayback('piano')).toBeDefined()
    expect(manager.getLivePlaybackFailure('piano')).toBeUndefined()
  })

  it('evicts the least recently used sampled bank by bytes, and never an oscillator', async () => {
    const { manager, engine, context } = await setup()
    bankSizes({ a: 80, b: 80, c: 80, d: 80 })
    await manager.prepareLivePlayback(context, destination, 'sine')
    for (const name of ['a', 'b']) await manager.prepareLivePlayback(context, destination, name)
    expect(engine.forget).not.toHaveBeenCalled()
    await manager.prepareLivePlayback(context, destination, 'c')
    expect(engine.forget.mock.calls).toEqual([['a']])
    manager.getLivePlayback('b')
    await manager.prepareLivePlayback(context, destination, 'd')
    expect(engine.forget.mock.calls).toEqual([['a'], ['c']])
    expect(manager.getLivePlayback('sine')).toBeDefined()
    expect(manager.getLivePlaybackDiagnostics('d')).toMatchObject({ installedBanks: 3, installedPcmBytes: 160 * MIB })
  })

  it('takes no memory for an oscillator even when held banks fill it', async () => {
    const { manager, context } = await setup()
    bankSizes({ a: 100, b: 90 })
    for (const name of ['a', 'b']) {
      await manager.prepareLivePlayback(context, destination, name)
      manager.getLivePlayback(name)!.press(name, [{ instrumentId: name, pitch: 60 }])
    }
    await manager.prepareLivePlayback(context, destination, 'sine')
    expect(manager.getLivePlayback('sine')).toBeDefined()
    expect(manager.getLivePlaybackFailure('sine')).toBeUndefined()
    expect(manager.getLivePlaybackDiagnostics('sine').installedPcmBytes).toBe(190 * MIB)
  })

  it('drops the prepared reference immediately after posting while installation stays gated on acknowledgement', async () => {
    const { manager, engine, context } = await setup()
    let acknowledge!: () => void
    const instrument = { ...bank('piano'), kind: 'sample-bank', zoneSelection: 'nearest-root', zones: [{
      id: 'sample', rootMidi: 60, sampleRate: 48000, channels: [new Float32Array(16)], mipmaps: [[new Float32Array(8)]],
    }] }
    mocks.prepare.mockResolvedValueOnce(instrument)
    mocks.preparationDiagnostics.mockReturnValue({ cachedPreparationPcmBytes: 32, preparingPcmBytes: 0, preparationPcmBudgetBytes: 192 * 1024 * 1024 })
    engine.prepare.mockImplementationOnce(() => new Promise<void>(resolve => { acknowledge = resolve }))
    const first = manager.prepareLivePlayback(context, destination, 'piano')
    const next = manager.prepareLivePlayback(context, destination, 'sine')
    await vi.waitFor(() => expect(engine.prepare).toHaveBeenCalledOnce())
    expect(mocks.prepare).toHaveBeenCalledOnce()
    expect(mocks.releasePrepared).toHaveBeenCalledWith(context, 'piano', instrument)
    expect(manager.getLivePlaybackDiagnostics('piano')).toMatchObject({
      installedPcmBytes: 0, installingPcmBytes: 96, cachedPreparationPcmBytes: 32, preparingPcmBytes: 0, additionalPcmBytes: 128,
    })
    acknowledge()
    await Promise.all([first, next])
    expect(mocks.releasePrepared).toHaveBeenCalledWith(context, 'piano', instrument)
    expect(mocks.releasePrepared).toHaveBeenCalledTimes(2)
    expect(instrument.zones[0].channels[0].byteLength).toBe(64)
    expect(manager.getLivePlaybackDiagnostics('piano').installingPcmBytes).toBe(0)
  })

  it('refuses a bank the held banks leave no room for, without evicting anything for it', async () => {
    const { manager, engine, context } = await setup()
    bankSizes({ held: 100, spare: 40, large: 100 })
    for (const name of ['spare', 'held']) await manager.prepareLivePlayback(context, destination, name)
    manager.getLivePlayback('held')!.press('finger', [{ instrumentId: 'held', pitch: 60 }])
    mocks.releasePrepared.mockClear()
    await manager.prepareLivePlayback(context, destination, 'large')
    // Freeing the spare bank would not make room, so it stays resident.
    expect(engine.forget).not.toHaveBeenCalled()
    expect(manager.getLivePlayback('spare')).toBeDefined()
    expect(manager.getLivePlayback('large')).toBeUndefined()
    expect(mocks.releasePrepared).toHaveBeenCalledWith(context, 'large', expect.objectContaining({ instrumentId: 'large' }))
    expect(manager.getLivePlaybackFailure('large')).toEqual({ kind: 'fallback', budget: true,
      reason: 'Sample memory is full: this sound needs 100.0 MiB, but 100.0 MiB of the 192.0 MiB sample memory is held by playing loops and keys' })
  })

  it('does not download a refused bank again while the banks that refused it are still held', async () => {
    const { manager, engine, context } = await setup()
    bankSizes({ held: 100, large: 100 })
    await manager.prepareLivePlayback(context, destination, 'held')
    manager.getLivePlayback('held')!.press('finger', [{ instrumentId: 'held', pitch: 60 }])
    await manager.prepareLivePlayback(context, destination, 'large')
    mocks.prepare.mockClear()
    await manager.prepareLivePlayback(context, destination, 'large')
    await manager.prepareLivePlayback(context, destination, 'large')
    expect(mocks.prepare).not.toHaveBeenCalled()
    expect(manager.getLivePlayback('large')).toBeUndefined()
    expect(manager.getLivePlaybackFailure('large')).toMatchObject({ kind: 'fallback', budget: true })
    // Released, the next attempt decides afresh and now fits.
    manager.getLivePlayback('held')!.release('finger')
    await manager.prepareLivePlayback(context, destination, 'large')
    expect(mocks.prepare).toHaveBeenCalledOnce()
    expect(engine.forget).toHaveBeenCalledWith('held')
    expect(manager.getLivePlayback('large')).toBeDefined()
    expect(manager.getLivePlaybackFailure('large')).toBeUndefined()
  })

  it('pins held banks until release and temporarily falls back when they fill the memory', async () => {
    const { manager, engine, context } = await setup()
    bankSizes({ a: 90, b: 90, c: 90 })
    for (const name of ['a', 'b']) {
      await manager.prepareLivePlayback(context, destination, name)
      manager.getLivePlayback(name)!.press(name, [{ pitch: 60, instrumentId: name }])
    }
    await manager.prepareLivePlayback(context, destination, 'c')
    expect(manager.getLivePlayback('c')).toBeUndefined()
    expect(engine.forget).not.toHaveBeenCalled()
    expect(manager.needsLivePlaybackPreparation('c')).toBe(true)
    manager.getLivePlayback('a')!.release('a')
    await manager.prepareLivePlayback(context, destination, 'c')
    expect(engine.forget).toHaveBeenCalledWith('a')
    expect(manager.getLivePlayback('c')).toBeDefined()
  })

  it('keeps a resting holder\'s pinned bank resident through cache pressure until the pin is released', async () => {
    const { manager, engine, context } = await setup()
    bankSizes({ piano: 90, b: 90, c: 90, d: 90, e: 90, f: 90 })
    await manager.prepareLivePlayback(context, destination, 'piano')
    // A looping member rests (sounds nothing) while other banks load.
    const unpin = manager.pinLivePlayback('member-1', ['piano'])
    for (const name of ['b', 'c', 'd']) await manager.prepareLivePlayback(context, destination, name)
    expect(engine.forget.mock.calls.flat()).toEqual(['b', 'c'])
    expect(manager.getLivePlayback('piano')).toBeDefined()
    unpin()
    for (const name of ['e', 'f']) await manager.prepareLivePlayback(context, destination, name)
    expect(engine.forget.mock.calls.flat()).toContain('piano')
  })

  it('refuses a bank loudly when Looper pins leave no room, and names it a fallback, not a load failure', async () => {
    const { manager, engine, context } = await setup()
    bankSizes({ a: 90, b: 90, e: 90 })
    for (const name of ['a', 'b']) {
      await manager.prepareLivePlayback(context, destination, name)
      manager.pinLivePlayback(`member-${name}`, [name])
    }
    await manager.prepareLivePlayback(context, destination, 'e')
    await manager.prepareLivePlayback(context, destination, 'e')
    expect(engine.forget).not.toHaveBeenCalled()
    expect(manager.getLivePlayback('e')).toBeUndefined()
    expect(manager.getLivePlaybackFailure('e')).toEqual({ kind: 'fallback', budget: true,
      reason: 'Sample memory is full: this sound needs 90.0 MiB, but 180.0 MiB of the 192.0 MiB sample memory is held by playing loops and keys' })
    expect(manager.getLivePlaybackFailure('a')).toBeUndefined()
  })

  it('lets live input on an evicted bank fall back when Looper pins refuse it, instead of dropping it', async () => {
    const { manager, context } = await setup()
    bankSizes({ e: 90, a: 90, b: 90 })
    // 'e' was resident once, then evicted when two pinned members' banks loaded.
    await manager.prepareLivePlayback(context, destination, 'e')
    for (const name of ['a', 'b']) {
      await manager.prepareLivePlayback(context, destination, name)
      manager.pinLivePlayback(`looper:${name}`, [name])
    }
    expect(manager.getLivePlayback('e')).toBeUndefined()
    const loadErrors: string[] = []
    const stop = manager.subscribeLivePlayback({ onEvent() {}, onLoadError: instrumentId => loadErrors.push(instrumentId) })
    // The press waits for recovery, is refused for memory, and goes on to the fallback renderer.
    await expect(manager.waitForLivePlayback('e')).resolves.toBeUndefined()
    expect(manager.getLivePlayback('e')).toBeUndefined()
    expect(manager.getLivePlaybackFailure('e')).toMatchObject({ kind: 'fallback', budget: true })
    expect(loadErrors).toEqual([])
    // Once a member leaves, the next press brings the bank back to the worklet.
    manager.pinLivePlayback('looper:a', [])
    await manager.waitForLivePlayback('e')
    expect(manager.getLivePlayback('e')).toBeDefined()
    expect(manager.getLivePlaybackFailure('e')).toBeUndefined()
    stop()
  })

  it('refuses a single bank larger than the whole memory as unsupported, not as a full memory', async () => {
    const { manager, engine, context } = await setup()
    bankSizes({ huge: 200 })
    await manager.prepareLivePlayback(context, destination, 'huge')
    expect(engine.prepare).not.toHaveBeenCalled()
    expect(manager.getLivePlaybackFailure('huge')).toEqual({ kind: 'fallback',
      reason: 'Sample bank needs 200.0 MiB, more than the 192.0 MiB sample memory' })
  })

  it('reports a failed download as a load failure until a retry installs the bank', async () => {
    const { manager, context } = await setup()
    mocks.prepare.mockResolvedValueOnce({ kind: 'retryable', instrumentId: 'piano', reason: 'Could not download C4v8.mp3 (HTTP 503)' })
    await manager.prepareLivePlayback(context, destination, 'piano')
    expect(manager.getLivePlaybackFailure('piano')).toEqual({ kind: 'load', reason: 'Could not download C4v8.mp3 (HTTP 503)' })
    await manager.prepareLivePlayback(context, destination, 'piano')
    expect(manager.getLivePlaybackFailure('piano')).toBeUndefined()
  })

  it('reports a failed rebuild to subscribers with the instrument load failure available', async () => {
    const { manager, context } = await setup()
    Object.assign(context, { sampleRate: 48000 })
    await manager.prepareLivePlayback(context, destination, 'piano')
    const failures: unknown[] = []
    const stop = manager.subscribeLivePlayback({ onEvent() {}, onLoadError(instrumentId, reason) {
      failures.push({ instrumentId, reason, failure: manager.getLivePlaybackFailure(instrumentId) })
    } })
    mocks.prepare.mockResolvedValueOnce({ kind: 'retryable', instrumentId: 'piano', reason: 'offline' })
    Object.assign(context, { sampleRate: 44100 })
    const { resumeAudioContext } = await import('@/services/audioLifecycle')
    await resumeAudioContext(context)
    expect(failures).toContainEqual({ instrumentId: 'piano', reason: 'offline', failure: { kind: 'load', reason: 'offline' } })
    stop()
  })

  it('accounts installed source and derived PCM separately', async () => {
    const { manager, context } = await setup()
    mocks.prepare.mockImplementation(async (_context, instrumentId) => ({
      ...bank(instrumentId), kind: 'sample-bank', zoneSelection: 'nearest-root',
      zones: [{ id: 'z', rootMidi: 60, sampleRate: 48000, channels: [new Float32Array(1024)], mipmaps: [[new Float32Array(512)]] }],
    }))
    await manager.prepareLivePlayback(context, destination, 'piano')
    expect(manager.getLivePlaybackDiagnostics('piano')).toMatchObject({
      installedPcmBytes: 6144, installedSourcePcmBytes: 4096, installedDerivedPcmBytes: 2048 })
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
    bankSizes({ a: 80, b: 80, e: 80 })
    for (const name of ['a', 'b']) await manager.prepareLivePlayback(context, destination, name)
    let retired!: () => void
    engine.forget.mockImplementation(() => new Promise<void>(resolve => { retired = resolve }))
    const installing = manager.prepareLivePlayback(context, destination, 'e')
    await vi.waitFor(() => expect(engine.forget).toHaveBeenCalledWith('a'))
    expect(manager.getLivePlaybackDiagnostics('e')).toMatchObject({ installedBanks: 2, installedPcmBytes: 160 * MIB })
    expect(manager.getLivePlayback('a')).toBeUndefined()
    expect(engine.prepare).toHaveBeenCalledTimes(2)
    retired(); await installing
    expect(engine.prepare).toHaveBeenCalledTimes(3)
    expect(manager.getLivePlaybackDiagnostics('e')).toMatchObject({ installedBanks: 2, installedPcmBytes: 160 * MIB })
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

  it('retries temporary catalog failure without invalidating an already playing bank', async () => {
    const { manager, context, engine } = await setup()
    await manager.prepareLivePlayback(context, destination, 'sine')
    mocks.prepare.mockResolvedValueOnce({ kind: 'retryable', instrumentId: 'piano', reason: 'offline' })
    await manager.prepareLivePlayback(context, destination, 'piano')
    expect(manager.getLivePlayback('piano')).toBeUndefined()
    expect(manager.needsLivePlaybackPreparation('piano')).toBe(true)
    expect(manager.getLivePlaybackDiagnostics('piano').reason).toBe('offline')
    expect(engine.dispose).not.toHaveBeenCalled()
    expect(manager.getLivePlayback('sine')).toBeDefined()
    await manager.prepareLivePlayback(context, destination, 'piano')
    expect(manager.getLivePlayback('piano')).toBeDefined()
    expect(manager.getLivePlaybackDiagnostics('piano').reason).toBeNull()
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
    await vi.waitFor(() => expect(resolveOld).toBeTypeOf('function'))
    const next = manager.prepareLivePlayback(context(), destination, 'new')
    expect(mocks.prepare).toHaveBeenCalledOnce()
    resolveOld(bank('old')); await Promise.all([old, next])
    expect(manager.getLivePlayback('old')).toBeUndefined()
    expect(manager.getLivePlayback('new'), JSON.stringify(manager.getLivePlaybackDiagnostics('new'))).toBeDefined()
  })
})

describe('live Shape controls on the worklet backend', () => {
  const shaped = { cutoff: 800, resonance: 4, room: .5, delay: .3, envelope: { attack: .2, release: undefined } }

  it('routes the worklet through its shaping chain with the latest controls', async () => {
    const { manager, engine, context } = await setup()
    manager.setLivePlaybackShaping(shaped)
    await manager.prepareLivePlayback(context, destination, 'piano')
    const [chain] = mocks.chains
    expect(mocks.create).toHaveBeenCalledWith(context, chain.input, expect.anything(), chain)
    expect(engine.effects).toHaveBeenLastCalledWith(shaped)
    expect(engine.shape).toHaveBeenLastCalledWith(shaped.envelope)
    expect(engine.effects).toHaveBeenLastCalledWith(shaped)
  })

  it('applies later edits to the chain and the worklet envelope', async () => {
    const { manager, engine, context } = await setup()
    await manager.prepareLivePlayback(context, destination, 'piano')
    manager.setLivePlaybackShaping(shaped)
    expect(engine.effects).toHaveBeenLastCalledWith(shaped)
    expect(engine.shape).toHaveBeenLastCalledWith(shaped.envelope)
    expect(engine.effects).toHaveBeenLastCalledWith(shaped)
  })

  it('keeps edits made while the worklet is still being created', async () => {
    const { manager, engine, context } = await setup()
    let finish!: (value: typeof engine) => void
    mocks.create.mockImplementationOnce(() => new Promise(resolve => { finish = resolve }))
    const pending = manager.prepareLivePlayback(context, destination, 'piano')
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    manager.setLivePlaybackShaping(shaped)
    finish(engine); await pending
    expect(engine.effects).toHaveBeenLastCalledWith(shaped)
    expect(engine.shape).toHaveBeenLastCalledWith(shaped.envelope)
    expect(engine.effects).toHaveBeenLastCalledWith(shaped)
  })

  it('disposes the chain together with its worklet', async () => {
    const { manager, engine, context } = await setup()
    await manager.prepareLivePlayback(context, destination, 'piano')
    manager.getLivePlayback('piano')!.dispose()
    expect(engine.dispose).toHaveBeenCalledOnce()
    expect(mocks.chains[0].dispose).toHaveBeenCalledOnce()
  })
})

describe('production renderer selection', () => {
  it.each([
    ['square', 'square'], ['sawtooth', 'sawtooth'], ['sqr', 'square'], ['saw', 'sawtooth'],
    ['amSynth', 'sawtooth'], ['fmSynth', 'square'], ['metalSynth', 'square'],
  ])('prepares and renders %s as worklet %s using the real catalog', async (name, resolved) => {
    const { manager, context, engine } = await setup()
    const { registerSynthSounds } = await import('superdough')
    registerSynthSounds()
    const actual = await vi.importActual<typeof import('@/services/preparedLiveInstrument')>('@/services/preparedLiveInstrument')
    mocks.prepare.mockImplementation(actual.prepareLiveInstrument)
    const { LiveAudioCore } = await import('@/audio/live/core')
    const core = new LiveAudioCore(48000, () => {})
    engine.prepare.mockImplementation(async instrument => core.command({ type: 'prepare', requestId: 1, instrument }, 0))
    engine.press.mockImplementation((ownerId, notes) => core.command({ type: 'press', ownerId, notes }, 0))

    await manager.prepareLivePlayback(context, destination, name)
    expect(manager.getLivePlaybackDiagnostics(name).backend).toBe('audio-worklet')
    const renderer = manager.getLivePlayback(name)!
    renderer.press('finger', [{ pitch: 69, instrumentId: resolved }])
    const pcm = new Float32Array(4800)
    core.render([pcm], 0)
    expect(pcm.some(value => Math.abs(value) > .1)).toBe(true)
    expect(engine.prepare).toHaveBeenCalledWith(expect.objectContaining({ waveform: resolved,
      gain: .24, attack: .003, decay: .001, sustain: 1, release: .12 }))
  })

  it.each([
    ['supersaw', 'supersaw'], ['pulse', 'pulse'],
  ])('routes unsupported %s through %s to fallback without disturbing a held worklet bank', async (name, resolved) => {
    const { manager, context, engine } = await setup()
    await manager.prepareLivePlayback(context, destination, 'sine')
    const held = manager.getLivePlayback('sine')!
    held.press('finger', [{ pitch: 96, instrumentId: 'sine' }])
    const unsupported = { kind: 'unsupported', instrumentId: resolved, reason: 'Unsupported synthesis' }
    mocks.prepare.mockResolvedValueOnce(unsupported)

    await manager.prepareLivePlayback(context, destination, name)

    expect(mocks.prepare).toHaveBeenLastCalledWith(context, resolved, expect.any(AbortSignal))
    expect(manager.getLivePlayback(name)).toBeUndefined()
    expect(manager.getLivePlayback(resolved)).toBeUndefined()
    expect(manager.needsLivePlaybackPreparation(name)).toBe(false)
    expect(manager.needsLivePlaybackPreparation(resolved)).toBe(false)
    expect(manager.getLivePlaybackDiagnostics(name)).toMatchObject({
      backend: 'superdough', reason: unsupported.reason, installedBanks: 1, installingPcmBytes: 0,
    })
    expect(engine.prepare).toHaveBeenCalledTimes(1)
    expect(engine.forget).not.toHaveBeenCalled()
    expect(engine.dispose).not.toHaveBeenCalled()
    expect(manager.getLivePlayback('sine')).toBe(held)
    held.release('finger')
    expect(engine.release).toHaveBeenCalledWith('finger')
  })

  it('keeps the worklet when an obsolete native backend environment variable is present', async () => {
    vi.stubEnv('VITE_LIVE_AUDIO_BACKEND', 'native')
    const { manager, context } = await setup()
    await manager.prepareLivePlayback(context, destination, 'piano')
    expect(mocks.create).toHaveBeenCalledOnce()
    expect(manager.getLivePlaybackDiagnostics('piano').backend).toBe('audio-worklet')
  })
})
