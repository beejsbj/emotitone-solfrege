import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const boundary = vi.hoisted(() => ({
  registerSound: vi.fn(),
  getAudioContext: vi.fn(),
  releaseAudioNode: vi.fn(),
  stopVibrato: vi.fn(),
}))

vi.mock('@strudel/core', () => ({
  noteToMidi: () => 60,
  freqToMidi: () => 60,
  getSoundIndex: () => 0,
  Pattern: class {},
  getPlayableNoteValue: vi.fn(),
}))

vi.mock('@strudel/webaudio', () => ({
  ...boundary,
  getADSRValues: () => [0, 0, 1, 0.2],
  getParamADSR: vi.fn(),
  getPitchEnvelope: vi.fn(),
  getVibratoOscillator: () => ({ stop: boundary.stopVibrato }),
  onceEnded: (source: EventTarget, callback: () => void) =>
    source.addEventListener('ended', callback, { once: true }),
}))

vi.mock('sfumato', () => ({ startPresetNote: vi.fn(), loadSoundfont: vi.fn() }))

// This source model implements Web Audio's replaceable scheduled stop and ended
// event. Tests execute the installed source/package, rather than copying its
// stop function, and observe whether its public handle actually ends playback.
class BufferSource extends EventTarget {
  playbackRate = { value: 1 }
  detune = {}
  start = vi.fn()
  connect = vi.fn((node: unknown) => node)
  stop = vi.fn((at: number) => {
    clearTimeout(this.endTimer)
    this.endTimer = setTimeout(() => this.dispatchEvent(new Event('ended')), at * 1000 - Date.now())
  })
  private endTimer: ReturnType<typeof setTimeout> | undefined
}

describe.each([
  ['source module', '@strudel/soundfonts/fontloader.mjs'],
  ['published package entry', '@strudel/soundfonts'],
])('soundfont stop: %s', (_name, modulePath) => {
  let source: BufferSource

  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(0)
    boundary.registerSound.mockClear()
    boundary.releaseAudioNode.mockClear()
    boundary.stopVibrato.mockClear()
    source = new BufferSource()
    boundary.getAudioContext.mockReturnValue({
      createBufferSource: () => source,
      createGain: () => ({ gain: {} }),
    })
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      text: async () => 'var preset={zones:[{keyRangeLow:0,keyRangeHigh:127,originalPitch:6000,coarseTune:0,fineTune:0,loopStart:2,loopEnd:40000,sampleRate:44100,buffer:{duration:60}}]};',
    }))
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.useRealTimers()
    vi.unstubAllGlobals()
  })

  async function instrument() {
    // importActual bypasses the app's shared soundfonts mock for the package
    // entry while still mocking the package's audio/context boundaries.
    const module = await vi.importActual<{ registerSoundfonts: () => void }>(modulePath)
    module.registerSoundfonts()
    const registration = boundary.registerSound.mock.calls.find(([name]) => name === 'gm_piano')!
    const onended = vi.fn()
    const handle = await registration[1](10, { note: 'C4', duration: 60, release: 0.2 }, onended)
    return { handle, onended }
  }

  it('ends a held source at release and cleans up through its ended event', async () => {
    const { handle, onended } = await instrument()
    expect(source.start).toHaveBeenCalledWith(10)
    handle.stop(10.5)
    await vi.advanceTimersByTimeAsync(10499)
    expect(onended).not.toHaveBeenCalled()
    expect(boundary.releaseAudioNode).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onended).toHaveBeenCalledTimes(1)
    expect(boundary.releaseAudioNode).toHaveBeenCalledExactlyOnceWith(source)
    expect(boundary.stopVibrato).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('allows earlier cancellation without allowing later requests to extend it', async () => {
    const { handle, onended } = await instrument()
    handle.stop(12)
    handle.stop(11)
    handle.stop(13)
    await vi.advanceTimersByTimeAsync(11000)
    expect(onended).toHaveBeenCalledTimes(1)
    expect(boundary.releaseAudioNode).toHaveBeenCalledTimes(1)
    source.dispatchEvent(new Event('ended'))
    await vi.advanceTimersByTimeAsync(70000)
    expect(onended).toHaveBeenCalledTimes(1)
    expect(boundary.stopVibrato).toHaveBeenCalledTimes(1)
    expect(vi.getTimerCount()).toBe(0)
  })
})
