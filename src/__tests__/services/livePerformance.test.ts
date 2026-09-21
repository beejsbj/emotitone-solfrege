import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { LiveRendererCallbacks, LiveVoiceEvent } from '@/audio/liveRenderer'

let listener: LiveRendererCallbacks
vi.mock('@/services/livePlayback', () => ({ subscribeLivePlayback: (next: LiveRendererCallbacks) => {
  listener = next
  return vi.fn()
} }))
import { createLivePerformance } from '@/services/livePerformance'
import { LiveAudioCore } from '@/audio/live/core'
import type { LiveResponse } from '@/audio/live/types'

const config = { style: 'repeat' as const, bpm: 120, rate: 16 as const }
const event = (ownerId: string, phase: 'attack' | 'release', at: number, pitch = 60): LiveVoiceEvent => ({
  ownerId, phase, at, pitch, noteId: 'voice', instrumentId: 'piano', style: 'repeat',
})
function setup() {
  const callbacks = { now: () => 1, onEvent: vi.fn(), onMirror: vi.fn(), onOwnerClosed: vi.fn(), onError: vi.fn(), onExpression: vi.fn() }
  const renderer = { setPitchBend: vi.fn(), configure: vi.fn(), press: vi.fn(), release: vi.fn(), clear: vi.fn(), dispose: vi.fn(), forget: vi.fn() }
  const performance = createLivePerformance(callbacks)
  performance.press('hand', [{ instrumentId: 'piano', pitch: 60 }], { label: 'first' }, renderer, config)
  return { performance, renderer, callbacks }
}
beforeEach(() => vi.clearAllMocks())

