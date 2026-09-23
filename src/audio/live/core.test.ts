import { describe, expect, it } from 'vitest'
import { LiveAudioCore } from './core'
import type { LiveCommand, LiveResponse, LiveVoiceEvent, PreparedLiveInstrument } from './types'

const bank: PreparedLiveInstrument = {
  kind: 'sample-bank', instrumentId: 'test', zoneSelection: 'nearest-root',
  gain: 1, attack: 0, decay: 0, sustain: 1, release: 0.01,
  zones: [{ id: 'zone', rootMidi: 60, sampleRate: 1000,
    channels: [new Float32Array([1, .5, 0, -.5]), new Float32Array([.2, .4, .6, .8])],
    loopStartFrame: 0, loopEndFrame: 4 }],
}
function setup(instrument = bank) {
  const events: LiveVoiceEvent[] = []
  const messages: LiveResponse[] = []
  const core = new LiveAudioCore(1000, response => {
    messages.push(response)
    if (response.type === 'event') events.push(response.event)
  })
  let frame = 0
  const send = (command: LiveCommand) => core.command(command, frame)
  send({ type: 'prepare', requestId: 1, instrument })
  const press = (ownerId: string, pitches: number[]) => send({ type: 'press', ownerId,
    notes: pitches.map(pitch => ({ pitch, instrumentId: instrument.instrumentId })) })
  const render = (length: number) => {
    const output = [new Float32Array(length), new Float32Array(length)]
    core.render(output, frame)
    frame += length
    return output
  }
  return { core, events, messages, send, press, render }
}

