import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const audio = vi.hoisted(() => ({
  attackNote: vi.fn<(...args: unknown[]) => Promise<number>>(),
  releaseNote: vi.fn(),
  stopNote: vi.fn(),
  getAudioContext: vi.fn(),
}))

vi.mock('@/services/superdoughAudio', () => audio)

import { createScheduledLiveVoice } from '@/services/scheduledLiveVoice'

const EPOCH = 1_800_000_000_000
const CLOCK_START = 1000

function deferred<T = void>() {
  let resolve!: (value: T) => void
  let reject!: (error: unknown) => void
  const promise = new Promise<T>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise
    reject = rejectPromise
  })
  return { promise, resolve, reject }
}

function create(at = 1050) {
  const onScheduleStart = vi.fn()
  const onScheduleEnd = vi.fn()
  const onStart = vi.fn()
  const onEnd = vi.fn()
  const onError = vi.fn()
  const voice = createScheduledLiveVoice({
    noteId: 'voice-1',
    noteName: 'C4',
    instrument: 'piano',
    at,
    releaseSeconds: 0.15,
    now: () => performance.now(),
    onScheduleStart,
    onScheduleEnd,
    onStart,
    onEnd,
    onError,
  })
  return { voice, onScheduleStart, onScheduleEnd, onStart, onEnd, onError }
}

