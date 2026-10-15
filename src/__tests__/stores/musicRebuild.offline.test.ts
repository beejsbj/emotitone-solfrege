import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, disposePinia, setActivePinia, type Pinia } from 'pinia'
import { LiveAudioCore } from '@/audio/live/core'
import { pcmTransferList } from '@/audio/live/pcm'
import type { LiveWorklet, PreparedLiveInstrument } from '@/audio/live/types'
import type { LiveRendererCallbacks } from '@/audio/liveRenderer'
import { memoryCaches } from '../helpers/memoryCaches'

const adapters = vi.hoisted(() => ({ create: vi.fn() }))
vi.mock('@/audio/live/bridge', () => ({ createLiveWorklet: adapters.create }))
vi.mock('@/audio/liveShaping', () => ({ OPEN_CUTOFF_HZ: 12000,
  createLiveShapingChain: () => ({ input: {}, dispose() {} }) }))
vi.mock('@/services/audioRuntime', () => ({ getLiveOrbit() {} }))

let pinia: Pinia
let builds: Array<{ core?: LiveAudioCore; callbacks: LiveRendererCallbacks; sent: PreparedLiveInstrument[] }>
let context: AudioContext
let network: ReturnType<typeof vi.fn>
let decoded: ReturnType<typeof vi.fn>

beforeEach(() => {
  vi.resetModules(); vi.clearAllMocks()
  pinia = createPinia(); setActivePinia(pinia)
  builds = []
  vi.stubGlobal('AudioWorkletNode', vi.fn())
  vi.stubGlobal('caches', memoryCaches().storage)
  decoded = vi.fn(async () => {
    const wave = Float32Array.from({ length: 1024 }, (_, frame) => Math.sin(frame * .1) * .5)
    return { sampleRate: context.sampleRate, length: wave.length, numberOfChannels: 1,
      copyFromChannel: (target: Float32Array) => target.set(wave) }
  })
  context = Object.assign(new EventTarget(), {
    audioWorklet: {}, state: 'running', sampleRate: 48000, currentTime: 0,
    decodeAudioData: decoded,
  }) as unknown as AudioContext
  network = vi.fn(async (url: string) => url.endsWith('.js')
    ? new Response(`var _tone_fixture={zones:[{originalPitch:6000,keyRangeLow:0,keyRangeHigh:127,sampleRate:48000,file:'AAAA'}]};`)
    : new Response(new Uint8Array([1, 2, 3])))
  vi.stubGlobal('fetch', network)
  adapters.create.mockImplementation(async (_context: AudioContext, _destination: AudioNode, callbacks: LiveRendererCallbacks) => {
    const build = { core: undefined as LiveAudioCore | undefined, callbacks, sent: [] as PreparedLiveInstrument[] }
    build.core = new LiveAudioCore(context.sampleRate, response => {
      if (response.type === 'event') callbacks.onEvent(response.event)
      if (response.type === 'owner-ended') callbacks.onOwnerEnded?.(response.ownerId)
    })
    builds.push(build)
    return {
      async prepare(instrument) {
        build.sent.push(instrument)
        const owned = structuredClone(instrument, { transfer: pcmTransferList(instrument) })
        build.core!.command({ type: 'prepare', requestId: 1, instrument: owned }, 0)
      },
      press(ownerId, notes) { build.core!.command({ type: 'press', ownerId, notes }, 0) },
      release(ownerId) { build.core?.command({ type: 'release', ownerId }, 0) },
      clear() { build.core?.command({ type: 'clear' }, 0) },
      dispose() { build.core = undefined },
      async forget() {}, configure() {}, shape() {}, effects() {}, setPitchBend() {}, setGain() {},
    } satisfies LiveWorklet
  })
})
afterEach(() => { disposePinia(pinia); vi.unstubAllGlobals(); vi.restoreAllMocks(); vi.useRealTimers() })