describe('production live audio render core', () => {
  it('renders immediate stereo PCM, resamples by source rate/root pitch and loops', () => {
    const { press, render } = setup()
    press('finger', [48])
    const [left, right] = render(16)
    expect([...left].filter((_, index) => index % 2 === 0)).toEqual([1, .5, 0, -.5, 1, .5, 0, -.5])
    expect([...right].filter((_, index) => index % 2 === 0)).toEqual([.2, .4, .6, .8, .2, .4, .6, .8].map(Math.fround))
  })

  it('generates every 1/16 pulse and gate without main-thread callbacks', () => {
    const { send, press, render, events } = setup()
    send({ type: 'configure', config: { style: 'repeat', rate: 16 } })
    press('finger', [60])
    render(1000)
    expect(events.filter(e => e.phase === 'attack').map(e => e.at)).toEqual(
      [0, .125, .25, .375, .5, .625, .75, .875])
    expect(events.filter(e => e.phase === 'release').map(e => e.at)).toEqual(
      [.1, .225, .35, .475, .6, .725, .85, .975])
  })

  it('interpolates fractional sample positions with the source sample rate', () => {
    const halfRate: PreparedLiveInstrument = { ...bank, kind: 'sample-bank', zoneSelection: 'nearest-root',
      zones: [{ ...bank.zones[0], sampleRate: 500, loopEndFrame: 32,
        channels: [Float32Array.from({ length: 32 }, (_, index) => Math.sin(2 * Math.PI * index / 32))] }] }
    const { press, render } = setup(halfRate)
    press('finger', [60])
    const output = render(64)[0]
    for (let index = 0; index < output.length; index++) {
      expect(output[index]).toBeCloseTo(Math.sin(2 * Math.PI * index / 64), 2)
    }
  })

  it('honors first matching soundfont ranges and never fills an unsupported range with a wrong sample', () => {
    const ranges: PreparedLiveInstrument = { ...bank, kind: 'sample-bank', zoneSelection: 'first-range', zones: [
      { ...bank.zones[0], lowMidi: 60, highMidi: 64, loopEndFrame: 2, channels: [new Float32Array([.2, .2])] },
      { ...bank.zones[0], lowMidi: 64, highMidi: 67, loopEndFrame: 2, channels: [new Float32Array([.9, .9])] },
    ] }
    const { press, render, events } = setup(ranges)
    press('shared-boundary', [64]); press('outside', [80])
    expect(render(1)[0][0]).toBeCloseTo(.2)
    expect(events.filter(e => e.phase === 'attack').map(e => e.pitch)).toEqual([64])
  })

  it('selects the nearest sample root and preserves bank order for equal-distance roots', () => {
    const nearest: PreparedLiveInstrument = { ...bank, kind: 'sample-bank', zoneSelection: 'nearest-root', zones: [
      { ...bank.zones[0], rootMidi: 60, channels: [new Float32Array([.2, .2])] },
      { ...bank.zones[0], rootMidi: 64, channels: [new Float32Array([.9, .9])] },
    ] }
    const { press, render, send } = setup(nearest)
    press('tie', [62]); expect(render(1)[0][0]).toBeCloseTo(.2)
    send({ type: 'clear' }); render(20)
    press('closer', [63]); expect(render(1)[0][0]).toBeCloseTo(.9)
  })

  it.each(['sine', 'triangle', 'square', 'sawtooth'] as const)('renders finite audible %s and completes its release', waveform => {
    const { press, render, send, core } = setup({ kind: 'oscillator', instrumentId: 'osc', waveform,
      gain: .3, attack: .002, decay: .003, sustain: .7, release: .01 })
    press('finger', [48])
    const output = render(100)[0]
    expect(output.every(Number.isFinite)).toBe(true)
    expect(output.some(sample => Math.abs(sample) > .1)).toBe(true)
    expect(Math.max(...output.map(Math.abs))).toBeLessThanOrEqual(Math.fround(.3))
    send({ type: 'release', ownerId: 'finger' }); render(20)
    expect(core.voiceCount).toBe(0)
  })

  it.each(['strum-up', 'strum-down'] as const)('collects and sorts nearby %s inputs, maintaining35ms spread', style => {
    const { press, send, render, events } = setup()
    send({ type: 'configure', config: { style } })
    press('e', [64]); render(10); press('c', [60]); press('g', [67]); render(120)
    expect(events.filter(e => e.phase === 'attack').map(e => [e.pitch, e.at])).toEqual(
      style === 'strum-up' ? [[60, .03], [64, .065], [67, .1]] : [[67, .03], [64, .065], [60, .1]])
  })

  it('removes a released pending strum without shifting remaining notes', () => {
    const { press, send, render, events } = setup()
    send({ type: 'configure', config: { style: 'strum-up' } })
    press('a', [60]); press('b', [64]); press('c', [67]); render(40)
    send({ type: 'release', ownerId: 'b' }); render(100)
    expect(events.filter(e => e.phase === 'attack').map(e => [e.pitch, e.at])).toEqual([[60, .03], [67, .1]])
  })

  it('updates future arp notes while retaining the immediate first press and up-down sequence', () => {
    const { press, send, render, events } = setup()
    send({ type: 'configure', config: { style: 'arp-up-down', rate: 16 } })
    press('first', [64]); press('lower', [60]); press('higher', [67]); render(510)
    expect(events.filter(e => e.phase === 'attack').map(e => e.pitch)).toEqual([64, 64, 67, 64, 60])
  })

  it('does not post unchanged plans every render quantum and acknowledges bank retirement after its bounded fade', () => {
    const { press, send, render, events, messages } = setup()
    press('held', [60]); render(10)
    const plans = messages.filter(message => message.type === 'plan').length
    for (let i = 0; i < 10; i++) render(10)
    expect(messages.filter(message => message.type === 'plan')).toHaveLength(plans)
    send({ type: 'forget', requestId: 2, instrumentId: 'test', instant: false })
    expect(messages.filter(message => message.type === 'forgotten')).toHaveLength(0)
    expect(render(4)[0].some(value => value !== 0)).toBe(true)
    render(2)
    expect(messages.filter(message => message.type === 'forgotten')).toEqual([{ type: 'forgotten', requestId: 2 }])
    press('new', [60]); render(4)
    expect(events.filter(event => event.phase === 'attack')).toHaveLength(1)
  })

  it('forgets suspended banks immediately without needing an audio render callback', () => {
    const { core, press, render, send, messages } = setup()
    press('held', [60]); render(1)
    send({ type: 'forget', requestId: 9, instrumentId: 'test', instant: true })
    expect(core.voiceCount).toBe(0)
    expect(messages.at(-1)).toEqual({ type: 'forgotten', requestId: 9 })
  })

  it('cancels an onset before rendering without reporting a note that never sounded', () => {
    const { press, send, render, events } = setup()
    press('finger', [60]); send({ type: 'release', ownerId: 'finger' })
    expect(render(100)[0].every(value => value === 0)).toBe(true)
    expect(events).toEqual([])
  })

  it('releases and removes a naturally ended one-shot without waiting for key-up', () => {
    const instrument: PreparedLiveInstrument = { ...bank, kind: 'sample-bank', zoneSelection: 'nearest-root',
      zones: [{ ...bank.zones[0], loopStartFrame: undefined, loopEndFrame: undefined }] }
    const { press, render, core, events, send } = setup(instrument)
    press('held', [60]); render(20)
    expect(core.voiceCount).toBe(0)
    expect(events.map(event => [event.phase, event.at])).toEqual([['attack', 0], ['release', .004]])
    send({ type: 'release', ownerId: 'held' })
    expect(events).toHaveLength(2)
  })

  it('preserves30ms rhythmic releases while Together retains instrument articulation', () => {
    const { press, render, send, core } = setup({ ...bank, release: .2 })
    send({ type: 'configure', config: { style: 'repeat', rate: 16 } })
    press('held', [60]); render(1); send({ type: 'release', ownerId: 'held' }); render(31)
    expect(core.voiceCount).toBe(0)
    send({ type: 'configure', config: { style: 'together' } })
    press('held', [60]); render(1); send({ type: 'release', ownerId: 'held' }); render(31)
    expect(core.voiceCount).toBe(1)
  })

  it('acknowledges original unison owner only after its surviving shared lifecycle ends', () => {
    const { press, render, send, messages } = setup()
    send({ type: 'configure', config: { style: 'repeat', rate: 16 } })
    press('original', [60]); render(1); press('other', [60])
    send({ type: 'release', ownerId: 'original' }); render(10)
    expect(messages.filter(message => message.type === 'owner-ended')).toEqual([])
    render(90)
    const releaseIndex = messages.findIndex(message => message.type === 'event' && message.event.phase === 'release')
    const endedIndex = messages.findIndex(message => message.type === 'owner-ended' && message.ownerId === 'original')
    expect(endedIndex).toBeGreaterThan(releaseIndex)
  })

  it('preserves arp phase at the next old-grid tempo boundary', () => {
    const { send, press, render, events } = setup()
    send({ type: 'configure', config: { style: 'arp-up', rate: 16 } })
    press('chord', [67, 60, 64])
    render(150)
    send({ type: 'configure', config: { bpm: 60 } })
    render(700)
    expect(events.filter(e => e.phase === 'attack').map(e => [e.pitch, e.at])).toEqual(
      [[60, 0], [64, .125], [67, .25], [60, .5], [64, .75]])
  })

  it('retains owner unisons and cancels queued pulses on final release', () => {
    const { send, press, render, events } = setup()
    send({ type: 'configure', config: { style: 'repeat', rate: 16 } })
    press('a', [60]); render(10); press('b', [60])
    send({ type: 'release', ownerId: 'a' }); render(20)
    expect(events.filter(e => e.phase === 'release')).toHaveLength(0)
    send({ type: 'release', ownerId: 'b' }); render(300)
    expect(events.map(e => [e.phase, e.at])).toEqual([['attack', 0], ['release', .03]])
  })

  it('bounds voice rendering and retires all output after repeated clear', () => {
    const { core, press, send, render, events } = setup()
    for (let i = 0; i < 200; i++) { press(`o${i}`, [60]); render(1) }
    expect(core.voiceCount).toBeLessThanOrEqual(72)
    send({ type: 'clear' }); send({ type: 'clear' })
    render(30)
    expect(core.voiceCount).toBe(0)
    const released = events.filter(e => e.phase === 'release').map(e => e.noteId)
    expect(new Set(released).size).toBe(released.length)
    expect(released).toHaveLength(200)
  })

  it('admits at most64 simultaneous voices without reporting stolen pre-onset notes as played', () => {
    const { core, press, render, events } = setup()
    for (let index = 0; index < 100; index++) press(`owner-${index}`, [60])
    render(1)
    expect(core.voiceCount).toBe(64)
    expect(events).toHaveLength(64)
    expect(events.every(event => event.phase === 'attack')).toBe(true)
  })

  // A constant-level loop makes every rendered frame equal the envelope.
  const dc: PreparedLiveInstrument = { ...bank, instrumentId: 'dc', attack: 0, release: 0,
    zones: [{ id: 'dc', rootMidi: 60, sampleRate: 1000, channels: [new Float32Array([1, 1, 1, 1])],
      loopStartFrame: 0, loopEndFrame: 4 }] }

  it('applies Shape envelope overrides to new voices only', () => {
    const { send, press, render } = setup(dc)
    press('before', [60])
    render(1)
    send({ type: 'shape', envelope: { attack: .01, release: .5 } })
    // The sounding voice keeps its instant attack and prepared release.
    expect(render(2)[0][1]).toBe(1)
    send({ type: 'shape', envelope: { attack: .01 } })
    send({ type: 'release', ownerId: 'before' })
    render(1)
    press('after', [60])
    // 10ms at 1kHz ramps over ten frames.
    expect([...render(4)[0]]).toEqual([0, .1, .2, .3].map(Math.fround))
  })

  it('restores prepared articulation when the override is cleared and ignores invalid values', () => {
    const { send, press, render } = setup(dc)
    send({ type: 'shape', envelope: { attack: .01 } })
    send({ type: 'shape', envelope: { attack: -1 } })
    send({ type: 'shape', envelope: { attack: Number.NaN } })
    press('shaped', [60])
    expect(render(2)[0][1]).toBeCloseTo(.1)
    send({ type: 'release', ownerId: 'shaped' })
    render(5)
    send({ type: 'shape', envelope: {} })
    press('natural', [60])
    expect(render(2)[0][1]).toBe(1)
  })

  it('uses the Shape release for held voices', () => {
    const { send, press, render } = setup(dc)
    send({ type: 'shape', envelope: { release: .004 } })
    press('finger', [60])
    render(3)
    send({ type: 'release', ownerId: 'finger' })
    expect([...render(5)[0]]).toEqual([1, .75, .5, .25, 0])
  })
})