describe('scheduled live voice', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(EPOCH)
    vi.spyOn(performance, 'now').mockImplementation(() => CLOCK_START + Date.now() - EPOCH)
    audio.attackNote.mockReset().mockImplementation(async (...args: unknown[]) =>
      (args[3] as { atTime: number }).atTime)
    audio.releaseNote.mockReset()
    audio.stopNote.mockReset()
    audio.getAudioContext.mockReset().mockImplementation(() => ({
      currentTime: 12 + (performance.now() - CLOCK_START) / 1000,
    }))
  })

  afterEach(() => {
    vi.clearAllTimers()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('records a scheduled pulse that played while the main thread was stalled', async () => {
    const { voice, onStart, onEnd } = create()
    voice.release(1250)
    await vi.advanceTimersByTimeAsync(10)
    // Audio and the monotonic clock advance while callback delivery stalls.
    vi.setSystemTime(EPOCH + 1000)
    await vi.advanceTimersByTimeAsync(250)
    expect(onStart).toHaveBeenCalledExactlyOnceWith(EPOCH + 50)
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(EPOCH + 250)
  })

  it('schedules audio ahead while publishing start and end only at their deadlines', async () => {
    const { voice, onScheduleStart, onScheduleEnd, onStart, onEnd, onError } = create()
    voice.release(1250)
    expect(audio.attackNote).toHaveBeenCalledWith('voice-1', 'C4', 'piano', {
      atTime: 12.05,
      release: 0.15,
    })
    await vi.advanceTimersByTimeAsync(0)
    expect(audio.releaseNote).toHaveBeenCalledWith('voice-1', 12.25)
    expect(onScheduleStart).toHaveBeenCalledExactlyOnceWith(EPOCH + 50)
    expect(onScheduleEnd).toHaveBeenCalledExactlyOnceWith(EPOCH + 250)
    expect(onStart).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(49)
    expect(onStart).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onStart).toHaveBeenCalledExactlyOnceWith(EPOCH + 50)
    await vi.advanceTimersByTimeAsync(199)
    expect(onEnd).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(1)
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(EPOCH + 250)
    expect(onError).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('shortens a gate and removes the previously scheduled end callback', async () => {
    const { voice, onStart, onEnd } = create(1000)
    voice.release(1400)
    await vi.advanceTimersByTimeAsync(100)
    expect(onStart).toHaveBeenCalledExactlyOnceWith(EPOCH)
    voice.release(1200)
    voice.release(1300)
    expect(audio.releaseNote.mock.calls).toEqual([['voice-1', 12.4], ['voice-1', 12.2]])
    await vi.advanceTimersByTimeAsync(100)
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(EPOCH + 200)
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(500)
    voice.release(1100)
    expect(onEnd).toHaveBeenCalledTimes(1)
    expect(audio.releaseNote).toHaveBeenCalledTimes(2)
  })

  it('cancels a queued onset without publishing either recording event', async () => {
    const { voice, onStart, onEnd } = create()
    voice.release(1250)
    await vi.advanceTimersByTimeAsync(10)
    voice.release(1010)
    expect(audio.stopNote).toHaveBeenCalledExactlyOnceWith('voice-1')
    expect(vi.getTimerCount()).toBe(0)
    await vi.advanceTimersByTimeAsync(1000)
    expect(onStart).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()
  })

  it('stops an asynchronously loaded voice when input was released before onset', async () => {
    const attack = deferred()
    audio.attackNote.mockReturnValue(attack.promise)
    const { voice, onStart, onEnd, onError } = create()
    await vi.advanceTimersByTimeAsync(10)
    voice.release(1010)
    expect(audio.stopNote).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(500)
    attack.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(audio.stopNote).toHaveBeenCalledExactlyOnceWith('voice-1')
    expect(audio.releaseNote).not.toHaveBeenCalled()
    expect(onStart).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()
    expect(onError).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('drops a pulse whose whole gate elapsed while its sound was loading', async () => {
    const attack = deferred()
    audio.attackNote.mockReturnValue(attack.promise)
    const { voice, onStart, onEnd } = create()
    voice.release(1250)
    await vi.advanceTimersByTimeAsync(300)
    attack.resolve()
    await vi.advanceTimersByTimeAsync(0)
    expect(audio.stopNote).toHaveBeenCalledExactlyOnceWith('voice-1')
    expect(onStart).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('records the audible onset when loading crosses the scheduled deadline', async () => {
    const attack = deferred<number>()
    audio.attackNote.mockReturnValue(attack.promise)
    const { voice, onStart, onEnd } = create(1000)
    voice.release(1200)
    await vi.advanceTimersByTimeAsync(100)
    attack.resolve(12.1)
    await vi.advanceTimersByTimeAsync(0)
    expect(onStart).toHaveBeenCalledExactlyOnceWith(EPOCH + 100)
    await vi.advanceTimersByTimeAsync(100)
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(EPOCH + 200)
  })

  it('rebases the audio clock mapping after a suspended context resumes', async () => {
    const attack = deferred<number>()
    audio.attackNote.mockReturnValue(attack.promise)
    let audioTime = 12
    audio.getAudioContext.mockImplementation(() => ({ currentTime: audioTime }))
    const { voice, onStart, onEnd } = create()
    voice.release(1250)

    await vi.advanceTimersByTimeAsync(100)
    audioTime = 12
    attack.resolve(12.01)
    await vi.advanceTimersByTimeAsync(0)

    expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith('voice-1', 12.15)
    expect(onStart).not.toHaveBeenCalled()
    await vi.advanceTimersByTimeAsync(10)
    expect(onStart).toHaveBeenCalledExactlyOnceWith(EPOCH + 110)
    await vi.advanceTimersByTimeAsync(140)
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(EPOCH + 250)
  })

  it('sustains a strummed voice until its owner releases it', async () => {
    const { voice, onStart, onEnd } = create(1035)
    await vi.advanceTimersByTimeAsync(500)
    expect(onStart).toHaveBeenCalledExactlyOnceWith(EPOCH + 35)
    expect(audio.releaseNote).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()
    voice.release(1500)
    expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith('voice-1', 12.5)
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(EPOCH + 500)
    expect(audio.stopNote).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
  })

  it('preserves musical timestamps when a release is processed late', async () => {
    const { voice, onStart, onEnd } = create(1000)
    await vi.advanceTimersByTimeAsync(500)
    voice.release(1450)
    expect(audio.releaseNote).toHaveBeenCalledExactlyOnceWith('voice-1', 12.5)
    expect(onStart).toHaveBeenCalledExactlyOnceWith(EPOCH)
    expect(onEnd).toHaveBeenCalledExactlyOnceWith(EPOCH + 450)
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports asynchronous attack failure without emitting unmatched note events', async () => {
    const attack = deferred()
    audio.attackNote.mockReturnValue(attack.promise)
    const { voice, onStart, onEnd, onError } = create()
    voice.release(1250)
    const error = new Error('sample download failed')
    attack.reject(error)
    await vi.advanceTimersByTimeAsync(0)
    expect(onError).toHaveBeenCalledExactlyOnceWith(error)
    expect(onStart).not.toHaveBeenCalled()
    expect(onEnd).not.toHaveBeenCalled()
    expect(audio.releaseNote).not.toHaveBeenCalled()
    expect(vi.getTimerCount()).toBe(0)
    voice.release(1000)
    expect(onError).toHaveBeenCalledTimes(1)
  })
})
