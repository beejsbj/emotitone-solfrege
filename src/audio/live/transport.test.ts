import { describe, expect, it } from 'vitest'
import { LiveAudioCore } from './core'
import type { LiveResponse, LiveVoiceEvent } from './types'
import type { TransportMemberSpec } from './transport'

// SPIKE (BJS-484): the audio-thread transport rendered through the real core.
const RATE = 1000 // frames per second; 120 BPM -> one bar = 2000 frames
function setup() {
  const events: LiveVoiceEvent[] = []
  const responses: LiveResponse[] = []
  const core = new LiveAudioCore(RATE, response => {
    responses.push(response)
    if (response.type === 'event') events.push(response.event)
  })
  let frame = 0, id = 0
  core.command({ type: 'prepare', requestId: ++id, instrument: { kind: 'oscillator', instrumentId: 'osc', waveform: 'sine',
    gain: 1, attack: 0, decay: 0, sustain: 1, release: 0 } }, frame)
  const send = (command: Parameters<LiveAudioCore['command']>[0]) => core.command(command, frame)
  const render = (frames: number) => {
    for (let done = 0; done < frames; done += 128) {
      const length = Math.min(128, frames - done)
      core.render([new Float32Array(length), new Float32Array(length)], frame)
      frame += length
    }
  }
  return { events, responses, send, render, nextId: () => ++id }
}
const member = (id: string, overrides: Partial<TransportMemberSpec> = {}): TransportMemberSpec => ({
  id, lengthBars: 1, offsetBars: 0, rate: 1, muted: false,
  notes: [0, .25, .5, .75].map((begin, i) => ({ begin, duration: .1, pitch: 60 + i, instrumentId: 'osc', noteId: `${id}-${i}` })),
  ...overrides,
})
const attacks = (events: LiveVoiceEvent[], memberId: string) =>
  events.filter(e => e.phase === 'attack' && e.memberId === memberId).map(e => e.frame)

describe('audio-thread Looper transport (spike)', () => {
  it('plays a member on the bar grid at exact frames and loops it', () => {
    const t = setup()
    t.send({ type: 'transport-change', requestId: t.nextId(), change: { type: 'join', member: member('a') }, boundary: 'immediate' })
    t.send({ type: 'transport-start', requestId: t.nextId(), bpm: 120 })
    t.render(4000)
    expect(attacks(t.events, 'a')).toEqual([0, 500, 1000, 1500, 2000, 2500, 3000, 3500])
  })

  it('joins at an offset mid-phrase, in phase, from the next quantum', () => {
    const t = setup()
    t.send({ type: 'transport-start', requestId: t.nextId(), bpm: 120 })
    t.render(1280)
    t.send({ type: 'transport-change', requestId: t.nextId(), change: { type: 'join', member: member('b', { offsetBars: .375 }) }, boundary: 'immediate' })
    t.render(2720)
    // Offset .375 bar = 750 frames: onsets at 750 + 500k; those before 1280 are not retro-fired.
    expect(attacks(t.events, 'b')).toEqual([1750, 2250, 2750, 3250, 3750])
  })

  it('applies a change at an exact future bar, keeping notes before it and none after', () => {
    const t = setup()
    t.send({ type: 'transport-change', requestId: t.nextId(), change: { type: 'join', member: member('a') }, boundary: 'immediate' })
    t.send({ type: 'transport-start', requestId: t.nextId(), bpm: 120 })
    t.render(300)
    t.send({ type: 'transport-change', requestId: t.nextId(), change: { type: 'leave', memberId: 'a' }, boundary: { bar: 1 } })
    t.render(3700)
    expect(attacks(t.events, 'a')).toEqual([0, 500, 1000, 1500])
    const applied = t.responses.find(r => r.type === 'transport-applied' && r.appliedBar === 1)
    expect(applied).toMatchObject({ appliedFrame: 2000, late: false })
  })

  it('changes tempo at a bar boundary without moving notes before it', () => {
    const t = setup()
    t.send({ type: 'transport-change', requestId: t.nextId(), change: { type: 'join', member: member('a') }, boundary: 'immediate' })
    t.send({ type: 'transport-start', requestId: t.nextId(), bpm: 120 })
    t.render(100)
    t.send({ type: 'transport-change', requestId: t.nextId(), change: { type: 'tempo', bpm: 240 }, boundary: { bar: 1 } })
    t.render(3000)
    // Bar 1 at frame 2000, then one bar = 1000 frames.
    expect(attacks(t.events, 'a')).toEqual([0, 500, 1000, 1500, 2000, 2250, 2500, 2750, 3000])
  })

  it('mutes immediately: the sounding voice fades and no further onsets start', () => {
    const t = setup()
    t.send({ type: 'transport-change', requestId: t.nextId(), change: { type: 'join', member: member('a', {
      notes: [{ begin: 0, duration: .9, pitch: 60, instrumentId: 'osc', noteId: 'long' }] }) }, boundary: 'immediate' })
    t.send({ type: 'transport-start', requestId: t.nextId(), bpm: 120 })
    t.render(512)
    t.send({ type: 'transport-change', requestId: t.nextId(), change: { type: 'update', memberId: 'a', patch: { muted: true } }, boundary: 'immediate' })
    t.render(4000)
    expect(attacks(t.events, 'a')).toEqual([0])
    expect(t.events.find(e => e.phase === 'release' && e.memberId === 'a')?.frame).toBe(512)
  })
})