describe('prepared performance MIDI ownership', () => {
  it('routes expression only to a held owner and records active or delayed note onsets', () => {
    const { performance, renderer, callbacks } = setup()
    expect(performance.setPitchBend('unknown', 20)).toBe(false)
    expect(performance.setPitchBend('hand', NaN)).toBe(false)
    expect(performance.setPitchBend('hand', 80)).toBe(true)
    expect(renderer.setPitchBend).toHaveBeenLastCalledWith('hand', 50)
    expect(callbacks.onExpression).not.toHaveBeenCalled()
    listener.onEvent(event('hand', 'attack', .9))
    expect(callbacks.onExpression).toHaveBeenLastCalledWith('voice', 50, 1)
    performance.setPitchBend('hand', -20)
    expect(callbacks.onExpression).toHaveBeenLastCalledWith('voice', -20, 1)
    performance.release('hand')
    expect(performance.setPitchBend('hand', 0)).toBe(false)
    expect(renderer.setPitchBend).toHaveBeenCalledTimes(2)
  })

  it('does not replay a completed MIDI plan when stalled audio lifecycle callbacks arrive', () => {
    const { callbacks } = setup()
    const attack = event('hand', 'attack', .125), release = event('hand', 'release', .225)
    listener.onPlan!([attack, release])
    // MIDI has already delivered both timestamps while the main thread was blocked.
    listener.onEvent(attack)
    listener.onPlan!([release])
    listener.onEvent(release)
    listener.onPlan!([])
    expect(callbacks.onMirror.mock.calls.map(([next, , phase]) => [phase, next.at])).toEqual([
      ['attack', .125], ['release', .225],
    ])
    expect(callbacks.onEvent.mock.calls.map(([next]) => next)).toEqual([attack, release])
  })

  it('delivers buffered real worklet lifecycle before snapshots retire elapsed plans', () => {
    const { callbacks } = setup()
    const messages: LiveResponse[] = []
    const core = new LiveAudioCore(1000, message => messages.push(message))
    core.command({ type: 'prepare', requestId: 1, instrument: {
      kind: 'oscillator', instrumentId: 'piano', waveform: 'sine', gain: .3, attack: 0, decay: 0, sustain: 1, release: .03,
    } }, 0)
    core.command({ type: 'configure', config }, 0)
    core.command({ type: 'press', ownerId: 'hand', notes: [{ instrumentId: 'piano', pitch: 60 }] }, 0)
    const deliver = () => {
      for (const message of messages.splice(0)) {
        if (message.type === 'event') listener.onEvent(message.event)
        else if (message.type === 'plan') listener.onPlan!(message.events)
        else if (message.type === 'owner-ended') listener.onOwnerEnded!(message.ownerId)
      }
    }
    deliver()
    // Hold MessagePort delivery across an entire second of render work.
    core.render([new Float32Array(1000)], 0)
    core.command({ type: 'release', ownerId: 'hand' }, 1000)
    deliver()
    const attacks = callbacks.onMirror.mock.calls.filter(([, , phase]) => phase === 'attack').map(([next]) => next.noteId)
    expect(new Set(attacks).size).toBe(attacks.length)
    expect(callbacks.onEvent.mock.calls.filter(([next]) => next.phase === 'attack')).toHaveLength(8)
    expect(callbacks.onEvent.mock.calls.filter(([next]) => next.phase === 'release')).toHaveLength(8)
  })

  it('cancels and republishes both edges when a planned pitch changes without changing its timestamp', () => {
    const { callbacks } = setup()
    listener.onPlan!([event('hand', 'attack', 2), event('hand', 'release', 3)])
    listener.onPlan!([event('hand', 'attack', 2, 64), event('hand', 'release', 3, 64)])
    expect(callbacks.onMirror.mock.calls.map(([next, , phase]) => [phase, next.pitch])).toEqual([
      ['attack', 60], ['release', 60], ['cancel', 60], ['attack', 64], ['release', 64],
    ])
  })

  it('republishes a cancelled plan if the renderer schedules the same note again', () => {
    const { callbacks } = setup()
    const attack = event('hand', 'attack', 2), release = event('hand', 'release', 3)
    listener.onPlan!([attack, release])
    listener.onPlan!([])
    listener.onPlan!([attack, release])
    listener.onEvent(attack)
    listener.onEvent(release)
    expect(callbacks.onMirror.mock.calls.map(([, , phase]) => phase)).toEqual(['attack', 'release', 'cancel', 'attack', 'release'])
  })

  it('reschedules changed attack times and mirrors an earlier actual release once', () => {
    const { callbacks } = setup()
    listener.onPlan!([event('hand', 'attack', 2), event('hand', 'release', 3)])
    listener.onPlan!([event('hand', 'attack', 2.5), event('hand', 'release', 3)])
    listener.onEvent(event('hand', 'attack', 2.5))
    listener.onEvent(event('hand', 'release', 2.75))
    expect(callbacks.onMirror.mock.calls.map(([next, , phase]) => [phase, next.at])).toEqual([
      ['attack', 2], ['release', 3], ['cancel', 1], ['attack', 2.5], ['release', 3], ['release', 2.75],
    ])
  })

  it('cancels both planned edges once on close and ignores the old owner after another press', () => {
    const { callbacks, performance, renderer } = setup()
    listener.onPlan!([event('hand', 'attack', 2), event('hand', 'release', 3)])
    performance.close()
    expect(callbacks.onMirror.mock.calls.map(([, , phase]) => phase)).toEqual(['attack', 'release', 'cancel'])
    performance.press('hand', [{ instrumentId: 'piano', pitch: 64 }], {}, renderer, config)
    const successor = renderer.press.mock.calls.at(-1)![0]
    expect(successor).not.toBe('hand')
    listener.onEvent(event('hand', 'attack', 2))
    listener.onOwnerEnded!('hand')
    expect(callbacks.onEvent).not.toHaveBeenCalled()
    expect(performance.release('hand')).toBe(true)
  })

  it('keeps delayed events and owner retirement attached to the press that created them', () => {
    const { performance, renderer, callbacks } = setup()
    listener.onPlan!([event('hand', 'attack', 2), event('hand', 'release', 3)])
    performance.release('hand')
    performance.press('hand', [{ instrumentId: 'piano', pitch: 64 }], { label: 'second' }, renderer, config)
    const successor = renderer.press.mock.calls.at(-1)![0]
    expect(successor).not.toBe('hand')
    listener.onEvent(event('hand', 'attack', 2))
    listener.onEvent(event('hand', 'release', 3))
    listener.onOwnerEnded!('hand')
    listener.onEvent({ ...event(successor, 'attack', 4, 64), noteId: 'successor' })
    expect(callbacks.onEvent.mock.calls.map(([next, metadata]) => [next.ownerId, metadata.label])).toEqual([
      ['hand', 'first'], ['hand', 'first'], ['hand', 'second'],
    ])
    expect(performance.release('hand')).toBe(true)
    expect(renderer.release).toHaveBeenLastCalledWith(successor)
  })
})
