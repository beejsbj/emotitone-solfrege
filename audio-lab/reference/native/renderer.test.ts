import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createPreparedNativeRenderer } from './renderer'
import type { PreparedNativeInstrument } from '@/services/preparedNativeInstrument'
import type { LiveVoiceEvent } from '@/audio/live/types'
import type { LiveRendererCallbacks } from '@/audio/liveRenderer'
import { createLivePerformance } from '@/services/livePerformance'

const subscription = vi.hoisted(() => ({ listener: undefined as LiveRendererCallbacks | undefined }))
vi.mock('@/services/livePlayback', () => ({
  subscribeLivePlayback: (listener: LiveRendererCallbacks) => {
    subscription.listener = listener
    return () => { subscription.listener = undefined }
  },
}))

function parameter() {
  return { value: 0, setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn(), cancelScheduledValues: vi.fn() }
}
function fixture(options: { onError?(error: Error): void } = {}) {
  const sources: Array<ReturnType<typeof source>> = []
  function source() {
    const node = { buffer: null as AudioBuffer | null, loop: false, loopStart: 0, loopEnd: 0, type: '',
      frequency: parameter(), playbackRate: parameter(), connect: vi.fn(), disconnect: vi.fn(),
      start: vi.fn(), stop: vi.fn(), onended: null as null | (() => void) }
    sources.push(node)
    return node
  }
  const gains: Array<{ gain: ReturnType<typeof parameter>; connect: ReturnType<typeof vi.fn>; disconnect: ReturnType<typeof vi.fn> }> = []
  const stateEvents = new EventTarget()
  let frozenAt: number | undefined
  const context = { get currentTime() { return frozenAt ?? Date.now() / 1000 }, state: 'running',
    addEventListener: stateEvents.addEventListener.bind(stateEvents), removeEventListener: stateEvents.removeEventListener.bind(stateEvents),
    createBufferSource: vi.fn(source), createOscillator: vi.fn(source), createGain: vi.fn(() => {
      const gain = { gain: parameter(), connect: vi.fn(), disconnect: vi.fn() }; gains.push(gain); return gain
    }) } as unknown as AudioContext
  const events: LiveVoiceEvent[] = []
  const plans: LiveVoiceEvent[][] = []
  const ended = vi.fn()
  const renderer = createPreparedNativeRenderer(context, {} as AudioNode, {
    onEvent: event => { events.push(event); subscription.listener?.onEvent(event) },
    onPlan: plan => { plans.push(plan); subscription.listener?.onPlan?.(plan) },
    onOwnerEnded: owner => { ended(owner); subscription.listener?.onOwnerEnded?.(owner) },
    onError: options.onError ?? (error => { throw error }),
  })
  function setState(state: AudioContextState) {
    frozenAt = state === 'running' ? undefined : context.currentTime
    Object.defineProperty(context, 'state', { value: state, configurable: true })
    stateEvents.dispatchEvent(new Event('statechange'))
  }
  return { renderer, sources, gains, context, events, plans, ended, setState }
}
const synth: PreparedNativeInstrument = { kind: 'oscillator', waveform: 'sine', instrumentId: 'sine', gain: .24,
  attack: .003, decay: .001, sustain: 1, release: .12 }
const note = (pitch = 60) => ({ pitch, instrumentId: 'sine' })
const all: Array<ReturnType<typeof fixture>> = []
function setup(options?: Parameters<typeof fixture>[0]) { const value = fixture(options); all.push(value); return value }
beforeEach(() => { subscription.listener = undefined; vi.useFakeTimers(); vi.setSystemTime(0) })
afterEach(() => { all.splice(0).forEach(({ renderer }) => renderer.dispose()); vi.useRealTimers() })