async function setup(name: string) {
  const catalog = await import('@/audio/soundCatalog')
  if (name === 'piano') catalog.registerSampleMap({ _base: 'https://raw.githubusercontent.com/fixtures/', piano: { C4: 'c.wav' } })
  else catalog.registerSoundfonts({ gm_violin: ['violin'] })
  const manager = await import('@/services/livePlayback')
  await manager.prepareLivePlayback(context, {} as AudioNode, name)
  const audio = await import('@/services/superdoughAudio')
  vi.mocked(audio.getAudioContext).mockReturnValue(context)
  const { useInstrumentStore } = await import('@/stores/instrument')
  const instrument = useInstrumentStore()
  instrument.currentInstrument = name
  const { useMusicStore } = await import('@/stores/music')
  return { manager, audio, music: useMusicStore(), instrument }
}

function expectSound(build = builds.at(-1)!) {
  const output = new Float32Array(512)
  build.core!.render([output], 0)
  expect(output.some(value => Math.abs(value) > .001)).toBe(true)
}

describe('selected instrument input across offline rebuilds', () => {
  it.each(['piano', 'gm_violin'])('rebuilds %s offline at a new rate with PCM only in the active worklet', async name => {
    const { manager, music, audio } = await setup(name)
    const owner = await music.attackExactPitch('C4')
    expectSound()
    const downloads = network.mock.calls.length
    network.mockRejectedValue(new TypeError('offline'))
    Object.assign(context, { sampleRate: 44100 })
    const nextOwner = await music.attackExactPitch('E4')
    expect(nextOwner).toBeTruthy()
    expect(builds).toHaveLength(2)
    expect(builds[0].core).toBeUndefined()
    expectSound()
    expect(network).toHaveBeenCalledTimes(downloads)
    expect(decoded).toHaveBeenCalledTimes(2)
    expect(audio.attackNote).not.toHaveBeenCalled()
    for (const build of builds) for (const sent of build.sent) {
      if (sent.kind !== 'sample-bank') throw new Error('Expected sample PCM')
      expect(sent.zones.flatMap(zone => [...zone.channels, ...(zone.mipmaps?.flat() ?? [])]).every(channel => channel.byteLength === 0)).toBe(true)
    }
    const diagnostics = manager.getLivePlaybackDiagnostics(name)
    expect(diagnostics.installedSourcePcmBytes).toBe(4096)
    expect(diagnostics.additionalPcmBytes).toBe(diagnostics.installedPcmBytes)
    expect(diagnostics.cachedPreparationPcmBytes).toBe(0)
    expect(diagnostics.preparingPcmBytes).toBe(0)
    expect(diagnostics.installedBanks).toBe(1)
    await music.releaseNote(owner!)
    await music.releaseNote(nextOwner!)
  })

  it.each(['play', 'release', 'change instrument', 'rate change'])('shows warming while preserving input through recovery; next action: %s', async action => {
    const { music, audio, instrument } = await setup('piano')
    if (action === 'rate change') Object.assign(context, { sampleRate: 44100 })
    else builds[0].callbacks.onError?.(new Error('processor failed'))
    let finish!: () => void
    decoded.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve({
      sampleRate: 48000, length: 1024, numberOfChannels: 1,
      copyFromChannel: (target: Float32Array) => target.fill(.5),
    }) }))
    let cancelled = false
    const pending = music.attackExactPitch('C4', () => cancelled)
    const simultaneous = action === 'play' ? music.attackExactPitch('E4') : undefined
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    expect(audio.attackNote).not.toHaveBeenCalled()
    expect(builds).toHaveLength(1)
    expect(instrument.warmingInstrument).toBe('piano')
    expect(instrument.isInstrumentWarming('piano')).toBe(true)
    expect(instrument.isLoading).toBe(true)
    if (action === 'release') cancelled = true
    if (action === 'change instrument') instrument.selectionEpoch++
    finish()
    const owner = await pending
    const otherOwner = await simultaneous
    expect(decoded).toHaveBeenCalledTimes(2)
    expect(builds).toHaveLength(2)
    expect(instrument.warmingInstrument).toBeNull()
    expect(instrument.isLoading).toBe(false)
    if (action === 'play' || action === 'rate change') {
      expect(owner).toBeTruthy()
      expectSound()
      await music.releaseNote(owner!)
      await music.releaseNote(otherOwner!)
    } else expect(owner).toBeNull()
    expect(audio.attackNote).not.toHaveBeenCalled()
  })

  it.each(['decode', 'fetch'])('bounds a retired %s and lets the replacement context recover', async stalled => {
    const { manager } = await setup('piano')
    const oldContext = context
    builds[0].callbacks.onError?.(new Error('processor failed'))
    let finish!: () => void
    const copy = vi.fn()
    if (stalled === 'decode') decoded.mockImplementationOnce(() => new Promise(resolve => {
      finish = () => resolve({ sampleRate: 48000, length: 1024, numberOfChannels: 1, copyFromChannel: copy })
    }))
    else {
      vi.stubGlobal('caches', memoryCaches().storage)
      network.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(new Response(new Uint8Array([1]))) }))
    }
    const retired = manager.prepareLivePlayback(oldContext, {} as AudioNode, 'piano')
    await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
    vi.useFakeTimers()
    context = Object.assign(new EventTarget(), {
      audioWorklet: {}, state: 'running', sampleRate: 44100, currentTime: 0, decodeAudioData: decoded,
    }) as unknown as AudioContext
    const replacement = manager.prepareLivePlayback(context, {} as AudioNode, 'piano')
    await vi.advanceTimersByTimeAsync(5100)
    expect(manager.getLivePlayback('piano')).toBeDefined()
    await replacement
    finish()
    await retired
    expect(copy).not.toHaveBeenCalled() // A late decode must never allocate owned PCM.
    const preparation = await import('@/services/preparedLiveInstrument')
    expect(preparation.getPreparedLiveInstrumentDiagnostics(oldContext).cachedPreparationPcmBytes).toBe(0)
    expect(manager.getLivePlaybackDiagnostics('piano').installedBanks).toBe(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shows a bridge creation failure to the player and retries without fallback PCM', async () => {
    const { music, audio, instrument } = await setup('piano')
    builds[0].callbacks.onError?.(new Error('processor failed'))
    adapters.create.mockRejectedValueOnce(new Error('addModule failed'))
    await expect(music.attackExactPitch('C4')).rejects.toThrow('addModule failed')
    expect(instrument.lastWarmupError).toBe('addModule failed')
    expect(instrument.lastWarmupErrorInstrument).toBe('piano')
    expect(audio.attackNote).not.toHaveBeenCalled()
    const owner = await music.attackExactPitch('C4')
    expectSound()
    expect(instrument.lastWarmupError).toBeNull()
    await music.releaseNote(owner!)
  })

  it.each(['rate change', 'release', 'already ready'])('clears a stale error after confirmed recovery: %s', async action => {
    const { music, instrument } = await setup('piano')
    instrument.lastWarmupError = 'previous offline failure'
    instrument.lastWarmupErrorInstrument = 'piano'
    if (action === 'rate change') Object.assign(context, { sampleRate: 44100 })
    if (action === 'release') builds[0].callbacks.onError?.(new Error('processor failed'))
    let finish!: () => void
    if (action !== 'already ready') {
      const decode = decoded.getMockImplementation()!
      decoded.mockImplementationOnce(() => new Promise(resolve => { finish = () => resolve(decode()) }))
    }
    let cancelled = false
    const pending = music.attackExactPitch('C4', () => cancelled)
    if (action !== 'already ready') {
      await vi.waitFor(() => expect(finish).toBeTypeOf('function'))
      cancelled = action === 'release'
      finish()
    }
    const owner = await pending
    expect(instrument.lastWarmupError).toBeNull()
    expect(instrument.lastWarmupErrorInstrument).toBeNull()
    if (action === 'release') expect(owner).toBeNull()
    else { expectSound(); await music.releaseNote(owner!) }
  })

  it('surfaces an uncached recovery failure and retries on the next press without loading fallback PCM', async () => {
    const { music, audio, instrument } = await setup('gm_violin')
    builds[0].callbacks.onError?.(new Error('processor failed'))
    vi.stubGlobal('caches', memoryCaches().storage) // Simulate device eviction.
    network.mockRejectedValueOnce(new TypeError('offline'))
    await expect(music.attackExactPitch('C4')).rejects.toThrow('offline')
    expect(instrument.lastWarmupError).toContain('offline')
    expect(audio.attackNote).not.toHaveBeenCalled()
    const owner = await music.attackExactPitch('C4')
    expectSound()
    expect(instrument.lastWarmupError).toBeNull()
    await music.releaseNote(owner!)
  })
})