describe('prepared native audio renderer', () => {
  it('submits a ready press synchronously at the current audio time with no lead or preparation wait', async () => {
    const { renderer, sources, events } = setup()
    await renderer.prepare(synth)
    vi.setSystemTime(1000)
    renderer.press('hand', [note(69)])
    expect(sources).toHaveLength(1)
    expect(sources[0].start).toHaveBeenCalledWith(1)
    expect(sources[0].frequency.setValueAtTime).toHaveBeenCalledWith(440, 1)
    expect(events).toMatchObject([{ phase: 'attack', ownerId: 'hand', at: 1 }])
    renderer.release('hand')
    expect(events).toMatchObject([{ phase: 'attack' }, { phase: 'release', at: 1 }])
    expect(sources[0].stop).toHaveBeenLastCalledWith(1.12)
  })

  it('uses the exact original stereo buffer and browser resampling, preserving soundfont overlap and loop seconds', async () => {
    const { renderer, sources } = setup()
    const buffer = { sampleRate: 48000, length: 48000, numberOfChannels: 2, getChannelData: vi.fn() } as unknown as AudioBuffer
    await renderer.prepare({ ...synth, kind: 'sample-bank', instrumentId: 'gm_test', zoneSelection: 'first-range',
      zones: [{ id: 'first', rootMidi: 60, lowMidi: 48, highMidi: 61, buffer, loopStartFrame: 480, loopEndFrame: 24000 },
        { id: 'second', rootMidi: 61, lowMidi: 60, highMidi: 72, buffer }] })
    renderer.press('hand', [{ pitch: 61, instrumentId: 'gm_test' }])
    expect(sources[0].buffer).toBe(buffer)
    expect(sources[0].playbackRate.setValueAtTime).toHaveBeenCalledWith(2 ** (1 / 12), 0)
    expect(sources[0]).toMatchObject({ loop: true, loopStart: .01, loopEnd: .5 })
    expect(buffer.getChannelData).not.toHaveBeenCalled()
  })

  it('queues 400 ms of rhythm immediately and retains original gate timestamps after a 300 ms callback stall', async () => {
    const { renderer, sources, events, plans } = setup()
    await renderer.prepare(synth)
    renderer.configure({ style: 'repeat', bpm: 120, rate: 16 })
    renderer.press('hand', [note()])
    expect(sources.map(source => source.start.mock.calls[0][0])).toEqual([0, .125, .25, .375])
    expect(sources.map(source => source.stop.mock.calls[0][0])).toEqual([.13, .255, .38, .505])
    expect(plans.at(-1)).toEqual(expect.arrayContaining([expect.objectContaining({ phase: 'attack', at: .375 })]))
    // The browser can render all pre-submitted nodes while JS cannot run.
    vi.setSystemTime(300)
    vi.advanceTimersByTime(10)
    expect(events.filter(event => event.phase === 'attack').map(event => event.at)).toEqual([0, .125, .25])
    expect(events.filter(event => event.phase === 'release').map(event => event.at)).toEqual([.1, .225])
  })

  it('cancels already queued future notes before onset when the owner lets go', async () => {
    const { renderer, sources, events, plans, ended } = setup()
    await renderer.prepare(synth)
    renderer.configure({ style: 'repeat', bpm: 120, rate: 16 })
    renderer.press('hand', [note()])
    vi.setSystemTime(50)
    renderer.release('hand')
    expect(sources.slice(1).every(source => source.stop.mock.calls.at(-1)?.[0] === .05)).toBe(true)
    expect(events.filter(event => event.phase === 'attack')).toHaveLength(1)
    expect(plans.at(-1)).toEqual([])
    expect(ended).toHaveBeenCalledWith('hand')
    vi.advanceTimersByTime(1000)
    expect(events.filter(event => event.phase === 'attack')).toHaveLength(1)
  })

  it('mirrors cancellation of every queued note before owner metadata is retired', async () => {
    const { renderer } = setup()
    await renderer.prepare(synth)
    const mirrored: Array<{ event: LiveVoiceEvent; phase: string }> = []
    const performance = createLivePerformance({
      now: () => Date.now() / 1000,
      onEvent: vi.fn(), onOwnerClosed: vi.fn(), onError: error => { throw error },
      onMirror: (event, metadata, phase) => { expect(metadata).toEqual({ pitch: 60 }); mirrored.push({ event, phase }) },
    })
    performance.press('hand', [note()], { pitch: 60 }, renderer, { style: 'repeat', bpm: 120, rate: 16 })
    const queued = mirrored.filter(item => item.phase === 'attack' && item.event.at > 0).map(item => item.event.noteId)
    expect(queued).toHaveLength(3)
    vi.setSystemTime(50)
    performance.release('hand')
    expect(mirrored.filter(item => item.phase === 'cancel').map(item => item.event.noteId)).toEqual(queued)
    expect(performance.release('hand')).toBe(false)
    performance.dispose()
  })

  it('retains metadata when a press atomically replaces an existing owner', async () => {
    const { renderer } = setup()
    await renderer.prepare(synth)
    const delivered: LiveVoiceEvent[] = []
    const performance = createLivePerformance({
      now: () => Date.now() / 1000,
      onEvent: event => delivered.push(event), onMirror: vi.fn(), onOwnerClosed: vi.fn(), onError: error => { throw error },
    })
    const config = { style: 'together' as const, bpm: 120, rate: 16 as const }
    performance.press('hand', [note(60)], {}, renderer, config)
    performance.press('hand', [note(64)], {}, renderer, config)
    expect(delivered.filter(event => event.phase === 'attack').map(event => event.pitch)).toEqual([60, 64])
    expect(performance.release('hand')).toBe(true)
    expect(delivered.filter(event => event.phase === 'release').map(event => event.pitch)).toEqual([60, 64])
    performance.dispose()
  })

  it('revises queued arpeggio pitches on chord changes without replaying the first note', async () => {
    const { renderer, sources, events } = setup()
    await renderer.prepare(synth)
    renderer.configure({ style: 'arp-up', bpm: 120, rate: 16 })
    renderer.press('low', [note(60)])
    renderer.press('high', [note(72)])
    const future = sources.filter(source => source.start.mock.calls[0][0] === .125)
    expect(future).toHaveLength(2)
    expect(future[0].stop).toHaveBeenLastCalledWith(0)
    expect(future[1].frequency.setValueAtTime).toHaveBeenCalledWith(440 * 2 ** ((72 - 69) / 12), .125)
    expect(events.filter(event => event.phase === 'attack')).toHaveLength(1)
  })

  it('keeps a shared unison alive until its final held owner releases', async () => {
    const { renderer, events, ended } = setup()
    await renderer.prepare(synth)
    renderer.configure({ style: 'repeat', bpm: 120, rate: 16 })
    renderer.press('one', [note()]); renderer.press('two', [note()])
    vi.setSystemTime(20)
    renderer.release('one')
    expect(events.filter(event => event.phase === 'release')).toEqual([])
    expect(ended).not.toHaveBeenCalledWith('one')
    renderer.release('two')
    expect(events.filter(event => event.phase === 'release')).toMatchObject([{ at: .02 }])
    expect(ended).toHaveBeenCalledWith('one')
    expect(ended).toHaveBeenCalledWith('two')
  })

  it('preserves the next rhythmic boundary while replacing more distant notes on a tempo change', async () => {
    const { renderer, sources } = setup()
    await renderer.prepare(synth)
    renderer.configure({ style: 'repeat', bpm: 120, rate: 16 })
    renderer.press('hand', [note()])
    vi.setSystemTime(20)
    renderer.configure({ bpm: 240 })
    expect(sources[1].stop).toHaveBeenLastCalledWith(.255)
    expect(sources[2].stop).toHaveBeenLastCalledWith(.02)
    expect(sources.some(source => source.start.mock.calls[0][0] === .1875)).toBe(true)
  })

  it('fades the oldest sounding note on the 65th admission and bounds retiring nodes', async () => {
    const { renderer, sources, events } = setup()
    await renderer.prepare(synth)
    renderer.press('hand', Array.from({ length: 73 }, (_, pitch) => note(pitch)))
    expect(sources).toHaveLength(73)
    expect(sources[0].stop).toHaveBeenLastCalledWith(0)
    expect(sources[1].stop).toHaveBeenLastCalledWith(.005)
    expect(events.filter(event => event.phase === 'release')).toHaveLength(9)
    expect(sources.filter(source => source.disconnect.mock.calls.length)).toHaveLength(1)
  })

  it('acknowledges bank retirement only after canceling its queued notes and releasing its sounding nodes', async () => {
    const { renderer, sources, events, ended } = setup()
    await renderer.prepare(synth)
    renderer.configure({ style: 'repeat', bpm: 120, rate: 16 })
    renderer.press('hand', [note()])
    const retiring = renderer.forget('sine')
    expect(events.filter(event => event.phase === 'release')).toMatchObject([{ at: 0 }])
    expect(sources[0].stop).toHaveBeenLastCalledWith(.005)
    await vi.advanceTimersByTimeAsync(10)
    await retiring
    expect(sources.every(source => source.disconnect.mock.calls.length > 0)).toBe(true)
    renderer.press('after-retirement', [note()])
    expect(sources).toHaveLength(4)
    expect(ended).toHaveBeenCalledWith('after-retirement')
  })

  it('stops all nodes and both scheduler timers on disposal', async () => {
    const { renderer, sources } = setup()
    await renderer.prepare(synth)
    renderer.configure({ style: 'repeat', bpm: 120, rate: 16 })
    renderer.press('hand', [note()])
    renderer.dispose()
    expect(vi.getTimerCount()).toBe(0)
    expect(sources.every(source => source.disconnect.mock.calls.length > 0)).toBe(true)
    renderer.press('ignored', [note()])
    await expect(renderer.prepare(synth)).rejects.toThrow('disposed')
    expect(sources).toHaveLength(4)
  })

  it('stops active and queued voices immediately on a frozen suspended clock without polling or resume tails', async () => {
    const { renderer, sources, gains, events, plans, ended, setState } = setup()
    await renderer.prepare(synth)
    renderer.configure({ style: 'repeat', bpm: 120, rate: 16 })
    renderer.press('hand', [note()])
    vi.setSystemTime(50)
    setState('suspended')
    expect(sources.every(source => source.stop.mock.calls.at(-1)?.[0] === .05)).toBe(true)
    expect(sources.every(source => source.disconnect.mock.calls.length > 0)).toBe(true)
    expect(gains.every(gain => gain.disconnect.mock.calls.length > 0)).toBe(true)
    expect(events).toMatchObject([{ phase: 'attack' }, { phase: 'release', at: .05 }])
    expect(plans.at(-1)).toEqual([])
    expect(ended).toHaveBeenCalledWith('hand')
    expect(vi.getTimerCount()).toBe(0)
    vi.advanceTimersByTime(1000)
    expect(vi.getTimerCount()).toBe(0)
    setState('running')
    vi.advanceTimersByTime(500)
    expect(sources).toHaveLength(4)
    expect(events).toHaveLength(2)
    renderer.press('fresh', [note(64)])
    expect(events.at(-1)).toMatchObject({ phase: 'attack', ownerId: 'fresh', pitch: 64 })
  })

  it('cleans up a failed source start before reentrant disposal and ignores the remaining chord notes', async () => {
    const errors: Error[] = []
    const { renderer, sources, context, events } = setup({ onError(error) { renderer.dispose(); errors.push(error) } })
    await renderer.prepare(synth)
    const create = vi.mocked(context.createOscillator).getMockImplementation()!
    vi.mocked(context.createOscillator).mockImplementationOnce(() => {
      const node = create()
      vi.spyOn(node, 'start').mockImplementation(() => { throw new Error('Injected source start failure') })
      vi.spyOn(node, 'stop').mockImplementation(() => { throw new DOMException('Source never started', 'InvalidStateError') })
      return node
    })
    expect(() => renderer.press('hand', [note(60), note(64), note(67)])).not.toThrow()
    expect(errors.map(error => error.message)).toEqual(['Injected source start failure'])
    expect(sources).toHaveLength(1)
    expect(sources[0].stop).not.toHaveBeenCalled()
    expect(sources[0].disconnect).toHaveBeenCalled()
    expect(events).toEqual([])
    expect(vi.getTimerCount()).toBe(0)
  })

  it('reports a non-looping sample natural end at its audio deadline even if delivery is late', async () => {
    const { renderer, events } = setup()
    await renderer.prepare({ ...synth, kind: 'sample-bank', instrumentId: 'sample', zoneSelection: 'nearest-root',
      zones: [{ id: 'root', rootMidi: 60, buffer: { sampleRate: 48000, length: 4800 } as AudioBuffer }] })
    renderer.press('hand', [{ pitch: 60, instrumentId: 'sample' }])
    vi.setSystemTime(300)
    vi.advanceTimersByTime(10)
    expect(events).toMatchObject([{ phase: 'attack', at: 0 }, { phase: 'release', at: .1 }])
  })
})
